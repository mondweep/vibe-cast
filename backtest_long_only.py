"""
SPY walk-forward paper-trading backtest using the Cognitum Seed
RVF vector store as the kNN backend.

Variant: LONG-ONLY with a 5 bps signal threshold.
Compared to backtest.py, this variant:
  - Drops the short branch entirely (desired in {0, +1})
  - Raises SIGNAL_THRESHOLD_BPS from 0 to 5 to filter noise trades
  - Uses a fresh SPY_ID_BASE to avoid colliding with the v1 run's vectors
  - Writes to separate output files so v1 results are preserved.

Run from this dir with the venv:
    .venv/bin/python backtest_long_only.py
"""

from __future__ import annotations

import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from embedding import DIM, FEATURE_COLS, apply_scaler, compute_raw_features, fit_scaler
from store_client import StoreClient
from yfinance_loader import load_spy

# ------------------------------------------------------------------ config

SPY_ID_BASE = 11_000_000_000        # fresh range for this variant (v1 used 10B)
WARMUP_BARS = 252                   # ~1 trading year before the strategy starts
K_NEIGHBORS = 10                    # k for signal aggregation
QUERY_K = 2_000                     # over-sample to filter past sensor noise
MIN_NEIGHBORS = 3                   # require at least this many SPY hits
SIGNAL_THRESHOLD_BPS = 5            # mean-pred threshold (bps) for entering long
SLIPPAGE_BPS = 1                    # per-side
START_DATE = "2018-01-01"

OUT_DIR = Path(__file__).parent
EQUITY_CSV = OUT_DIR / "equity_long_only.csv"
EQUITY_PNG = OUT_DIR / "equity_curve_long_only.png"
REPORT_MD = OUT_DIR / "report_long_only.md"


# ------------------------------------------------------------------ main

def main() -> None:
    print(f"[1/6] Loading SPY daily bars from Yahoo (start={START_DATE})…")
    bars = load_spy(start=START_DATE)
    print(f"      bars: {len(bars)}, range: {bars.index[0].date()} → {bars.index[-1].date()}")

    print("[2/6] Computing features…")
    raw = compute_raw_features(bars).dropna()
    bars = bars.loc[raw.index]
    print(f"      after dropna: {len(raw)} bars")

    if len(raw) < WARMUP_BARS + 30:
        raise SystemExit("Not enough data for warmup + meaningful test")

    print(f"[3/6] Fitting scaler on warmup window (first {WARMUP_BARS} bars)…")
    scaler = fit_scaler(raw.iloc[:WARMUP_BARS])
    scaled = apply_scaler(raw, scaler)

    forward_ret = np.log(bars["Close"]).diff().shift(-1)

    client = StoreClient()
    print(f"      seed status: {client.status()}")

    label_lookup: dict[int, float] = {}

    print(f"[4/6] Backfilling {WARMUP_BARS} warmup vectors into the seed…")
    backfill: list[tuple[int, list[float]]] = []
    for i in range(WARMUP_BARS):
        vec = scaled.iloc[i][FEATURE_COLS + ["bias"]].to_numpy(dtype=float).tolist()
        if any(np.isnan(v) for v in vec):
            continue
        bar_id = SPY_ID_BASE + i
        backfill.append((bar_id, vec))
        if not pd.isna(forward_ret.iloc[i]):
            label_lookup[bar_id] = float(forward_ret.iloc[i])

    for j in range(0, len(backfill), 250):
        client.ingest(backfill[j : j + 250], dedup=False)
    print(f"      ingested {len(backfill)} warmup vectors")

    print(f"[5/6] Walk-forward {WARMUP_BARS}…{len(scaled) - 2}…")
    equity = 1.0
    position = 0
    flip_count = 0
    bars_with_position = 0
    bars_winning = 0
    insufficient_neighbors = 0

    threshold = SIGNAL_THRESHOLD_BPS / 1e4
    records: list[dict] = []
    t0 = time.time()

    last_idx = len(scaled) - 1  # need bar i+1 for P&L
    for i in range(WARMUP_BARS, last_idx):
        bar_id = SPY_ID_BASE + i
        vec = scaled.iloc[i][FEATURE_COLS + ["bias"]].to_numpy(dtype=float).tolist()
        if any(np.isnan(v) for v in vec):
            records.append(
                {"date": scaled.index[i], "equity": equity, "position": position,
                 "mean_pred": np.nan, "spy_neighbors": 0}
            )
            continue

        neighbors = client.query(vec, k=QUERY_K)
        spy_neighbors = [
            n for n in neighbors if SPY_ID_BASE <= n["id"] < bar_id
        ][:K_NEIGHBORS]

        if len(spy_neighbors) >= MIN_NEIGHBORS:
            fwd = [label_lookup[n["id"]] for n in spy_neighbors if n["id"] in label_lookup]
            fwd = [r for r in fwd if not pd.isna(r)]
            mean_pred = float(np.mean(fwd)) if fwd else 0.0
        else:
            mean_pred = 0.0
            insufficient_neighbors += 1

        # LONG-ONLY: only +1 or 0 (no shorting)
        if mean_pred > threshold:
            desired = +1
        else:
            desired = 0

        if desired != position:
            equity *= 1 - SLIPPAGE_BPS / 1e4
            flip_count += 1
        position = desired

        actual_fwd = forward_ret.iloc[i]
        if not pd.isna(actual_fwd) and position != 0:
            pnl = position * float(actual_fwd)
            equity *= 1 + pnl
            bars_with_position += 1
            if pnl > 0:
                bars_winning += 1

        records.append(
            {"date": scaled.index[i], "equity": equity, "position": position,
             "mean_pred": mean_pred, "spy_neighbors": len(spy_neighbors)}
        )

        client.ingest([(bar_id, vec)], dedup=False)
        if not pd.isna(forward_ret.iloc[i]):
            label_lookup[bar_id] = float(forward_ret.iloc[i])

        if (i - WARMUP_BARS) % 100 == 0:
            elapsed = time.time() - t0
            print(f"      bar {i}  date={scaled.index[i].date()}  "
                  f"eq={equity:.4f}  pos={position:+d}  knn_hits={len(spy_neighbors)}  "
                  f"({elapsed:.1f}s)")

    print(f"[6/6] Generating report…")
    eq = pd.DataFrame(records).set_index("date")
    eq.to_csv(EQUITY_CSV)

    bh_close = bars["Close"].loc[eq.index]
    bh = bh_close / float(bh_close.iloc[0])

    daily_ret = eq["equity"].pct_change().fillna(0)
    n_years = max(len(eq) / 252, 1e-9)
    final = float(eq["equity"].iloc[-1])
    cagr = final ** (1 / n_years) - 1
    sharpe = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 0 else 0.0
    rolling_max = eq["equity"].cummax()
    max_dd = float(((eq["equity"] - rolling_max) / rolling_max).min())
    hit_rate = (bars_winning / bars_with_position) if bars_with_position > 0 else 0.0

    bh_final = float(bh.iloc[-1])
    bh_cagr = bh_final ** (1 / n_years) - 1
    bh_dd = float(((bh - bh.cummax()) / bh.cummax()).min())

    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.plot(eq.index, eq["equity"], label=f"long-only kNN (k={K_NEIGHBORS}, thr={SIGNAL_THRESHOLD_BPS}bps)", linewidth=1.6)
    ax.plot(eq.index, bh, label="SPY buy & hold", alpha=0.65, linewidth=1.2)
    ax.set_title("SPY long-only paper trader — Cognitum Seed kNN backend")
    ax.set_ylabel("Equity (start = 1.0)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(EQUITY_PNG, dpi=120)
    plt.close(fig)

    pos_dist = eq["position"].value_counts().sort_index().to_dict()
    avg_neighbors = float(eq["spy_neighbors"].mean())

    report = f"""# Neural Trader — SPY Walk-Forward Backtest (LONG-ONLY variant)

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Data:** SPY daily bars, {bars.index[0].date()} → {bars.index[-1].date()} ({len(bars)} bars)
**Embedding:** 8-dim feature vector ({', '.join(FEATURE_COLS)}, bias=1.0), z-scored on warmup window
**Method:** walk-forward, k={K_NEIGHBORS} cosine-NN over historical SPY embeddings only;
mean of neighbor forward returns → **long/flat only** signal (threshold {SIGNAL_THRESHOLD_BPS} bps);
1-day hold; {SLIPPAGE_BPS} bps/side slippage.

## Headline

| Metric | Strategy | SPY buy & hold |
|---|---|---|
| Final equity | **{final:.4f}** | {bh_final:.4f} |
| CAGR | **{cagr * 100:.2f}%** | {bh_cagr * 100:.2f}% |
| Sharpe (daily, ann.) | **{sharpe:.2f}** | — |
| Max drawdown | **{max_dd * 100:.2f}%** | {bh_dd * 100:.2f}% |
| Hit rate (bar-days) | **{hit_rate * 100:.2f}%** | — |
| Position flips | {flip_count} | — |
| Bars in market | {bars_with_position} / {len(eq)} | — |
| Insufficient-neighbors bars | {insufficient_neighbors} | — |
| Avg SPY neighbors / query | {avg_neighbors:.2f} | — |

![equity curve](equity_curve_long_only.png)

## Position distribution

| position | bars |
|---|---|
{chr(10).join(f"| {k:+d} | {v} |" for k, v in pos_dist.items())}

## Notes

- Vectors written to seed under id range `[{SPY_ID_BASE:_}, {SPY_ID_BASE + len(scaled):_})`.
- The neural-trader cog was stopped during this run to keep the store quiet.
- Pre-existing seed vectors (sensor data + v1 SPY range at 10_000_000_000) excluded by post-filtering on id range.
- Query oversampling: k={QUERY_K} from store, then filter to SPY range, then take top {K_NEIGHBORS}.
- This is a backtest. No money at risk. Standard caveats: in-sample scaler fit on first 252 bars,
  no transaction cost beyond {SLIPPAGE_BPS} bps slippage, no shorting (long-only), no dividend handling
  (close prices are auto-adjusted by yfinance).
"""
    REPORT_MD.write_text(report)

    print(f"      report: {REPORT_MD}")
    print(f"      equity curve: {EQUITY_PNG}")
    print(f"      equity csv: {EQUITY_CSV}")
    print()
    print(f"=== HEADLINE ===")
    print(f"strategy: equity {final:.4f}, CAGR {cagr*100:.2f}%, Sharpe {sharpe:.2f}, MaxDD {max_dd*100:.2f}%, hit {hit_rate*100:.2f}%")
    print(f"buy&hold: equity {bh_final:.4f}, CAGR {bh_cagr*100:.2f}%, MaxDD {bh_dd*100:.2f}%")


if __name__ == "__main__":
    main()

"""
SPY walk-forward paper-trading backtest using the Cognitum Seed
RVF vector store as the kNN backend.

Variant v2: LONG-ONLY + 5 bps threshold + 200-DAY REGIME FEATURE.

Compared to backtest_long_only.py, this variant:
  - Replaces the constant `bias` slot (d8) with a z-scored 200-day regime
    feature: (close - SMA_200) / SMA_200. This gives kNN a way to match
    "bull dip" to "bull dip" rather than "any dip".
  - Keeps total embedding dim at 8 (matches seed RVF store).
  - Uses a fresh SPY_ID_BASE to avoid colliding with v1/v2_long_only vectors.
  - Writes to separate output files so prior runs are preserved.

Run from this dir with the venv:
    .venv/bin/python backtest_v2_regime.py
"""

from __future__ import annotations

import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from embedding import FEATURE_COLS, compute_raw_features
from store_client import StoreClient
from yfinance_loader import load_spy

# ------------------------------------------------------------------ config

SPY_ID_BASE = 12_000_000_000        # fresh range for this variant
WARMUP_BARS = 252                   # ~1 trading year before the strategy starts
K_NEIGHBORS = 10
QUERY_K = 2_000
MIN_NEIGHBORS = 3
SIGNAL_THRESHOLD_BPS = 5
SLIPPAGE_BPS = 1
START_DATE = "2018-01-01"

# 8-dim layout: 7 original features + 1 regime feature (no bias slot)
EXT_FEATURE_COLS = FEATURE_COLS + ["regime_200ma"]
assert len(EXT_FEATURE_COLS) == 8

OUT_DIR = Path(__file__).parent
EQUITY_CSV = OUT_DIR / "equity_v2_regime.csv"
EQUITY_PNG = OUT_DIR / "equity_curve_v2_regime.png"
REPORT_MD = OUT_DIR / "report_v2_regime.md"


# ------------------------------------------------------------------ main

def main() -> None:
    print(f"[1/6] Loading SPY daily bars from Yahoo (start={START_DATE})…")
    bars = load_spy(start=START_DATE)
    print(f"      bars: {len(bars)}, range: {bars.index[0].date()} → {bars.index[-1].date()}")

    print("[2/6] Computing features (7 base + 1 regime)…")
    raw = compute_raw_features(bars)
    sma_200 = bars["Close"].rolling(200).mean()
    raw["regime_200ma"] = (bars["Close"] - sma_200) / sma_200
    raw = raw.dropna()
    bars = bars.loc[raw.index]
    print(f"      after dropna: {len(raw)} bars (200-day MA needs 200-bar warmup)")

    if len(raw) < WARMUP_BARS + 30:
        raise SystemExit("Not enough data for warmup + meaningful test")

    print(f"[3/6] Fitting scaler on warmup window (first {WARMUP_BARS} bars)…")
    scaler_mean = raw[EXT_FEATURE_COLS].iloc[:WARMUP_BARS].mean()
    scaler_std = raw[EXT_FEATURE_COLS].iloc[:WARMUP_BARS].std()
    scaled = raw.copy()
    scaled[EXT_FEATURE_COLS] = (raw[EXT_FEATURE_COLS] - scaler_mean) / scaler_std

    forward_ret = np.log(bars["Close"]).diff().shift(-1)

    client = StoreClient()
    print(f"      seed status: {client.status()}")

    label_lookup: dict[int, float] = {}

    print(f"[4/6] Backfilling {WARMUP_BARS} warmup vectors into the seed…")
    backfill: list[tuple[int, list[float]]] = []
    for i in range(WARMUP_BARS):
        vec = scaled.iloc[i][EXT_FEATURE_COLS].to_numpy(dtype=float).tolist()
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

    last_idx = len(scaled) - 1
    for i in range(WARMUP_BARS, last_idx):
        bar_id = SPY_ID_BASE + i
        vec = scaled.iloc[i][EXT_FEATURE_COLS].to_numpy(dtype=float).tolist()
        if any(np.isnan(v) for v in vec):
            records.append(
                {"date": scaled.index[i], "equity": equity, "position": position,
                 "mean_pred": np.nan, "spy_neighbors": 0, "regime": np.nan}
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

        # LONG-ONLY (carry-over from v1 long-only)
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
             "mean_pred": mean_pred, "spy_neighbors": len(spy_neighbors),
             "regime": float(raw["regime_200ma"].iloc[i])}
        )

        client.ingest([(bar_id, vec)], dedup=False)
        if not pd.isna(forward_ret.iloc[i]):
            label_lookup[bar_id] = float(forward_ret.iloc[i])

        if (i - WARMUP_BARS) % 100 == 0:
            elapsed = time.time() - t0
            print(f"      bar {i}  date={scaled.index[i].date()}  "
                  f"eq={equity:.4f}  pos={position:+d}  knn_hits={len(spy_neighbors)}  "
                  f"reg={raw['regime_200ma'].iloc[i]:+.3f}  ({elapsed:.1f}s)")

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
    ax.plot(eq.index, eq["equity"], label=f"long-only kNN +regime (k={K_NEIGHBORS}, thr={SIGNAL_THRESHOLD_BPS}bps)", linewidth=1.6)
    ax.plot(eq.index, bh, label="SPY buy & hold", alpha=0.65, linewidth=1.2)
    ax.set_title("SPY long-only paper trader + 200d regime — Cognitum Seed kNN backend")
    ax.set_ylabel("Equity (start = 1.0)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(EQUITY_PNG, dpi=120)
    plt.close(fig)

    pos_dist = eq["position"].value_counts().sort_index().to_dict()
    avg_neighbors = float(eq["spy_neighbors"].mean())

    report = f"""# Neural Trader — SPY Walk-Forward Backtest (v2: long-only + 200d regime)

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Data:** SPY daily bars, {bars.index[0].date()} → {bars.index[-1].date()} ({len(bars)} bars)
**Embedding:** 8-dim feature vector — 7 base ({', '.join(FEATURE_COLS)}) + **regime_200ma** = (close − SMA_200)/SMA_200, all z-scored on warmup window. Bias slot dropped to fit dim=8.
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

![equity curve](equity_curve_v2_regime.png)

## Position distribution

| position | bars |
|---|---|
{chr(10).join(f"| {k:+d} | {v} |" for k, v in pos_dist.items())}

## Notes

- Vectors written to seed under id range `[{SPY_ID_BASE:_}, {SPY_ID_BASE + len(scaled):_})`.
- The neural-trader cog was stopped during this run.
- Pre-existing seed vectors (sensor + v1 SPY at 10B + v1.5 long-only SPY at 11B) excluded by id-range filter.
- Query oversampling: k={QUERY_K} from store, then filter to SPY range, then take top {K_NEIGHBORS}.
- The regime feature is dimensionless (% deviation from 200-day MA), then z-scored on the 252-bar warmup window.
- This is a backtest. No money at risk.
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

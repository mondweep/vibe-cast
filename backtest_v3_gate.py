"""
SPY walk-forward paper-trading backtest — variant v3: REGIME GATE.

The cleanest test of the regime hypothesis:
  - kNN distance still uses the same 7 short-term features + bias (8-dim) as v1.5
  - Reuses v1.5's already-ingested SPY vectors at id base 11_000_000_000
    (no new ingest — same neighbor pool, exactly apples-to-apples vs v1.5)
  - Computes regime_200ma = (close - SMA_200) / SMA_200 separately
  - Decision rule: position = +1 iff mean_pred > 5 bps AND regime_200ma > 0
                   else position = 0
  - Long-only, no shorting

Run from this dir with the venv:
    .venv/bin/python backtest_v3_gate.py
"""

from __future__ import annotations

import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from embedding import FEATURE_COLS, apply_scaler, compute_raw_features, fit_scaler
from store_client import StoreClient

# yfinance_loader.py / spy_daily.csv cache became dataless on disk; fetch fresh.
import yfinance as yf

def load_spy(start: str):
    spy = yf.download("SPY", start=start, auto_adjust=True, progress=False)
    if spy.columns.nlevels > 1:
        spy.columns = spy.columns.droplevel(-1)
    return spy

# ------------------------------------------------------------------ config

SPY_ID_BASE = 11_000_000_000        # reuse v1.5's already-ingested vectors
WARMUP_BARS = 252
K_NEIGHBORS = 10
QUERY_K = 2_000
MIN_NEIGHBORS = 3
SIGNAL_THRESHOLD_BPS = 5
SLIPPAGE_BPS = 1
START_DATE = "2018-01-01"

OUT_DIR = Path(__file__).parent
EQUITY_CSV = OUT_DIR / "equity_v3_gate.csv"
EQUITY_PNG = OUT_DIR / "equity_curve_v3_gate.png"
REPORT_MD = OUT_DIR / "report_v3_gate.md"


# ------------------------------------------------------------------ main

def main() -> None:
    print(f"[1/5] Loading SPY daily bars from Yahoo (start={START_DATE})…")
    bars = load_spy(start=START_DATE)
    print(f"      bars: {len(bars)}, range: {bars.index[0].date()} → {bars.index[-1].date()}")

    print("[2/5] Computing features (same as v1.5) + regime_200ma (separate)…")
    raw = compute_raw_features(bars).dropna()       # 20-day dropna only, like v1.5
    bars = bars.loc[raw.index]
    sma_200 = bars["Close"].rolling(200).mean()
    regime = (bars["Close"] - sma_200) / sma_200    # NaN for first ~180 entries; OK
    print(f"      after dropna: {len(raw)} bars; regime non-NaN from index "
          f"{int((~regime.isna()).idxmax() == regime.index[0]) and 0 or regime.notna().argmax()}")

    if len(raw) < WARMUP_BARS + 30:
        raise SystemExit("Not enough data for warmup + meaningful test")

    scaler = fit_scaler(raw.iloc[:WARMUP_BARS])
    scaled = apply_scaler(raw, scaler)

    forward_ret = np.log(bars["Close"]).diff().shift(-1)

    client = StoreClient()
    print(f"      seed status: {client.status()}")

    # Build label_lookup from existing labels (forward returns by id) — same logic
    # as v1.5 since vectors at 11B+i correspond to scaled.iloc[i].
    label_lookup: dict[int, float] = {}
    for i in range(len(scaled)):
        bar_id = SPY_ID_BASE + i
        if not pd.isna(forward_ret.iloc[i]):
            label_lookup[bar_id] = float(forward_ret.iloc[i])
    print(f"[3/5] Built label_lookup for {len(label_lookup)} bars (no re-ingest needed; reusing v1.5 vectors)")

    print(f"[4/5] Walk-forward {WARMUP_BARS}…{len(scaled) - 2}…")
    equity = 1.0
    position = 0
    flip_count = 0
    bars_with_position = 0
    bars_winning = 0
    insufficient_neighbors = 0
    gated_off = 0       # times kNN said long but regime gate said no
    knn_fired = 0       # times kNN said long (before gate)

    threshold = SIGNAL_THRESHOLD_BPS / 1e4
    records: list[dict] = []
    t0 = time.time()

    last_idx = len(scaled) - 1
    for i in range(WARMUP_BARS, last_idx):
        bar_id = SPY_ID_BASE + i
        vec = scaled.iloc[i][FEATURE_COLS + ["bias"]].to_numpy(dtype=float).tolist()
        if any(np.isnan(v) for v in vec):
            records.append(
                {"date": scaled.index[i], "equity": equity, "position": position,
                 "mean_pred": np.nan, "spy_neighbors": 0, "regime": np.nan,
                 "knn_long": False, "gated": False}
            )
            continue

        neighbors = client.query(vec, k=QUERY_K)
        spy_neighbors = [n for n in neighbors if SPY_ID_BASE <= n["id"] < bar_id][:K_NEIGHBORS]

        if len(spy_neighbors) >= MIN_NEIGHBORS:
            fwd = [label_lookup[n["id"]] for n in spy_neighbors if n["id"] in label_lookup]
            fwd = [r for r in fwd if not pd.isna(r)]
            mean_pred = float(np.mean(fwd)) if fwd else 0.0
        else:
            mean_pred = 0.0
            insufficient_neighbors += 1

        knn_says_long = mean_pred > threshold
        if knn_says_long:
            knn_fired += 1

        regime_today = float(regime.iloc[i]) if not pd.isna(regime.iloc[i]) else 0.0
        gate_open = regime_today > 0.0

        if knn_says_long and gate_open:
            desired = +1
        else:
            desired = 0

        if knn_says_long and not gate_open:
            gated_off += 1

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
             "regime": regime_today, "knn_long": knn_says_long,
             "gated": (knn_says_long and not gate_open)}
        )

        if (i - WARMUP_BARS) % 100 == 0:
            elapsed = time.time() - t0
            print(f"      bar {i}  date={scaled.index[i].date()}  "
                  f"eq={equity:.4f}  pos={position:+d}  reg={regime_today:+.3f}  "
                  f"knn_hits={len(spy_neighbors)}  ({elapsed:.1f}s)")

    print(f"[5/5] Generating report…")
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
    ax.plot(eq.index, eq["equity"],
            label=f"v3 long-only kNN + 200d gate (k={K_NEIGHBORS}, thr={SIGNAL_THRESHOLD_BPS}bps)",
            linewidth=1.6)
    ax.plot(eq.index, bh, label="SPY buy & hold", alpha=0.65, linewidth=1.2)
    ax.set_title("SPY long-only paper trader + regime gate — Cognitum Seed kNN backend")
    ax.set_ylabel("Equity (start = 1.0)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(EQUITY_PNG, dpi=120)
    plt.close(fig)

    pos_dist = eq["position"].value_counts().sort_index().to_dict()
    avg_neighbors = float(eq["spy_neighbors"].mean())
    gate_pct = (gated_off / knn_fired * 100) if knn_fired > 0 else 0.0

    report = f"""# Neural Trader — SPY Walk-Forward Backtest (v3: regime gate)

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Data:** SPY daily bars, {bars.index[0].date()} → {bars.index[-1].date()} ({len(bars)} bars)
**Embedding:** 8-dim — same 7 short-term features + bias as v1.5 (regime stays OUT of cosine).
**Method:** walk-forward, k={K_NEIGHBORS} cosine-NN over historical SPY embeddings only;
mean of neighbor 1-day forward returns → kNN long signal (threshold {SIGNAL_THRESHOLD_BPS} bps);
**regime gate**: long position only if mean_pred > {SIGNAL_THRESHOLD_BPS} bps **AND** (close − SMA_200)/SMA_200 > 0;
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
| Times kNN signaled long | {knn_fired} | — |
| Times gate vetoed long | {gated_off} ({gate_pct:.1f}% of kNN longs) | — |

![equity curve](equity_curve_v3_gate.png)

## Position distribution

| position | bars |
|---|---|
{chr(10).join(f"| {k:+d} | {v} |" for k, v in pos_dist.items())}

## Notes

- No re-ingest: this run reuses v1.5's already-ingested vectors at id range
  `[{SPY_ID_BASE:_}, {SPY_ID_BASE + len(scaled):_})`. Same kNN neighbor pool as v1.5
  at every step → the only difference vs v1.5 is the regime gate.
- The neural-trader cog was stopped during this run.
- Query oversampling: k={QUERY_K}, then filter to SPY id range, then take top {K_NEIGHBORS}.
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
    print(f"gate: kNN signaled long {knn_fired}x, gate vetoed {gated_off}x ({gate_pct:.1f}%)")


if __name__ == "__main__":
    main()

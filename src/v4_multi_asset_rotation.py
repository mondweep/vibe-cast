"""
Multi-asset rotation backtest using the Cognitum Seed RVF store
as a per-asset kNN backend.

Variant v4: rotate among SPY, QQQ, IEF, GLD (and cash) using each asset's
own kNN history. Each day:

  for each asset in {SPY, QQQ, IEF, GLD}:
      vec = embed(asset_today)
      neighbors = kNN_query(vec, filter to this asset's id range)
      mean_pred[asset] = mean(neighbor forward returns)

  winner = argmax(mean_pred)
  if mean_pred[winner] > 5 bps:
      hold winner
  else:
      hold cash

Each asset gets its own ID range:
  SPY: 13_000_000_000 + i
  QQQ: 14_000_000_000 + i
  IEF: 15_000_000_000 + i
  GLD: 16_000_000_000 + i

Run from project root with the venv:
    PYTHONPATH=src .venv/bin/python src/v4_multi_asset_rotation.py
"""

from __future__ import annotations

import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import yfinance as yf

from embedding import FEATURE_COLS, apply_scaler, compute_raw_features, fit_scaler
from store_client import StoreClient

# ------------------------------------------------------------------ config

ASSETS = {
    "SPY": 13_000_000_000,
    "QQQ": 14_000_000_000,
    "IEF": 15_000_000_000,
    "GLD": 16_000_000_000,
}

WARMUP_BARS = 252
K_NEIGHBORS = 10
QUERY_K = 2_000
MIN_NEIGHBORS = 3
SIGNAL_THRESHOLD_BPS = 5
SLIPPAGE_BPS = 1
START_DATE = "2018-01-01"

OUT_DIR = Path(__file__).resolve().parent.parent / "results" / "v4_multi_asset_rotation"
OUT_DIR.mkdir(parents=True, exist_ok=True)
EQUITY_CSV = OUT_DIR / "equity.csv"
EQUITY_PNG = OUT_DIR / "equity_curve.png"
REPORT_MD = OUT_DIR / "report.md"


# ------------------------------------------------------------------ helpers

def load_asset(symbol: str, start: str) -> pd.DataFrame:
    """Fetch one asset's daily OHLCV from yfinance, return a clean DataFrame."""
    bars = yf.download(symbol, start=start, auto_adjust=True, progress=False)
    if hasattr(bars.columns, "nlevels") and bars.columns.nlevels > 1:
        bars.columns = bars.columns.droplevel(-1)
    return bars


# ------------------------------------------------------------------ main

def main() -> None:
    print(f"[1/6] Loading {len(ASSETS)} assets from Yahoo (start={START_DATE})…")
    raw_bars: dict[str, pd.DataFrame] = {}
    for sym in ASSETS:
        bars = load_asset(sym, START_DATE)
        raw_bars[sym] = bars
        print(f"      {sym}: {len(bars)} bars, {bars.index[0].date()} → {bars.index[-1].date()}")

    # Align to common trading days across all assets
    common_index = None
    for sym, bars in raw_bars.items():
        common_index = bars.index if common_index is None else common_index.intersection(bars.index)
    aligned: dict[str, pd.DataFrame] = {sym: bars.loc[common_index] for sym, bars in raw_bars.items()}
    print(f"      common trading days: {len(common_index)}")

    print("[2/6] Computing 8-dim features per asset…")
    raw_features: dict[str, pd.DataFrame] = {}
    bars_per_asset: dict[str, pd.DataFrame] = {}
    for sym, bars in aligned.items():
        raw = compute_raw_features(bars).dropna()
        raw_features[sym] = raw
        bars_per_asset[sym] = bars.loc[raw.index]

    # Re-align across assets after each asset's dropna
    common_after_dropna = None
    for sym, raw in raw_features.items():
        common_after_dropna = raw.index if common_after_dropna is None else common_after_dropna.intersection(raw.index)
    raw_features = {sym: raw.loc[common_after_dropna] for sym, raw in raw_features.items()}
    bars_per_asset = {sym: b.loc[common_after_dropna] for sym, b in bars_per_asset.items()}
    print(f"      common bars after dropna: {len(common_after_dropna)}")

    if len(common_after_dropna) < WARMUP_BARS + 30:
        raise SystemExit("Not enough data for warmup + meaningful test")

    print(f"[3/6] Fitting scaler per asset on warmup window (first {WARMUP_BARS} bars)…")
    scaled: dict[str, pd.DataFrame] = {}
    forward_ret: dict[str, pd.Series] = {}
    for sym, raw in raw_features.items():
        scaler = fit_scaler(raw.iloc[:WARMUP_BARS])
        scaled[sym] = apply_scaler(raw, scaler)
        forward_ret[sym] = np.log(bars_per_asset[sym]["Close"]).diff().shift(-1)

    client = StoreClient()
    print(f"      seed status total_vectors: {client.status().get('total_vectors')}")

    label_lookup: dict[int, float] = {}

    print(f"[4/6] Backfilling {WARMUP_BARS} warmup vectors per asset…")
    for sym, id_base in ASSETS.items():
        backfill: list[tuple[int, list[float]]] = []
        for i in range(WARMUP_BARS):
            vec = scaled[sym].iloc[i][FEATURE_COLS + ["bias"]].to_numpy(dtype=float).tolist()
            if any(np.isnan(v) for v in vec):
                continue
            bar_id = id_base + i
            backfill.append((bar_id, vec))
            if not pd.isna(forward_ret[sym].iloc[i]):
                label_lookup[bar_id] = float(forward_ret[sym].iloc[i])
        for j in range(0, len(backfill), 250):
            client.ingest(backfill[j : j + 250], dedup=False)
        print(f"      {sym}: ingested {len(backfill)} warmup vectors")

    print(f"[5/6] Walk-forward {WARMUP_BARS}…{len(common_after_dropna) - 2}…")
    equity = 1.0
    held: str | None = None  # symbol or None for cash
    flip_count = 0
    bars_with_position = 0
    bars_winning = 0
    pos_counts: dict[str, int] = {sym: 0 for sym in ASSETS}
    pos_counts["cash"] = 0
    insufficient_neighbors = 0

    threshold = SIGNAL_THRESHOLD_BPS / 1e4
    records: list[dict] = []
    t0 = time.time()

    last_idx = len(common_after_dropna) - 1
    for i in range(WARMUP_BARS, last_idx):
        # Build query vector + run kNN for each asset
        mean_preds: dict[str, float] = {}
        neighbor_counts: dict[str, int] = {}
        for sym, id_base in ASSETS.items():
            vec = scaled[sym].iloc[i][FEATURE_COLS + ["bias"]].to_numpy(dtype=float).tolist()
            if any(np.isnan(v) for v in vec):
                mean_preds[sym] = float("nan")
                neighbor_counts[sym] = 0
                continue
            bar_id = id_base + i
            neighbors = client.query(vec, k=QUERY_K)
            asset_neighbors = [n for n in neighbors if id_base <= n["id"] < bar_id][:K_NEIGHBORS]
            neighbor_counts[sym] = len(asset_neighbors)
            if len(asset_neighbors) >= MIN_NEIGHBORS:
                fwd = [label_lookup[n["id"]] for n in asset_neighbors if n["id"] in label_lookup]
                fwd = [r for r in fwd if not pd.isna(r)]
                mean_preds[sym] = float(np.mean(fwd)) if fwd else 0.0
            else:
                mean_preds[sym] = 0.0
                insufficient_neighbors += 1

        # Pick winner: highest mean_pred, must clear threshold
        valid = {s: p for s, p in mean_preds.items() if not np.isnan(p)}
        if valid:
            winner = max(valid, key=valid.get)
            desired = winner if valid[winner] > threshold else None
        else:
            desired = None

        if desired != held:
            equity *= 1 - SLIPPAGE_BPS / 1e4
            flip_count += 1
        held = desired

        # P&L from holding `held` until tomorrow's close
        if held is not None:
            actual_fwd = forward_ret[held].iloc[i]
            if not pd.isna(actual_fwd):
                pnl = float(actual_fwd)
                equity *= 1 + pnl
                bars_with_position += 1
                if pnl > 0:
                    bars_winning += 1
            pos_counts[held] += 1
        else:
            pos_counts["cash"] += 1

        records.append({
            "date": common_after_dropna[i],
            "equity": equity,
            "held": held if held is not None else "cash",
            **{f"mean_pred_{s}": mean_preds[s] for s in ASSETS},
        })

        # Append today's vector to each asset's store, with its label
        for sym, id_base in ASSETS.items():
            vec = scaled[sym].iloc[i][FEATURE_COLS + ["bias"]].to_numpy(dtype=float).tolist()
            if any(np.isnan(v) for v in vec):
                continue
            bar_id = id_base + i
            client.ingest([(bar_id, vec)], dedup=False)
            if not pd.isna(forward_ret[sym].iloc[i]):
                label_lookup[bar_id] = float(forward_ret[sym].iloc[i])

        if (i - WARMUP_BARS) % 100 == 0:
            elapsed = time.time() - t0
            held_label = held if held is not None else "cash"
            print(f"      bar {i}  date={common_after_dropna[i].date()}  "
                  f"eq={equity:.4f}  held={held_label}  ({elapsed:.1f}s)")

    print(f"[6/6] Generating report…")
    eq = pd.DataFrame(records).set_index("date")
    eq.to_csv(EQUITY_CSV)

    # Buy & hold benchmarks for each asset over the same window
    bh_curves: dict[str, pd.Series] = {}
    for sym in ASSETS:
        c = bars_per_asset[sym]["Close"].loc[eq.index]
        bh_curves[sym] = c / float(c.iloc[0])

    daily_ret = eq["equity"].pct_change().fillna(0)
    n_years = max(len(eq) / 252, 1e-9)
    final = float(eq["equity"].iloc[-1])
    cagr = final ** (1 / n_years) - 1
    sharpe = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 0 else 0.0
    rolling_max = eq["equity"].cummax()
    max_dd = float(((eq["equity"] - rolling_max) / rolling_max).min())
    hit_rate = (bars_winning / bars_with_position) if bars_with_position > 0 else 0.0

    spy_bh_final = float(bh_curves["SPY"].iloc[-1])
    spy_bh_cagr = spy_bh_final ** (1 / n_years) - 1
    spy_bh_dd = float(((bh_curves["SPY"] - bh_curves["SPY"].cummax()) / bh_curves["SPY"].cummax()).min())

    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.plot(eq.index, eq["equity"],
            label=f"v4 multi-asset rotation (k={K_NEIGHBORS}, thr={SIGNAL_THRESHOLD_BPS}bps)",
            linewidth=1.8, color="black")
    for sym, curve in bh_curves.items():
        ax.plot(eq.index, curve, label=f"{sym} buy & hold", alpha=0.55, linewidth=1.0)
    ax.set_title("Multi-asset rotation paper trader — Cognitum Seed kNN backend")
    ax.set_ylabel("Equity (start = 1.0)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(EQUITY_PNG, dpi=120)
    plt.close(fig)

    pos_dist_str = "\n".join(f"| {k} | {v} |" for k, v in pos_counts.items())
    avg_neighbors = float(np.mean([
        eq[c].mean() for c in eq.columns if c.startswith("mean_pred_")
    ])) if False else None  # placeholder; kept minimal

    report = f"""# Neural Trader — v4: multi-asset rotation

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Universe:** {', '.join(ASSETS.keys())} + cash
**Data:** daily bars, {eq.index[0].date()} → {eq.index[-1].date()} ({len(eq)} walk-forward bars)
**Embedding:** 8-dim per asset (same 7 base features + bias as v1.5), z-scored on each asset's own warmup window.
**Method:** at each bar, query each asset's own kNN history (filter to per-asset id range), take winner = argmax(mean_pred);
hold winner if mean_pred > {SIGNAL_THRESHOLD_BPS} bps else cash. 1-day hold; {SLIPPAGE_BPS} bps/side slippage.

## Headline

| Metric | Strategy | SPY buy & hold |
|---|---|---|
| Final equity | **{final:.4f}** | {spy_bh_final:.4f} |
| CAGR | **{cagr * 100:.2f}%** | {spy_bh_cagr * 100:.2f}% |
| Sharpe (daily, ann.) | **{sharpe:.2f}** | — |
| Max drawdown | **{max_dd * 100:.2f}%** | {spy_bh_dd * 100:.2f}% |
| Hit rate (bar-days) | **{hit_rate * 100:.2f}%** | — |
| Position flips | {flip_count} | — |
| Bars in market | {bars_with_position} / {len(eq)} | — |
| Insufficient-neighbors events | {insufficient_neighbors} | — |

![equity curve](equity_curve.png)

## Position distribution

| held | bars |
|---|---|
{pos_dist_str}

## Notes

- Vectors written to seed under id ranges: {', '.join(f'{s}=[{b:_}, {b + len(common_after_dropna):_})' for s, b in ASSETS.items())}.
- Cog `neural-trader` was stopped during this run.
- Each asset's kNN searches only its own history (id-range filtering on cosine query results).
- Cash position earns 0% per bar (no money-market proxy); a real implementation would substitute SHV/BIL.
"""
    REPORT_MD.write_text(report)

    print(f"      report: {REPORT_MD}")
    print(f"      equity curve: {EQUITY_PNG}")
    print(f"      equity csv: {EQUITY_CSV}")
    print()
    print("=== HEADLINE ===")
    print(f"strategy: equity {final:.4f}, CAGR {cagr*100:.2f}%, Sharpe {sharpe:.2f}, MaxDD {max_dd*100:.2f}%, hit {hit_rate*100:.2f}%")
    print(f"SPY B&H:  equity {spy_bh_final:.4f}, CAGR {spy_bh_cagr*100:.2f}%, MaxDD {spy_bh_dd*100:.2f}%")
    print(f"position breakdown: {pos_counts}")


if __name__ == "__main__":
    main()

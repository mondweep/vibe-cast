"""
Neural Trader v5: DCA-friendly multi-asset rotation.

Designed for a real UK retail investor who deposits a fixed £ amount every
month into a Stocks & Shares ISA. Same kNN engine as v4, same universe
(SPY, QQQ, IEF, GLD + cash), but:

  - One signal evaluation per month (every ~21 trading days), not daily
  - Hold the chosen asset for the full month — no daily flipping
  - Each month: deposit £CONTRIBUTION_GBP cash, then rebalance into
    the kNN winner

This dramatically cuts position flips (≈87 vs v4's 1306) and the
slippage drag along with them.

Reuses v4's already-ingested vectors at id bases 13B/14B/15B/16B —
no re-ingest, just queries. Runs in ~30 seconds.

Run:
    PYTHONPATH=src .venv/bin/python src/v5_dca_monthly.py
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

# Universe — same as v4
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

REBALANCE_EVERY_BARS = 21      # ~one calendar month
TARGET_MONTHS = 60             # headline "5-year DCA" window for the report
CONTRIBUTION_GBP = 100         # base monthly deposit; results scale linearly

OUT_DIR = Path(__file__).resolve().parent.parent / "results" / "v5_dca_monthly"
OUT_DIR.mkdir(parents=True, exist_ok=True)
EQUITY_CSV = OUT_DIR / "equity.csv"
EQUITY_PNG = OUT_DIR / "equity_curve.png"
REPORT_MD = OUT_DIR / "report.md"


def load_asset(symbol: str, start: str) -> pd.DataFrame:
    bars = yf.download(symbol, start=start, auto_adjust=True, progress=False)
    if hasattr(bars.columns, "nlevels") and bars.columns.nlevels > 1:
        bars.columns = bars.columns.droplevel(-1)
    return bars


def main() -> None:
    print(f"[1/5] Loading {len(ASSETS)} assets…")
    raw_bars: dict[str, pd.DataFrame] = {}
    for sym in ASSETS:
        raw_bars[sym] = load_asset(sym, START_DATE)
        print(f"      {sym}: {len(raw_bars[sym])} bars")

    common_index = None
    for bars in raw_bars.values():
        common_index = bars.index if common_index is None else common_index.intersection(bars.index)
    aligned = {sym: bars.loc[common_index] for sym, bars in raw_bars.items()}
    print(f"      common bars: {len(common_index)}")

    print("[2/5] Computing features per asset…")
    raw_features: dict[str, pd.DataFrame] = {}
    bars_per_asset: dict[str, pd.DataFrame] = {}
    for sym, bars in aligned.items():
        raw = compute_raw_features(bars).dropna()
        raw_features[sym] = raw
        bars_per_asset[sym] = bars.loc[raw.index]

    common_after = None
    for raw in raw_features.values():
        common_after = raw.index if common_after is None else common_after.intersection(raw.index)
    raw_features = {sym: r.loc[common_after] for sym, r in raw_features.items()}
    bars_per_asset = {sym: b.loc[common_after] for sym, b in bars_per_asset.items()}
    print(f"      bars after dropna: {len(common_after)}")

    scaled: dict[str, pd.DataFrame] = {}
    forward_ret: dict[str, pd.Series] = {}
    for sym, raw in raw_features.items():
        scaler = fit_scaler(raw.iloc[:WARMUP_BARS])
        scaled[sym] = apply_scaler(raw, scaler)
        forward_ret[sym] = np.log(bars_per_asset[sym]["Close"]).diff().shift(-1)

    client = StoreClient()
    print(f"      seed status total_vectors: {client.status().get('total_vectors')}")

    # Reconstruct label_lookup from current data — must align exactly with v4's
    # ingestion (same START_DATE, same dropna, same indices).
    label_lookup: dict[int, float] = {}
    for sym, id_base in ASSETS.items():
        for i in range(len(scaled[sym])):
            bar_id = id_base + i
            if not pd.isna(forward_ret[sym].iloc[i]):
                label_lookup[bar_id] = float(forward_ret[sym].iloc[i])

    last_idx = len(common_after) - 1
    full_rebalance_bars = list(range(WARMUP_BARS, last_idx, REBALANCE_EVERY_BARS))
    print(f"[3/5] Walking forward over {len(full_rebalance_bars)} months (full history)…")

    threshold = SIGNAL_THRESHOLD_BPS / 1e4

    def run_dca(rebalance_bars: list[int], contribution: float):
        """Run the v5 simulation over the given list of rebalance bar indices."""
        portfolio = 0.0
        held: str | None = None
        total_contributed = 0.0
        flip_count = 0
        pos_counts_local: dict[str, int] = {sym: 0 for sym in ASSETS}
        pos_counts_local["cash"] = 0
        records_local: list[dict] = []

        for k, rebar in enumerate(rebalance_bars):
            portfolio += contribution
            total_contributed += contribution

            mean_preds: dict[str, float] = {}
            for sym, id_base in ASSETS.items():
                vec = scaled[sym].iloc[rebar][FEATURE_COLS + ["bias"]].to_numpy(dtype=float).tolist()
                if any(np.isnan(v) for v in vec):
                    mean_preds[sym] = float("nan")
                    continue
                bar_id = id_base + rebar
                neighbors = client.query(vec, k=QUERY_K)
                asset_neighbors = [n for n in neighbors if id_base <= n["id"] < bar_id][:K_NEIGHBORS]
                if len(asset_neighbors) >= MIN_NEIGHBORS:
                    fwd = [label_lookup[n["id"]] for n in asset_neighbors if n["id"] in label_lookup]
                    fwd = [r for r in fwd if not pd.isna(r)]
                    mean_preds[sym] = float(np.mean(fwd)) if fwd else 0.0
                else:
                    mean_preds[sym] = 0.0

            valid = {s: p for s, p in mean_preds.items() if not np.isnan(p)}
            if valid and max(valid.values()) > threshold:
                winner = max(valid, key=lambda s: valid[s])
            else:
                winner = None

            if winner != held:
                portfolio *= (1 - SLIPPAGE_BPS / 1e4)
                flip_count += 1
            else:
                portfolio -= contribution * SLIPPAGE_BPS / 1e4
            held = winner

            end_bar = min(rebar + REBALANCE_EVERY_BARS, last_idx)
            for d in range(rebar, end_bar):
                if held is not None:
                    fr = forward_ret[held].iloc[d]
                    if not pd.isna(fr):
                        portfolio *= (1 + float(fr))

            if held is not None:
                pos_counts_local[held] += 1
            else:
                pos_counts_local["cash"] += 1

            records_local.append({
                "date": common_after[rebar],
                "month_idx": k,
                "portfolio": portfolio,
                "total_contributed": total_contributed,
                "held": held if held else "cash",
            })

        return records_local, flip_count, pos_counts_local

    # Run the full-history simulation
    records, flip_count, pos_counts = run_dca(full_rebalance_bars, CONTRIBUTION_GBP)
    portfolio = records[-1]["portfolio"]
    total_contributed = records[-1]["total_contributed"]
    held = records[-1]["held"]
    print(f"      full-history: {len(records)} months, final £{portfolio:.2f}, contributed £{total_contributed:.0f}")

    # Run the most-recent-60-months simulation (clean DCA over last TARGET_MONTHS)
    if len(full_rebalance_bars) >= TARGET_MONTHS:
        recent_bars = full_rebalance_bars[-TARGET_MONTHS:]
        records_60, flip_count_60, pos_counts_60 = run_dca(recent_bars, CONTRIBUTION_GBP)
        portfolio_60 = records_60[-1]["portfolio"]
        contributed_60 = records_60[-1]["total_contributed"]
        print(f"      60-month subset: final £{portfolio_60:.2f}, contributed £{contributed_60:.0f}")
    else:
        records_60 = records
        portfolio_60 = portfolio
        contributed_60 = total_contributed
        flip_count_60 = flip_count
        pos_counts_60 = pos_counts

    print(f"[4/5] Computing benchmarks…")

    def run_dca_buy_only(rebalance_bars: list[int], asset_weights: dict[str, float], contribution: float):
        """Simple DCA into fixed-weight basket; no selling, just monthly buys."""
        balances: dict[str, float] = {sym: 0.0 for sym in asset_weights}
        records_local = []
        for rebar in rebalance_bars:
            for sym, w in asset_weights.items():
                balances[sym] += contribution * w * (1 - SLIPPAGE_BPS / 1e4)
            end_bar = min(rebar + REBALANCE_EVERY_BARS, last_idx)
            for d in range(rebar, end_bar):
                for sym in asset_weights:
                    fr = forward_ret[sym].iloc[d]
                    if not pd.isna(fr):
                        balances[sym] *= (1 + float(fr))
            records_local.append({"date": common_after[rebar], "value": sum(balances.values())})
        return records_local

    spy_dca_records = run_dca_buy_only(full_rebalance_bars, {"SPY": 1.0}, CONTRIBUTION_GBP)
    sf_records = run_dca_buy_only(full_rebalance_bars, {"SPY": 0.60, "IEF": 0.40}, CONTRIBUTION_GBP)

    # 60-month-window benchmarks
    if len(full_rebalance_bars) >= TARGET_MONTHS:
        recent_bars = full_rebalance_bars[-TARGET_MONTHS:]
        spy_dca_60 = run_dca_buy_only(recent_bars, {"SPY": 1.0}, CONTRIBUTION_GBP)[-1]["value"]
        sf_60 = run_dca_buy_only(recent_bars, {"SPY": 0.60, "IEF": 0.40}, CONTRIBUTION_GBP)[-1]["value"]
    else:
        spy_dca_60 = spy_dca_records[-1]["value"]
        sf_60 = sf_records[-1]["value"]

    print(f"[5/5] Generating report…")

    eq = pd.DataFrame(records).set_index("date")
    eq["spy_dca"] = pd.DataFrame(spy_dca_records).set_index("date")["value"]
    eq["sixty_forty"] = pd.DataFrame(sf_records).set_index("date")["value"]
    eq.to_csv(EQUITY_CSV)

    n_months = len(eq)
    final_v5 = float(eq["portfolio"].iloc[-1])
    final_spy = float(eq["spy_dca"].iloc[-1])
    final_sf = float(eq["sixty_forty"].iloc[-1])
    contrib_total = float(eq["total_contributed"].iloc[-1])

    # 60-month-specific results
    n_60 = min(TARGET_MONTHS, n_months)
    contrib_60 = CONTRIBUTION_GBP * n_60
    final_v5_60 = portfolio_60
    final_spy_60 = spy_dca_60
    final_sf_60 = sf_60

    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.plot(eq.index, eq["portfolio"], label=f"v5 monthly DCA rotation (£{CONTRIBUTION_GBP}/mo)",
            linewidth=2.0, color="black")
    ax.plot(eq.index, eq["spy_dca"], label="SPY-only DCA (no selling)", alpha=0.75, linewidth=1.3, color="tab:blue")
    ax.plot(eq.index, eq["sixty_forty"], label="60/40 SPY+IEF DCA (no rebalance)", alpha=0.75, linewidth=1.3, color="tab:orange")
    ax.plot(eq.index, eq["total_contributed"], label="Total contributed", alpha=0.6, linewidth=1.0,
            linestyle=":", color="grey")
    ax.set_title(f"v5 monthly DCA rotation vs simple DCA benchmarks (£{CONTRIBUTION_GBP}/month, full history)")
    ax.set_ylabel("Portfolio value (£)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(EQUITY_PNG, dpi=120)
    plt.close(fig)

    # Scaled scenarios — for 60-month window (the user-relevant horizon)
    scenarios = [100, 300, 500]
    scenario_rows_60 = ""
    for s in scenarios:
        scale = s / CONTRIBUTION_GBP
        c60 = contrib_60 * scale
        scenario_rows_60 += (
            f"| £{s} | £{c60:>8,.0f} | "
            f"**£{final_v5_60 * scale:>10,.0f}** | "
            f"£{final_spy_60 * scale:>10,.0f} | "
            f"£{final_sf_60 * scale:>10,.0f} | "
            f"£{(final_v5_60 - contrib_60) * scale:>+10,.0f} |\n"
        )

    pos_table = "\n".join(f"| {k} | {v} |" for k, v in pos_counts.items())

    report = f"""# Neural Trader — v5: DCA-friendly monthly rotation

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Universe:** {', '.join(ASSETS.keys())} + cash
**Cadence:** monthly (every ~{REBALANCE_EVERY_BARS} trading days)
**Data window:** {eq.index[0].date()} → {eq.index[-1].date()} ({n_months} months)
**Engine:** identical to v4 — same 8-dim embedding, k=10, 5 bps threshold, winner-take-all kNN.
**Difference vs v4:** rebalance once per month instead of once per day.

## Headline — most recent 60 months (5 years)

This is the answer to "if I started DCA today minus 60 months, what would I have now?". Base £{CONTRIBUTION_GBP}/month:

| Metric | v5 rotation | SPY-only DCA | 60/40 DCA |
|---|---|---|---|
| Months | {n_60} | {n_60} | {n_60} |
| Total contributed | £{contrib_60:,.0f} | £{contrib_60:,.0f} | £{contrib_60:,.0f} |
| Final portfolio | **£{final_v5_60:,.2f}** | £{final_spy_60:,.2f} | £{final_sf_60:,.2f} |
| Total profit | £{final_v5_60 - contrib_60:+,.2f} | £{final_spy_60 - contrib_60:+,.2f} | £{final_sf_60 - contrib_60:+,.2f} |
| Profit / contributed | **{(final_v5_60 / contrib_60 - 1) * 100:.1f}%** | {(final_spy_60 / contrib_60 - 1) * 100:.1f}% | {(final_sf_60 / contrib_60 - 1) * 100:.1f}% |

## Full history reference (base £{CONTRIBUTION_GBP}/mo, all {n_months} months)

| Metric | v5 rotation | SPY-only DCA | 60/40 DCA |
|---|---|---|---|
| Final | £{final_v5:,.2f} | £{final_spy:,.2f} | £{final_sf:,.2f} |
| Profit | £{final_v5 - contrib_total:+,.2f} | £{final_spy - contrib_total:+,.2f} | £{final_sf - contrib_total:+,.2f} |
| Profit / contributed | {(final_v5 / contrib_total - 1) * 100:.1f}% | {(final_spy / contrib_total - 1) * 100:.1f}% | {(final_sf / contrib_total - 1) * 100:.1f}% |
| Position flips | {flip_count} of {n_months} | 0 (DCA, no sells) | 0 |

![equity curve](equity_curve.png)

## Scaled scenarios — 60-month window

Linearly scaled monthly contribution, same 5-year window:

| Monthly £ | Total contributed | v5 final | SPY-only DCA | 60/40 DCA | v5 profit |
|---|---|---|---|---|---|
{scenario_rows_60}

## Position distribution (months held)

| held | months |
|---|---|
{pos_table}

## Notes

- Reuses v4's already-ingested vectors at id bases 13B/14B/15B/16B — no re-ingest.
- {flip_count} rebalance flips total vs v4's 1306. Slippage drag ≈ {(1 - (1 - SLIPPAGE_BPS/1e4)**flip_count) * 100:.1f}% cumulative (vs v4's ~12.2%).
- Cash earns 0% in this backtest. A real ISA holding cash gets ~3-5% via SHV/BIL or money-market funds in 2026 — adds ~0.3-0.5% to the v5 result.
- This is a backtest. Past performance is not a guarantee of future results. The data window happens to include an unusually strong bull market plus the AI rally. The next 60 months could be different.
"""
    REPORT_MD.write_text(report)

    print()
    print("=== HEADLINE — most recent 60 months (base £100/month) ===")
    print(f"  v5 final:    £{final_v5_60:>10,.2f}  (contributed £{contrib_60:,.0f}, profit £{final_v5_60 - contrib_60:+,.2f})")
    print(f"  SPY DCA:     £{final_spy_60:>10,.2f}  (profit £{final_spy_60 - contrib_60:+,.2f})")
    print(f"  60/40 DCA:   £{final_sf_60:>10,.2f}  (profit £{final_sf_60 - contrib_60:+,.2f})")
    print()
    print("=== Full-history reference (base £100/month, {} months) ===".format(n_months))
    print(f"  v5 final:    £{final_v5:>10,.2f}  (contributed £{contrib_total:,.0f}, profit £{final_v5 - contrib_total:+,.2f})")
    print(f"  SPY DCA:     £{final_spy:>10,.2f}  (profit £{final_spy - contrib_total:+,.2f})")
    print(f"  60/40 DCA:   £{final_sf:>10,.2f}  (profit £{final_sf - contrib_total:+,.2f})")
    print(f"  position flips: {flip_count} of {n_months} months")
    print()
    print("=== Scaled scenarios (60-month window) ===")
    for s in scenarios:
        scale = s / CONTRIBUTION_GBP
        print(f"  £{s}/mo → contributed £{contrib_60*scale:,.0f}"
              f"  v5: £{final_v5_60*scale:,.0f}"
              f"  SPY: £{final_spy_60*scale:,.0f}"
              f"  60/40: £{final_sf_60*scale:,.0f}")


if __name__ == "__main__":
    main()

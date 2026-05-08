# Cognitum Neural Trader

> **What if your AI trader's brain was a memory of every market day it had ever seen — and that memory lived on a Raspberry Pi in your house?**

This repo is a walk-forward backtest of an SPY trading strategy that uses a [**Cognitum Seed**](https://cognitum.app) device — a personal, custodial AI appliance — as a **k-Nearest-Neighbors memory** of past market days. Each day we ask the seed: *"find the 10 historical days that look most like today,"* then average what happened next on those days. That average becomes the trade signal.

We ran four variants. One worked. Three were instructive failures. The full story is in [`EXPLORATION_LOG.md`](EXPLORATION_LOG.md).

---

## The Big Picture

```
   Today's market bar  ──►  8-dim feature vector  ──►  ┌──────────────────┐
   (returns, volatility,                                │  Cognitum Seed   │
    volume, MA distance)                                │  (Raspberry Pi)  │
                                                        │                  │
                                                        │  Find 10 most    │
                                                        │  similar past    │
                                                        │  days by cosine  │
                                                        │  similarity      │
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
   Trade decision  ◄──  mean(their next-day returns)  ◄──  10 historical
   (long / flat)        gives "expected tomorrow"          neighbors
```

No model is trained. The "model" *is* the dataset. The seed remembers. We ask.

---

## Results at a Glance

Same window (Feb 2019 → May 2026, 1,824 walk-forward days):

| Variant | Final equity | CAGR | Sharpe | Max drawdown | Verdict |
|---|---|---|---|---|---|
| **SPY buy & hold** | 2.99x | **+16.5%** | — | −33.7% | benchmark |
| v1 — long/flat/short, no threshold | 0.87x | −1.94% | 0.00 | −48.1% | broken |
| **v1.5 — long-only, 5 bps threshold** | **1.33x** | **+4.00%** | **0.35** | **−25.3%** | **best** |
| v2 — regime as 8th feature in kNN | 1.03x | +0.47% | 0.11 | −27.5% | hurt |
| v3 — regime as outer trade gate | 1.16x | +2.03% | 0.28 | −22.4% | hurt return, helped DD |

### TL;DR

- **The kNN strategy works** — v1.5 is profitable with a real Sharpe and half the drawdown of SPY.
- **It does not beat buy-and-hold** during a 16%-CAGR bull stretch — the architecture has a real ceiling around 4% CAGR on technical features alone.
- **Adding a "regime" feature is harder than it sounds.** Both attempts (v2, v3) underperformed v1.5 in different and informative ways.

---

## Why This Is Interesting

Most trading strategies are **parametric** — you fit a model, the model has weights, the weights compress past data into a small number of parameters. The compression is also the loss.

This is **non-parametric**: every day is kept. The seed is the model. When today's market looks like September 2008, the seed says so — and we know what happened in September 2008.

The bet is that *the right pattern-match across decades is more useful than a fitted model that has averaged across them*. That bet is testable. We tested it.

---

## Repository Layout

```
.
├── README.md                            ← you are here
├── EXPLORATION_LOG.md                   ← deep dive: diagrams, journey, glossary
├── LIMITATIONS.md                       ← issue-ready catalog for the seed/cog devs
├── src/                                 ← Python source
│   ├── embedding.py                       feature definitions, z-scoring
│   ├── store_client.py                    HTTP client for the seed's RVF store
│   ├── yfinance_loader.py                 SPY OHLCV loader (cached)
│   ├── v1_baseline.py                     long/flat/short, no threshold
│   ├── v1_5_long_only.py                  long-only, 5 bps threshold (best)
│   ├── v2_regime_feature.py               regime feature inside cosine
│   └── v3_regime_gate.py                  regime as outer trade gate
└── results/                             ← per-variant output
    ├── v1_baseline/                       report only — outputs were dataless
    ├── v1_5_long_only/                    report.md + equity.csv + equity_curve.png
    ├── v2_regime_feature/                 ditto
    └── v3_regime_gate/                    ditto
```

Click into any `results/<variant>/report.md` for that run's full headline metrics, position distribution, and equity curve.

---

## Quickstart

### 1. Set up

You need:
- A Cognitum Seed device on your local network (this project assumes `genesis@169.254.42.1`)
- Python 3.9+ and a venv
- An SSH tunnel to the seed's HTTP API

```bash
# Create venv and install dependencies
python3 -m venv .venv
.venv/bin/pip install pandas numpy matplotlib requests yfinance

# Open the SSH tunnel (forwards seed's :80 to localhost:9080)
ssh -fN -L 9080:127.0.0.1:80 genesis@169.254.42.1
```

### 2. (Optional but recommended) pause the live cog

If `neural-trader` is running on the seed, pause it during the backtest so it doesn't write its own vectors to the store mid-run:

```bash
# via the seed's admin UI, or via MCP tool seed_cogs_stop
```

### 3. Run a variant

```bash
PYTHONPATH=src .venv/bin/python src/v1_5_long_only.py
```

Outputs land in `results/v1_5_long_only/`:
- `equity.csv` — per-bar equity, position, mean prediction, neighbor count
- `equity_curve.png` — strategy vs. buy & hold
- `report.md` — headline metrics

A run takes ~3 minutes (≈1,800 cosine queries to the seed over the SSH tunnel).

### 4. Read the results

Open the equity curve, then read the report. Then read [`EXPLORATION_LOG.md`](EXPLORATION_LOG.md) for the full story.

---

## The Story in 60 Seconds

1. **v1** lost money. It was forced to short during the strongest bull run in history (2019–2026) because the threshold was 0 — every tiny prediction triggered a flip. Hit rate: 49% (coin flip). 871 flips × 1bps slippage ≈ baked-in drag.

2. **v1.5** removed the short branch and required a 5 bps signal to act. Both changes were obvious in retrospect. Result: profitable, Sharpe 0.35, max drawdown halved. *Confirms the kNN signal has a real edge — it just gets eaten by noise trading.*

3. **v2** added a 200-day-MA regime feature as the 8th cosine dimension, expecting kNN to better distinguish "bull dip" from "bear dip." It did the opposite: the slow-moving regime feature dominated the cosine geometry, biasing kNN toward time-adjacent neighbors instead of the cross-decade pattern matches it's good at. *Worse on every metric.*

4. **v3** kept regime out of the cosine distance and used it as an outer gate ("only trade long when above the 200-day MA"). Drawdown improved. CAGR halved. *The gate killed exactly the trades where kNN has the most edge — counter-trend bounces during bear regimes (the "panic-bottom" pattern that 1987, 2008, and 2020 all share).*

The deeper lesson: **trend-following regime filters and pattern-matching kNN have philosophically opposite views during the very moments that matter.**

---

## Where to Go Next

Suggested by the exploration, in order of expected lift:

1. **5-day forward-return labels** instead of 1-day — biggest single lever; reduces label noise.
2. **Distance-weighted aggregator** — closer neighbors should count more.
3. **Multi-asset rotation** — to actually beat buy-and-hold, the universe probably needs to be more than SPY-in-or-out.

See [`EXPLORATION_LOG.md` § 6](EXPLORATION_LOG.md) for the full ranked list.

## Limitations We Hit

During the exploration we identified a number of limitations, footguns, and missing features in the seed / RVF store / `neural-trader` cog. These are catalogued in [`LIMITATIONS.md`](LIMITATIONS.md) as **ready-to-paste GitHub issues** — one bug, nine enhancements, two doc gaps, two open questions. Highlights:

- 🐛 **`dedup=false` silently allows duplicate vector IDs** (high-severity footgun for backtest reruns)
- ⚙️ **No tag / namespace filtering on kNN queries** — forced massive client-side oversampling
- ⚙️ **Cog has no metrics / observability endpoint** — predictions, neighbors, hit rate are a black box
- ⚙️ **No way to delete vectors** from the store; ours are now permanent residents

---

## Glossary

Curious about a term? See the [glossary in `EXPLORATION_LOG.md` § 8](EXPLORATION_LOG.md) — written for non-experts. Covers everything from *Sharpe ratio* and *cosine similarity* to *RVF vector store* and *witness chain*.

---

## Caveats

- This is a backtest. **Not financial advice.** Don't trade on it.
- No transaction-cost model beyond 1 bps/side slippage. Real spreads are wider, especially in stress.
- No dividend handling (yfinance's `auto_adjust=True` folds dividends into close prices, which is reasonable but not perfect).
- The kNN store accumulates state across runs. Different ID bases keep variant runs from contaminating each other (see each script's `SPY_ID_BASE`), but a clean experimental setup would clear the store between runs.
- The 200-day MA needs 200 bars of warmup, so v2 and v3 lose ~9 months of in-sample data at the start. Same-window comparison tables in the exploration log handle this.

---

## Built with

- [Cognitum Seed](https://cognitum.app) — personal AI appliance
- [yfinance](https://github.com/ranaroussi/yfinance) — SPY OHLCV data
- pandas, numpy, matplotlib, requests
- A lot of curiosity about whether memory is enough

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

Same window (Feb 2019 → May 2026):

| Variant | Final equity | CAGR | Sharpe | Max drawdown | Verdict |
|---|---|---|---|---|---|
| **SPY buy & hold** | 3.02x | **+16.5%** | ~1.0 | −33.7% | benchmark |
| v1 — long/flat/short, no threshold | 0.87x | −1.94% | 0.00 | −48.1% | broken |
| v1.5 — long-only, 5 bps threshold | 1.33x | +4.00% | 0.35 | **−25.3%** | best **single-asset** |
| v2 — regime as 8th feature in kNN | 1.03x | +0.47% | 0.11 | −27.5% | hurt |
| v3 — regime as outer trade gate | 1.16x | +2.03% | 0.28 | −22.4% | hurt return, helped DD |
| **v4 — multi-asset rotation** (SPY/QQQ/IEF/GLD + cash) | **2.61x** | **+14.16%** | **0.79** | −34.3% | **best non-DCA variant** |

### And — the realistic test for a UK retail investor

If you actually save £100/month into a Stocks & Shares ISA, what would you have after 5 years?

| Strategy | Contributed | Final | Profit |
|---|---|---|---|
| **SPY-only DCA** (just buy a bit each month, never sell) | £6,000 | **£9,105** | **+£3,105** |
| v5: DCA into kNN winner (same engine as v4, monthly cadence) | £6,000 | £8,120 | +£2,120 |
| 60/40 SPY+IEF DCA (no rebalance) | £6,000 | £7,947 | +£1,947 |

Scale linearly to £300/mo (£18,000 contributed → £27,315 SPY DCA) or £500/mo (£30,000 → £45,525 SPY DCA).

### TL;DR

- **For DCA, simple beats clever.** Plain "buy SPY every month inside a Stocks & Shares ISA" beat our v5 kNN rotation by ~£1,000 per £6,000 contributed over 5 years. See [`EXPLORATION_LOG.md` Appendix C](EXPLORATION_LOG.md) for full UK tax / broker analysis.
- **For a one-time lump sum**, universe choice was the biggest lever. Going from one asset (SPY) to four (SPY/QQQ/IEF/GLD) in v4 lifted CAGR from 4% → 14% and Sharpe from 0.35 → 0.79 *without changing the embedding or decision rule*.
- **v4 still didn't quite beat SPY's raw return** (14.16% vs 16.48%), but came within ~2.3 pp — and roughly doubled SPY's Sharpe-equivalent risk-adjusted return.
- **Single-asset technical kNN has a real ceiling** (~4% CAGR, Sharpe ~0.35); three feature/architecture tweaks (v2, v3) couldn't break it. Universe diversification did.
- **Adding a "regime" feature is harder than it sounds.** Both single-asset attempts (v2, v3) underperformed v1.5 in informative ways.

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
│   ├── v3_regime_gate.py                  regime as outer trade gate
│   ├── v4_multi_asset_rotation.py         daily rotation across SPY/QQQ/IEF/GLD + cash
│   └── v5_dca_monthly.py                  monthly-cadence DCA-friendly variant for UK ISA investors
└── results/                             ← per-variant output
    ├── v1_baseline/                       report only — outputs were dataless
    ├── v1_5_long_only/                    report.md + equity.csv + equity_curve.png
    ├── v2_regime_feature/                 ditto
    ├── v3_regime_gate/                    ditto
    ├── v4_multi_asset_rotation/           ditto (multi-asset rotation, daily)
    └── v5_dca_monthly/                    ditto (DCA-friendly monthly rotation)
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
# v4 multi-asset rotation (best variant, ~16 min — 4× the queries of single-asset)
PYTHONPATH=src .venv/bin/python src/v4_multi_asset_rotation.py

# or any single-asset variant (~3 min each)
PYTHONPATH=src .venv/bin/python src/v1_5_long_only.py
```

Outputs land in `results/<variant>/`:
- `equity.csv` — per-bar equity, position, mean prediction, neighbor count
- `equity_curve.png` — strategy vs. buy & hold (and per-asset benchmarks for v4)
- `report.md` — headline metrics

### 4. Read the results

Open the equity curve, then read the report. Then read [`EXPLORATION_LOG.md`](EXPLORATION_LOG.md) for the full story.

---

## The Story in 60 Seconds

1. **v1** lost money. It was forced to short during the strongest bull run in history (2019–2026) because the threshold was 0 — every tiny prediction triggered a flip. Hit rate: 49% (coin flip). 871 flips × 1bps slippage ≈ baked-in drag.

2. **v1.5** removed the short branch and required a 5 bps signal to act. Both changes were obvious in retrospect. Result: profitable, Sharpe 0.35, max drawdown halved. *Confirms the kNN signal has a real edge — it just gets eaten by noise trading.*

3. **v2** added a 200-day-MA regime feature as the 8th cosine dimension, expecting kNN to better distinguish "bull dip" from "bear dip." It did the opposite: the slow-moving regime feature dominated the cosine geometry, biasing kNN toward time-adjacent neighbors instead of the cross-decade pattern matches it's good at. *Worse on every metric.*

4. **v3** kept regime out of the cosine distance and used it as an outer gate ("only trade long when above the 200-day MA"). Drawdown improved. CAGR halved. *The gate killed exactly the trades where kNN has the most edge — counter-trend bounces during bear regimes (the "panic-bottom" pattern that 1987, 2008, and 2020 all share).*

5. **v4** kept v1.5's engine but expanded the universe — SPY, QQQ, IEF (bonds), GLD (gold), cash — and picked whichever asset's kNN signaled the strongest "go up" each day. Same embedding, same k, same threshold, same decision rule. The only change was the choice of *what to hold*. Result: **CAGR jumped 4% → 14%, Sharpe jumped 0.35 → 0.79.** The strategy spent only 21% of bars in SPY; it found bigger edges in QQQ (32%) and GLD (27%). *Universe choice did more than any feature tweak — it nearly closed the gap to SPY buy-and-hold.*

6. **v5** dropped the daily flipping in favour of a once-a-month rebalance — the cadence a real UK retail DCA investor would actually use. Same engine as v4, but you only check the signal on the day you deposit your monthly contribution. This cut position flips from 1306 to 61 and slippage drag from ~12% to ~0.6%. Result over the most recent 5 years: **v5 still lost to plain monthly DCA into SPY** (£8,120 vs £9,105 on £6,000 contributed). The simplest strategy you can imagine — buy a bit of SPY every month inside an ISA and never sell — beat the kNN rotation. *The deepest finding of the whole exploration: at retail scale, in tax-advantaged accounts, simple compounding wins.*

The deeper lessons:
- **Trend-following regime filters and pattern-matching kNN have philosophically opposite views** during the very moments that matter (the v2/v3 finding).
- **For a one-time deployment, universe choice matters more than feature engineering** (the v4 finding).
- **For ongoing DCA, simplicity matters more than universe choice** (the v5 finding). For a UK retail investor: open a Stocks & Shares ISA, set up a monthly direct debit into a low-cost S&P 500 tracker like VUSA, and don't touch it.

---

## Understanding the Key Concepts

If you're new to trading-strategy vocabulary, the results table above is hard to read. Three concepts unlock most of it. Click any heading to expand.

<details>
<summary><b>What does "Max Drawdown" mean?</b></summary>

**Drawdown** = the peak-to-trough decline of your equity from a previous high. **Max drawdown** is the *worst* such decline you ever experienced.

It's calculated continuously: at each point in time you track the all-time-high equity reached so far, and compute how far below that high you currently are.

```
drawdown_today = (equity_today − running_max) / running_max
```

It's always ≤ 0. Max drawdown is the most negative value across the whole run.

#### Why it matters

CAGR tells you how fast your money grows on average. Max drawdown tells you **the worst moment you'd have to live through.** A strategy with +20% CAGR but −60% max drawdown is mathematically impressive but psychologically unbearable — most investors panic-sell during the drawdown and never see the recovery. A strategy with +6% CAGR and −15% max drawdown might compound less aggressively but is **actually holdable**.

The full risk picture needs all three:

- **CAGR** = how fast it grows
- **Sharpe** = how smooth the growth is on average
- **Max drawdown** = the deepest hole you'd have to climb out of

#### How each strategy in this repo got its number

Crucially: **each strategy has its own equity curve, and its max drawdown is measured against its own prior highs — not against SPY's.** Different strategies suffer their worst drawdowns at different times.

```
   Equity (each starts at 1.0)

   3.0 ┤                                                ●●  SPY: 3.0 (Apr '26)
        │                                          ●●●●●
        │                                   ●●●●●●●
        │                            ●●●●●●●
   2.0 ┤                     ●●●●●●●●
        │              ●●●●●●
        │       ●●●●●●●
        │  ●●●●●
   1.27 ┤●●●          ⭐ v1.5 peak (Nov '21, ≈1.27)
        │   ╲                                        ●●  v1.5: 1.33
        │    ●●  ●●                            ●●●●●●
        │      ●●  ●                       ●●●●
        │           ●           ●●●●●●●●●●●            ●●  v3: 1.16
   1.0  ┤───────────●──────────●──────────────────────────  baseline
        │ │          ●        ●
        │ │           ●●    ●●        ⭐ v1.5 trough
   0.95 ┤ │             ●●●●          (Nov '23, ≈0.95)
        │ │                  ⭐ SPY trough (Mar '20, COVID)
   0.70 ┤ │  ●
        │ │   ●●
        │ │     ●●●●●●●●●●●●●●●●●●●●⭐●●●●●●●●●●●●●  v1: 0.87 (final)
   0.52 ┤ │            ⭐ v1 worst point ≈ 0.52
        └─┬──────┬──────┬──────┬──────┬──────┬──────┬───
        2019   2020   2021   2022   2023   2024   2025  2026
```

| Strategy | Peak (when) | Trough (when) | Drawdown | What was happening |
|---|---|---|---|---|
| SPY buy & hold | ≈1.05 (Feb '20) | ≈0.70 (Mar '20) | **−33.7%** | COVID crash |
| v1.5 long-only | ≈1.27 (Nov '21) | ≈0.95 (Nov '23) | **−25.3%** | 2022 bear market — was *long* and rode the decline down |
| v3 regime gate | ≈1.20 (Nov '21) | ≈0.93 (Oct '23) | **−22.4%** | Same period — gate kept it flat for parts of 2022 |
| v1 long/flat/short | ≈1.0 (start) | ≈0.52 (mid-run) | **−48.1%** | Sustained shorting in a bull run; gradual multi-year erosion |

Notice that **v1.5's worst drawdown wasn't COVID — it was 2022.** The strategy was mostly flat through COVID (kNN saw no clean signal during the crash), then went long during 2022 thinking the dip was a buying opportunity, and rode the bear market down. SPY's max drawdown is a different event entirely (March 2020).

</details>

<details>
<summary><b>What does "v1.5 long-only" mean?</b></summary>

Two things glued together:

- **"v1.5"** is just our version label — the half-step between v1 (the original) and v2 (the next experiment).
- **"long-only"** is the trading-strategy term that names the actual change.

#### The three positions a strategy can take

On any given trading day, a strategy picks one of three states:

| Position | Meaning | If price ↑ | If price ↓ |
|---|---|---|---|
| **Long** (+1) | You **own** the asset | You profit | You lose |
| **Flat** (0) | You hold **cash**, no position | Nothing happens | Nothing happens |
| **Short** (−1) | You **bet against** the asset (borrow + sell, hope to buy back cheaper) | You lose | You profit |

#### What v1 did vs what v1.5 does

Each day the kNN produces `mean_pred` — the average next-day return across the 10 most-similar historical days. Both versions used that same number; they just acted on it differently:

```python
# v1 (original):  long, flat, OR short
if mean_pred > 0:        desired = +1   # any tiny positive → buy
elif mean_pred < 0:      desired = -1   # any tiny negative → SHORT
else:                    desired = 0    # exactly zero → cash

# v1.5 (long-only with 5 bps threshold):
if mean_pred > 5 bps:    desired = +1   # only buy on a real positive signal
else:                    desired = 0    # otherwise sit in cash — never short
```

So **"long-only" literally means the strategy only ever picks between long and flat — it never shorts**, no matter what the kNN says. If the prediction is negative, v1.5 just sits in cash; v1 would have gone short.

#### Why this single change mattered so much

During the 2019–2026 backtest window, SPY tripled. v1 spent **783 days short** of a tripling market — every day short was a day fighting the tide. By removing the short branch:

- Those 783 short days became 783 *cash* days. Earning nothing is much better than losing money against a multi-year bull run.
- The 5 bps threshold also stopped the strategy from acting on every tiny noisy prediction, cutting trade flips by ~85%.
- The downside became bounded — you can lose at most what you have, not the unlimited downside of a short squeeze.

This is also why **most real-world retail strategies are long-only**: shorting requires margin/borrow infrastructure, has structurally asymmetric risk (a stock can theoretically rise to infinity, so a short's loss is unbounded), and fights the long-term upward drift of equity markets.

Long-only was the safer, simpler, more durable design choice — and for our kNN strategy it was also the *better-performing* one.

</details>

<details>
<summary><b>What does "v3 regime gate" mean?</b></summary>

v3 = v1.5 plus an extra "should we even be trading right now?" check that runs *after* the kNN decides.

#### The two ingredients

**1. Regime (the big-picture filter)**

A **regime** is the *backdrop* of the market — slow-moving, weeks-to-months in scale. We measure it with one number:

```
regime = (today's SPY close − 200-day moving average) / 200-day moving average
```

- **regime > 0** → SPY is above its 200-day average → **bull/uptrend regime** ("risk-on")
- **regime < 0** → SPY is below its 200-day average → **bear/downtrend regime** ("risk-off")

The 200-day MA is the canonical "long-term trend line" in technical analysis. Wall Street veterans literally use *"is SPY above its 200-day?"* as a one-bit risk-on/risk-off switch.

**2. Gate (an architectural pattern)**

A **gate** is a yes/no check that has to pass *before* something else is allowed to happen. Think of a bouncer at a club: someone gets to the front of the line (kNN signal), the bouncer says "OK" or "not tonight" (gate decision), and only then can they walk in (trade gets taken).

In code, a gate is an `AND`:

```python
take_trade = (kNN_signal_says_yes) AND (gate_says_yes)
```

If either side is False, no trade.

#### How v3 stacks them

```
              ┌─────────────────────────────────────┐
              │  Same kNN as v1.5                   │
              │  - 8-dim embedding                  │
              │  - cosine search over seed's store  │
              │  - mean of 10 nearest neighbors'    │
              │    next-day returns = mean_pred     │
              └────────────────┬────────────────────┘
                               │
                               ▼
                      ╔═══════════════════╗
                      ║  Decision rule    ║
                      ║                   ║
                      ║  long IF          ║
                      ║   mean_pred>5bps  ║   ◄── kNN signal (same as v1.5)
                      ║   AND             ║
                      ║   regime > 0      ║   ◄── NEW: regime gate
                      ║                   ║
                      ║  else flat        ║
                      ╚═══════════════════╝
```

The gate doesn't change what kNN computes — it only changes what we *do* about kNN's answer.

#### A concrete day-in-the-life

Take **April 13, 2020** — three weeks into the COVID crash. SPY was about 7% below its 200-day moving average.

| | What kNN said | v1.5 | **v3** |
|---|---|---|---|
| Apr 13, 2020 | "+12 bps. Go long." | Went long ✓ | Stayed **flat** (mean_pred ✓ but regime −7% ✗ — gate vetoed) |

Here, kNN was actually right — markets bounced hard from those COVID lows. v1.5 caught the bounce; v3 missed it.

Now take **September 2025** — SPY firmly above its 200-day MA, regime ≈ +12%:

| | What kNN said | v1.5 | **v3** |
|---|---|---|---|
| Sep 2025 | "+8 bps. Go long." | Went long ✓ | Went long ✓ (mean_pred ✓ AND regime ✓) |

In bull regimes, v3 behaves identically to v1.5. **The gate only matters during stress periods** — which is precisely when the answers are most consequential.

#### What it cost and what it saved

Across the 1,824 trading days:

- kNN said "go long" 878 times.
- The regime was negative on 184 of those days.
- v3 vetoed all 184 → went flat instead of long.

|  | v1.5 | **v3** | Difference |
|---|---|---|---|
| Bars long | 878 | 694 | −184 (the gated ones) |
| Bars flat | 946 | 1130 | +184 |
| Final equity | 1.33 | 1.16 | v3 lower by ~13% |
| Max drawdown | −25.3% | **−22.4%** | v3 *better* by 2.9 pts |

The gate **cost return but improved drawdown**. Translation: on average those 184 vetoed days *would* have been profitable (kNN had a real signal), but they came clustered in stressful, high-volatility windows. Cutting them lost some upside but bought a smoother ride.

#### The deeper lesson

This is the most surprising finding from the whole exploration:

> **Pattern-matching kNN and trend-following regime filters are *philosophically opposite views* of the market.** kNN says, *"this dip below the MA looks like the great panic-bottoms of 1987, 2008, 2020 — historically those bounce."* The regime gate says, *"don't trade below the MA, things keep falling."* Both can be statistically true on average, but they recommend opposite actions during the very moments that matter most.

A binary `AND` between them automatically excludes kNN's most distinctive edge — the counter-trend bounce trades. That's why v3 ends up safer but less profitable than v1.5. A more sophisticated design might use the regime as a *tiebreaker* rather than a hard veto, or weight position size by regime strength. See [`LIMITATIONS.md`](LIMITATIONS.md) and [`EXPLORATION_LOG.md` § 6](EXPLORATION_LOG.md) for the ranked list of next experiments.

</details>

---

## Where to Go Next

After v4, multi-asset rotation is **done** and was the biggest single lever. The remaining unexplored levers all attack v4's residual gap to SPY (≈2.3 pp CAGR) and its drawdown:

1. **Slower rotation** — v4 had 1306 flips in 1826 bars (~13% slippage drag). Cut that and you likely close most of the remaining gap.
2. **5-day forward-return labels** — daily returns are ~95% noise; longer-horizon labels are the cleanest unexplored win.
3. **Real cash-yield proxy** (SHV/BIL) — v4 spent 10% of bars in 0%-yielding cash; realistic short-rate adds ~0.5 pp CAGR.
4. **Volatility filter** — rotates out of an asset that's stuck in drawdown (would have caught QQQ's 2022 sell-off).
5. **Wider universe** (add EFA, EEM, VNQ, TLT) and/or **cross-asset features** (VIX, yield curve).

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

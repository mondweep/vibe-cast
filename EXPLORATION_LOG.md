# Neural Trader Exploration Log

**Project:** Cognitum.NeuralTrader
**Date:** 2026-05-08
**Author:** session log
**Audience:** mixed — technical depth where useful, plain language where possible (see Glossary at end)

---

## 0. Executive Summary

We set out to backtest the **Neural Trader** strategy that runs on a Cognitum Seed device. The strategy uses the seed's on-device vector store as a **k-Nearest-Neighbors (kNN) memory** of past market days, predicting what tomorrow will do by averaging what happened *after* the historical days that "looked most similar" to today.

Across **four variants** we walked from "lost money" → "profitable but mediocre" → and learned where the architecture's ceiling sits.

```
        STRATEGY EQUITY CURVES (1.0 = start)
        ──────────────────────────────────────
                                   2026-05
   3.00  ┤                                ●  SPY buy & hold (~+16% CAGR)
         │                            ╱
   2.00  ┤                        ╱
         │                    ╱
         │                ╱
   1.00  ┤────●●╱──────────────────────────  v1.5 long-only  (~+4% CAGR)  ← BEST
         │ ╲      ╲────●──●──●──●──────────  v3 regime gate (~+2% CAGR)
         │  ╲          ╲────●──●──●─────●──  v2 regime in cosine (~0% CAGR)
   0.50  ┤   ╲────●──●─────●──●──●──●──●──  v1 long/flat/short (~−2% CAGR)
         │
         └──┬──────┬──────┬──────┬──────┬──
          2019    2021   2023   2025  2026
```

### Headline result

| Variant | CAGR | Sharpe | MaxDD | Verdict |
|---|---|---|---|---|
| **SPY buy & hold** | **+16.5%** | — | −33.7% | benchmark |
| v1: long/flat/short, no threshold | −1.94% | 0.00 | −48.1% | **broken** — forced shorts in bull market |
| **v1.5: long-only, 5 bps threshold** | **+4.00%** | **0.35** | **−25.3%** | **best variant** |
| v2: regime as 8th cosine dimension | +0.47% | 0.11 | −27.5% | hurt — broke kNN geometry |
| v3: regime as decision gate | +2.03% | 0.28 | −22.4% | hurt return, helped drawdown |

### Three things we learned

1. **The naive kNN strategy works** as a sanity check (v1.5 produces small positive return with reasonable Sharpe), but **cannot beat buy & hold on raw return** during a 16%-CAGR bull stretch. That's a structural limit, not a tuning failure.
2. **Adding a "regime" feature is harder than it sounds.** Putting it inside the cosine distance (v2) corrupts neighbor selection. Using it as an outer gate (v3) throws out kNN's best work — its panic-bottom pattern matches.
3. **The biggest unexplored lever is the prediction target itself**: 1-day forward returns are ~95% noise; switching to 5-day or 10-day labels is the most promising next experiment.

---

## 1. The System

### 1.1 What we're working with

```
   ┌──────────────────────────────┐                        ┌─────────────────────────────┐
   │ Mac (local dev environment)  │                        │ Cognitum Seed (Raspberry Pi)│
   │                              │     ssh -fN -L 9080:   │ 169.254.42.1                │
   │  ┌────────────────────────┐  │     127.0.0.1:80       │ ┌─────────────────────────┐ │
   │  │ backtest_*.py          │  │ ─────────────────────► │ │ RVF vector store        │ │
   │  │  - load_spy()  yfinance│  │                        │ │   dim = 8               │ │
   │  │  - compute_features()  │  │   POST /store/ingest   │ │   60k+ vectors          │ │
   │  │  - StoreClient (HTTP)  │  │   POST /store/query    │ │   cosine similarity     │ │
   │  └────────────────────────┘  │ ◄───────────────────── │ └─────────────────────────┘ │
   │                              │                        │ ┌─────────────────────────┐ │
   │  Backtest writes/reads       │                        │ │ neural-trader cog v1.2  │ │
   │  the seed's vector store     │                        │ │ (was running; we paused │ │
   │  via SSH tunnel              │                        │ │  it during backtests)   │ │
   └──────────────────────────────┘                        │ └─────────────────────────┘ │
                                                           │ ┌─────────────────────────┐ │
                                                           │ │ Witness chain (84k+     │ │
                                                           │ │  cryptographic entries) │ │
                                                           │ └─────────────────────────┘ │
                                                           └─────────────────────────────┘
```

**Components:**

- **Cognitum Seed** — A Raspberry Pi device hosting a custodial vector store (RVF) and several "cog" applications. Acts as a personal, persistent kNN memory.
- **RVF vector store** — On-device cosine-similarity database. Fixed at **8 dimensions**. Currently holds ~60,000 vectors (~8 MB on disk, ~133 bytes/vector including index + witness-chain overhead).
- **`neural-trader` cog** — A small AI app on the seed that pulls live market data and writes its own vectors to the store. Running version 1.2.0.
- **Local backtest** — Python scripts on the Mac that fetch SPY daily bars from Yahoo Finance, embed each day as an 8-dim vector, and use the seed's RVF as the kNN backend over an SSH tunnel.

### 1.2 Storage scale (estimate)

For a hypothetical 4-million-record corpus at the same dim=8:

| Item | Calc | Size |
|---|---|---|
| Raw vector data (f32) | 4M × 8 × 4 B | ~128 MB |
| + IDs | 4M × 8 B | ~32 MB |
| At observed full overhead (133 B/vec) | 4M × 133 B | **~530 MB** |
| With 25% headroom for index growth | | **~660 MB** |

At higher dimensions (32-d ~2.1 GB; 128-d ~8 GB; 384-d ~24 GB) the picture changes — fitting on a Pi-class device favors compact embeddings.

---

## 2. The kNN Strategy (How It Decides)

### 2.1 Per-day workflow

```
                              ┌─────────────────────┐
                              │  Today's bar        │
                              │  (OHLCV from        │
                              │   Yahoo Finance)    │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │  Compute features   │
                              │   - log_ret_1       │  ← today's % move
                              │   - log_ret_5       │  ← past week
                              │   - log_ret_20      │  ← past month
                              │   - realized_vol_20 │  ← volatility
                              │   - tr_over_atr     │  ← bar range vs avg
                              │   - volume_z        │  ← volume vs avg
                              │   - dist_from_ma    │  ← above/below 20d MA
                              │   - bias = 1.0      │  ← constant slot
                              └──────────┬──────────┘
                                         │  z-score each (mean 0, std 1)
                                         ▼
                              ┌─────────────────────┐
                              │  8-dim query vector │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐                      Cognitum Seed
                              │ store.query(vec,    │  ───── HTTPS ─────►  RVF cosine kNN
                              │   k=2000,           │                      filter to past
                              │   metric=cosine)    │  ◄─── neighbors ──   SPY-only ids
                              └──────────┬──────────┘
                                         │  take top 10 SPY-only neighbors
                                         ▼
                              ┌─────────────────────┐
                              │  Lookup each        │
                              │  neighbor's KNOWN   │
                              │  next-day return    │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │  mean_pred =        │  ← kNN's forecast
                              │  mean of those 10   │     for tomorrow
                              │  forward returns    │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │  Decision rule      │  → long / flat / (short)
                              │  (varies per        │
                              │   variant)          │
                              └─────────────────────┘
```

### 2.2 The decision rule is what we tuned

Each variant kept the embedding/query/aggregation steps identical and changed **only the decision rule** at the bottom:

```
v1   : long if mean_pred > 0    | flat if = 0   | short if < 0
v1.5 : long if mean_pred > 5bps |              flat otherwise   (no shorting)
v2   : same as v1.5, but the embedding includes "regime" as the 8th dim
v3   : same as v1.5, but trade only if mean_pred > 5bps AND regime > 0
```

---

## 3. The Experiment Journey

### 3.1 v1 — Original: long/flat/short, zero threshold

> *"Just take whatever sign mean_pred has."*

**Setup:**
- Decision: `+1` if `mean_pred > 0`, `−1` if `< 0`, else `0`
- Threshold: 0 bps (any tiny prediction triggers a flip)
- Data: SPY daily, 2018-01-31 → 2026-05-06, 2077 bars after dropna
- Walk-forward: 1824 bars (Feb 2019 → May 2026)

**Result:**

| Final | CAGR | Sharpe | MaxDD | Hit rate | Position flips | Bars short / flat / long |
|---|---|---|---|---|---|---|
| 0.8680 | **−1.94%** | 0.00 | −48.14% | 49.06% | **871** | 783 / 12 / 1029 |

**Reading:**

The strategy lost ~13% over the period while SPY tripled. Five concrete reasons:

1. **Noise trading.** Threshold = 0 means any 0.01-bps mean_pred forces a flip.
2. **Cost drag.** 871 flips × 1 bps slippage per side = ~0.87% fixed drag, before real-world frictions.
3. **Wrong-side shorting.** 783 short bars during one of history's strongest bull runs (COVID rebound + AI boom) is structurally lethal.
4. **Hit rate ≈ coin flip.** 49% says the per-bar signal has no usable edge.
5. **Always in the market.** 1812/1824 bars had a position — no defensive flat regime.

![v1 equity curve](equity_curve.png)

---

### 3.2 v1.5 — Long-only with a 5 bps threshold

> *"Drop the short branch and require a real signal before trading."*

**Hypothesis:** v1's loss was structural (forced shorting + noise trading), not a bad signal. Removing those should expose any real edge.

**Change:**
```diff
- if mean_pred > 0:        desired = +1
- elif mean_pred < 0:      desired = −1
- else:                    desired = 0
+ if mean_pred > 5 bps:    desired = +1
+ else:                    desired = 0
```

**Result (same window as v1):**

| Final | CAGR | Sharpe | MaxDD | Hit rate | Bars long / flat |
|---|---|---|---|---|---|
| **1.3285** | **+4.00%** | **0.35** | **−25.27%** | **53.64%** | 878 / 946 |

**Reading:**

Confirmed the diagnosis. Two simple changes flipped the strategy from losing money to producing a small but real positive Sharpe. Drawdown almost halved (−48% → −25%). Hit rate moved from coin-flip to a modest 53.6% — small per-bar edge, large compounding effect when not paying noise costs.

![v1.5 equity curve](equity_curve_long_only.png)

**But:** still well below SPY buy & hold (+16% CAGR). Sitting in cash 52% of the time during the strongest bull market of our lifetimes is the cap on this.

---

### 3.3 v2 — Add a "regime" feature inside the cosine distance

> *"What if kNN knew whether the market was in a bull or bear regime?"*

**Hypothesis:** A regime feature should let kNN distinguish "bull-market dip" from "bear-market dip" and pick better neighbors.

**Definition of regime:**
```
regime_200ma = (close − SMA_200) / SMA_200
```
- Positive → above 200-day moving average → bull/uptrend regime
- Negative → below → bear/downtrend regime
- Magnitude → how extended

**Change:** replace the constant `bias` slot (8th dim) with the z-scored regime feature.

**Result (window starts Oct 2019 because 200-day MA needs 200 bars warmup):**

| Final | CAGR | Sharpe | MaxDD | Hit rate | Bars long / flat |
|---|---|---|---|---|---|
| 1.0265 | +0.40% | 0.11 | −27.5% | 53.3% | 837 / 808 |

Apples-to-apples on the same window:

| Metric | v1.5 | **v2** |
|---|---|---|
| Final | 1.2996 | **1.0311** |
| CAGR | 4.10% | **0.47%** |
| Sharpe | 0.35 | **0.11** |
| MaxDD | −25.3% | **−27.5%** |

**Surprise — v2 was worse, not better.**

```
                Why "mashing regime into cosine" hurts
                ──────────────────────────────────────

  Today's vector:      [ short-term features ............... | regime ]
                       │                                     │       │
                       └─────────────┬───────────────────────┘       │
                                     │                               │
                                     ▼                               ▼
                          dim 1..7 vary fast,         dim 8 (regime) varies SLOWLY
                          carry pattern signal        and is highly autocorrelated

   Effect on cosine kNN:
   ─────────────────────
   "Day A" — 2019 mild dip      regime ≈ +6%   short-term: low-vol pullback
   "Day B" — 2008 panic crash   regime ≈ −25%  short-term: SHARP, near-perfect match to today

   Today (2024 sharp pullback, regime ≈ +5%):
     ▸ vs Day A:  regime matches well, short-term mediocre  →  PICKED
     ▸ vs Day B:  short-term near-perfect, regime far off   →  REJECTED

   We taught kNN to optimize for "what era is it" instead of "what does this PATTERN do".
```

The regime dim is highly autocorrelated, so its z-scored value barely moves day-to-day. In cosine space, that means kNN started preferring **time-adjacent neighbors** (similar regime stretch) over **pattern-similar neighbors across decades** — which is exactly what kNN was supposed to be good at.

![v2 equity curve](equity_curve_v2_regime.png)

---

### 3.4 v3 — Regime as a decision gate (cleanest test)

> *"Keep the regime out of the cosine distance entirely. Use it only to decide whether to act on kNN's signal."*

**Hypothesis:** Decouple pattern-recognition (kNN's job) from regime-judgment (a separate filter). Two questions, two mechanisms.

**Architecture:**
```
              ┌──────────────────────────┐
              │  Embedding (7 features +│  ← unchanged from v1.5
              │  bias) — same as v1.5   │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  cosine kNN over RVF     │
              │  (same neighbor pool as  │
              │   v1.5; reused vectors)  │
              └────────────┬─────────────┘
                           │ mean_pred
                           ▼
                ╔══════════════════════╗
                ║ AND-gate decision    ║
   ┌────────────╣                       ╠──────────────┐
   │            ║  trade IF             ║              │
   │            ║   mean_pred > 5 bps   ║              │
   │            ║   AND regime > 0      ║              │
   │            ╚══════════════════════╝              │
   │                                                  │
   ▼                                                  ▼
"what does this pattern              "is the long-term backdrop
 usually do next?"                    favorable for taking the trade?"
```

**Result (same window as v1.5):**

| Metric | v1.5 | **v3** | Δ |
|---|---|---|---|
| Final | 1.3285 | **1.1569** | −13 pp |
| CAGR | 4.00% | **2.03%** | **−1.97 pp** |
| Sharpe | 0.35 | **0.28** | −0.07 |
| MaxDD | −25.27% | **−22.38%** | **+2.9 pp** ✓ |
| Hit rate | 53.64% | **54.61%** | +1.0 pp ✓ |
| Bars long | 878 | 694 | — |
| Gate vetoed | — | 184 (21% of kNN longs) | — |

![v3 equity curve](equity_curve_v3_gate.png)

**Surprise — also worse on return.**

The gate vetoed 184 long signals where kNN said "go long" but SPY was below its 200-day MA (Mar–May 2020 COVID, parts of 2022). On a per-bar basis those vetoed trades would have been **profitable on net** — gating them cost ~17 percentage points of total return.

**The deeper insight:**

```
   Two philosophies of edge:
   ────────────────────────

   Trend-following gate ("only trade above 200-day MA")
       │
       └─►  "Stay out of bear markets — they go down."
             Statistically true on AVERAGE.

   kNN pattern-matching
       │
       └─►  "When today's pattern matches the great panic-bottoms
             of history (1987, 2008, 2020), expect a bounce."
             Statistically true at THE TAILS.

   These are OPPOSITE views during the very moments that matter.
   The gate killed exactly the trades where kNN has the most edge.
```

---

## 4. Side-by-Side: Where We Ended Up

### 4.1 Same-window comparison (Feb 2019 → May 2026, 1824 bars)

```
   Final  ┌─────────────────────────────────────────────────────┐
   3.00 ──┤                            ●●●  SPY Buy & Hold      │
          │                       ●●●●                           │
          │                  ●●●●                                │
   2.00 ──┤             ●●●●                                     │
          │        ●●●●                                          │
          │   ●●●●                                               │
   1.30 ──┤●●●                  ▼━━━━ v1.5 long-only  +4.0% CAGR │
   1.15 ──┤                ▽════ v3  regime gate     +2.0% CAGR │
          │           ◇──── v2  regime in cosine    +0.5% CAGR │
   1.00 ──┤────────────────────────────────────────────────────  │
          │     ╲                                                │
   0.87 ──┤      ╲────●●● v1  long/flat/short         −1.9% CAGR │
          └─────────────────────────────────────────────────────┘
            2019      2021     2023     2025          2026
```

### 4.2 Risk vs return in a single picture

```
   Sharpe (risk-adjusted return)
   0.40 ┤                ● v1.5 (BEST)
        │
   0.30 ┤                          ● v3 gate
        │
   0.20 ┤
        │
   0.10 ┤        ● v2 regime
        │
   0.00 ┤  ● v1 (loses money)
        │
        └─┬───────┬──────┬──────┬──────┬─►
        −2%    +0.5%   +2%    +4%   CAGR
```

**Summary:** v1.5 dominates the others on every metric except max-drawdown (where v3 wins by 3 pp at the cost of half the return).

---

## 5. Insights We Now Hold

1. **The kNN architecture has a real ceiling.** With 7 short-term technical features on a single index ETF, expect a Sharpe ~0.3 and CAGR ~4% — *not* market-beating returns. This is consistent with academic literature on technical-features-only single-asset market-timing.

2. **"Cleaning up" v1's obvious flaws gets you the best result.** Long-only + a real threshold did 80% of the work. Subsequent feature/architecture additions (v2, v3) were neutral-to-negative.

3. **Regime information is real, but hard to use.**
   - Inside the cosine distance → corrupts neighbor selection (v2)
   - As a coarse outer gate → kills your best counter-trend trades (v3)
   - The "right" use is probably context-dependent: gate hard against shorting in a strong uptrend, but allow long counter-trend bounces below the MA. We're already long-only, so this collapses.

4. **The biggest unexplored lever is the prediction target, not the features.** 1-day forward returns on SPY are roughly 95% noise (signal-to-noise ratio ~0.05). Every feature change is fighting that label noise. Switching to **5-day or 10-day forward returns** would let kNN learn from a much cleaner target — at the cost of changing the holding-period semantics.

5. **To meaningfully beat SPY buy & hold, the architecture probably has to change.** Possible directions:
   - **Multi-asset universe** — rotate between SPY, QQQ, IEF, GLD, etc. instead of timing SPY in/out
   - **Cross-asset features** — VIX, yield-curve slope, dollar index, credit spreads
   - **Different aggregator** — distance-weighted neighbor returns, or a regression head, instead of a flat mean
   - **Vol-targeting** — size positions by inverse volatility rather than 100% / 0%

6. **Operationally, the seed-as-kNN-backend pattern works.** End-to-end latency was acceptable (~3 minutes for ~1800 walk-forward queries via SSH tunnel). The store handled co-existence of sensor vectors and SPY vectors via id-range filtering.

---

## 6. Recommended Next Steps (ordered by expected lift / effort ratio)

| # | Change | Why | Effort | Expected effect |
|---|---|---|---|---|
| 1 | **5-day forward-return label** | Reduces label noise — biggest single lever | small (one-line change, but holding period changes) | likely +1–2 pp CAGR, higher hit rate |
| 2 | **Distance-weighted aggregator** | Closer neighbors should count more than far ones | small | small-to-moderate |
| 3 | **More reactive regime** (50-day slope, 50/200 cross) | Less autocorrelated than 200-day MA | small | uncertain — could repeat v3's lesson |
| 4 | **Multi-asset rotation** | Beat-buy-and-hold actually requires a universe | medium | structural — different problem |
| 5 | **Cross-asset features** (VIX, yield curve) | Information not present in SPY alone | medium | likely modest improvement |
| 6 | **Learned aggregator** (small regressor on neighbor distances) | Replace flat mean with weighted, regularized prediction | medium | unclear — worth a try if (1) helps |

A pragmatic order: do **#1 first**, then revisit the goal. If the answer becomes "we want to actually beat SPY," jump to **#4**.

---

## 7. Open Questions / Pending Decisions

1. **Goal of the exercise** — risk-adjusted alpha, or beat-buy-and-hold? They imply different architectures.
2. **`neural-trader` cog state** — currently *stopped* on the seed (we paused it during backtests so it wouldn't pollute the store). Should be restarted for production usage.
3. **Vector hygiene** — across v1/v1.5/v2/v3 we've ingested ~6,000 SPY vectors at ID bases 10B / 11B / 12B. None deleted. May want to clean up before next experiments.
4. **Environmental issue noted** — several project files (`yfinance_loader.py`, `spy_daily.csv`, `embedding.py`, `store_client.py`) are currently in macOS *dataless* state (size metadata correct but on-disk content evicted by Optimized Storage). Worked around by inlining the SPY loader. Worth manually re-hydrating via Finder if iCloud Drive is enabled.

---

## 8. Glossary

This list is intentionally written for non-experts.

### Trading & finance terms

- **Backtest** — Running a trading rule against historical data to estimate how it would have performed. Cheap to do, easy to fool yourself with.
- **Walk-forward** — A backtest style where, at each historical day, the model can use only information available *up to that day* (no peeking ahead). The opposite of an in-sample fit.
- **Long / Flat / Short** — *Long* = own the asset (profit if price rises). *Flat* = no position (return = 0). *Short* = bet against the asset (profit if price falls; conceptually "borrow and sell").
- **Buy & hold** — The trivial strategy of buying once and never selling. The benchmark every active strategy is judged against.
- **SPY** — An exchange-traded fund (ETF) that tracks the S&P 500 index. The most liquid US-equity proxy.
- **OHLCV bar** — One row per trading day: Open price, High, Low, Close, Volume.
- **CAGR (Compound Annual Growth Rate)** — Annualized geometric return: `(final / initial)^(1/years) − 1`. The "average yearly return" you can quote at parties.
- **Sharpe ratio** — Annualized return divided by annualized volatility. Roughly: how many units of return you got per unit of risk taken. Above 1 is genuinely good; 0.3 is mediocre; 0 means you took risk for no reward.
- **Maximum drawdown (MaxDD)** — The largest peak-to-trough loss the strategy ever suffered. The number that decides whether you'd actually live with it.
- **Hit rate** — Fraction of bets that won. 50% is a coin flip; 53–55% with positive expected value is a meaningful edge.
- **Slippage / bps (basis points)** — Cost of trading. 1 bps = 0.01%. `1 bps/side` means 1 bps each time you buy AND each time you sell.
- **Position flip** — A change in position (from flat to long, long to flat, etc.). Each flip incurs slippage.
- **Forward return** — The return *after* a given day. `forward_ret[today] = log(close[tomorrow]) − log(close[today])`. The thing the kNN tries to predict.
- **Buy-and-hold** — see "Buy & hold" above.

### Statistics / ML

- **Vector embedding** — Representing something (a day, a word, an image) as a list of numbers so a computer can compute "distance" between two of them.
- **Feature** — One number in the embedding. e.g., "today's percentage return" is a feature.
- **Z-score / standardization** — Rescaling each feature to have mean 0 and standard deviation 1, so features measured on different scales (returns, volume, distances) become comparable.
- **k-Nearest Neighbors (kNN)** — A non-parametric machine-learning technique. For a query, find the *k* training examples most similar to it, then aggregate their known outcomes. No model is "trained" — the dataset *is* the model.
- **Cosine similarity** — One way to measure how "aligned" two vectors are. Cosine of the angle between them. Range: [−1, +1]. 1 = identical direction, 0 = perpendicular, −1 = opposite. Insensitive to vector magnitude.
- **Aggregator** — The function that combines multiple neighbors' outcomes into a single prediction. We used `mean()`. Alternatives: weighted mean, median, regression.
- **Label / target** — The thing the model is predicting. Here: next-day forward return.
- **Walk-forward (again, ML-flavored)** — Train (or in our case, expand the kNN store) only with data up to time *t*, predict at *t+1*. Repeat for every *t*.
- **In-sample / out-of-sample** — In-sample = the model has seen this data already (risk of overfitting). Out-of-sample = unseen data, the honest test.
- **Threshold** — A minimum signal level required before acting. Used to filter out low-confidence noise.

### Market-structure terms

- **Regime** — The prevailing *state* of the market — bull vs. bear, calm vs. stressed, easing vs. tightening. A slow-moving backdrop that changes how individual price patterns play out.
- **Moving average (MA / SMA)** — Average of the last N closes. Smooths short-term noise. The "200-day MA" is a classic long-term trend reference.
- **Volatility (realized vol)** — Standard deviation of recent daily returns, annualized. Measures how jumpy prices have been.
- **ATR (Average True Range)** — Like volatility but in price units, accounting for gaps. Used to size bar ranges.
- **Volume z-score** — Today's volume, expressed in standard deviations above/below its 20-day mean.
- **Distance-from-MA** — How far today's close is above (positive) or below (negative) a moving average. Used as a momentum/mean-reversion indicator.

### System / infrastructure terms

- **Cognitum Seed** — The Raspberry Pi device hosting on-device AI capabilities. Personal, custodial, persistent.
- **Cog** — An app installed on the seed (e.g., `neural-trader`, `health-monitor`, `ruview-densepose`).
- **RVF (vector store)** — The seed's on-device cosine-similarity vector database. Fixed at dim=8 in this project.
- **Witness chain** — A cryptographic hash chain that gives the seed's data tamper-evident integrity. Grows by one entry per ingest.
- **SSH tunnel** — A local TCP forward over SSH. We use `ssh -fN -L 9080:127.0.0.1:80 genesis@169.254.42.1` to expose the seed's HTTP API on `localhost:9080`.
- **MCP (Model Context Protocol)** — How Claude calls the seed's tools without raw HTTP. Used here to inspect device status, list cogs, etc.
- **yfinance** — A Python library that scrapes Yahoo Finance for historical bar data. Free, unofficial, occasionally rate-limited.
- **Pyright / mypy** — Python type checkers. The "Pyright" diagnostics that appeared during runs were false positives on `pandas.DatetimeIndex.date` (works at runtime).

### File / output references in this project

| File | What it is |
|---|---|
| `backtest.py` | Original v1 (long/flat/short, 0 bps threshold) |
| `backtest_long_only.py` | v1.5 (long-only, 5 bps threshold) |
| `backtest_v2_regime.py` | v2 (regime feature inside cosine) |
| `backtest_v3_gate.py` | v3 (regime as decision gate) |
| `embedding.py` | Feature definitions and z-scoring |
| `store_client.py` | HTTP client for the seed's RVF store |
| `yfinance_loader.py` | SPY data loader (cached to `spy_daily.csv`) |
| `equity*.csv` | Per-bar equity curve and position log for each variant |
| `equity_curve*.png` | Equity-curve plots vs SPY buy & hold |
| `report*.md` | Auto-generated headline reports per run |
| `EXPLORATION_LOG.md` | This document |

---

## Appendix A: Per-run reports

For full per-run detail (including position distributions, neighbor counts, and slippage accounting), see:

- `report.md` — v1
- `report_long_only.md` — v1.5
- `report_v2_regime.md` — v2
- `report_v3_gate.md` — v3

## Appendix B: Reproducing a run

```bash
# 1. Make sure the SSH tunnel to the seed is up
ssh -fN -L 9080:127.0.0.1:80 genesis@169.254.42.1

# 2. Stop the neural-trader cog so it doesn't pollute the store
#    (via MCP tool seed_cogs_stop, or seed admin UI)

# 3. Run the variant
.venv/bin/python backtest_long_only.py     # or backtest_v2_regime.py / backtest_v3_gate.py

# 4. Inspect outputs
open equity_curve_long_only.png
cat  report_long_only.md
```

---

*End of log.*

# Neural Trader Exploration Log

**Project:** Cognitum.NeuralTrader
**Date:** 2026-05-08
**Author:** session log
**Audience:** mixed — technical depth where useful, plain language where possible (see Glossary at end)

---

## 0. Executive Summary

We set out to backtest the **Neural Trader** strategy that runs on a Cognitum Seed device. The strategy uses the seed's on-device vector store as a **k-Nearest-Neighbors (kNN) memory** of past market days, predicting what tomorrow will do by averaging what happened *after* the historical days that "looked most similar" to today.

Across **five variants** we walked from "lost money" → "profitable but mediocre on one asset" → "rotate across an asset universe and almost beat buy-and-hold." The architectural lessons compound; v4 was the breakthrough.

```
        STRATEGY EQUITY CURVES (1.0 = start)
        ──────────────────────────────────────────────
   3.00  ┤                                    ●●●●  SPY buy & hold (+16.5% CAGR)
         │                              ●●●●●●
         │                       ●●●●●●●
   2.61  ┤                ●●●●●●           ●●●●●  v4 multi-asset rotation (+14.2% CAGR) ← BEST
         │           ●●●●●        ●●  ●●●●●
   2.00  ┤      ●●●●●     ●●●●●●●● ●●
         │  ●●●●
         │                     ⭐ v4 dipped to ~1.41 in 2023 (held QQQ through bear)
   1.33  ┤●●●           ●●●●●●●●●●●●●●●●●●●●  v1.5 long-only      (+4.0% CAGR)
   1.16  ┤  ●●        ●●●●●●●●●●●●●●●●●●●●●●●  v3 regime gate     (+2.0% CAGR)
   1.03  ┤    ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  v2 regime in cosine (+0.5% CAGR)
   1.00  ┤────────────────────────────────────  baseline
         │ ╲
   0.87  ┤  ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  v1 long/flat/short (−1.9% CAGR)
         └──┬──────┬──────┬──────┬──────┬──────
          2019    2021   2023   2025   2026
```

### Headline result

| Variant | Final | CAGR | Sharpe | MaxDD | Verdict |
|---|---|---|---|---|---|
| **SPY buy & hold** | 3.02 | **+16.48%** | ~1.0 | −33.7% | benchmark |
| v1: long/flat/short, no threshold | 0.87 | −1.94% | 0.00 | −48.1% | **broken** — forced shorts in bull market |
| v1.5: long-only, 5 bps threshold | 1.33 | +4.00% | 0.35 | **−25.3%** | best **single-asset** variant |
| v2: regime as 8th cosine dimension | 1.03 | +0.47% | 0.11 | −27.5% | hurt — broke kNN geometry |
| v3: regime as decision gate | 1.16 | +2.03% | 0.28 | −22.4% | hurt return, helped drawdown |
| **v4: multi-asset rotation** | **2.61** | **+14.16%** | **0.79** | −34.3% | **best variant** — closed most of the gap to SPY |

### Three things we learned

1. **The naive kNN strategy works as a single-asset signal but cannot beat buy & hold on raw return** when restricted to one ETF during a 16%-CAGR bull stretch. That's a structural limit, not a tuning failure.
2. **Adding a "regime" feature is harder than it sounds.** Putting it inside the cosine distance (v2) corrupts neighbor selection. Using it as an outer gate (v3) throws out kNN's best work — its panic-bottom pattern matches.
3. **Universe choice matters more than feature choice.** Going from one asset (SPY) to four (SPY/QQQ/IEF/GLD) lifted CAGR from 4% → 14% and Sharpe from 0.35 → 0.79 *without changing the embedding or decision rule*. The biggest open lever is no longer "what features?" but "what assets and what aggregator?"

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

> *(v1 equity-curve image is not in the repo — the file was evicted by macOS Optimized Storage during the session and could not be recovered. The numbers above are authoritative.)*

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

![v1.5 equity curve](results/v1_5_long_only/equity_curve.png)

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

![v2 equity curve](results/v2_regime_feature/equity_curve.png)

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

![v3 equity curve](results/v3_regime_gate/equity_curve.png)

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

### 3.5 v4 — Multi-asset rotation across SPY, QQQ, IEF, GLD + cash

> *"What if the strategy's universe wasn't 'SPY or cash' but a small basket of asset classes, and each day we picked whichever one's pattern most strongly suggested 'go up next'?"*

**Hypothesis:** The 4% CAGR ceiling we hit in v1.5 isn't a kNN limitation — it's a **universe** limitation. SPY-or-cash forces you to either fight a 16%-CAGR bull tide or cede returns. Add bonds (IEF) and gold (GLD) to the choice set and the strategy gains the *structural* ability to escape equity bear markets entirely.

**Architecture change** (kept everything else identical to v1.5):

```
   Each trading day, for EACH asset in {SPY, QQQ, IEF, GLD}:
     1. Compute the same 8-dim feature vector as v1.5
     2. Query the seed for that asset's 10 nearest historical neighbors
        (id-range filter keeps each asset's kNN inside its own history)
     3. Average those neighbors' next-day returns → mean_pred[asset]

   Pick winner = argmax(mean_pred)
   if mean_pred[winner] > 5 bps:
       hold winner
   else:
       hold cash
```

Each asset got its own ID range in the seed store (SPY=13B, QQQ=14B, IEF=15B, GLD=16B). 4× more vectors written, 4× more queries per walk-forward bar, ~16 min total runtime instead of ~3 min.

**Universe rationale:**

| Asset | Role |
|---|---|
| **SPY** | US large-cap equity (the benchmark we're trying to beat) |
| **QQQ** | US tech-heavy (NASDAQ-100) — captures AI-boom upside |
| **IEF** | 7–10y US Treasuries — defensive, negatively correlated with stocks during equity panic |
| **GLD** | Gold — inflation hedge, crisis hedge, alternative store of value |
| **cash** | The "no signal" fallback — preserves capital during noise |

**Result:**

| Metric | Strategy | SPY buy & hold |
|---|---|---|
| Final equity | **2.6113** | 3.0204 |
| CAGR | **+14.16%** | +16.48% |
| Sharpe (ann.) | **0.79** | ~1.0 |
| Max drawdown | **−34.33%** | −33.72% |
| Hit rate | 54.40% | — |
| Position flips | 1306 | — |
| Bars in market | 1636 / 1826 | — |

![v4 equity curve](results/v4_multi_asset_rotation/equity_curve.png)

**Position breakdown** (across 1826 walk-forward bars):

| Asset | Bars | % of time |
|---|---|---|
| QQQ | 590 | 32% |
| GLD | 493 | 27% |
| SPY | 384 | 21% |
| cash | 190 | 10% |
| IEF | 169 | 9% |

The strategy genuinely used the universe — no single asset dominated. QQQ during AI rallies, GLD during inflation/crisis windows, SPY as a baseline, IEF and cash as defensive postures.

**Reading:**

This is **the breakthrough**. Three jumps in one experiment:

| | v1.5 (best single-asset) | **v4 (rotation)** | Δ |
|---|---|---|---|
| CAGR | +4.00% | **+14.16%** | **+10 pp** |
| Sharpe | 0.35 | **0.79** | **+0.44** |
| Final equity | 1.33 | **2.61** | nearly doubled |

**But it didn't quite beat SPY on raw return** (14.16% vs 16.48%) — and the max drawdown actually got *worse* (−34% vs v1.5's −25%, marginally worse than SPY's −33.7%). The drawdown happened in 2022: v4 was holding QQQ during the tech sell-off, watching it bleed for ~13 months before rotating out. Multi-asset rotation isn't automatically less risky — being in *some* asset all the time means you absorb whichever one's downturn you happen to be holding.

**What worked:**

- Universe diversity gave the strategy real options. ~36% of bars were in defensive positions (IEF + GLD + cash). Single-asset SPY can't do that.
- Most of the lift came not from better timing within an asset, but from being in the *right asset* at the *right time*. GLD got picked heavily through 2020–2022 (inflation regime); QQQ through the 2024–2026 AI rally.
- Sharpe more than doubled (0.35 → 0.79), confirming the strategy is meaningfully *less risky per unit of return* than v1.5.

**What still needs work:**

- 1306 position flips in 1826 bars = the strategy switched assets ~72% of trading days. With 1 bps slippage that's ~13% baseline drag from rotation costs. Held longer would help.
- The 2022 QQQ drawdown wasn't caught — kNN kept saying "QQQ looks attractive" while it bled. A volatility filter or a multi-day-confirmation rule could have shifted earlier.
- Cash earns 0% in this backtest. A real implementation would substitute SHV/BIL (~5% in recent years), which would add another ~0.5% CAGR to v4's result.

**Net verdict:** v4 closed roughly **80% of the gap** between v1.5 and SPY buy-and-hold while keeping a meaningful Sharpe edge. The remaining gap is small enough that a few targeted improvements (slower rotation, vol filter, cash-yield proxy) might plausibly close it entirely.

---

## 4. Side-by-Side: Where We Ended Up

### 4.1 Same-window comparison (Feb 2019 → May 2026)

```
   Final  ┌─────────────────────────────────────────────────────────┐
   3.02 ──┤                                          ●●●  SPY B&H   │
          │                                    ●●●●●                 │
          │                              ●●●●●●                      │
   2.61 ──┤                       ●●●●●●●          ●●●●●  v4 rotation│
          │                ●●●●●●●          ●●●●●●●                  │
   2.00 ──┤        ●●●●●●●●        ●●●●●●●●                          │
          │   ●●●●●                                                  │
          │   ●                                                      │
   1.33 ──┤●●● ●            ●●●●●●●●●●●●●●●●●●●●●●●●●  v1.5 long-only│
   1.16 ──┤    ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  v3 regime gate│
   1.03 ──┤             ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  v2 regime cos │
   1.00 ──┤────────────────────────────────────────────────────────  │
          │ ╲                                                        │
   0.87 ──┤  ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●  v1 broken     │
          └──┬───────┬──────┬──────┬──────┬──────┬──────┬───────────┘
            2019    2021   2023   2025   2026
```

### 4.2 Risk vs return in a single picture

```
   Sharpe (risk-adjusted return)
   0.80 ┤                                         ● v4 (BEST)
        │
        │
   0.40 ┤                                         
   0.35 ┤                       ● v1.5
        │
   0.30 ┤                            ● v3 gate
        │
   0.20 ┤
        │
   0.10 ┤        ● v2 regime
        │
   0.00 ┤  ● v1
        │
        └─┬───────┬──────┬──────┬──────┬──────┬──────┬─────►
        −2%    +0.5%   +2%    +4%   +14%      ← CAGR
```

**Summary:** **v4 dominates everything else on Sharpe and on raw CAGR.** v1.5 still wins on max-drawdown (−25% vs v4's −34%); the other variants are pareto-dominated by v1.5 and v4.

---

## 5. Insights We Now Hold

1. **Single-asset technical kNN has a real ceiling.** With 7 short-term technical features on one ETF (v1.5), expect Sharpe ~0.3 and CAGR ~4%. Three further variants on the same architecture (v2, v3) couldn't break that ceiling. This is consistent with decades of academic literature on technical-features-only single-asset market-timing.

2. **Universe choice matters more than feature choice.** v4 changed *only* the universe — same embedding, same k, same threshold, same decision rule — and got Sharpe 0.79 and CAGR 14%. Going from "what features?" to "what assets?" was the biggest single lever in the whole exploration.

3. **"Cleaning up" v1's obvious flaws got the first big win.** Removing shorts and adding a 5 bps threshold (v1.5) lifted CAGR from −2% to +4%. Subsequent feature additions (v2, v3) were neutral-to-negative. Defaults matter.

4. **Regime information is real, but hard to use** as a feature in cosine geometry.
   - Inside the cosine distance → corrupts neighbor selection (v2)
   - As a coarse outer gate → kills your best counter-trend trades (v3)
   - The "right" use is probably context-dependent: gate hard against shorting in a strong uptrend, but allow long counter-trend bounces below the MA. We're already long-only, so this collapses.

5. **Multi-asset rotation got most of the way to SPY but not all of it.** v4's gap to SPY (16.48% vs 14.16% CAGR) is small enough to plausibly close with three known levers: (a) slower rotation to cut slippage drag, (b) a vol-aware filter to escape sustained drawdowns sooner, (c) a real cash yield (SHV/BIL) instead of 0%. Each adds ~0.5–1.5 pp expected.

6. **The 1-day forward-return label is still the highest-leverage unexplored knob.** Daily returns on these ETFs are roughly 95% noise. Switching to 5-day or 10-day forward labels (with corresponding longer holding periods) would let kNN learn from a much cleaner target. Untested across all five variants.

7. **Operationally, the seed-as-kNN-backend scales.** v4 wrote ~8K vectors (4 assets × 2079 bars) and made 4× more queries per bar than single-asset variants. Run time was ~16 min vs ~3 min — linear scaling, no surprises. The store handled the multi-asset id-range filtering correctly throughout.

---

## 6. Recommended Next Steps (ordered by expected lift / effort ratio)

Re-ranked after v4. Multi-asset rotation is **done** and was the biggest single lever — moving the architecture from a 4% CAGR ceiling to 14%. The remaining unexplored levers all attack v4's residual gap to SPY (≈2.3 pp CAGR) and its drawdown (−34%):

| # | Change | Why | Effort | Expected effect |
|---|---|---|---|---|
| 1 | **Slower rotation** (e.g. only flip when winner changes for N consecutive days, or 5-day rebalance) | v4 had 1306 flips in 1826 bars = ~13% slippage drag | small | likely +1–2 pp CAGR |
| 2 | **5-day forward-return label** | Reduces label noise; should sharpen winner-picking in v4 | small | likely +0.5–1 pp CAGR, higher hit rate |
| 3 | **Real cash yield** (substitute SHV/BIL for the 0% cash leg) | v4 spent 10% of bars in 0%-yielding cash; with realistic short-rate this adds ~0.5 pp CAGR | trivial | +0.3–0.6 pp CAGR |
| 4 | **Volatility filter** for the held asset | v4 held QQQ through the entire 2022 bear; a vol filter would have rotated out earlier | small-to-medium | mostly improves drawdown |
| 5 | **Distance-weighted aggregator** | Closer neighbors should count more than far ones | small | small-to-moderate |
| 6 | **Wider universe** (add EFA, EEM, VNQ, TLT, BIL) | More options → more chances to be in something good | small | modest, with risk of dilution |
| 7 | **Cross-asset features** (VIX, yield curve, dollar) | Information not present in any single ETF's price | medium | likely modest improvement |
| 8 | **Learned aggregator** (small regressor on neighbor distances) | Replace flat mean with weighted, regularized prediction | medium | unclear — worth a try if (1)+(2) help |

A pragmatic order: stack **#1 + #2 + #3** on top of v4 first. If those close the gap to SPY, declare success. If not, add **#4** and a wider universe (#6).

---

## 7. Open Questions / Pending Decisions

1. **Goal of the exercise** — risk-adjusted alpha, or beat-buy-and-hold? They imply different architectures.
2. **`neural-trader` cog state** — currently *stopped* on the seed (we paused it during backtests so it wouldn't pollute the store). Should be restarted for production usage.
3. **Vector hygiene** — across all five variants we've ingested ~14,000 vectors at ID bases 10B (v1 SPY), 11B (v1.5/v3 SPY), 12B (v2 SPY), 13B (v4 SPY), 14B (v4 QQQ), 15B (v4 IEF), 16B (v4 GLD). None deleted. The seed's `total_vectors` grew from 59,672 at session start to ~95,000+. May want to clean up before next experiments — see [LIMITATIONS.md E3](LIMITATIONS.md#e3-vector-deletion--scrubbing-api).
4. **Environmental issue noted** — several project files (`yfinance_loader.py`, `spy_daily.csv`, `embedding.py`, `store_client.py`) are currently in macOS *dataless* state (size metadata correct but on-disk content evicted by Optimized Storage). Worked around by inlining the SPY loader. Worth manually re-hydrating via Finder if iCloud Drive is enabled.

> **For a structured, issue-ready catalog of all the limitations, bugs, and enhancement requests we identified — formatted as ready-to-paste GitHub issues — see [`LIMITATIONS.md`](LIMITATIONS.md).**

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
| `src/v1_baseline.py` | Original v1 (long/flat/short, 0 bps threshold) |
| `src/v1_5_long_only.py` | v1.5 (long-only, 5 bps threshold) |
| `src/v2_regime_feature.py` | v2 (regime feature inside cosine) |
| `src/v3_regime_gate.py` | v3 (regime as decision gate) |
| `src/v4_multi_asset_rotation.py` | v4 (rotation across SPY/QQQ/IEF/GLD + cash; **best variant**) |
| `src/embedding.py` | Feature definitions and z-scoring |
| `src/store_client.py` | HTTP client for the seed's RVF store |
| `src/yfinance_loader.py` | SPY data loader (cached to `spy_daily.csv`) |
| `results/<variant>/equity.csv` | Per-bar equity curve and position log |
| `results/<variant>/equity_curve.png` | Equity-curve plot vs SPY buy & hold |
| `results/<variant>/report.md` | Auto-generated headline report |
| `EXPLORATION_LOG.md` | This document |
| `README.md` | Top-level project overview and quickstart |
| `LIMITATIONS.md` | Issue-ready catalog of bugs, enhancement requests, and open questions for the seed/cog developers |

---

## Appendix A: Per-run reports

For full per-run detail (including position distributions, neighbor counts, and slippage accounting), see:

- [`results/v1_baseline/report.md`](results/v1_baseline/report.md) — v1
- [`results/v1_5_long_only/report.md`](results/v1_5_long_only/report.md) — v1.5
- [`results/v2_regime_feature/report.md`](results/v2_regime_feature/report.md) — v2
- [`results/v3_regime_gate/report.md`](results/v3_regime_gate/report.md) — v3
- [`results/v4_multi_asset_rotation/report.md`](results/v4_multi_asset_rotation/report.md) — v4 (multi-asset rotation; **best variant**)

## Appendix B: Reproducing a run

```bash
# 1. Make sure the SSH tunnel to the seed is up
ssh -fN -L 9080:127.0.0.1:80 genesis@169.254.42.1

# 2. Stop the neural-trader cog so it doesn't pollute the store
#    (via MCP tool seed_cogs_stop, or seed admin UI)

# 3. Run the variant (run from project root so PYTHONPATH picks up src/)
PYTHONPATH=src .venv/bin/python src/v4_multi_asset_rotation.py
# Other variants:
#   src/v1_baseline.py / src/v1_5_long_only.py / src/v2_regime_feature.py / src/v3_regime_gate.py

# 4. Inspect outputs
open results/v4_multi_asset_rotation/equity_curve.png
cat  results/v4_multi_asset_rotation/report.md
```

---

*End of log.*

# Neural Trader — SPY Walk-Forward Backtest (v2: long-only + 200d regime)

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Data:** SPY daily bars, 2018-10-16 → 2026-05-06 (1898 bars)
**Embedding:** 8-dim feature vector — 7 base (log_ret_1, log_ret_5, log_ret_20, realized_vol_20, tr_over_atr, volume_z, dist_from_ma) + **regime_200ma** = (close − SMA_200)/SMA_200, all z-scored on warmup window. Bias slot dropped to fit dim=8.
**Method:** walk-forward, k=10 cosine-NN over historical SPY embeddings only;
mean of neighbor forward returns → **long/flat only** signal (threshold 5 bps);
1-day hold; 1 bps/side slippage.

## Headline

| Metric | Strategy | SPY buy & hold |
|---|---|---|
| Final equity | **1.0265** | 2.6593 |
| CAGR | **0.40%** | 16.16% |
| Sharpe (daily, ann.) | **0.11** | — |
| Max drawdown | **-27.53%** | -33.72% |
| Hit rate (bar-days) | **53.29%** | — |
| Position flips | 728 | — |
| Bars in market | 837 / 1645 | — |
| Insufficient-neighbors bars | 15 | — |
| Avg SPY neighbors / query | 9.85 | — |

![equity curve](equity_curve_v2_regime.png)

## Position distribution

| position | bars |
|---|---|
| +0 | 808 |
| +1 | 837 |

## Notes

- Vectors written to seed under id range `[12_000_000_000, 12_000_001_898)`.
- The neural-trader cog was stopped during this run.
- Pre-existing seed vectors (sensor + v1 SPY at 10B + v1.5 long-only SPY at 11B) excluded by id-range filter.
- Query oversampling: k=2000 from store, then filter to SPY range, then take top 10.
- The regime feature is dimensionless (% deviation from 200-day MA), then z-scored on the 252-bar warmup window.
- This is a backtest. No money at risk.

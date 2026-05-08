# Neural Trader — SPY Walk-Forward Backtest (LONG-ONLY variant)

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Data:** SPY daily bars, 2018-01-31 → 2026-05-06 (2077 bars)
**Embedding:** 8-dim feature vector (log_ret_1, log_ret_5, log_ret_20, realized_vol_20, tr_over_atr, volume_z, dist_from_ma, bias=1.0), z-scored on warmup window
**Method:** walk-forward, k=10 cosine-NN over historical SPY embeddings only;
mean of neighbor forward returns → **long/flat only** signal (threshold 5 bps);
1-day hold; 1 bps/side slippage.

## Headline

| Metric | Strategy | SPY buy & hold |
|---|---|---|
| Final equity | **1.3285** | 2.9882 |
| CAGR | **4.00%** | 16.33% |
| Sharpe (daily, ann.) | **0.35** | — |
| Max drawdown | **-25.27%** | -33.72% |
| Hit rate (bar-days) | **53.64%** | — |
| Position flips | 870 | — |
| Bars in market | 878 / 1824 | — |
| Insufficient-neighbors bars | 12 | — |
| Avg SPY neighbors / query | 9.89 | — |

![equity curve](equity_curve.png)

## Position distribution

| position | bars |
|---|---|
| +0 | 946 |
| +1 | 878 |

## Notes

- Vectors written to seed under id range `[11_000_000_000, 11_000_002_077)`.
- The neural-trader cog was stopped during this run to keep the store quiet.
- Pre-existing seed vectors (sensor data + v1 SPY range at 10_000_000_000) excluded by post-filtering on id range.
- Query oversampling: k=2000 from store, then filter to SPY range, then take top 10.
- This is a backtest. No money at risk. Standard caveats: in-sample scaler fit on first 252 bars,
  no transaction cost beyond 1 bps slippage, no shorting (long-only), no dividend handling
  (close prices are auto-adjusted by yfinance).

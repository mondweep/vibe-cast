# Neural Trader — SPY Walk-Forward Backtest

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Data:** SPY daily bars, 2018-01-31 → 2026-05-06 (2077 bars)
**Embedding:** 8-dim feature vector (log_ret_1, log_ret_5, log_ret_20, realized_vol_20, tr_over_atr, volume_z, dist_from_ma, bias=1.0), z-scored on warmup window
**Method:** walk-forward, k=10 cosine-NN over historical SPY embeddings only;
mean of neighbor forward returns → long/flat/short signal; 1-day hold; 1 bps/side slippage.

## Headline

| Metric | Strategy | SPY buy & hold |
|---|---|---|
| Final equity | **0.8680** | 2.9882 |
| CAGR | **-1.94%** | 16.33% |
| Sharpe (daily, ann.) | **0.00** | — |
| Max drawdown | **-48.14%** | -33.72% |
| Hit rate (bar-days) | **49.06%** | — |
| Position flips | 871 | — |
| Bars in market | 1812 / 1824 | — |
| Insufficient-neighbors bars | 12 | — |
| Avg SPY neighbors / query | 9.90 | — |

![equity curve](equity_curve.png)

## Position distribution

| position | bars |
|---|---|
| -1 | 783 |
| +0 | 12 |
| +1 | 1029 |

## Notes

- Vectors written to seed under id range `[10_000_000_000, 10_000_002_077)`.
- The neural-trader cog was stopped during this run to keep the store quiet.
- Pre-existing seed vectors (~54k sensor data) were excluded from kNN by post-filtering on id range.
- Query oversampling: k=2000 from store, then filter to SPY range, then take top 10.
- This is a backtest. No money at risk. Standard caveats: in-sample scaler fit on first 252 bars,
  no transaction cost beyond 1 bps slippage, no shorting borrow cost, no dividend handling
  (close prices are auto-adjusted by yfinance).

# Neural Trader — SPY Walk-Forward Backtest (v3: regime gate)

**Backend:** Cognitum Seed `0.21.12`, RVF vector store via SSH tunnel
**Data:** SPY daily bars, 2018-01-31 → 2026-05-07 (2078 bars)
**Embedding:** 8-dim — same 7 short-term features + bias as v1.5 (regime stays OUT of cosine).
**Method:** walk-forward, k=10 cosine-NN over historical SPY embeddings only;
mean of neighbor 1-day forward returns → kNN long signal (threshold 5 bps);
**regime gate**: long position only if mean_pred > 5 bps **AND** (close − SMA_200)/SMA_200 > 0;
1-day hold; 1 bps/side slippage.

## Headline

| Metric | Strategy | SPY buy & hold |
|---|---|---|
| Final equity | **1.1569** | 3.0297 |
| CAGR | **2.03%** | 16.54% |
| Sharpe (daily, ann.) | **0.28** | — |
| Max drawdown | **-22.38%** | -33.72% |
| Hit rate (bar-days) | **54.61%** | — |
| Position flips | 702 | — |
| Bars in market | 694 / 1825 | — |
| Insufficient-neighbors bars | 12 | — |
| Avg SPY neighbors / query | 9.89 | — |
| Times kNN signaled long | 878 | — |
| Times gate vetoed long | 184 (21.0% of kNN longs) | — |

![equity curve](equity_curve.png)

## Position distribution

| position | bars |
|---|---|
| +0 | 1131 |
| +1 | 694 |

## Notes

- No re-ingest: this run reuses v1.5's already-ingested vectors at id range
  `[11_000_000_000, 11_000_002_078)`. Same kNN neighbor pool as v1.5
  at every step → the only difference vs v1.5 is the regime gate.
- The neural-trader cog was stopped during this run.
- Query oversampling: k=2000, then filter to SPY id range, then take top 10.
- This is a backtest. No money at risk.

"""
SPY daily OHLCV loader, cached to spy_daily.csv.

(Reconstructed from function signature; original on-disk content was
 evicted by macOS Optimized Storage during this session.)
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import yfinance as yf

CACHE = Path(__file__).parent / "spy_daily.csv"


def load_spy(start: str = "2018-01-01") -> pd.DataFrame:
    if CACHE.exists() and CACHE.stat().st_size > 0:
        return pd.read_csv(CACHE, index_col=0, parse_dates=True)
    bars = yf.download("SPY", start=start, auto_adjust=True, progress=False)
    if hasattr(bars.columns, "nlevels") and bars.columns.nlevels > 1:
        bars.columns = bars.columns.droplevel(-1)
    bars.to_csv(CACHE)
    return bars

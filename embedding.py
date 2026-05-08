"""
8-dim feature vector for an SPY daily bar.

Dim layout:
    d1 — log return today
    d2 — 5-day log return
    d3 — 20-day log return
    d4 — 20-day realized vol (std of daily log returns)
    d5 — true range / 20-day ATR
    d6 — volume z-score (vs 20-day mean/std)
    d7 — (close - 20-day MA) / 20-day ATR
    d8 — 1.0 (constant bias slot, mirrors cog convention)

Dims 1..7 are z-scored using stats fitted on the warmup window so cosine
distance has meaningful geometry across regimes.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

DIM = 8

FEATURE_COLS = [
    "log_ret_1",
    "log_ret_5",
    "log_ret_20",
    "realized_vol_20",
    "tr_over_atr",
    "volume_z",
    "dist_from_ma",
]


def compute_raw_features(bars: pd.DataFrame) -> pd.DataFrame:
    df = bars.copy()
    log_close = np.log(df["Close"])
    df["log_ret_1"] = log_close.diff()
    df["log_ret_5"] = log_close.diff(5)
    df["log_ret_20"] = log_close.diff(20)
    df["realized_vol_20"] = df["log_ret_1"].rolling(20).std()

    high_low = df["High"] - df["Low"]
    high_close = (df["High"] - df["Close"].shift()).abs()
    low_close = (df["Low"] - df["Close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr_20 = tr.rolling(20).mean()
    df["tr_over_atr"] = tr / atr_20

    vol_mean = df["Volume"].rolling(20).mean()
    vol_std = df["Volume"].rolling(20).std()
    df["volume_z"] = (df["Volume"] - vol_mean) / vol_std

    ma_20 = df["Close"].rolling(20).mean()
    df["dist_from_ma"] = (df["Close"] - ma_20) / atr_20

    df["bias"] = 1.0

    return df[FEATURE_COLS + ["bias"]]


def fit_scaler(features: pd.DataFrame) -> dict:
    return {
        "mean": features[FEATURE_COLS].mean(),
        "std": features[FEATURE_COLS].std(),
    }


def apply_scaler(features: pd.DataFrame, scaler: dict) -> pd.DataFrame:
    out = features.copy()
    out[FEATURE_COLS] = (features[FEATURE_COLS] - scaler["mean"]) / scaler["std"]
    return out

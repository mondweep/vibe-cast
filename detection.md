# Real-Time Detection Capture

**Capture window:** 2026-05-01 23:05:24 → 2026-05-01 23:06:24 (60 seconds, 1 Hz polling)
**Hardware:** ESP32-S3 @ `192.168.68.131` running RuView v0.6.3 firmware (binary version `0.6.2`)
**Mode:** `edge_tier=1` (on-device DSP, vitals packets emitted every 200 ms)
**Server:** `wifi-densepose-sensing-server` on `localhost:3000`
**Endpoint:** `/api/v1/edge-vitals`
**Unique device packets observed:** 60 / 60 polls — **stream is live, not cached**

---

## Executive Summary

### What was reliably detected

- **Presence**: detected in **60/60** samples (100%). The system is confident there are people in the room throughout the capture window.
- **Motion**: detected in **60/60** samples (100%). Motion energy averaged **7.94** with peaks up to **34.39** — consistent with multiple people moving naturally (not still).
- **Falls**: **0** detected (none).

### Breathing rate

- Range: **6.74 – 30.50 bpm**
- Mean: **17.07 bpm**, median **19.05 bpm**, stdev **8.05**
- Mean lands inside the normal adult resting range (12–20 bpm) — encouraging.
- **However:** the stdev is large (~8 bpm), and individual samples swing from 6.7 bpm (impossibly slow) to 30.5 bpm (panting). This means the FFT is finding *a* peak in the breathing band each sample but is not consistently locking on one breathing source. With multiple people in the room, the analyzer can't tell whose chest it's looking at — it picks the strongest peak each window, which can change as different people inhale/exhale.
- **Verdict on the question "what is my breathing rate?"**: the *average* is plausible, but individual readings should not be trusted as a vital-sign measurement. To get a clean per-person breathing rate, the room would need exactly one still person on the AP→ESP path.

### Heart rate

- Range: **43.04 – 51.43 bpm**
- Mean: **46.37 bpm**, median **46.15 bpm**, stdev **2.09**
- The stable narrow range (stdev only ~2 bpm) is suspicious — *too* consistent given the noisy environment.
- **Likely artifact**: the values cluster around ~46 bpm, which is below normal awake adult resting (60–100). Heart-rate detection from CSI requires sub-millimetre chest-wall vibration to dominate the heart-rate frequency band; with multiple moving bodies and -80 dBm capture signal, that's unlikely. The FFT is probably locking onto a breathing-rate harmonic or multipath wobble, not actual cardiac signal.
- **Verdict**: do **not** treat these as a real heart rate measurement.

### Signal quality

- RSSI: **-83 to -58 dBm** (mean **-80.8**, stdev **4.23**)
- The mean RSSI of -80.85 dBm is in the **"weak"** range — close to the noise floor for CSI extraction. Brief excursion to -58 dBm visible in the data shows the ESP can occasionally hear strong frames; most of the time it's listening to far-away beacons.
- This is the principal limitation: at this signal strength, breathing detection is plausible-on-average but unreliable per-sample, and heart rate is essentially noise.

### Bottom line

- **Working well**: presence, motion detection, real-time data flow.
- **Working in aggregate**: breathing rate (mean ~17 bpm is biologically plausible).
- **Not working**: heart rate (mean ~46 bpm is implausibly low; likely a sub-harmonic of breathing).

---

## Raw samples (1 Hz, 60s)

| t (s) | wall clock | RSSI | presence | mot_e | BR bpm | HR bpm | dev_uptime_ms |
|---:|---|---:|:---:|---:|---:|---:|---:|
| 0 | 23:05:24 | -81 | ✓ | 4.92 | 17.24 | 46.15 | 1634193 |
| 1 | 23:05:25 | -81 | ✓ | 4.90 | 19.25 | 46.91 | 1635223 |
| 2 | 23:05:26 | -81 | ✓ | 5.18 | 21.76 | 47.30 | 1636343 |
| 3 | 23:05:27 | -81 | ✓ | 3.58 | 21.76 | 47.30 | 1637373 |
| 4 | 23:05:28 | -80 | ✓ | 14.37 | 21.76 | 48.21 | 1638293 |
| 5 | 23:05:29 | -82 | ✓ | 11.82 | 21.76 | 46.72 | 1639113 |
| 6 | 23:05:30 | -81 | ✓ | 12.38 | 21.42 | 46.55 | 1640233 |
| 7 | 23:05:31 | -81 | ✓ | 7.64 | 21.42 | 45.24 | 1641263 |
| 8 | 23:05:32 | -81 | ✓ | 5.18 | 22.40 | 45.76 | 1642283 |
| 9 | 23:05:33 | -81 | ✓ | 5.71 | 22.40 | 45.42 | 1643203 |
| 10 | 23:05:34 | -80 | ✓ | 9.89 | 30.50 | 46.15 | 1644233 |
| 11 | 23:05:35 | -81 | ✓ | 2.72 | 30.50 | 44.44 | 1645353 |
| 12 | 23:05:36 | -80 | ✓ | 3.07 | 30.50 | 45.00 | 1646283 |
| 13 | 23:05:37 | -81 | ✓ | 3.40 | 30.50 | 45.97 | 1647203 |
| 14 | 23:05:38 | -81 | ✓ | 10.12 | 30.50 | 46.15 | 1648323 |
| 15 | 23:05:39 | -81 | ✓ | 12.98 | 30.50 | 46.34 | 1649353 |
| 16 | 23:05:40 | -81 | ✓ | 8.76 | 30.50 | 45.19 | 1650173 |
| 17 | 23:05:41 | -81 | ✓ | 13.84 | 30.50 | 45.00 | 1651293 |
| 18 | 23:05:42 | -82 | ✓ | 9.56 | 22.13 | 45.13 | 1652323 |
| 19 | 23:05:43 | -81 | ✓ | 7.08 | 23.52 | 43.55 | 1653243 |
| 20 | 23:05:44 | -81 | ✓ | 5.12 | 23.52 | 43.40 | 1654263 |
| 21 | 23:05:45 | -83 | ✓ | 5.10 | 23.52 | 43.78 | 1655293 |
| 22 | 23:05:46 | -82 | ✓ | 6.24 | 23.52 | 43.78 | 1656113 |
| 23 | 23:05:47 | -82 | ✓ | 6.34 | 23.52 | 43.90 | 1657133 |
| 24 | 23:05:48 | -82 | ✓ | 9.36 | 20.51 | 46.35 | 1658263 |
| 25 | 23:05:49 | -82 | ✓ | 21.26 | 20.51 | 46.35 | 1659083 |
| 26 | 23:05:50 | -82 | ✓ | 10.27 | 20.51 | 46.35 | 1660203 |
| 27 | 23:05:51 | -82 | ✓ | 5.64 | 20.58 | 44.63 | 1661333 |
| 28 | 23:05:52 | -82 | ✓ | 5.43 | 20.58 | 44.63 | 1662053 |
| 29 | 23:05:53 | -81 | ✓ | 4.28 | 20.58 | 44.63 | 1663273 |
| 30 | 23:05:54 | -82 | ✓ | 2.31 | 20.58 | 43.20 | 1664093 |
| 31 | 23:05:55 | -82 | ✓ | 3.15 | 18.84 | 43.37 | 1665323 |
| 32 | 23:05:56 | -82 | ✓ | 14.44 | 18.84 | 43.04 | 1666043 |
| 33 | 23:05:57 | -81 | ✓ | 19.02 | 15.58 | 43.37 | 1667273 |
| 34 | 23:05:58 | -82 | ✓ | 3.93 | 15.58 | 45.19 | 1668193 |
| 35 | 23:05:59 | -82 | ✓ | 3.86 | 15.58 | 45.78 | 1669323 |
| 36 | 23:06:00 | -59 | ✓ | 5.11 | 12.24 | 47.16 | 1670343 |
| 37 | 23:06:01 | -82 | ✓ | 5.73 | 12.24 | 47.16 | 1671163 |
| 38 | 23:06:02 | -82 | ✓ | 6.25 | 10.52 | 46.53 | 1672293 |
| 39 | 23:06:03 | -82 | ✓ | 8.75 | 10.52 | 47.30 | 1673003 |
| 40 | 23:06:04 | -82 | ✓ | 11.61 | 8.33 | 47.30 | 1674133 |
| 41 | 23:06:05 | -83 | ✓ | 4.46 | 8.21 | 48.00 | 1675263 |
| 42 | 23:06:06 | -82 | ✓ | 2.76 | 8.21 | 46.34 | 1676283 |
| 43 | 23:06:07 | -82 | ✓ | 6.04 | 8.21 | 46.15 | 1677203 |
| 44 | 23:06:08 | -82 | ✓ | 11.35 | 8.21 | 46.15 | 1678223 |
| 45 | 23:06:09 | -82 | ✓ | 5.98 | 8.21 | 45.19 | 1679153 |
| 46 | 23:06:10 | -82 | ✓ | 3.81 | 8.21 | 45.97 | 1680273 |
| 47 | 23:06:11 | -82 | ✓ | 3.29 | 8.21 | 46.55 | 1681193 |
| 48 | 23:06:12 | -82 | ✓ | 11.48 | 7.72 | 46.91 | 1682323 |
| 49 | 23:06:13 | -82 | ✓ | 9.37 | 7.72 | 48.87 | 1683243 |
| 50 | 23:06:14 | -82 | ✓ | 3.72 | 6.74 | 48.10 | 1684273 |
| 51 | 23:06:15 | -82 | ✓ | 10.34 | 6.74 | 47.81 | 1685093 |
| 52 | 23:06:16 | -82 | ✓ | 11.35 | 6.74 | 49.79 | 1686213 |
| 53 | 23:06:17 | -82 | ✓ | 6.25 | 6.74 | 49.79 | 1687243 |
| 54 | 23:06:18 | -82 | ✓ | 12.06 | 6.74 | 50.42 | 1688063 |
| 55 | 23:06:19 | -82 | ✓ | 34.39 | 7.72 | 50.42 | 1689183 |
| 56 | 23:06:20 | -82 | ✓ | 3.88 | 7.72 | 51.43 | 1690213 |
| 57 | 23:06:21 | -58 | ✓ | 4.13 | 8.45 | 51.43 | 1691273 |
| 58 | 23:06:22 | -82 | ✓ | 6.11 | 8.45 | 51.43 | 1692253 |
| 59 | 23:06:23 | -82 | ✓ | 5.05 | 8.45 | 45.97 | 1693283 |

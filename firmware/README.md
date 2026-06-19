# SkyWatch Firmware (ESP32) — scaffold

Thin-client firmware for the SkyWatch device (ADR-0001, ADR-0007, ADR-0008).
It self-configures via a Wi-Fi portal, polls the gateway's `GET /sky` Sky
Snapshot, and renders flights + satellites.

> **Status:** Phase 4 scaffold. `src/main.cpp` is an intentionally minimal
> skeleton (config-portal stub + poll loop) to be fleshed out per the
> [Implementation Plan](../docs/IMPLEMENTATION-PLAN.md). It is not yet a complete
> build.

## Target hardware
- ESP32-C3 with a 1.28" 240×240 round IPS display (as in the hackster "Micro
  Radar" build), or any generic ESP32 + TFT. Zero soldering.

## Toolchain
[PlatformIO](https://platformio.org/) (Arduino framework). See `platformio.ini`.

```bash
# from firmware/
pio run                 # build
pio run -t upload       # flash
pio device monitor      # serial logs
```

## Planned libraries
- `WiFiManager` (or built-in captive portal) — config portal
- `ArduinoJson` — parse the Sky Snapshot
- `HTTPClient` / `WiFiClientSecure` — poll the gateway
- `TFT_eSPI` / `LVGL` — display
- (Phase 4 option) an Arduino SGP4 library — offline "favourite satellite" mode

## Config captured by the portal (persisted to NVS)
Wi-Fi creds · observer lat/lon/altitude · range + units · min elevation ·
satellite group · gateway base URL · optional API credentials.

## Gateway contract
`GET {gatewayBaseUrl}/sky` → Sky Snapshot JSON (see
[ADR-0008](../docs/adr/0008-device-gateway-http-json.md)).

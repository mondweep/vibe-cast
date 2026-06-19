# SkyWatch Firmware (ESP32) — thin client

Firmware for the SkyWatch device (ADR-0001, ADR-0007, ADR-0008). It
self-configures via a Wi-Fi portal, polls the gateway's `GET /sky` Sky Snapshot,
and renders flights + satellites.

> **Status:** Phase 4. Complete, modular reference firmware. It builds with
> **Serial output out of the box**; the round-display radar is included but
> gated behind `-DUSE_TFT` (needs a TFT_eSPI User_Setup for your panel). The
> code has not yet been hardware-flash-verified — treat the display wiring/setup
> as the remaining board-specific step.

## Target hardware
- ESP32-C3 with a 1.28" 240×240 round IPS display (as in the hackster "Micro
  Radar" build), or any generic ESP32 + TFT. Zero soldering.

## Modules (`src/`)
| File | Responsibility |
| --- | --- |
| `config.h/.cpp` | `DeviceConfig` + NVS persistence (Preferences) |
| `portal.h/.cpp` | Wi-Fi captive portal (WiFiManager) with observer/gateway fields |
| `gateway_client.h/.cpp` | Build the `/sky` URL, HTTP GET, parse JSON (ArduinoJson) |
| `sky_model.h` | Fixed-capacity in-memory Sky Snapshot model |
| `render.h/.cpp` | Serial view always; round-display radar under `-DUSE_TFT` |
| `main.cpp` | Boot → portal/connect → poll loop → render |

## Build & flash (PlatformIO)
```bash
cd firmware
pio run                 # build (Serial-only by default)
pio run -t upload       # flash
pio device monitor      # serial logs
```
Enable the display: uncomment `-DUSE_TFT` in `platformio.ini` and add a
`TFT_eSPI` `User_Setup` for your panel (e.g. GC9A01 240×240 round).

## First-time setup (config portal)
1. On first boot (or hold the BOOT button), the device starts a Wi-Fi AP named
   **`SkyWatch-Setup`**.
2. Connect to it; the captive form captures: Wi-Fi creds, observer
   **lat/lon/altitude**, **flight range**, **min elevation**, **satellite
   group**, **gateway URL** (e.g. `http://192.168.1.10:8080`) and optional token.
3. Settings persist to NVS; the device connects and starts polling.

## Gateway contract
`GET {gatewayBaseUrl}/sky?lat=&lon=&altKm=&rangeKm=&minEl=` → Sky Snapshot JSON
(see [ADR-0008](../docs/adr/0008-device-gateway-http-json.md) and the example at
[docs/contracts/sky-snapshot.example.json](../docs/contracts/sky-snapshot.example.json)).
The parser in `gateway_client.cpp` maps that document field-for-field into
`sky_model.h`.

## Display semantics
- **Flights** — yellow dots; angle = bearing from you, radius = distance / range.
- **Satellites overhead** — cyan triangles; sky-dome view (centre = zenith, rim
  = horizon), angle = azimuth.
- **Next pass** — banner with max elevation; `*` marks an optically **visible**
  pass (Phase 3).

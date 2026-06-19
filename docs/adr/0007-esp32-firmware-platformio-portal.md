# ADR-0007: ESP32 firmware on Arduino/PlatformIO with a Wi-Fi config portal

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
The device must run on common ESP32 modules (e.g. ESP32-C3 round display, like
Micro Radar), be flashable without soldering, let the user enter location and
settings without hard-coding, and render the Sky Snapshot. We need a firmware
stack and a configuration UX.

## Decision
- Build firmware with **PlatformIO + Arduino framework** for ESP32 (portable
  across boards, good library ecosystem: TFT/LVGL, WiFiManager, ArduinoJson).
- On first boot (or on demand) start a **Wi-Fi AP + captive config portal** to
  capture: Wi-Fi creds, **observer lat/lon/altitude**, range + units, min
  elevation, satellite group, and gateway URL + optional API credentials —
  mirroring the Micro Radar UX. Persist to NVS/flash.
- At runtime the firmware **polls the gateway's `GET /sky` Sky Snapshot** and
  renders flights (bearing/distance) and satellites (az/el) plus the next pass.

## Consequences
### Positive
- No code changes to relocate the device; zero soldering preserved.
- Thin client (ADR-0001) — rendering only; portable across displays.
### Negative / trade-offs
- Config portal + display drivers are board-specific glue to maintain.
### Follow-ups
- Phase 2: implement portal + JSON polling against the gateway contract.
- Phase 4: optional on-device SGP4 "favourite satellite" offline mode.

## Alternatives considered
- **ESP-IDF (no Arduino):** more control, steeper effort; unnecessary here.
- **MicroPython:** friendlier scripting but weaker display/perf for this UI.
- **Hard-coded config:** rejected — fails the "around where I am" usability goal.

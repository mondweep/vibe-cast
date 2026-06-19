# ADR-0001: Gateway-centric architecture with a thin ESP32 device

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
We must track flights and satellites and render them on an ESP32. Two extremes:
(a) do everything on-device (like single-satellite ESP32 trackers that run SGP4
locally), or (b) put aggregation and heavy computation in a small gateway
service the device polls. We want to track *many* satellites, predict passes for
whole groups, and combine that with live flight data — all while keeping the
firmware simple enough to run on cheap ESP32 display modules with zero soldering.

## Decision
Adopt a **gateway-centric** topology:
- A **gateway service** (Node/TypeScript) aggregates flight data, runs SGP4 for
  satellite groups, predicts passes, and exposes a single **Sky Snapshot** JSON.
- The **ESP32 firmware** is a **thin client**: configure → poll snapshot → render.

On-device SGP4 for a single favourite satellite remains a future enhancement
(ADR roadmap, Phase 4) but is not the primary path.

## Consequences
### Positive
- Firmware stays small, portable across ESP32 display modules, and easy to test.
- Multi-satellite SGP4, pass scheduling, and provider caching live where there
  is CPU and memory.
- One device, or many devices, can share one gateway.
### Negative / trade-offs
- Requires running a gateway (a Raspberry Pi, home server, or small VPS).
- Device needs network reachability to the gateway.
### Follow-ups
- Phase 4: optional on-device SGP4 for an offline "favourite satellite" mode.

## Alternatives considered
- **All-on-device:** simplest deployment but limited to a few satellites and
  awkward to combine with flight aggregation; harder to unit-test.
- **Cloud-only (no local gateway):** raises privacy concerns (observer location)
  and recurring cost; rejected for the hobbyist use case.

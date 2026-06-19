# ADR-0009: Gateway-served browser front-end (second consumer)

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
The ESP32 device is the intended product front-end, but it is the *only* visual
surface and it requires hardware (flashing + a wired display). Before (or
without) hardware, the only way to see data is raw `GET /sky` JSON. Users need a
way to actually *see* the flights and satellites around them immediately.

## Decision
Serve a lightweight **browser front-end** from the gateway itself at `GET /`:
a single static `public/index.html` (vanilla JS + Canvas, no build step) that
polls the existing `GET /sky` endpoint and renders the same views as the
firmware — a flight radar (bearing/distance), a satellite sky-dome (azimuth/
elevation), the next *visible* pass, and warnings.

Architecturally the browser is a **second downstream Conformist**, consuming the
exact same **Sky Snapshot Published Language** as the ESP32 (ADR-0008). No new
domain, endpoint, or contract is introduced — both consumers share one schema
(guarded by the contract test). Express serves the static directory after the
API routes so `/sky` and `/health` are never shadowed.

## Consequences
### Positive
- A usable visual front-end **with zero hardware** — works on any phone/laptop.
- Reuses the existing endpoint, contract, and caching; nothing new to maintain
  on the data side.
- Doubles as a live debugging/demo view for the firmware's rendering logic.
### Negative / trade-offs
- A static page (no framework) keeps it dependency-free but basic; richer UI
  would warrant a real front-end toolchain later.
- The gateway now also serves static assets (shipped in the Docker image).
### Follow-ups
- Optional: observer presets, history trail, dark/light themes.

## Alternatives considered
- **JSON only:** lowest effort, but not something you can "look at".
- **Separate SPA app/deployment:** more capable but adds a build pipeline and a
  second deployable for what is, today, a glanceable radar — premature.

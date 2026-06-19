# SkyWatch — Implementation Plan (phased, ADR-guided)

Build order derived from the [PRD](./prd/PRD.md) and governed by the
[ADRs](./adr/). Each phase has an objective, the ADRs it realises, concrete
deliverables, and a Definition of Done. We work **outside-in with London-School
TDD** (ADR-0006): write a failing test against a port, implement, refactor.

Legend: ✅ done · 🚧 in progress · ⬜ planned

---

## Phase 0 — Foundations & research  ✅
**Objective:** ground the project and set up the workspace and swarm tooling.
- ✅ Research prior art & data sources → [RESEARCH.md](./research/RESEARCH.md)
- ✅ DDD PRD (ubiquitous language, bounded contexts, domain model) → [PRD.md](./prd/PRD.md)
- ✅ ADR set 0001–0008
- ✅ Orphan branch `aircraft-tracking`; RuFlo swarm orchestration initialised
- ✅ Gateway workspace: TypeScript + Jest (ts-jest), hexagonal layout
**DoD:** docs reviewed; `npm test` runs (even with zero tests); ADRs accepted.

## Phase 1 — Domain core (gateway)  ✅
**Objective:** the pure, tested heart of both bounded contexts.
**ADRs:** 0001, 0003, 0004, 0006
- ✅ Shared Kernel: `GeoCoordinate`, `Observer`, haversine/bearing/bounding-box
- ✅ Flight: `Aircraft`, `AircraftFeed` port, `NearbyAircraftService` (range
  filter + distance/bearing + ordering) — mockist tests
- ✅ Satellite: `Satellite`/`LookAngle`/`SatellitePass`, `Propagator` &
  `TleSource` ports, `PassPredictor` (AOS/TCA/LOS) — scripted-fake tests
- ✅ Adapters: `Sgp4Propagator` (satellite.js, integration-tested),
  `OpenSkyFeed` + `mapOpenSkyStates`, `CelestrakTleSource` + `parseTleText`
- ✅ Application: `SkySnapshotService` composing both contexts
**DoD:** ✅ `npm run typecheck` clean; ✅ `npm test` green (20 tests), no network.

## Phase 2 — Gateway HTTP service + live wiring  ⬜
**Objective:** serve the Sky Snapshot to devices and prove it end-to-end.
**ADRs:** 0008, 0002, 0005
- ⬜ `GET /sky` endpoint (Express/Fastify) → `SkySnapshotService` (contract per ADR-0008)
- ⬜ `GET /healthz`; config via env (OpenSky creds, default observer, group)
- ⬜ OpenSky OAuth2 client-credentials token manager (fetch + refresh)
- ⬜ Per-context resilience: a failing feed degrades, never crashes (NFR6)
- ⬜ Integration/e2e smoke tests (nightly/allowed-failure) against live APIs
- ⬜ Dockerfile + `docker compose` for Raspberry Pi / home server
**DoD:** `curl /sky` returns a valid snapshot against live (or recorded) data;
unit suite still offline-green.

## Phase 3 — Visibility & richer satellite features  ⬜
**Objective:** make passes genuinely useful for sky-watching.
**ADRs:** 0004 (follow-up), 0005
- ⬜ Sunlit/eclipse calc → flag **optically visible** passes (sat sunlit + observer dark)
- ⬜ Sub-sample AOS/LOS for sharper rise/set times; magnitude estimate where possible
- ⬜ Multi-group tracking & "next visible ISS/Starlink/NOAA" summaries
- ⬜ Bright-pass ranking for the device's "what to look at" hint
**DoD:** visible-pass tests (scripted illumination) green; documented in PRD.

## Phase 4 — ESP32 firmware (thin client)  ⬜
**Objective:** the physical device people actually look at.
**ADRs:** 0007, 0008, 0001 (follow-up)
- ⬜ PlatformIO project; board profile for ESP32-C3 round display (+ generic TFT)
- ⬜ Wi-Fi AP captive **config portal**: Wi-Fi, observer lat/lon/alt, range+units,
  min elevation, satellite group, gateway URL/creds → persisted to NVS
- ⬜ Poll `GET /sky` (HTTPClient + ArduinoJson); render flight radar + sky dome
  (az/el) + next-pass banner
- ⬜ Optional on-device SGP4 "favourite satellite" offline mode (Arduino SGP4 lib)
**DoD:** device boots, self-configures, and renders a live snapshot from the gateway.

## Phase 5 — Hardening, deploy & polish  ⬜
**Objective:** make it dependable and easy to run.
- ⬜ CI: typecheck + test + lint on PR (GitHub Actions); firmware build job
- ⬜ Caching/back-pressure tuning; rate-limit-aware polling
- ⬜ Optional MQTT/WebSocket push for multi-device (ADR-0008 follow-up)
- ⬜ Deploy guide (Pi/VPS), 3D-print/enclosure notes, end-user setup docs
**DoD:** green CI; one-command gateway deploy; reproducible firmware build.

---

## Cross-cutting practices
- **TDD (London School)** every phase: failing port test → implement → refactor (ADR-0006).
- **One ADR per significant decision**; supersede rather than edit history.
- **Ports stay thin**; provider/library specifics live only in adapters (ADR-0003).
- **No secrets in git** (`.gitignore` covers `.env`); device keeps observer location local (NFR5).

## Traceability (requirement → phase)
| FR | Phase |
| --- | --- |
| FR1, FR2 (nearby flights) | 1 ✅ |
| FR3 (TLE fetch+cache) | 1 ✅ |
| FR4, FR5 (look angle / overhead) | 1 ✅ |
| FR6 (pass prediction) | 1 ✅ |
| FR7 (Sky Snapshot JSON over HTTP) | 1 (model) ✅ / 2 (endpoint) ⬜ |
| FR8 (config portal) | 4 ⬜ |
| FR9 (render) | 4 ⬜ |
| Visible passes (PRD §7 follow-up) | 3 ⬜ |

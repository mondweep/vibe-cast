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

## Phase 2 — Gateway HTTP service + live wiring  ✅
**Objective:** serve the Sky Snapshot to devices and prove it end-to-end.
**ADRs:** 0008, 0002, 0005
- ✅ `GET /sky` endpoint (Express) → `SkySnapshotService` (contract per ADR-0008),
  with observer-query parsing + 400/500 handling
- ✅ `GET /health`; config via env (`config.ts`, OpenSky creds, default observer, group)
- ✅ OpenSky OAuth2 client-credentials token manager (`OpenSkyTokenManager`,
  cached + refresh + in-flight de-dupe); `OpenSkyFeed` accepts a `tokenProvider`
- ✅ Per-context resilience: a failing feed/source degrades to a `warnings[]`,
  never crashes the snapshot (NFR6)
- ✅ Composition root (`main.ts`) + `npm start`; multi-stage Dockerfile +
  `docker compose` + `.env.example` + [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🚧 Nightly/allowed-failure e2e against live APIs (manual smoke verified:
  `GET /sky` returned real aircraft near London) — wire into CI in Phase 5
**DoD:** ✅ `curl /sky` returns a valid live snapshot (verified end-to-end);
✅ unit suite still offline-green (39 tests); ✅ `npm run build` emits `dist/main.js`.

## Phase 3 — Visibility & richer satellite features  ✅
**Objective:** make passes genuinely useful for sky-watching.
**ADRs:** 0004 (follow-up), 0005
- ✅ Low-precision solar geometry (`sun.ts`): Sun ECI, observer solar elevation,
  cylindrical Earth-shadow eclipse test — pure, unit-tested
- ✅ `SunModel` port + `AstronomicalSunModel` adapter; `Propagator` extended with
  `eciPositionKm` for shadow testing
- ✅ `VisibilityService` → flag **optically visible** passes (satellite sunlit +
  observer in darkness, configurable twilight threshold) — London-School tests
- ✅ Wired into `SkySnapshotService`: passes carry a `visible` flag
- ⬜ (future) sub-sample AOS/LOS sharpening; brightness/magnitude estimate;
  per-group "next visible" summaries
**DoD:** ✅ visibility tests (deterministic fakes) green; ✅ solar math tested
against known geometry; passes annotated in the Sky Snapshot.

## Phase 4 — ESP32 firmware (thin client)  ✅ (pending hardware flash)
**Objective:** the physical device people actually look at.
**ADRs:** 0007, 0008, 0001 (follow-up)
- ✅ PlatformIO project; board profiles for ESP32-C3 round display + generic ESP32
- ✅ Wi-Fi AP captive **config portal** (WiFiManager): Wi-Fi, observer lat/lon/alt,
  range, min elevation, satellite group, gateway URL/token → persisted to NVS
- ✅ Poll `GET /sky` (HTTPClient + ArduinoJson) → parse into `sky_model.h`
- ✅ Render: Serial always; round-display radar (flights by bearing/distance,
  satellites on a sky-dome, next-pass banner with visible `*`) under `-DUSE_TFT`
- ✅ Shared JSON contract artefact (`docs/contracts/sky-snapshot.example.json`)
- ⬜ (future) on-device SGP4 "favourite satellite" offline mode (Arduino SGP4 lib)
**DoD:** firmware is complete + modular and parses the live gateway contract
field-for-field. **Remaining:** flash to hardware + board-specific TFT User_Setup
(can't be compiled in CI sandbox — see Phase 5 firmware build job).

## Phase 5 — Hardening, deploy & polish  ✅
**Objective:** make it dependable and easy to run.
- ✅ CI (`.github/workflows/ci.yml`): gateway typecheck + test + build; firmware
  PlatformIO build job (cached)
- ✅ Rate-limit-friendly **caching layer** (`CachingSnapshotService`, TTL +
  in-flight de-dupe, failures not cached) wired into the composition root (NFR3)
- ✅ **Contract guard**: published JSON Schema
  (`docs/contracts/sky-snapshot.schema.json`) validated in CI against the example
  and a freshly produced snapshot, so gateway↔firmware can't drift (ADR-0008)
- ✅ Deploy guide ([DEPLOYMENT.md](./DEPLOYMENT.md)) + device setup
  ([firmware/README.md](../firmware/README.md))
- ⬜ (future) MQTT/WebSocket push for many devices (ADR-0008 follow-up);
  3D-print/enclosure notes
**DoD:** ✅ CI workflow defined (gateway green locally: 58 tests); ✅ one-command
gateway deploy (`docker compose up`); ✅ reproducible firmware build profile.

## Phase 6 — Browser front-end  ✅
**Objective:** a visual front-end you can see *without* ESP32 hardware.
**ADRs:** 0009, 0008
- ✅ Static `public/index.html` (vanilla JS + Canvas, no build step) served by the
  gateway at `GET /`, polling the existing `/sky` endpoint
- ✅ Renders the same views as the firmware: flight radar (bearing/distance),
  satellite sky-dome (az/el), next *visible* pass, warnings; observer inputs +
  auto-refresh
- ✅ Second downstream Conformist over the same Sky Snapshot Published Language —
  no new endpoint/contract; Docker image ships `public/`
**DoD:** ✅ `GET /` serves the page (test); ✅ verified live (radar renders real
flights/sats); 59 tests green.

## Phase 7 — Live deployment + click-to-learn + cloud hardening  ✅
**Objective:** ship it to a URL the team can use, make it informative and robust.
**ADRs:** 0010, 0011
- ✅ Deployed to **Google Cloud Run** (public, warm, min-instances=1); keyless
  GitHub Actions CD via Workload Identity Federation ([DEPLOY-CICD.md](./DEPLOY-CICD.md))
- ✅ **Click-to-learn enrichment** (ADR-0010): `GET /flight/:icao24` (airline +
  route + aircraft type/registration/owner + photo via adsbdb) and
  `GET /satellite/:noradId` (type/owner/launch/orbit via CelesTrak SATCAT) —
  lazy, cached, behind ports; surfaced from radar markers **and** table rows
- ✅ **Cloud hardening** (ADR-0011): adsb.lol default feed (OpenSky blocks cloud
  IPs), IPv4-first DNS, CelesTrak retry + stale-cache + bundled `visual` fallback
- ✅ Browser front-end: GPS location, enlarged radar, click popups, clearer
  next-pass panel, optional shared-token guard
**DoD:** ✅ live URL serves real flights + satellites + passes with no warnings;
✅ enrichment verified live (e.g. AUA33V → Austrian A320neo, VIE→LHR, photo);
✅ **87 tests green**, fully offline.

## Phase 8 — Geographic map view + post-launch fixes (browser)  ✅
**Objective:** let users relate flights/satellites to where they actually are (PRD G6).
**ADRs:** 0012, 0013, 0009
- ✅ Leaflet 1.9.4 (CDN+SRI) + **CARTO Dark Matter** tiles (keyless, dark, HTTPS);
  Stadia fallback documented
- ✅ **Radar ⇄ Map toggle** for flights: observer marker, range circle (= area the
  radar covers), flights at real lat/lon; click a marker → existing details popup
- ✅ Satellites on the map at their **sub-satellite ground point + line to you**
  (ADR-0013); the gateway exposes `subLatDeg`/`subLonDeg`
- ✅ Attribution + privacy note in the UI; footer credit (author + GitHub)
- ✅ Browser-only (the ESP32 keeps the polar radar)

**Post-launch fixes (GitHub issues, TDD where applicable):**
- ✅ **#11** satellites missing on the map → sub-satellite points (ADR-0013);
  flight popup rendered behind the map → z-index fix
- ✅ **#12** details popup cut off at the screen bottom → re-clamp after async
  enrichment loads + `max-height`/scroll
- ✅ **#13** satellite popup hung on "loading more…" (CelesTrak SATCAT blocks the
  cloud IP) → TLE-derived orbital elements in `/sky` (always available) +
  fail-fast SATCAT timeout

**DoD:** ✅ deployed & live; flights + satellites render on the map; popups stay
on-screen and load fast; **97 tests green**, fully offline.
**Process note:** browser presentation (no new domain), so London-School TDD
applies to the gateway-side additions (sub-point, orbital elements) while the UI
is verified by syntax-check + live test; built ADR-first with a *proportionate*
swarm (a research specialist validated tile providers — implementation is one
file, so a larger swarm would be disproportionate per "match agents to complexity").

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
| FR7 (Sky Snapshot JSON over HTTP) | 1 (model) ✅ / 2 (endpoint) ✅ |
| FR8 (config portal) | 4 ✅ |
| FR9 (render) | 4 (ESP32) ✅ / 6 (browser) ✅ |
| Visible passes (PRD §7 follow-up) | 3 ✅ |
| Click-to-learn enrichment (flights + satellites) | 7 ✅ |
| Live cloud deployment + resilience | 7 ✅ |
| FR10 (map view), FR11 (satellites on map) | 8 ✅ |
| Post-launch fixes (#11 sats-on-map, #12 popup clamp, #13 orbital info) | 8 ✅ |

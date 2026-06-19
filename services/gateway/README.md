# SkyWatch Gateway

The service that aggregates flight data and computes satellite passes, then
serves a single **Sky Snapshot** to ESP32 devices. TypeScript, hexagonal
architecture, DDD bounded contexts, London-School TDD.

## Scripts
```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # Jest (offline, deterministic)
npm run build       # emit dist/ (entry: dist/main.js)
npm start           # run the built gateway (reads env / .env)
```

## HTTP API (ADR-0008)
- `GET /healthz` → `{ "status": "ok" }`
- `GET /sky?lat=&lon=&altKm=&rangeKm=&minEl=` → the **Sky Snapshot** JSON
  (flights + satellites overhead + upcoming passes + `warnings[]`). All query
  params are optional and fall back to the configured observer defaults.

Configuration is via environment variables — see
[`.env.example`](./.env.example). OpenSky OAuth2 credentials are optional
(`OPENSKY_CLIENT_ID`/`SECRET`); without them the gateway calls OpenSky
anonymously. Deploy with Docker — see [../../docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

## Architecture (ADR-0003)
```
src/
  shared/                 Observer + geo math (Shared Kernel)
  flight/
    domain/               Aircraft, NearbyAircraftService
    ports/                AircraftFeed (driven port)
    adapters/             OpenSkyFeed + mapOpenSkyStates (ACL)
  satellite/
    domain/               Satellite, LookAngle, SatellitePass, PassPredictor
    ports/                Propagator, TleSource (driven ports)
    adapters/             Sgp4Propagator (satellite.js), CelestrakTleSource
  application/            SkySnapshotService (composes both contexts)
  index.ts                public barrel
test/                     mirrors src/ — mockist tests + adapter/integration tests
```

The **domain depends only on ports**; HTTP/JSON/SGP4 specifics live in adapters,
so providers and the propagation library are swappable (ADR-0002, 0004, 0005).

## Testing approach (ADR-0006)
- `NearbyAircraftService` — mocked `AircraftFeed`; asserts the queried box and
  range filtering/ordering.
- `PassPredictor` — scripted fake `Propagator` (deterministic elevation curve);
  no SGP4 in the unit test.
- Adapters — pure mappers/parsers tested directly; HTTP via injected `fetch`;
  one real-SGP4 integration test.
- **No network** in any test.

## Status
**Phases 1–2 complete:** domain core + adapters, the OAuth2 token manager, the
`GET /sky` / `GET /healthz` HTTP service, per-context resilience, and Docker
deploy assets. Verified end-to-end against live OpenSky data (39 tests green,
fully offline). Next: Phase 3 (visible-pass calculation) and Phase 4 (ESP32
firmware) — see [../../docs/IMPLEMENTATION-PLAN.md](../../docs/IMPLEMENTATION-PLAN.md).

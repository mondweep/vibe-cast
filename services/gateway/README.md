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

Configuration is via environment variables — see `.env.example`. OpenSky OAuth2
credentials are optional (`OPENSKY_CLIENT_ID`/`SECRET`); without them the gateway
calls OpenSky anonymously. Deploy with Docker — see
[../../docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

### Caching (NFR3)
Snapshots are cached per observer for `CACHE_TTL_MS` (default **30000** ms) via
`CachingSnapshotService`, with concurrent polls sharing one in-flight
computation and failures never cached. Computing passes for a large satellite
group (e.g. `visual`, ~150 sats × 6 h) takes several seconds, so the TTL should
stay well above that to keep device polls cheap and within provider rate limits.

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
**Phases 1–5 complete** (gateway side): domain core + adapters, OAuth2 token
manager, `GET /sky` / `GET /healthz`, per-context resilience, optically-visible
pass detection, snapshot caching, a JSON-schema contract guard, Docker deploy
assets, and CI. **58 tests green, fully offline**; verified end-to-end against
live OpenSky data. The ESP32 firmware (Phase 4) awaits a hardware flash. See
[../../docs/IMPLEMENTATION-PLAN.md](../../docs/IMPLEMENTATION-PLAN.md).

# SkyWatch Gateway

The service that aggregates flight data and computes satellite passes, then
serves a single **Sky Snapshot** to ESP32 devices. TypeScript, hexagonal
architecture, DDD bounded contexts, London-School TDD.

## Scripts
```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # Jest (offline, deterministic)
npm run build       # emit dist/
```

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
**Phase 1 complete** (domain core + adapters). The HTTP `GET /sky` endpoint and
live OpenSky/CelesTrak wiring are Phase 2 — see
[../../docs/IMPLEMENTATION-PLAN.md](../../docs/IMPLEMENTATION-PLAN.md).

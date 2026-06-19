# ADR-0004: SGP4 propagation via satellite.js on the gateway

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
Satellite positions are computed from TLEs using the SGP4/SDP4 model. We need a
trustworthy implementation. Per ADR-0001 the heavy lifting runs on the gateway
(TypeScript/Node). Options: `satellite.js`, `tle.js` (wraps satellite.js), a
hand-rolled SGP4, or a Python service (skyfield/pyephem).

## Decision
Use **`satellite.js`** on the gateway, wrapped by an `Sgp4Propagator` adapter
implementing the `Propagator` port. The adapter converts ECI → ECF → look angles
(`twoline2satrec`, `propagate`, `gstime`, `eciToEcf`, `ecfToLookAngles`),
memoises parsed satrecs per TLE, and returns our `LookAngle` value object in
degrees/kilometres. A minimal ambient type declaration (`types/satellite.js.d.ts`)
covers the surface we use.

## Decision
The **domain** (`PassPredictor`) depends on the `Propagator` *port*, never on
satellite.js — so pass-detection logic is tested with a scripted fake and SGP4 is
covered by one focused integration test.

## Consequences
### Positive
- Battle-tested SGP4; no orbital math to maintain ourselves.
- Stays in the gateway's language (TS) — one runtime, easy testing.
- Library is swappable (port) and isolated (single adapter).
### Negative / trade-offs
- satellite.js typings are minimal — mitigated with a local `.d.ts`.
### Follow-ups
- Phase 3: add sunlit/visibility (eclipse) calculation for "visible pass" labels.
- Phase 4: evaluate an Arduino SGP4 lib for optional on-device mode.

## Alternatives considered
- **Python/skyfield:** excellent accuracy but adds a second runtime and an
  inter-process boundary; rejected for now.
- **Hand-rolled SGP4:** unjustified risk vs. a maintained library.

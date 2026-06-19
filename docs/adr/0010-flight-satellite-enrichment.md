# ADR-0010: Lazy flight & satellite enrichment via adsbdb + CelesTrak SATCAT

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
Users want to click a marker and learn *what* it is: for a flight, the airline
and route (origin → destination) and aircraft type; for a satellite, what it is
and its orbit. ADS-B (OpenSky/adsb.lol) carries only position + callsign + ICAO24
— **not** route or airline — so enrichment needs an external lookup. The Sky
Snapshot is polled frequently by every consumer, so enrichment must not bloat it.

## Decision
Add **lazy, per-item enrichment endpoints** the front-end calls only on click:
- `GET /flight/:icao24?callsign=…` → airline + route + aircraft (registration,
  type, owner, photo).
- `GET /satellite/:noradId` → catalogue metadata (type, owner, launch, period,
  inclination, apogee/perigee).

Sources sit behind **ports + adapters** (ADR-0003):
- `FlightInfoProvider` ← `AdsbdbFlightInfo` over **adsbdb.com** (free, no auth):
  `/aircraft/{icao24}` (works broadly, incl. a photo) and `/callsign/{cs}`
  (route — commercial flights only; private/GA return "unknown" → `null`).
- `SatelliteInfoProvider` ← `CelestrakSatcatInfo` over **CelesTrak SATCAT**.

Both adapters **cache with a TTL** (enrichment data is near-static) and **degrade
to `null` instead of throwing**, so a popup never breaks. The same token guard as
`/sky` applies. Enrichment is **kept out of the Sky Snapshot** so the polled
read-model stays small and the contract (ADR-0008) is unchanged.

## Decision: gateway-side, not browser-direct
adsbdb is CORS-open, so a browser could call it directly — but routing it through
the gateway gives **one shared cache** (kind to upstream rate limits for a whole
team), avoids per-user third-party exposure, keeps SATCAT (uncertain CORS)
working, and lets the ESP32 reuse it later.

## Consequences
### Positive
- Rich click-to-learn UX (airline, route, aircraft photo, orbit) with no change
  to the hot `/sky` path; cached and resilient.
- New sources are swappable adapters; the browser stays simple.
### Negative / trade-offs
- Extra third-party dependencies (adsbdb, CelesTrak SATCAT); mitigated by caching
  and null-degradation.
- Route data is unavailable for private/GA flights (upstream limitation).

## Alternatives considered
- **Embed enrichment in every Sky Snapshot:** bloats a frequently-polled payload
  and multiplies upstream calls — rejected.
- **Browser calls adsbdb directly:** fastest, but no shared cache/rate-limit
  protection and doesn't cover SATCAT — rejected for a team deployment.

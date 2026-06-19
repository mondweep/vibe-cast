# ADR-0002: OpenSky as the default flight feed, behind a pluggable port

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
Flights can come from community ADS-B aggregators (OpenSky, adsb.lol,
airplanes.live, adsb.fi), paid APIs (FlightAware, FR24), or a self-hosted
RTL-SDR/dump1090. The hackster "Micro Radar" build uses OpenSky and proves it
works from an ESP32 over Wi-Fi without RF hardware (preserving zero-soldering).
These providers differ in auth, shape, and rate limits.

## Decision
- Default flight source is the **OpenSky Network** `/states/all` bounding-box
  endpoint, with OAuth2 client-credentials bearer auth.
- Access it only through an **`AircraftFeed` port** (`fetchInBoundingBox`). The
  OpenSky-specific mapping (positional `states` array → `Aircraft`) lives in an
  adapter (`OpenSkyFeed`) as an Anti-Corruption Layer.

## Consequences
### Positive
- Swappable sources: adsb.lol / local dump1090 become new adapters, no domain
  change (NFR2).
- Domain never sees HTTP, JSON indices, or auth.
### Negative / trade-offs
- OpenSky credit limits require modest polling and caching.
- OAuth2 token lifecycle must be handled in the adapter/config.
### Follow-ups
- Add an `Adsb.lolFeed` and a `Dump1090Feed` adapter in a later phase.

## Alternatives considered
- **Paid APIs:** richer/faster but cost and ToS overhead — out of scope.
- **Own RTL-SDR receiver:** best data, but reintroduces hardware and breaks the
  zero-soldering goal; kept as an optional local adapter only.

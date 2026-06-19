# ADR-0005: TLE acquisition from CelesTrak with a TTL cache

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
SGP4 needs TLEs. CelesTrak and Space-Track are the canonical sources. CelesTrak
serves grouped element sets over HTTPS without auth (e.g. `GROUP=stations`,
`visual`, `starlink`, `noaa`). TLEs change slowly (epoch ages over days) but the
endpoints must not be hammered.

## Decision
- Fetch TLEs from **CelesTrak GP** (`gp.php?GROUP=<group>&FORMAT=tle`) via a
  `CelestrakTleSource` adapter implementing the `TleSource` port.
- Parse the repeating `(name, line1, line2)` triples with a **pure** parser
  (unit-tested) and extract the NORAD id from line 1.
- **Cache per group with a TTL** (default 6 h; TLEs effectively valid ~24 h) and
  an injectable clock so caching is deterministically testable.

## Consequences
### Positive
- Few network calls; resilient to brief CelesTrak unavailability within the TTL.
- No credentials required (unlike Space-Track).
- Pure parser is trivially testable; cache verified with a fake clock.
### Negative / trade-offs
- In-memory cache is per-process; lost on restart (acceptable; re-fetch is cheap).
### Follow-ups
- Optional Space-Track adapter for specialised catalogues.
- Persist cache to disk/flash for cold starts if needed.

## Alternatives considered
- **Space-Track:** authoritative but requires an account/login flow.
- **n2yo / ISS pass APIs:** offload prediction entirely, but couple us to a
  third-party predictor and lose multi-satellite flexibility.

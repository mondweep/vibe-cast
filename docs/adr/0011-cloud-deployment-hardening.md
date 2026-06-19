# ADR-0011: Cloud-deployment hardening — adsb.lol default feed, IPv4-first DNS, resilient CelesTrak

- **Status:** Accepted
- **Date:** 2026-06-19
- **Supersedes (in part):** ADR-0002 (OpenSky is no longer the default flight feed)

## Context
Deploying the gateway to **Google Cloud Run** surfaced three issues that did not
appear in local development, each of which broke a core feature in the cloud:

1. **OpenSky blocks datacenter IPs.** OpenSky's anonymous `/states/all` works from
   a dev machine but the connection is dropped from Cloud Run's IP range (`fetch
   failed`). So the default flight feed (ADR-0002) produced **zero flights** in
   production.
2. **Node `fetch` (undici) fails on IPv6-first.** On Cloud Run, Node resolved
   AAAA records and attempted an unroutable IPv6 address without falling back,
   so **CelesTrak** (and any dual-stack host) failed at the connection level.
3. **CelesTrak intermittently throttles cloud IPs.** Even with IPv4, CelesTrak
   periodically refuses the Cloud Run IP for minutes at a time (observed via a
   2-minute poll), blanking the satellite view and the SATCAT enrichment.

## Decision
1. **Default flight feed → adsb.lol** (`FLIGHT_SOURCE=adsblol`). It is open, needs
   no auth, is friendly to cloud egress, and queries by point+radius (mapped from
   our bounding box). OpenSky remains available via `FLIGHT_SOURCE=opensky` (+
   optional OAuth2). This is a clean swap because both are `AircraftFeed`
   adapters (ADR-0003) — no domain change.
2. **Force IPv4-first DNS** via `NODE_OPTIONS=--dns-result-order=ipv4first`, set in
   the deploy config (so CI/keyless deploys inherit it). The env var is set before
   `undici` initialises, which the in-code `dns.setDefaultResultOrder` did not
   reliably achieve; the code call is kept as belt-and-braces.
3. **Make CelesTrak access resilient:** `CelestrakTleSource` and
   `CelestrakSatcatInfo` retry with backoff, serve a stale cache rather than fail,
   and `CelestrakTleSource` falls back to a **bundled `visual` TLE snapshot**
   (`src/satellite/data/visual-fallback.ts`, ~148 sats) when every live fetch
   fails — so the satellite view never goes blank. TLE cache TTL raised to 12h.

## Consequences
### Positive
- Flights, satellites, and passes all work in the cloud; the satellite view
  degrades gracefully (bundled fallback) instead of disappearing during a
  CelesTrak throttle. Verified live on Cloud Run.
- Source-agnosticism (ADR-0003) paid off: swapping the feed was an adapter + one
  config line.
### Negative / trade-offs
- The bundled fallback TLE ages; it is a last resort (TLEs stay usable for
  days–weeks) and should be refreshed occasionally.
- Per-click SATCAT enrichment still depends on CelesTrak, so satellite *metadata*
  (not the overhead view) can be briefly unavailable during a throttle; the UI
  degrades to basics + an N2YO live-track link.
### Follow-ups
- Consider a second TLE source (e.g. an authenticated Space-Track adapter) for
  deeper resilience; periodically refresh the bundled fallback.

## Alternatives considered
- **Keep OpenSky + add OAuth2:** auth may not lift a datacenter-IP block, and it
  adds credential setup; adsb.lol "just works" from the cloud.
- **A VPC egress / static IP** to present a non-datacenter IP to OpenSky/CelesTrak:
  heavier infra for a hobbyist deployment; rejected.

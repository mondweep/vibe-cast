# ADR-0012: Geographic map view for flights in the browser front-end

- **Status:** Accepted
- **Date:** 2026-06-19
- **Extends:** [ADR-0009](./0009-browser-frontend.md) (browser front-end)

## Context
The polar radar is accurate but abstract — users asked to **relate what they see
to where they actually are**: real coastlines/streets, their own position, and
the area the range covers. Every aircraft in the Sky Snapshot already carries its
true `latitudeDeg`/`longitudeDeg`, so plotting flights on a real map is a natural,
high-relatability win. Satellites, by contrast, are an *overhead* concept
(azimuth/elevation), not a ground position — they do not belong on a street map.

Constraints: must use a **free** map service; the page is **dark-themed**; it is
served over **HTTPS** on Cloud Run; and it must stay a thin browser feature (the
ESP32 cannot render slippy maps, so it keeps the polar radar — this is a
browser-only enhancement, consistent with ADR-0009).

## Decision
Add a **Map view** to the browser front-end, using **Leaflet 1.9.4** (via CDN
with SRI) and **CARTO "Dark Matter" raster tiles** as the default basemap:

- **Tiles:** `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`
  (subdomains `abcd`). **No API key**, dark aesthetic, HTTPS, global CDN, suitable
  for a low-traffic team app. Attribution shown: © OpenStreetMap contributors © CARTO.
  **Documented fallback:** Stadia Maps `alidade_smooth_dark` with a free account +
  Cloud Run domain allow-listed (formal 200k credits/month SLA) if CARTO's
  keyless CDN proves insufficient.
- **Flights view = Radar ⇄ Map toggle.** Radar (polar) stays the default; Map
  shows the same flights at their **real positions**, an **observer marker**, and
  a **range circle** (`L.circle`, radius = the observer's range) = "the area the
  radar covers". Clicking a flight marker reuses the existing details popup
  (`openFlight`), so airline/route/aircraft enrichment works identically.
- **Satellites stay on the sky-dome** (they're overhead, not a ground point).
  Satellite ground-tracks are a possible future addition, not v1.
- **No gateway/domain change.** The data is already in `/sky`; this is pure
  browser presentation. Leaflet is loaded from a CDN; tiles are `<img>` requests.

## Consequences
### Positive
- Immediately relatable: users see themselves, the covered area, and planes over
  real geography. Reuses the existing snapshot, enrichment popup, and GPS centring.
- Keyless default → no secret management; provider is swappable in one line.
### Negative / trade-offs
- **Privacy:** panning/zooming the map sends tile requests (viewport + IP) to the
  tile provider, who can infer the user's approximate location — same class of
  trade-off as the flight-info lookups (ADR-0010). Noted in the UI/docs.
- External CDN dependency (Leaflet + tiles); attribution is mandatory.
- If we ever add a Content-Security-Policy, it must allow `img-src` cartocdn +
  `script-src`/`style-src` unpkg (Leaflet injects inline styles).
### Follow-ups
- Optional satellite ground-tracks / sub-satellite points.
- Optional satellite-imagery basemap toggle (Esri World Imagery, non-commercial).

## Alternatives considered
- **OpenStreetMap standard tiles:** keyless but light-only (clashes with the dark
  UI) and the OSMF policy explicitly may withdraw access for heavier/commercial
  use — kept only as a light-theme option.
- **MapTiler / keyed Stadia:** richer styles but require an API key in front-end
  JS (mitigated by domain restriction); unnecessary given CARTO is keyless.
- **Map replacing the radar entirely:** loses the satellite sky-dome and the
  at-a-glance polar view; a toggle keeps both.

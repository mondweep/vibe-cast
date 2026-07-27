# ADR-0008: Inline SVG point map, deferred choropleth

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Infrastructure Impact swarm

## Context

FR-2.6 requires a damage map. The bulletin's infrastructure sections carry longitude and latitude per damaged item — roads, bridges, embankments, schools, anganwadi centres, ponds — so the data for a point map is already in hand.

FR-2.7 additionally wants a district choropleth, which needs boundary polygons. Those are **not** in the bulletin, and this is the product's highest-likelihood risk (PRD §9): Assam revenue-circle boundaries in GeoJSON are not reliably or freely available at the granularity that would make a choropleth operationally useful. District boundaries are obtainable; revenue-circle boundaries — the level at which decisions are actually made — largely are not.

Meanwhile, a mapping library (Leaflet ~45 KB, MapLibre GL ~200 KB) brings a hard problem with it: **tile servers are a network dependency**. Every tile request violates NFR-5's spirit and would require loosening the `connect-src 'self'` CSP that ADR-0004 and ADR-0007 rely on. Self-hosting Assam raster tiles at usable zoom levels is hundreds of megabytes — incompatible with a static deploy and with offline use.

## Decision

**Ship an inline SVG point map. Defer the choropleth.**

1. Project lat/long linearly onto Assam's bounding box (89.7–96.0°E, 24.1–28.2°N) from the shared kernel. At Assam's latitude the distortion of an equirectangular projection is small enough to be irrelevant for locating damage clusters, which is the actual job.
2. **No basemap tiles.** Damage points are rendered against a plain field with a district-centroid reference layer for orientation. This keeps `connect-src 'self'` intact and works fully offline.
3. Points are typed by damage class using **shape and fill together, never colour alone** (NFR-8).
4. **`approximate` coordinates render distinctly** from `precise` ones — hollow and dashed, with a legend note explaining that the source reported insufficient precision. The 2026-07-27 bulletin contains bare `94, 27` values for Charaideo's fisheries rows, accurate to roughly 100 km; plotting those as though they were precise would be a lie told in pixels.
5. Overlapping points cluster with a count badge.
6. **Choropleth is a `Should`, not a `Must`** (PRD §6.2), gated on boundary data being sourced. When district GeoJSON is available it can be added behind the same SVG renderer with no new dependency.

## Consequences

**Positive**

- Zero new dependencies; zero network egress; works offline.
- Full control over the approximate-vs-precise distinction, which an off-the-shelf marker layer would not give without fighting it.
- Tiny: a few KB of SVG against ~200 KB for MapLibre.
- Renders crisply on a projector at any zoom (NFR-11).

**Negative**

- **No geographic context.** Points float without rivers, roads, or settlements behind them. This is the real cost, and for a flood tool — where the Brahmaputra's course is the single most orienting feature on any map of Assam — it is a genuine loss, partly offset by the district-centroid reference layer.
- No pan/zoom/rotate out of the box; basic zoom must be hand-rolled if needed.
- Linear projection is not equal-area, so it is unsuitable for any future area-based calculation. Documented so nobody builds one on it.

## Alternatives considered

- **Leaflet or MapLibre with OSM tiles.** Rejected: requires loosening the CSP and breaks offline operation, in exchange for context that is nice rather than necessary.
- **Self-hosted vector tiles for Assam.** Rejected for v1 on bundle size, but the **best future option** — a PMTiles archive of Assam at moderate zoom would restore geographic context while staying static and offline-capable. Revisit if users report the missing basemap as a real impediment.
- **Static basemap image of Assam.** Rejected: attribution and licensing complexity for a raster that would be blurry on a projector, and it would still not scale under zoom.

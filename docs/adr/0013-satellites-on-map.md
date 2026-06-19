# ADR-0013: Satellites on the map via sub-satellite ground points

- **Status:** Accepted
- **Date:** 2026-06-19
- **Extends:** [ADR-0012](./0012-geographic-map-view.md)
- **Issue:** [#11](https://github.com/mondweep/vibe-cast/issues/11)

## Context
ADR-0012 added a geographic Map view for flights and deliberately kept satellites
on the polar sky-dome only, reasoning that satellites are *overhead* (azimuth /
elevation), not at a ground position. Users found their absence on the map
confusing — they want to see the satellites there too. A satellite *does* have a
meaningful ground position: its **sub-satellite point** (the point on Earth's
surface directly beneath it). The catch: for a low pass the sub-point can be
hundreds of km away from the observer (well outside the flight-range circle),
whereas a near-overhead pass sits almost on top of the observer.

## Decision
Plot satellites on the Map view at their **sub-satellite ground point**, with a
**faint line from the observer to each** (so the direction and distance are
obvious, and it's clear a far-off marker is the same thing that's "overhead").
**Keep the map at the flight-range zoom** — do not auto-fit to include distant
sub-points; satellites beyond the view stay off-screen until the user pans/zooms
(chosen with the maintainer).

To support this, the **gateway computes the sub-satellite point** for every
overhead satellite and exposes it on each `satellitesOverhead` entry in `/sky`
(`subLatDeg`, `subLonDeg`). The conversion is a **pure domain function**
(`subSatellitePoint(eci, at)`: ECI position + GMST → geocentric lat/lon) fed by
the existing `Propagator.eciPositionKm` — no new external dependency, and it is
unit-tested London-School (a scripted ECI → asserted sub-point) plus a real-SGP4
integration test. The JSON-schema contract (ADR-0008) gains the two nullable
fields, guarded by the contract test.

Clicking a satellite marker reuses the existing `openSatellite` details popup.

(Also fixed alongside, per issue #11: the details popup `z-index` is raised above
Leaflet's panes so it is visible over the map — a CSS-only bug fix, not an
architectural decision.)

## Consequences
### Positive
- Satellites appear in both views; the map shows *where over the Earth* they are,
  the radar shows *where in your sky*. The connecting line ties the two together.
- Pure, testable conversion; no new third-party dependency; contract stays in sync.
### Negative / trade-offs
- A near-overhead satellite's sub-point sits almost on the observer (markers can
  overlap "you"); a low pass sits far away — both are physically correct but can
  surprise. The line mitigates the confusion.
- Geocentric (spherical) latitude is used for the marker — up to ~0.2° off the
  geodetic value; immaterial for a map dot, avoids an oblateness correction.
### Follow-ups
- Optional: short orbital ground-*track* (a few minutes either side of now).

## Alternatives considered
- **Keep satellites radar-only (status quo, ADR-0012):** rejected — users want them
  on the map.
- **Draw satellites near the observer regardless of true position:** simpler but
  geographically wrong and misleading; rejected.
- **Auto-fit the map to include all sub-points:** shrinks the local flight area and
  fights the "relatable, where am I" goal; rejected (keep flight-range zoom).

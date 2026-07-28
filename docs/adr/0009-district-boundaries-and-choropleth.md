# ADR-0009: District boundaries bundled; choropleth shipped; projection corrected

- **Status:** Accepted
- **Date:** 2026-07-28
- **Supersedes:** ADR-0008 in part — specifically its decisions 1 (linear
  projection), 2 (no basemap), and 6 (choropleth deferred). ADR-0008's other
  decisions and its reasoning about mapping libraries stand.
- **Deciders:** Infrastructure Impact swarm

## Context

An officer who used the console said this about the damage map:

> "The damage map doesn't show the map of Assam — only dots. Without the map it
> doesn't add value."

They were right, and the criticism goes further than aesthetics. A point at
`94.73, 26.92` on an empty field tells nobody *where*. The whole value of
plotting geography is that a reader recognises the place; without the place,
the plot is a scatter chart with degrees on its axes, and the officer already
had the table.

ADR-0008 deferred the choropleth on a stated assumption: that boundary data at
a useful granularity was not obtainable. **That assumption was falsified.**
Assam District boundaries of Census 2011 lineage are published by the DataMeet
India community under CC BY 4.0. Simplified with Douglas–Peucker at 0.002°
(~200 m) and rounded to four decimal places, all 33 Districts come to 67 kB of
GeoJSON — 18.5 kB gzipped. Provenance and processing are recorded in
`fixtures/README.md`.

Two things ADR-0008 said that were **not accurate** and are corrected here:

1. It described the map as rendering points "with a district-centroid reference
   layer for orientation". No such layer was ever built. The map was points on
   an empty field, exactly as the officer described. ADR-0008 has been amended
   to say so.
2. It claimed the distortion of mapping longitude and latitude independently
   onto a bounding box was "small enough to be irrelevant". It was not. At
   26.2°N a degree of longitude is 0.897 of a degree of latitude, so Assam was
   drawn about 11% too wide. That is not a rounding error; it is the shape of
   the state.

What has **not** changed is the constraint that produced ADR-0008 in the first
place. A tile server is still a network dependency, still incompatible with
`connect-src 'self'` (ADR-0004, ADR-0007), and still incompatible with offline
use in a control room. Nothing here reopens that.

## Decision

**Bundle the District boundaries. Draw Assam. Shade it. Fix the projection.**

### 1. Boundaries ship as a generated TypeScript module

`fixtures/assam-districts.geojson` → `src/generated/assam-districts.ts`, via
`scripts/generate-assam-districts.ts` (`npm run generate:assam-districts`).
This follows `generate-bundled-bulletins.ts` exactly, for the same reasons: the
committed artefact costs no build-time work, the GeoJSON envelope and per-
feature `properties` never reach the bundle, and the shape stays under the type
checker.

The artefact is guarded by `src/adapters/ui/assam-districts.test.ts`, which
re-derives the boundaries from the fixture on every test run — through the same
pure transform the generator used — and asserts equality. Hand-edit the
generated file and the test fails. The generator's pure half lives in
`scripts/assam-districts-source.ts` precisely so importing it has no side
effect.

### 2. Equirectangular projection with a standard parallel at 26.2°N

    x = PAD + (λ − λ_min) · cos(26.2°) · SCALE
    y = PAD + (φ_max − φ) · SCALE

One scale factor for both axes; longitude discounted by cos(26.2°) ≈ 0.8973.
The viewBox height is **derived** from that scale (740.7 for a width of 1000),
not chosen, so nobody can re-break the aspect ratio by rounding it to a tidier
number. `map-projection.test.ts` asserts that a kilometre east is the same
length as a kilometre north, to within 1%.

This is still not equal-area and still not conformal — scale drifts about ±2.5%
between Assam's northern and southern edges. **Do not compute an area from it.**
ADR-0008's warning on that point stands unchanged.

### 3. Choropleth with four states, not two (FR-2.7)

A choropleth's characteristic failure is having exactly two states — shaded and
unshaded — and letting the second absorb three different situations. This one
has four, which is ADR-0005 drawn rather than printed:

| State | Meaning | Rendered as |
|---|---|---|
| `reported` | figure above zero | one of five sequential fills |
| `reported-nil` | reported, and the figure is zero | flat cool fill, definite edge |
| `unknown` | in the bulletin, this measure not reported | diagonal hatch |
| `absent` | no row in the bulletin at all | stipple, broken edge |

`absent` is textured rather than left blank on purpose. **A blank District is
what "fine" looks like**, and a District nobody has heard from is not fine.

The ramp is single-hue and monotonic in lightness (L\* ≈ 95 → 63), so ordering
survives greyscale and every form of colour vision deficiency. It is never the
only channel regardless (NFR-8): the legend prints the numeric band edges, each
District's `<title>` states its figure and band in words, and the same
sentences appear in a visually-hidden list for screen readers.

The darkest step stops at L\* 63 deliberately. Geography is **ground**; the
damage markers are **figure**. A saturated choropleth would take the eye off the
thing the view is named after.

Bands are five equal intervals from just above zero to a rounded maximum.
Equal-interval rather than quantile because a bulletin carries 6–8 affected
Districts, and quantile breaks over that few values move whenever one figure
changes — the same colour would mean something different on consecutive days.

### 4. The measure is the user's choice

Population Affected (default), Crop Area Submerged, or Inmates in Relief Camps.
The choice is a visible control, and the chosen measure is named in the legend,
in the SVG's `aria-label`, and in every District's title text.

**Severity Index is deliberately not offered as a shading measure.** It is this
console's own weighted composite (ADR-0006) with user-editable weights, and a
shaded state map is the last place a derived number should be able to pass
itself off as a reported one.

### 5. District names are matched explicitly, never fuzzily

Comparison folds case, whitespace and the punctuation the two sources disagree
about — `Kamrup (M)` → `kamrup m`, `South Salmara-Mankachar` →
`south salmara mankachar` — and an explicit alias table maps the rest.

On the 2026-07-27 bulletin, seven of eight Districts match by name and one does
not: ASDMA writes **`Kamrup (M)`** where the boundary data says **`Kamrup
Metropolitan`**. That single case is why the matching is a table and not a
prefix test: **`Kamrup` also exists as a separate rural District in both
sources**, so a substring match would shade rural Kamrup with Guwahati's
figures — a wrong answer rather than a missing one.

A bulletin District with no boundary — Bajali (2021) and Tamulpur (2022) are
real Districts created after Census 2011 — is **named in the UI** as reported
but unshaded. It is never folded into its parent District and never silently
dropped.

### 6. The map says what it is not

Three limitations are stated beside the map rather than left for the reader to
discover:

- **Shading stops at District.** The bulletin reports to Revenue Circle, and
  Revenue Circle boundaries are not published as open data. An unshaded part of
  a shaded District therefore means nothing at all, and the UI says so, because
  an officer reading it as "this Circle is fine" would be reading a fact that
  is not there.
- **No rivers.** For a flood map this is a real loss — the Brahmaputra is the
  single most orienting feature on any map of Assam. We have no channel
  geometry: not in the bulletin, which carries river names and gauge readings
  but no shapes, and not in the boundary data. So it is absent and labelled as
  absent, not approximated. A hand-drawn river would be a lie told in pixels,
  which is the same mistake as plotting a two-significant-figure coordinate as
  a surveyed position.
- **Attribution** for the boundary data appears beside the map, as CC BY 4.0
  requires.

## Consequences

**Positive**

- The map answers "where" — and, via the choropleth, PRD §2.1 question 1,
  "which Districts are worst", at a glance rather than by reading a table.
- Still zero new dependencies, still zero network egress, still fully offline.
  Paths are hand-rolled from the GeoJSON rings.
- Still crisp on a projector at any zoom (NFR-11) — it is vector all the way
  down.
- The reported/nil/unknown/absent distinction is now visible in the one view
  where it is easiest to lose.

**Negative**

- **The entry chunk grew by ~23 kB gzipped**: ~20 kB of District geometry and
  ~3 kB of choropleth code, taking it from 101 kB to 124 kB gzipped. That is a
  real cost against NFR-3 and it is paid at first paint, because the map view
  is statically imported. If NFR-3 ever comes under pressure, the boundaries
  are the obvious thing to move behind a dynamic import — they are needed only
  when the Damage Map view is opened, and the machinery for that split already
  exists for pdf.js. Not done now: one lazy boundary is enough complexity to
  justify, and this one is not yet paying for itself.
- **Boundaries are Census 2011 vintage.** Districts created since then have no
  polygon. Handled by naming them, not by guessing.
- **Still no Revenue Circle granularity**, which remains where decisions are
  actually made. This is a smaller gap than before but it is the same gap.
- The licence trail for the immediate source file is community republication of
  Census data rather than a first-party licence statement. Low risk for factual
  government boundary data, worth confirming before any public release —
  flagged in `fixtures/README.md`.

## Alternatives considered

- **Keep deferring, add centroid labels instead.** Rejected: this is roughly
  what ADR-0008 claimed to have and did not, and District name labels floating
  on an empty field would not have answered the officer's complaint. You cannot
  recognise a place from a list of its parts.
- **Fetch boundaries at runtime.** Rejected outright: `connect-src 'self'` and
  offline operation are load-bearing (ADR-0004, ADR-0007).
- **Full geometry, unsimplified (657 kB).** Rejected: ten times the payload for
  detail below one rendered pixel at state scale.
- **Round coordinates further in the generator** to shave a few kB. Rejected:
  it would weaken the artefact test from an identity check against the fixture
  to a check against a transform of it, and that test is the only thing
  standing between the committed artefact and silent drift.
- **A mapping library with vector tiles (PMTiles).** Still the best future
  option for real basemap context, and still rejected for the same reasons
  ADR-0008 gave. Revisit if the absent rivers turn out to be the next
  complaint.

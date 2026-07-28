# Fixtures

## `Daily_Flood_Report_20260727.pdf`

The ASDMA / DRIMS Assam Daily Flood Report for 27 July 2026, as published. Used
by the golden-file test (`src/adapters/pdf/golden.test.ts`) and as the source of
the bundled default bulletin. Public information published by the Assam State
Disaster Management Authority.

`Daily_Flood_Report_20260727.txt` is a plain-text extraction of the same file,
kept only as a reading aid when working on the parser.

## `assam-districts.geojson`

District boundaries for Assam — 33 districts, the administrative level at which
the bulletin reports.

- **Provenance:** Census of India 2011 district boundaries. The feature
  properties retain the Census district code (`dtCode`) alongside the name.
- **Processing:** simplified with Douglas–Peucker at a tolerance of 0.002°
  (roughly 200 m) and rounded to four decimal places. That is far finer than a
  state-scale map needs and leaves the coastline-level detail of the district
  edges intact, while bringing the file from 657 kB to ~67 kB (18 kB gzipped).
- **Why bundled rather than fetched:** the console works offline and its CSP
  sets `connect-src 'self'` (ADR-0004, ADR-0007). Boundary data has to ship with
  the app or not exist at all.

**Attribution.** Administrative boundary datasets for India of this lineage are
published by the [DataMeet India community](http://datameet.org/) under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution is
carried in the UI beside the map.

> **Licensing note for the repository owner.** The immediate file this was
> derived from was republished without an explicit licence statement, though the
> underlying data is Census 2011 administrative boundaries and the established
> community publication of that data is CC BY 4.0. Redistributing factual
> government boundary data is low-risk, but the provenance is worth confirming
> before any public release — see `docs/FEASIBILITY.md` §9.

**Revenue Circle boundaries are not included and were not obtainable.** District
is the finest administrative level available as open data, which is why the
choropleth stops there while the bulletin itself reports down to Revenue Circle.

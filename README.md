# Assam Flood Situation Console

A decision console for the **ASDMA Daily Flood Report** — the bulletin published by the Assam State Disaster Management Authority through DRIMS (Disaster Reporting and Information Management System).

Load the bulletin PDF; get a ranked, related, projected, comparable and mapped situation picture aimed at scenario planning and operational decisions.

**It opens on real history.** Sixteen consecutive real ASDMA bulletins — 20 July to 4 August 2026 — ship with the console, already parsed, so a link you send someone lands on a working fifteen-day trend and a real cumulative picture rather than an empty screen they have to populate first.

---

## The problem

The bulletin is complete but not *decidable*. Every number a decision maker needs is in it, and almost nothing is arranged to be acted on:

- **Nothing is ranked.** Sivasagar (144,461 affected) and Kamrup Metro (0 affected) occupy visually identical rows.
- **Nothing is related.** Camp inmates are on page 2; affected population is on page 1. The ratio between them — the most useful number in the document — appears nowhere.
- **Nothing is projected.** "If the river stays above danger level for 48 more hours, do we have rice?" needs arithmetic across four sections.
- **Nothing is comparable.** Yesterday's bulletin is a separate PDF.
- **Geography is latent.** Damage rows carry lat/long, rendered as text columns.

From the 2026-07-27 bulletin, the single figure the console exists to surface:

> **365,023 people — 81.9% of those affected — are in neither a relief camp nor a distribution centre.**
>
> Derived: 445,495 affected − 28,695 camp inmates − 51,777 non-camp inmates. It appears nowhere in the PDF.

## Documentation

| Document | What it covers |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements, domain-driven design: bounded contexts, ubiquitous language, aggregates, invariants |
| [`docs/FEASIBILITY.md`](docs/FEASIBILITY.md) | Feasibility assessment with verified evidence from the real bulletin |
| [`docs/adr/`](docs/adr/) | Architecture decision records |
| [`docs/BULLETIN-SYNC.md`](docs/BULLETIN-SYNC.md) | Keeping the bundled archive current from a Drive folder, and what to do when it breaks |
| [`docs/PRD-REHABILITATION-ECONOMICS.md`](docs/PRD-REHABILITATION-ECONOMICS.md) | *In build:* costing rehabilitation from the bulletins — damage, loss, needs, funding gap |
| [`docs/FEASIBILITY-REHABILITATION-ECONOMICS.md`](docs/FEASIBILITY-REHABILITATION-ECONOMICS.md) | *In build:* whether that model is buildable on this data, measured against the archive |
| [`docs/FEASIBILITY-REPLACEMENT-COST.md`](docs/FEASIBILITY-REPLACEMENT-COST.md) | Replacement cost and working-capital loss from documented assumptions |
| [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) | Every judgement the cost model makes, why, and how much of the answer it carries |

### Architecture decisions

| ADR | Decision |
|---|---|
| [0001](docs/adr/0001-hexagonal-architecture-with-ddd-bounded-contexts.md) | Hexagonal architecture with DDD bounded contexts |
| [0002](docs/adr/0002-coordinate-based-pdf-table-reconstruction.md) | Coordinate-based PDF table reconstruction |
| [0003](docs/adr/0003-london-school-tdd.md) | London-School (mockist) TDD |
| [0004](docs/adr/0004-client-side-only-processing.md) | Client-side-only processing, zero network egress |
| [0005](docs/adr/0005-unknown-is-not-zero.md) | Unknown is not zero |
| [0006](docs/adr/0006-severity-index-relative-and-user-weighted.md) | Severity index is relative and user-weighted |
| [0007](docs/adr/0007-static-netlify-deployment.md) | Static deployment on Netlify |
| [0008](docs/adr/0008-svg-point-map-not-mapping-library.md) | Inline SVG point map, deferred choropleth *(partially superseded by 0009)* |
| [0009](docs/adr/0009-district-boundaries-and-choropleth.md) | District boundaries bundled; choropleth shipped; projection corrected |
| [0010](docs/adr/0010-bundled-bulletin-archive.md) | Every bulletin in `fixtures/` ships pre-parsed; the historical ones are split out of first paint |
| [0011](docs/adr/0011-cost-norms-are-cited-versioned-and-never-invented.md) | Cost norms are cited, versioned, and never invented |
| [0012](docs/adr/0012-integrating-a-stock-changes-its-unit.md) | Integrating a stock changes its unit — person-days are not people |
| [0013](docs/adr/0013-no-backend-for-the-economic-model.md) | No backend for the economic model; it needs none, so none was adopted |
| [0014](docs/adr/0014-constructed-rates-carry-a-derivation-not-a-citation.md) | A constructed rate carries a derivation, not a citation |

## Design principles

**Unknown is not zero.** DRIMS expresses "no data" as `Nil`, `SNR`, or a blank cell, and these do not mean the same thing. Coercing them to `0` would let the console report "0 schools damaged" for a Revenue Circle that has not reported. The distinction is carried in the type system from cell parse to rendered pixel (ADR-0005).

**Totals are verified, not trusted.** Every stated Total is checked against an independent sum of its rows. Mismatches surface as warnings rather than being silently corrected — the difference between a parser you can use in an emergency and one you cannot.

**Derived figures are labelled as derived.** Nothing the console computes is presented as something ASDMA published. Every derived metric carries its formula.

**Casualties are never summed.** ASDMA reports flood deaths and general (non-flood) drownings separately. The `Casualties` type has no `total` field, so they cannot be added by accident.

**ASDMA's vocabulary, unchanged.** District, Revenue Circle, Inmates, Relief Camp, Kuccha, Pukka. An officer must be able to read this UI and the PDF side by side without translating.

**The bulletin never leaves your machine.** Parsing is client-side; `connect-src 'self'` in the CSP makes that a browser-enforced property, not a promise.

## Getting started

```bash
npm install
npm run dev                       # development server
npm test                          # all tests
npm run test:coverage             # with coverage thresholds
npm run build                     # production build to dist/
npm run verify:lazy-pdfjs         # after a build: pdf.js is not in first paint
npm run verify:lazy-archive       # after a build: nor is the historical archive
npm run generate:bundled-bulletins # re-parse fixtures/ into src/generated/
```

The console opens on the bundled archive, so there is nothing to load to see it
working. To try the parser itself, load any PDF from `fixtures/`.

## The bundled bulletin archive

The console ships with the sixteen consecutive ASDMA Daily Flood Reports for
**20 July – 4 August 2026**, parsed at build time into `src/generated/`. They are
real bulletins, read by the same parser that reads yours — not a demonstration
dataset — so the Trend view draws a genuine fifteen-day line with no gaps and
Cumulative & Peak reports a genuine period on first open.

The set is not a list anyone maintains: `scripts/generate-bundled-bulletins.ts`
discovers every `fixtures/Daily_Flood_Report_YYYYMMDD.pdf` on disk. It used to
hold a hard-coded list of dates, which meant the Drive sync could download a new
bulletin, the generator would ignore it, the tests and the build would pass, and
CI would commit a change that altered nothing.

Shipping the *parsed* reports rather than the PDFs is what makes this affordable:
18 MB of PDF becomes 192 kB gzipped of data, and the default path loads no
pdf.js at all.

| | |
|---|---|
| **Eager** | The newest bulletin (4 August), in the entry chunk. First paint renders with real figures and no waiting. |
| **Lazy** | The fifteen older ones, behind a dynamic `import()`, ~192 kB gzipped in their own chunk. They arrive just after first paint, and the console *says* it is waiting rather than reporting a bulletin count it is about to change. |

`npm run verify:lazy-archive` asserts against the built `dist/` that the archive
is a separate chunk, is dynamically imported, and is not reachable statically
from anything loaded eagerly. First paint is **235.7 kB gzipped**, against the
300 kB NFR-4 budget.

The archive chunk went 95 kB → 192 kB as the bundle grew from eleven days to
sixteen, and most of that jump is not the extra days. `Infrastructure Damaged
- Others` was being read one column left of itself and dropped all but a handful
of its rows; reading it correctly took 27 July alone from 29 damaged items to
490. The chunk is lazy, so none of it lands in first paint — which has gone
*down* with each of the last two additions, because each new newest bulletin has
been a smaller one than the day before.

Four rules govern the archive once it is on screen:

- **Your own copy always wins.** Load a bulletin for a day the archive covers and
  yours supersedes it.
- **The headline views follow the newest bulletin held**, archive or loaded — and
  staleness is measured against that same bulletin, so bundled history can never
  make a stale console look current.
- **It is disclosed wherever it contributes.** Every view that draws a bundled
  point says how many of its points are bundled, and over what dates.
- **It is yours to clear.** One click on the Trend view removes it, leaving your
  own bulletins untouched. It is never written to your browser's storage — it is
  not your record.

## Project structure

```
src/
├── domain/                       # Pure. No I/O, no framework, no DOM.
│   ├── shared/                   # Shared kernel + published language
│   ├── situation/                # Situation Assessment (core)
│   ├── response/                 # Response Capacity (core)
│   ├── scenario/                 # Scenario Planning (core)
│   └── timeline/                 # Temporal Comparison
├── application/
│   ├── ports/                    # Interfaces the domain needs from outside
│   ├── use-cases/
│   └── services/
├── adapters/
│   ├── pdf/                      # pdf.js — implements BulletinSource
│   ├── persistence/              # IndexedDB — implements ReportRepository
│   └── ui/                       # React — driving adapter
├── composition/                  # Object graph, stateful shell, domain → view mapping
├── generated/                    # Committed build artefacts (bulletin archive, boundaries)
├── architecture.test.ts          # Fitness tests enforcing the dependency rule
└── main.tsx                      # Browser entry point
```

The dependency rule — dependencies point inward only — is enforced by
[`src/architecture.test.ts`](src/architecture.test.ts), not by convention. It also
asserts that no source file calls `fetch`, `XMLHttpRequest`, `WebSocket`, or
`sendBeacon`, making the zero-egress guarantee a build-time property as well as a
CSP one.

## Shareable view URLs

Every view has its own URL, so a colleague can be pointed at the one being
discussed rather than told where to click:

| View | Path |
|---|---|
| Situation Summary | `/` |
| District Ranking | `/district-ranking` |
| Response Capacity | `/response-capacity` |
| Damage Map | `/damage-map` |
| Scenario Planner | `/scenario-planner` |
| Trend | `/trend` |
| Cumulative & Peak | `/cumulative-and-peak` |
| Reconstruction Cost | `/reconstruction-cost` |
| Cost Explorer | `/cost-explorer` |

Back and forward work, and an unrecognised path lands on the Situation Summary
rather than a blank screen. Bulletins live in the browser, not the URL, so a
link opens on the right view with whatever bulletins that reader has loaded.

Slugs are a published contract: a link somebody sent a colleague should keep
working, so change one only alongside a redirect for the old path.

## Reconstruction Cost

The one view whose figures the console **constructed** rather than read. It is a
separate view, and separate on purpose: everything on Cumulative & Peak is a
quantity ASDMA printed or arithmetic on one, and is auditable back to a Total
row. Everything here is a quantity multiplied by a rate somebody chose, and the
choosing was ours.

The bulletin contains no money at all — across 23 sections and 190 district-days
there is not one monetary value — so every rupee is `quantity × rate`, one half
auditable and one half arguable. Three controls keep the halves apart:

- **A rate that cannot cite its source cannot be constructed** (ADR-0011). The
  SDRF schedule carries its MHA circular number on every rate. The effective
  dates that rule forced us to record are what revealed the schedule *expired on
  31 March 2026*, before the flood it would be applied to — so the console says
  so rather than quietly producing a confident number.
- **A constructed rate carries a derivation instead** (ADR-0014): a formula plus
  every input, each either published-and-cited or assumed-with-a-range-and-a-
  reason. No bare numbers. An assumption without a reason will not construct.
- **Constructed figures are always intervals**, computed by evaluating the
  derivation at its assumption bounds. The width is a measurement of how much of
  the answer is judgement — currently 165% of its centre — not a hedge chosen for
  presentation. Narrowing it requires a better input, not tighter bounds.

**Reconstruction is a policy choice and the console refuses to make it.** 91.2%
of the dwellings destroyed outright were Kuccha (3,187 of 3,494), so what those
are rebuilt as moves the bill further than every other assumption combined. All
three options are shown together — a selector would let the cheapest be chosen
without seeing what it costs in future risk — and each policy's cost shares a
table row with its effect on future risk, so neither can be read without the
other.

Kuccha *superstructures* are not costed at all: a civil-works schedule prices
brick, cement and RCC, and a Kuccha house is bamboo, timber and thatch. Under
"protect in place" the raised plinths beneath them **are** priced, which is the
direct answer to building defences where rebuilding in permanent materials is
not possible.

## Cost Explorer

The same argument as Reconstruction Cost, shown rather than stated — one model,
two reading postures. Reconstruction Cost is a document, read top to bottom by
somebody who has to defend a figure, and its ordering *is* the argument: the
warning precedes the number, the derivation precedes the total. Dropping charts
into it would break that, because a chart is read before the paragraph above it
whatever the DOM says. This view is for orienting, deciding what to ask about,
or presenting to a room.

**An interval is drawn as a floating band, never a bar with whiskers.** A bar
rising from zero to the central value reads as *the* number and makes the
whiskers look like tolerance on a measurement — the exact impression ADR-0014
exists to prevent. So each bar runs from the low bound to the high with the
central value ticked inside it. There is no single length for the eye to read
off; the band is the answer. Every chart also ships with the same data as a
table, because NFR-8 forbids colour as the only channel and NFR-11 puts this on
a washed-out projector.

Three refusals are geometric rather than editorial here, because a chart can
mislead in a shape where prose cannot:

- **The tiers are never one chart.** Household assets and public infrastructure
  are separate panels, so they cannot be added by eye. There is no total series
  to render by accident.
- **A policy's cost is never drawn without its effect on future risk**, which is
  a table column rather than a legend colour. The cheapest policy is the one
  that rebuilds the vulnerability.
- **The ₹10 lakh comparison carries its denominators on the bars.** Almost all
  of the gap between the two totals is that the demand reaches ~147,000
  households and reconstruction 3,494 — two bars without those counts would be
  the most misleading thing this console could draw.

Four controls change **how the figures are expressed, never what they are**:
the denominator (total, per destroyed dwelling, per affected household), the
sensitivity ranking (rupee swing or range width — offered because they
disagree, and the disagreement is the lesson), which figure's assumptions to
show, and how many. Truncation announces itself: the chart says how many
assumptions it is hiding and what they are worth.

Assumptions are *not* editable here. ADR-0014 §6 commits to that, and doing it
properly means re-evaluating derivations in the domain and carrying the result
back through the view model. Faking it in the view — scaling a total by a ratio
— would produce numbers no derivation supports, on the one screen whose whole
purpose is that every number has one. The control is missing rather than
dishonest.

## Deployment

Static deploy to Netlify — no backend, no database, no secrets, no functions.
`netlify.toml` sets the SPA fallback, immutable asset caching, and a CSP whose
`connect-src 'self'` enforces the zero-egress guarantee.

## Known limitations

- **No automatic bulletin fetch.** Bulletins are downloaded from
  [SDRF Assam](https://sdrf.assam.gov.in/dfr/download?type=flood) and loaded manually.
  Three things prevent automating it: static hosting has no scheduler, CORS blocks
  browser-side fetching, and — decisively — the endpoint is **geo-restricted to India**,
  so CI runners and hosting providers outside the country cannot reach it at all.
  For users in Assam the link simply works. See
  [`docs/FEASIBILITY.md`](docs/FEASIBILITY.md) §5.
- **No Revenue Circle choropleth.** District boundaries are bundled and the District
  choropleth ships (ADR-0009), but boundary GeoJSON at Revenue Circle granularity is
  not available as open data. The map says so: an unshaded part of a shaded District
  means nothing at all. Revenue Circle figures are in the District drill-down instead.
- **No rivers on the map.** The bulletin carries river names and gauge readings but no
  channel geometry, and there is none in the boundary data. The Brahmaputra is absent
  and labelled as absent rather than approximated (ADR-0009).
- **Scanned PDFs are not supported.** OCR is out of scope for v1; a PDF without a
  text layer is rejected with a clear message rather than parsed into garbage.
- **Bundled history stops at 4 August 2026.** The archive is fixed at build time, so
  it ages. The staleness banner states its age in words on every screen, and the
  figures are marked unsafe for current decisions once they are old enough — but
  the console cannot fetch a newer bulletin for you (see above).

## Contact

Questions or comments: **Mondweep Chakravorty** — [LinkedIn](https://www.linkedin.com/in/mondweepchakravorty/)

## Data source

Bulletins are published by the [Assam State Disaster Management Authority](https://asdma.assam.gov.in/information-services/assam-flood-report).
ASDMA's bulletin remains the authoritative record; this console is a read-side
consumer and every figure is traceable back to its source page.

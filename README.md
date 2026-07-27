# Assam Flood Situation Console

A decision console for the **ASDMA Daily Flood Report** — the bulletin published by the Assam State Disaster Management Authority through DRIMS (Disaster Reporting and Information Management System).

Load the bulletin PDF; get a ranked, related, projected, comparable and mapped situation picture aimed at scenario planning and operational decisions.

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
| [0008](docs/adr/0008-svg-point-map-not-mapping-library.md) | Inline SVG point map, deferred choropleth |

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
npm run dev            # development server
npm test               # all tests
npm run test:coverage  # with coverage thresholds
npm run build          # production build to dist/
```

Load `fixtures/Daily_Flood_Report_20260727.pdf` to try it against the real bulletin.

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
├── architecture.test.ts          # Fitness tests enforcing the dependency rule
└── main.tsx                      # Composition root
```

The dependency rule — dependencies point inward only — is enforced by
[`src/architecture.test.ts`](src/architecture.test.ts), not by convention. It also
asserts that no source file calls `fetch`, `XMLHttpRequest`, `WebSocket`, or
`sendBeacon`, making the zero-egress guarantee a build-time property as well as a
CSP one.

## Deployment

Static deploy to Netlify — no backend, no database, no secrets, no functions.
`netlify.toml` sets the SPA fallback, immutable asset caching, and a CSP whose
`connect-src 'self'` enforces the zero-egress guarantee.

## Known limitations

- **No automatic bulletin fetch.** Static hosting has no scheduler, and CORS blocks
  browser-side fetching from `asdma.gov.in`. Bulletins are loaded manually. See
  [`docs/FEASIBILITY.md`](docs/FEASIBILITY.md) §5 for the automation options.
- **No revenue-circle choropleth.** Boundary GeoJSON at that granularity is not
  reliably available as open data. The point map needs no external data (ADR-0008).
- **Scanned PDFs are not supported.** OCR is out of scope for v1; a PDF without a
  text layer is rejected with a clear message rather than parsed into garbage.
- **Trend needs multiple bulletins.** One PDF is one snapshot. Load several to get deltas.

## Data source

Bulletins are published by the [Assam State Disaster Management Authority](https://asdma.assam.gov.in/information-services/assam-flood-report).
ASDMA's bulletin remains the authoritative record; this console is a read-side
consumer and every figure is traceable back to its source page.

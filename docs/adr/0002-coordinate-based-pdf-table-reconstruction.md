# ADR-0002: Coordinate-based PDF table reconstruction

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Ingestion swarm

## Context

The DRIMS bulletin is a 31-page PDF with a genuine text layer — verified by extracting text from the 2026-07-27 edition without OCR. That is the single fact that makes this product viable (see ADR-0007).

But the text layer is hostile to naive parsing:

1. **Cells wrap across lines.** The left-hand section label renders as four separate text runs: `Infrastruct` / `ure` / `Damaged - ` / `Road`. Line-oriented parsing sees four lines, not one label.
2. **Rows span many lines at different heights.** One Jorhat road-damage row occupies 11 visual lines because the Remarks column wraps.
3. **Columns are not delimited.** No pipes, no consistent whitespace runs. Column identity is purely geometric.
4. **Numbers split mid-token.** Longitude `94.107469` renders as `94.1074` + `69` across a line break.
5. **An inline mini-language is embedded in cells.** `(Nazira | 41), (Demow | 24)` and the compound `(Mahmora | Population Affected: 67128 | Crop Area Submerged: 7340)`.
6. **Sentinels are ambiguous.** `Nil` means zero in a count column and "no such item" in a name column. `SNR` means *Status Not Reported* — unknown, not zero.

A regex or line-based parser gets perhaps 60% of this right and — critically — **fails silently on the rest**, producing plausible-looking wrong numbers. In a flood console, a plausible wrong number is worse than a visible failure.

## Decision

Reconstruct tables **geometrically** from pdf.js positioned text items, in a four-stage pipeline:

```
PDF → [1] TextRunExtractor    → positioned runs {str, x, y, width, height, page}
    → [2] RowClusterer        → runs grouped into visual rows by y-proximity
    → [3] ColumnResolver      → column bands inferred from x-histogram per section
    → [4] SectionAssembler    → logical rows, cells joined across wraps
    → FloodSituationReport
```

**Stage details**

1. **TextRunExtractor** — `page.getTextContent()`, transform matrix → absolute x/y. Adapter-local; never crosses the domain boundary.
2. **RowClusterer** — group runs whose baselines fall within a tolerance of ~40% of median glyph height. Tolerance is derived from the document, not hard-coded, so it survives font-size changes.
3. **ColumnResolver** — build an x-position histogram of run starts within a section, find gaps, derive column bands. Bands are computed **per section** because sections have different column counts (3 to 11).
4. **SectionAssembler** — walk rows, detect section boundaries by reassembled left-column labels, join continuation lines into logical rows keyed by the District column being non-empty.

**Section recognition is label-driven, not position-driven.** Labels are reassembled from wrapped runs and matched against 22 known `SectionKind`s using normalised comparison (whitespace-collapsed, case-folded). If ASDMA reorders sections or shifts columns, recognition still works.

**Number parsing is explicit and total.** A dedicated `parseDrimsNumber` handles: float noise (`2025.9200000000003`), `Nil` → `Zero`, `SNR` → `Unknown`, blank → `Unknown`, split tokens rejoined before parse. It returns a discriminated union `{kind: 'value'|'zero'|'unknown'}` — **never a bare number** — so callers cannot accidentally treat unknown as zero. This is the anti-corruption layer's core guarantee (PRD §3.3).

**Reconciliation is mandatory.** Every section with a stated Total row is checked against an independent sum of its district rows. A mismatch marks the section `Degraded` and surfaces in the UI. This converts the failure mode from *silent corruption* to *visible warning* — the whole reason the technique is acceptable at all.

## Consequences

**Positive**

- Survives column-width changes, font changes, and page-break shifts — the realistic modes of DRIMS drift.
- Handles multi-line cells correctly, which is required for the road/embankment sections where Remarks routinely wrap to 10+ lines.
- Reconciliation gives a self-check that no regex approach can offer.
- Unknown/zero distinction is structural, enforced by the type system.

**Negative**

- Substantially more complex than regex; the clusterer and resolver need their own unit tests with synthetic geometry fixtures.
- Tolerance constants require tuning against real bulletins. Mitigated by deriving them from document statistics rather than hard-coding.
- A full ASDMA redesign (different table structure entirely, not just shifted columns) still breaks it. No approach survives that; reconciliation at least makes it obvious.

## Alternatives considered

- **Regex over `page.getTextContent()` joined text.** Rejected: fails on wrapped cells and split numbers, and fails *silently*.
- **`pdf2json` / `pdf-table-extractor`.** Rejected: neither handles the wrapped-label section detection, and both add dependency weight for a partial solution.
- **Server-side extraction with Python (camelot/tabula).** Rejected: requires a backend, breaking the static-Netlify decision (ADR-0007) and the offline requirement (NFR-6).
- **LLM-based extraction.** Rejected for v1: non-deterministic, requires an API key and network egress (violating NFR-5), costs per parse, and cannot be golden-file tested. Reconsider only as a fallback for sections that fail deterministic extraction.

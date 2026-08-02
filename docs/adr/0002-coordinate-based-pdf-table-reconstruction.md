# ADR-0002: Coordinate-based PDF table reconstruction

- **Status:** Accepted; the reconciliation claim **amended 2026-07-28** after it
  was falsified in the field (see the amendment below)
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

> ⚠ **Amended 2026-07-28. The sentence above was too broad, and the gap it left
> was the one that actually bit.**
>
> Reconciliation catches a section that was *found and misread*. It is blind to
> a section that was **never found at all** — there is no stated Total to
> compare against, so nothing disagrees and nothing is flagged.
>
> That is not hypothetical. On the 25 and 26 July 2026 bulletins the gutter
> threshold in `deriveBodyStart` mis-detected the label column, every District
> name was read as a section label, and only 2 of 23 sections were recognised.
> The result — a husk carrying 46 "districts" in a state that has 35, several of
> them sentences of Remarks prose — was published as `confidence: high` with
> **zero reconciliation failures**. The safety net this ADR relies on did not
> move.
>
> **The correction has two parts.** Provenance is now *exhaustive*: a section in
> the 23-section catalogue that was never located is recorded as `failed` rather
> than silently omitted, so "we found two" and "there were only two" stop being
> indistinguishable downstream. And a document-level integrity check
> (`document-integrity.ts`) applies four independent tests — sections recognised
> against the catalogue, district count against Assam's 35, district names that
> are names rather than sentences, and a statewide population total present —
> any one of which catches the case above on its own. A document-level breach
> demotes every section, so the confidence check consumers already make becomes
> a true whole-document check without needing new vocabulary.
>
> **The general lesson, worth more than the fix:** a validity check that
> compares two things the parser produced can only catch disagreement between
> them. It cannot catch absence. Completeness has to be asserted against an
> expectation held *outside* the parse — here, the known section catalogue and
> the known number of districts in Assam. Reconciliation was necessary and is
> not sufficient.

> ⚠ **Amended again, 2026-07-31. The 28 July bulletin produced the same husk.
> The amendment above caught it — the document was refused, and never reached
> the screen — but the cause lay a layer below: a fallback that was allowed to
> be silent.**
>
> `deriveBodyStart` returned a bare `number`. When it could not locate the
> Particulars gutter it substituted `FALLBACK_BODY_START` and returned that,
> indistinguishable in type and in value from a measurement. Whether the
> constant happened to land *inside* the gutter channel or *right of the
> District column* was the difference between a correct parse and a bulletin of
> Remarks prose — and nothing downstream could tell which had happened. It is
> the same defect class as the one above, one stage earlier: not "we compared
> the wrong things" but "we answered a question we could not answer".
>
> **First correction — the fallback is loud.** Table geometry is now a typed
> outcome (`BodyStartDerivation`: `measured` | `supplied` | `unmeasurable`) and
> the number cannot be reached without reading the discriminant that qualifies
> it. `unmeasurable` still carries `FALLBACK_BODY_START`, because ADR-0005 says
> the husk is published rather than deleted — but it travels into
> `checkDocumentIntegrity` as a fifth invariant (`table-geometry-measured`,
> severity `failed`), so a guessed gutter refuses the document *whatever the
> parse happened to produce*. A document that read all 23 sections perfectly on
> a guessed gutter is still refused. That property holds independently of
> whether the geometry fix below generalises to the next layout DRIMS ships,
> which is exactly why it was built first.
>
> **Second correction — the gutter is measured per page, by vote.** Taking the
> ink over the whole document at once requires the gutter/body channel to be
> clear on *every page simultaneously*, and DRIMS does not guarantee that: a
> Particulars label wider than its own column overflows to the right and bridges
> the channel. On 28 July the label line `CWC bulletin issued at` is 74.5pt of
> ink in a 37.5pt column; it starts at x=37.80, inside the gutter, and ends at
> 112.30, well right of the channel at 75.26. That **one run out of 7,799**
> merged the two columns and moved the document-wide boundary to 114.26 — right
> of the District column, which is the whole failure.
>
> A page, by contrast, is a complete rendering of both columns, and pages are
> independent witnesses. Each page whose leftmost ink is the document's leftmost
> ink casts one vote; continuation pages, which carry no Particulars label at
> all, abstain rather than voting for a boundary they cannot see. The plurality
> wins — nine pages to one on 28 July — and no plurality (no gutter page at all,
> or a tie) is `unmeasurable` rather than a constant quietly substituted.
>
> No threshold was tuned to achieve this. The channel threshold remains
> `DEFAULT_MIN_COLUMN_GAP` (0.2pt), and every value from 0.02 to 0.3 yields
> byte-identical output on all eleven bulletins — a plateau an order of
> magnitude wide, bounded below by the 0.1pt gap inside a single word and above
> by the 0.3pt narrowest real column boundary in the corpus.
>
> **The general lesson:** a geometric feature that must hold across an entire
> document is only as robust as its worst line. Measuring it on independent
> witnesses and taking the consensus is not a heuristic bolted on top; it is the
> honest reading of a document whose renderer does not respect its own cells.

> ⚠ **Amended again, 2026-08-02. The 31 July bulletin was refused, correctly,
> for a reason that had been dismissed as cosmetic for eleven days: a District
> name that DRIMS wraps across two printed lines.**
>
> Stage 4 joins a wrapped *cell* with a space, and decides that a printed line
> starts a new row if its first cell "names something" — anything not beginning
> with a bracket or a lower-case letter. Both rules are right about cells and
> wrong about names. DRIMS sizes the District column to whatever the Particulars
> gutter leaves, and when a name does not fit it breaks it **wherever it runs
> out of room**, which is usually inside a word. So `Bongaigaon` printed over
> two lines rejoined as `Bongaigao n`, and `Karbi Anglong` — whose second line
> is capitalised — opened a row of its own and was published as two Districts.
> On 31 July the column is ~27pt wide, nine names wrap at once, and the parse
> yields 47 Districts in a state that has 35: `district-count-within-assam`
> refuses the document. The refusal is right. The input to it was not.
>
> **The geometric rule is not available, and this is the interesting part.** The
> obvious repair — "District cell filled, every other cell empty, therefore a
> name tail, join it upward" — is false on this corpus. On 27 July `Dhemaji`,
> `Nagaon` and `Kamrup (M)` each occupy a row whose every other cell is empty:
> they are quiet Districts reporting nothing, and that is the identical shape.
> A geometric rule folds three real Districts into one, and folding Kamrup into
> Kamrup (M) shades rural Kamrup with Guwahati's flood. **A missing repair is a
> gap; a wrong merge is a lie.** The two are not symmetric and the rule must not
> treat them as if they were.
>
> **First correction — the join must be evidenced.** Two candidate joins are
> tried, closed (`Charaid` + `eo`) and spaced (`Karbi` + `Anglong`), and one is
> taken only if it yields a name in a District vocabulary AND the fragment is
> not itself a District. Nothing else counts. A name the vocabulary has never
> heard of is left exactly as DRIMS printed it, which is what makes an
> incomplete vocabulary safe: 1 August names **Bajali**, created in 2020 and
> absent from every open dataset this project ships, and it passes through
> untouched. The failure mode is a name we decline to repair — visible, and
> refused by the integrity check if it matters — never a name we invent.
>
> The vocabulary lives in `src/adapters/pdf/assam-districts.ts` and deliberately
> **not** in the shared kernel. The domain treats `DistrictName` as an opaque
> validated string on purpose (ADR-0005); a closed roster in `domain/shared`
> would invite something to validate against it, and the moment anything does,
> Bajali and Tamulpur stop being Districts. Down in the adapter it can only ever
> be a hint about how a PDF was typeset.
>
> **Second correction — a block we cannot name is not part of the block above
> it.** A section's rows used to run until the next label the recogniser
> recognised, so DRIMS's unlabelled-to-us `Wildlife affected under protected
> areas description` block was appended to `Infrastructure Damaged - Others` —
> rows, and, fatally, geometry. Its District column is 7pt wider. On 31 July
> `Charaideo` in that block reached across the channel into the Revenue Circle
> column, the two resolved as **one band**, and every Revenue Circle in the
> bulletin was published as a District (`Cachar Sonai`, `GolaghaKhumtai`,
> `Kamrup Dispur`, `Mahmora`, `Bokakhat`, …). The glued names were never a row
> problem; they were this. An unrecognised block now ends the section before it
> and yields no table of its own.
>
> **Third correction — the infrastructure item columns are counted from the
> right.** Removing the Wildlife block exposed what it had been hiding. The five
> infrastructure tables were all read with `Infrastructure Damaged - Road`'s
> ten-column layout, but `- Others` has eleven: it carries an extra `Damages`
> column on the left, and its right-aligned count column resolves as one band or
> two depending on whether DRIMS printed `Nil` in it. It only ever appeared to
> work because *one hyphen* in the Wildlife block, at x=143.78 on page 30 of the
> 27 July bulletin, bridged two bands and collapsed eleven columns to ten. With
> that hyphen gone the indices pointed one column left, and the table read the
> count as the item name. The tables disagree about their left-hand columns and
> agree about their right-hand ones — item name, department, village, location,
> latitude, longitude, remarks — so the offsets are now taken from the right
> edge. That also *fixes* a longstanding misread: the shipped 27 July archive
> records a damaged asset named `3.37`, reported by a department called
> `PRAMUD`, in a village called `Fishery`. Those were the count, the owner's
> name and the department, each read one column to the left of itself.
>
> **The general lesson:** the last two corrections are the same mistake as the
> 28 July one, at a different scale. A geometric feature taken over a whole
> section is only as robust as the single widest run in it, and a run that got
> in because we could not name the block it belongs to is not evidence about
> anything. Exclude what you cannot account for *before* you measure, and do not
> let a table's column indices be calibrated, silently, by the accident that was
> hiding the bug.

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

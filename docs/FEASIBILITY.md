# Feasibility Assessment

**Question:** Can an app load the ASDMA daily flood bulletin PDF, present it for scenario planning and decision making, and host on Netlify?

**Verdict: Feasible, with high confidence on the core and one genuine limitation on automation.**

The decisive fact is that the DRIMS bulletin is a **digitally generated PDF with a real text layer**. Everything else follows from it. Had it been a scan, this assessment would read very differently.

---

## 1. Evidence gathered

Findings below are from direct inspection of the 2026-07-27 bulletin, not assumption.

| Question | Finding | Method | Confidence |
|---|---|---|---|
| Does the PDF have a text layer? | **Yes.** Full text extracted with no OCR. | `pypdf` extraction, all pages | **Verified** |
| How large is it? | **31 pages**, 1.2 MB (not the 13 initially reported) | Page count | **Verified** |
| How much structure? | ~22 report sections + Remarks; District → Revenue Circle → item hierarchy | Manual reading of all sections | **Verified** |
| Are coordinates present? | **Yes**, lon/lat per damaged infrastructure item | Sections 18–22 | **Verified** |
| Do internal totals reconcile? | **Yes** on the checks performed: 187,890 + 183,461 + 74,144 = 445,495 ✓ | Arithmetic on extracted values | **Verified** |
| Is the table layout parser-friendly? | **No.** Wrapped cells, split numbers, no delimiters, embedded mini-syntax | Structural inspection | **Verified** |
| Are sentinel values ambiguous? | **Yes.** `Nil`, `SNR`, and blanks each mean different things | Cross-section comparison | **Verified** |
| Is there a stable public URL for bulletins? | **Probably.** Pattern `asdma.gov.in/pdf/flood_report/{year}/Daily_Flood_Report_{DD.MM.YYYY}.pdf` appears in search results | Web search | **Unverified — see §5** |

**On that last row:** the ASDMA domain returned 503 through this environment's proxy and reset the connection on direct `curl`, most likely blocking datacenter IPs. The URL pattern is reported by a search index, not confirmed by us. **Verify from a normal browser on an Indian connection before building anything that depends on it.**

---

## 2. What makes this feasible

### The text layer (decisive)

Every figure in the bulletin is extractable programmatically. No OCR, no accuracy loss, no per-page cost, no GPU. This single property moves extraction from "research project with an error budget" to "engineering task with a test suite".

### The data is already decision-shaped

ASDMA reports at District and Revenue Circle grain with consistent dimensions across sections. The bulletin is not a narrative to be mined — it is a relational dataset rendered as tables. It has a natural schema, which is exactly what a domain model needs.

### The most valuable outputs are arithmetic, not modelling

The insights the bulletin lacks are trivially computable once the data is structured:

| Insight | Computation | 2026-07-27 |
|---|---|---|
| People affected but unsheltered | 445,495 − 28,695 − 51,777 | **365,023 (81.9%)** |
| Camp uptake | 28,695 ÷ 445,495 | **6.4%** |
| Camp load | 28,695 ÷ 90 | **319/camp** |
| Days of rice left | (1,191.09 Q × 100) ÷ (28,695 × 0.6 kg) | **6.9 days** |

Four subtractions and divisions. No machine learning, no simulation, no external data. The gap between "the bulletin" and "a decision console" is smaller than it looks — which is precisely why it is worth closing.

### Netlify is a natural fit

Because parsing runs client-side (ADR-0004), the app is genuinely static: no backend, no database, no secrets, no functions. `netlify.toml` is ~30 lines. It runs comfortably on the free tier, and the CSP turns "your bulletin never leaves your machine" into a browser-enforced property rather than a promise.

---

## 3. What makes it hard

### Table reconstruction (the main engineering cost)

The text layer is present but hostile:

- Section labels wrap across runs — `Infrastruct` / `ure` / `Damaged - ` / `Road`
- One Jorhat road row spans 11 visual lines because Remarks wrap
- Numbers split mid-token — `94.1074` + `69`
- No delimiters; column identity is purely geometric
- Embedded mini-syntax in cells — `(Nazira | 41), (Demow | 24)`, and a compound form
- Float noise — `2025.9200000000003`

A naive parser gets ~60% right and **fails silently on the rest**. That is the real risk, not the difficulty. Mitigations: coordinate-based reconstruction (ADR-0002) and mandatory reconciliation of every stated Total against an independent sum, which converts silent corruption into a visible warning.

### The unknown/zero trap

`Nil`, `SNR`, and blank cells are not interchangeable. Coercing them all to `0` would let the console report "0 schools damaged" for a Revenue Circle that simply has not reported. This is the most dangerous bug available in this product, and it is one line of careless code away. ADR-0005 addresses it structurally through the type system.

### Format drift

ASDMA can change the layout with no notice. Nothing prevents this. Reconciliation makes breakage loud rather than silent, and label-driven section recognition degrades gracefully under column shifts — but a full redesign requires parser work. Budget for it as recurring maintenance, not a one-off.

### Boundary data for choropleth

District boundaries for Assam are obtainable. **Revenue Circle boundaries — the level where decisions are actually made — largely are not** available as open GeoJSON. This is why the choropleth is a `Should` and the point map is a `Must` (ADR-0008). The point map needs no external data at all.

---

## 4. Feasibility by capability

| Capability | Feasible? | Notes |
|---|---|---|
| Load PDF in browser | **Yes** | pdf.js, no server |
| Extract all 22 sections | **Yes** | Coordinate-based; the bulk of the work |
| Verify totals | **Yes** | Independent sums vs stated totals |
| District/circle drill-down | **Yes** | Hierarchy is already in the data |
| Derived decision metrics | **Yes** | Simple arithmetic |
| Severity ranking | **Yes** | Normalise + weight; weights user-adjustable |
| Point map of damage | **Yes** | lon/lat already in the bulletin |
| District choropleth | **Probably** | Needs sourced GeoJSON |
| Revenue-circle choropleth | **Unlikely** | Boundary data largely unavailable |
| Scenario projection | **Yes** | Pure function over the parsed report |
| Multi-day trend | **Yes** | User loads several PDFs; IndexedDB persists them |
| **Automatic daily fetch** | **No — not from a static site** | See §5 |
| Offline operation | **Yes** | Everything client-side after first load |
| Netlify hosting | **Yes** | Pure static deploy |
| River level forecasting | **No** | Out of scope; needs CWC feeds and hydrological modelling |
| Historical multi-season analysis | **Possible** | Needs a bulletin archive; see §5 |

---

## 5. The one real limitation: automation

A static site **cannot** fetch the daily bulletin automatically. Two independent blockers:

1. **No scheduler.** Static hosting has no cron. Nothing runs unless a user opens the page.
2. **CORS.** Even with the page open, browser JavaScript cannot fetch a PDF from `asdma.gov.in` unless ASDMA sends `Access-Control-Allow-Origin`. Government portals essentially never do.

So v1 requires a human to download the PDF and drop it in. For a daily-rhythm control-room tool that is acceptable, but it is a real friction point and worth stating plainly rather than discovering later.

**If automation becomes a requirement**, in increasing order of cost:

| Option | How | Cost | Trade-off |
|---|---|---|---|
| **A. Scheduled function + proxy** | Netlify Scheduled Function fetches the PDF daily, re-serves it same-origin | Low | Breaks the pure-static property; ASDMA may block datacenter IPs — as it appears to have blocked us |
| **B. GitHub Action → committed archive** | Action fetches daily, commits the PDF (or parsed JSON) to the repo, Netlify serves it same-origin | Low | Still static hosting; builds a valuable dated archive as a side effect; same IP-blocking risk |
| **C. Ask ASDMA for a feed** | Request an API or CORS header | Political, not technical | Best outcome by far if achievable, and worth asking |
| **D. Manual upload (v1)** | User drops the PDF in | None | Works today; a human in the loop each morning |

**Option B is the recommendation** if automation is wanted. It preserves static hosting, adds no runtime dependency, and the accumulating archive is what would eventually make multi-season trend analysis and an *absolute* severity scale possible (ADR-0006 defers that only for lack of history). Verify the URL pattern from an Indian connection first.

---

## 6. Effort

Assuming this codebase as the starting point:

| Work | Effort | Risk |
|---|---|---|
| Domain model + metrics | Small | Low — pure functions, fully tested |
| PDF extraction pipeline | **Large** | **High** — the dominant cost and the dominant risk |
| Extraction hardening across bulletin variants | Medium | High — needs several real bulletins to test against |
| UI + visualisations | Medium | Low |
| Scenario planner | Small | Low — arithmetic over the parsed report |
| Persistence + export | Small | Low |
| Netlify deployment | Trivial | Low |
| Choropleth (if pursued) | Medium | Medium — gated on boundary data |
| Automation (Option B) | Small | Medium — gated on URL pattern and IP access |

**Roughly 70% of the total effort is PDF extraction and its hardening.** Everything downstream is comparatively straightforward. Any plan that under-weights extraction will slip.

The single highest-value next step is **acquiring 5–10 bulletins from different dates** — including a low-water day and a peak-flood day — and running the parser against all of them. One bulletin proves the approach; ten prove it survives contact with reality. Layout drift, sections that appear only during severe events, and districts that report differently from one another are all invisible with a sample of one.

---

## 7. What would change this verdict

| If this were true | Verdict becomes |
|---|---|
| The PDF were a scan with no text layer | **Marginal.** OCR on dense tables runs ~85–95% per cell, which compounds badly across a 31-page document. Would need human verification of every figure — defeating the purpose. |
| ASDMA published a JSON/CSV feed | **Trivially feasible.** Most of the effort here exists solely to undo a PDF. |
| The layout changed weekly | **Unsustainable.** Parser maintenance would exceed the product's value. |
| Revenue-circle boundaries were open data | **Materially better.** The choropleth would become a `Must`, and the map would be the primary view rather than a supporting one. |

---

## 8. Recommendation

**Proceed.** The core product — load, parse, rank, relate, project, map, compare — is feasible and largely built here. Netlify hosting is trivial. The technical risk is concentrated in one well-understood place, and the mitigations for it are structural rather than aspirational.

Three caveats worth carrying forward:

1. **Extraction is the project.** Budget accordingly, and treat reconciliation as non-negotiable — it is what makes a parser you can trust in an emergency.
2. **Automation needs a decision.** Manual upload works today; Option B is the clean path if that friction proves unacceptable.
3. **Get more bulletins before declaring the parser done.** A sample of one is a demo, not a validation.

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
| Do internal totals reconcile? | **Mostly.** Statewide population checks out: 187,890 + 183,461 + 74,144 = 445,495 ✓. But **Sivasagar's camp inmates do not**: stated 24,695 vs 11,892 + 10,497 + 2,281 = 24,670, a gap of 25 | Arithmetic on extracted values | **Verified** |
| Is the table layout parser-friendly? | **No.** Wrapped cells, split numbers, no delimiters, embedded mini-syntax | Structural inspection | **Verified** |
| Are sentinel values ambiguous? | **Yes.** `Nil`, `SNR`, and blanks each mean different things | Cross-section comparison | **Verified** |
| Is there a download endpoint for bulletins? | **Yes.** `sdrf.assam.gov.in/dfr/download?type=flood` returns the report directly | Confirmed by the project owner | **Confirmed** |
| Can it be reached from hosting infrastructure? | **No.** It is geo-restricted to India | Confirmed by the project owner; our probes reset | **Confirmed** |

**On those last two rows:** our own probes from this environment failed (503 through the proxy, connection reset on direct `curl`), which we initially read as datacentre-IP blocking. The project owner has confirmed the real cause: the endpoint enforces an **India geofence**, and is a genuine direct download for anyone inside it. This distinction matters — it is what rules out CI-based automation entirely (§5), which IP blocking alone would not have.

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

District boundaries for Assam are obtainable — and, as of 2026-07-28, **sourced and bundled**: all 33 Districts of Census 2011 lineage, published by the DataMeet India community under CC BY 4.0, simplified to ~200 m and shipped at 18.5 kB gzipped. The District choropleth is therefore built, not deferred (ADR-0009), and it needs no external data at run time because the boundaries are in the bundle.

**Revenue Circle boundaries — the level where decisions are actually made — remain unavailable** as open GeoJSON. That gap is unchanged and is now stated in the UI beside the map, so an unshaded Circle inside a shaded District is never read as good news. The point map itself still needs no external data at all.

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
| District choropleth | **Yes — shipped** | GeoJSON sourced and bundled, 18.5 kB gzipped (ADR-0009) |
| Revenue-circle choropleth | **No** | Boundary data unavailable; the limitation is stated in the UI |
| Scenario projection | **Yes** | Pure function over the parsed report |
| Multi-day trend | **Yes** | User loads several PDFs; IndexedDB persists them |
| **Automatic daily fetch** | **No — not from a static site** | See §5 |
| Offline operation | **Yes** | Everything client-side after first load |
| Netlify hosting | **Yes** | Pure static deploy |
| River level forecasting | **No** | Out of scope; needs CWC feeds and hydrological modelling |
| Historical multi-season analysis | **Possible** | Needs a bulletin archive; see §5 |

---

## 5. The one real limitation: automation

Bulletins are downloaded from **`https://sdrf.assam.gov.in/dfr/download?type=flood`**. Confirmed behaviour:

- It **is a direct download** — the endpoint returns the report, not a landing page.
- It is **geo-restricted to India**. From anywhere else it is unreachable without an India VPN. (This is why our own probes reset the connection.)
- It carries **no date parameter**, so it appears to serve only the *latest* bulletin. There is no evidence of a fetchable archive.

A static site cannot fetch it automatically, for **three** independent reasons — and the third is the one that actually decides it:

1. **No scheduler.** Static hosting has no cron. Nothing runs unless a user opens the page.
2. **CORS.** Even with the page open, browser JavaScript cannot read a cross-origin PDF unless the server sends `Access-Control-Allow-Origin`. Government portals essentially never do.
3. **Geo-restriction.** The endpoint only answers requests originating in India.

**Point 3 rules out the cheap automation options.** GitHub Actions runners, Netlify build and function containers, and most CI infrastructure run in US and European datacentres. They are outside the geofence, so they simply cannot reach the endpoint — no amount of scheduling logic fixes that.

| Option | How | Viable? |
|---|---|---|
| **A. Netlify Scheduled Function** | Function fetches daily, re-serves same-origin | **No** — Netlify has no India region; outside the geofence |
| **B. GitHub Action → committed archive** | Action fetches daily, commits the PDF, Netlify serves it | **No** — GitHub-hosted runners are outside the geofence |
| **B′. Self-hosted runner in India** | Same as B, but on a small VM in an Indian region (e.g. Mumbai) or an office machine | **Yes** — the only automation path that works. Costs a always-on host to maintain |
| **C. Ask ASDMA/SDRF for a feed** | Request an API, a CORS header, or an allowlisted egress | Political, not technical — **best outcome if achievable** |
| **D. Manual download + upload** | A user in India downloads and drops the PDF in | **Yes — works today, zero infrastructure** |

**Recommendation: D for now, C in parallel.** Manual upload is not merely the v1 compromise — given the geofence it is the only option that needs no infrastructure at all, and the intended users are in Assam, inside the fence, where the link simply works. Pursue B′ only if a daily archive becomes genuinely valuable enough to justify running and maintaining an India-hosted machine; that archive is what would eventually enable multi-season trends and an *absolute* severity scale (ADR-0006 defers that only for lack of history).

> **Corrected from an earlier draft.** This assessment previously recommended Option B (a GitHub Action). That was wrong: it assumed the endpoint was merely blocking datacentre IPs, when in fact it enforces a country geofence that GitHub's runners cannot satisfy.

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
| Choropleth | Medium | **Resolved** — boundary data sourced and bundled (ADR-0009) |
| Automation (Option B) | Small | Medium — gated on URL pattern and IP access |

**Roughly 70% of the total effort is PDF extraction and its hardening.** Everything downstream is comparatively straightforward. Any plan that under-weights extraction will slip.

The single highest-value next step was **acquiring 5–10 bulletins from different dates** — including a low-water day and a peak-flood day — and running the parser against all of them. One bulletin proves the approach; ten prove it survives contact with reality.

**This has since been done, and the estimate above was right for the wrong reason.** Thirteen consecutive bulletins (20 July – 1 August 2026) are now in `fixtures/` and all thirteen ship pre-parsed. Every parser defect of consequence found so far was invisible at a sample of one — but none of them was layout drift between *severe* and *quiet* days, which is what this paragraph predicted. They were all the same shape instead: **a column gets narrower and something the parser assumed about geometry stops being true.** A gutter threshold fitted to one bulletin; a District name wrapped mid-word when the column tightened; an unnamed block whose column bands were measured together with its neighbour's. The variable that matters is not how bad the flood is, it is how long the longest section label is that day.

The corollary is the useful part: a bulletin count is not coverage. What made the difference was checks that state what the answer must *look like* — 23 sections present, districts within Assam, names that are names — rather than checks that compare two things the parser produced. See ADR-0002.

---

## 7. What would change this verdict

| If this were true | Verdict becomes |
|---|---|
| The PDF were a scan with no text layer | **Marginal.** OCR on dense tables runs ~85–95% per cell, which compounds badly across a 31-page document. Would need human verification of every figure — defeating the purpose. |
| ASDMA published a JSON/CSV feed | **Trivially feasible.** Most of the effort here exists solely to undo a PDF. |
| The layout changed weekly | **Unsustainable.** Parser maintenance would exceed the product's value. |
| Revenue-circle boundaries were open data | **Materially better.** District shading already ships; shading to Revenue Circle would make the map the primary view rather than a supporting one. |

---

## 8. Recommendation

**Proceed.** The core product — load, parse, rank, relate, project, map, compare — is feasible and largely built here. Netlify hosting is trivial. The technical risk is concentrated in one well-understood place, and the mitigations for it are structural rather than aspirational.

Three caveats worth carrying forward:

1. **Extraction is the project.** Budget accordingly, and treat reconciliation as non-negotiable — it is what makes a parser you can trust in an emergency.
2. **Automation needs a decision.** Manual upload works today; Option B is the clean path if that friction proves unacceptable.
3. **Get more bulletins before declaring the parser done.** A sample of one is a demo, not a validation.

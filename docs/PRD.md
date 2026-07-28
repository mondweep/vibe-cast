# Product Requirements Document — Assam Flood Situation Console

**Codename:** `assam-flood-monitoring`
**Version:** 1.0
**Date:** 2026-07-27
**Method:** Domain-Driven Design (Strategic + Tactical)
**Source system of record:** DRIMS Assam — Disaster Reporting and Information Management System, operated by the Assam State Disaster Management Authority (ASDMA)

---

## 1. Problem Statement

ASDMA publishes a *Daily Flood Report* as a PDF via DRIMS. The 2026-07-27 bulletin is 31 pages containing roughly 22 distinct reporting sections, each a wide table broken down by District and then by Revenue Circle.

The bulletin is **complete but not decidable**. Every number a decision maker needs is present, but:

- **Nothing is ranked.** Sivasagar (144,461 affected) and Kamrup Metro (0 affected) occupy visually identical rows. Severity must be reconstructed by eye.
- **Nothing is related.** Relief camp inmates (28,695) live on page 2; affected population (445,495) lives on page 1. The ratio between them — the single most useful number in the document, telling you that **93.6% of affected people are not in camps** — appears nowhere.
- **Nothing is projected.** The bulletin is a snapshot. "If Dhansiri (S) stays above danger level for 48 more hours, do we have rice?" is unanswerable without arithmetic across four sections.
- **Nothing is comparable.** Yesterday's bulletin is a separate PDF. Trend — the difference between a receding flood and a building one — requires manually diffing documents.
- **Geography is latent.** Infrastructure damage rows carry longitude/latitude, but the PDF renders them as text columns. A reader cannot see that damage clusters along one road corridor.

The consequence is that the bulletin functions as a **record of what happened** rather than an **instrument for deciding what to do next**. A District Commissioner reads it to file it, not to act on it.

### 1.1 What this product is

A decision console that ingests the ASDMA PDF unchanged — no upstream process change, no cooperation from DRIMS required — and re-presents it as a ranked, related, projected, comparable, and mapped situation picture aimed at scenario planning.

### 1.2 What this product is not

- **Not a forecasting system.** It does not predict rainfall or river levels. It projects the consequences of assumptions the user supplies.
- **Not a system of record.** ASDMA's bulletin remains authoritative. Every figure is traceable back to its page and section.
- **Not a replacement for DRIMS.** It is a read-side consumer.

---

## 2. Users and Decisions

The product is designed backwards from decisions, not forwards from data.

| User | Horizon | Decision they must make | What the bulletin fails to give them |
|---|---|---|---|
| **ASDMA State Control Room officer** | Hours | Where to send the next NDRF/SDRF column and the next tranche of boats | Relative severity ranking; where rescue assets are thinnest per capita |
| **District Commissioner** | 12–48 hours | Whether to open more camps, and where | Camp uptake vs. affected population; camp load per site; days of ration left |
| **Revenue Circle Officer** | Hours | Which villages to evacuate first | Revenue-circle-level severity, currently buried in `(Circle \| value)` inline text |
| **Relief & Logistics lead** | 2–7 days | What to pre-position and where | Ration coverage days; distribution centre load vs. camp load |
| **PWD / Water Resources engineer** | Days | Which embankments and roads to prioritise for repair | Spatial clustering of damage; breached vs. merely affected |
| **State Executive Committee / CM's office** | Days–weeks | Resource envelope, central assistance case, public communication | Trend across bulletins; cumulative burden; defensible severity narrative |

### 2.1 Primary decision questions (the acceptance bar)

The product succeeds if a decision maker can answer each of these in under 30 seconds, from a cold start, with the PDF just loaded:

1. Which three districts are worst affected, and by what measure?
2. How many affected people are *not* in relief camps?
3. Which revenue circle has the highest camp load per site?
4. How many days of rice remain at current inmate counts?
5. Where is infrastructure damage geographically concentrated?
6. If the affected population grows 30%, which district's camp capacity fails first?
7. What changed since yesterday's bulletin?

Question 6 is scenario planning. Question 7 requires multi-bulletin ingestion. Both are in scope.

---

## 3. Strategic Design

### 3.1 Domain distillation

| Subdomain | Type | Rationale |
|---|---|---|
| **Bulletin Ingestion** | Generic-leaning Supporting | PDF extraction is a solved problem in general, but the DRIMS layout is idiosyncratic enough to need bespoke work. No competitive value, high correctness risk. |
| **Situation Assessment** | **Core** | Turning raw counts into ranked, comparable severity is the product's reason to exist. |
| **Response Capacity** | **Core** | Relating relief supply to relief demand — camps, inmates, rations, rescue assets — is where decisions are actually made. |
| **Infrastructure Impact** | Supporting | Geospatial damage inventory. Valuable, but its logic is presentation-heavy rather than rule-heavy. |
| **Scenario Planning** | **Core** | The forward-looking capability that distinguishes a console from a dashboard. |
| **Temporal Comparison** | Supporting | Trend across bulletins. High value, but mechanically it is set arithmetic over the core model. |

Investment follows this classification: the Situation Assessment, Response Capacity, and Scenario Planning contexts get the richest domain models and the most rigorous tests. Bulletin Ingestion gets the most *defensive* tests, because it is where silent corruption enters.

### 3.2 Bounded contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ASDMA / DRIMS (external)                    │
│                    Daily Flood Report PDF (upstream)                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ Conformist — we accept their format
                                 │ and their language, unchanged
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BULLETIN INGESTION CONTEXT                                         │
│  Turns an opaque PDF into a validated, provenance-carrying report.  │
│  Aggregate: BulletinExtraction                                      │
│  Language: Bulletin, Page, Section, Cell, Extraction, Provenance,   │
│            Confidence, ReconciliationFailure                        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ Published Language:
                                 │ FloodSituationReport (immutable)
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
┌─────────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
│ SITUATION           │ │ RESPONSE         │ │ INFRASTRUCTURE      │
│ ASSESSMENT (Core)   │ │ CAPACITY (Core)  │ │ IMPACT              │
│                     │ │                  │ │                     │
│ How bad is it, and  │ │ Can we cope, and │ │ What is broken, and  │
│ where, and for whom?│ │ for how long?    │ │ where exactly?       │
│                     │ │                  │ │                     │
│ Agg: DistrictSit.   │ │ Agg: ReliefOp.   │ │ Agg: DamageInventory │
│      RiverStatus    │ │      CampNetwork │ │                     │
└──────────┬──────────┘ └────────┬─────────┘ └──────────┬──────────┘
           │                     │                      │
           └──────────┬──────────┴──────────────────────┘
                      │ Shared Kernel: AdministrativeUnit,
                      │ ReportDate, Quantity types
                      ▼
        ┌─────────────────────────────┐   ┌──────────────────────────┐
        │ SCENARIO PLANNING (Core)    │   │ TEMPORAL COMPARISON      │
        │ What if it gets worse?      │◄──│ What changed since       │
        │ Agg: Scenario               │   │ yesterday?               │
        │ Svc: ProjectionEngine       │   │ Agg: BulletinTimeline    │
        └─────────────────────────────┘   └──────────────────────────┘
```

### 3.3 Context map — relationships

| Upstream | Downstream | Pattern | Justification |
|---|---|---|---|
| DRIMS PDF | Bulletin Ingestion | **Conformist** | We have zero influence over ASDMA's format. We absorb their model wholesale rather than negotiate. |
| Bulletin Ingestion | All others | **Published Language** | `FloodSituationReport` is an immutable, versioned contract. Downstream contexts never see a `PDFTextItem`. |
| Situation Assessment | Response Capacity | **Customer/Supplier** | Response Capacity needs affected-population figures to compute uptake; Situation Assessment publishes them deliberately. |
| Situation Assessment + Response Capacity | Scenario Planning | **Shared Kernel** | Scenario Planning perturbs both models, so it shares their value objects. Deliberately small kernel: `AdministrativeUnit`, quantity types. |
| Bulletin Ingestion | Temporal Comparison | **Open Host Service** | Timeline stores whole `FloodSituationReport`s; needs no special API. |

**Anti-corruption layer.** The single most important structural decision. DRIMS emits values like `2025.9200000000003` (float noise), `"Nil"` where `0` is meant, `"SNR"` for *Status Not Reported*, blank cells that may mean zero or may mean unknown, and inline mini-syntax `(Mahmora | 67), (Sonari | 80)`. **None of this leaks past the ingestion boundary.** The ACL translates it into explicit domain types where "unknown" and "zero" are distinguishable — a distinction the PDF itself does not reliably make, and one that matters enormously when the number is deaths.

---

## 4. Ubiquitous Language

The language is **ASDMA's, not ours**. Where DRIMS says "Revenue Circle" we say Revenue Circle, never "sub-district". Officers must be able to read our UI and the PDF side by side without translation. Terms below are binding on code, tests, UI copy, and this document.

### 4.1 Administrative and hydrological terms (adopted from ASDMA)

| Term | Definition | Notes for implementers |
|---|---|---|
| **District** | First-level administrative unit. 8 appear in the 2026-07-27 bulletin; 35 exist in Assam. | Districts with all-zero rows (Dhemaji, Dibrugarh) are *reported and quiet*, not absent. Preserve the distinction. |
| **Revenue Circle** | Second-level unit within a District. 21 affected in this bulletin. | The real unit of operational decision-making. Never flatten it away. |
| **Village** | Third level. 631 affected. | Reported as counts per Revenue Circle, not named. |
| **Danger Level (DL)** | River stage above which flooding is expected. Per CWC bulletin issued 08:00. | 2026-07-27: Dhansiri (S) at Numaligarh. |
| **Highest Flood Level (HFL)** | Historic maximum recorded stage. Above HFL is the severe case. | 2026-07-27: Nil. |
| **CWC** | Central Water Commission — issues the river-level bulletin ASDMA quotes. | External authority; we attribute, never restate. |

### 4.2 Impact terms

| Term | Definition | Trap |
|---|---|---|
| **Affected Population** | People in villages recorded as flood-affected. | **Not** the same as displaced. 445,495 affected vs 28,695 in camps. Conflating these is the single most dangerous error this product could make. |
| **Crop Area Submerged** | Agricultural land under water, in hectares. | Carries float noise from DRIMS. Round at presentation, never at storage. |
| **Human Lives Lost — Confirmed** | Deaths attributed to the flood. Split into *Flood Death* and *General Drowning (Non Flood)*. | These two are reported separately by ASDMA and **must not be summed**. Doing so overstates flood mortality. |
| **Human Lives Lost — Missing** | Persons unaccounted for. Tracked separately from confirmed. | Never merge into a single "casualties" figure. |
| **Houses Damaged** | Split **Fully/Severely** vs **Partially**, each split **Kuccha** (non-permanent) vs **Pukka** (permanent). | Four distinct figures. Kuccha/Pukka drives compensation rates, so the split is not cosmetic. |
| **Animals Affected / Washed Away** | Livestock, split Big / Small / Poultry. | Two different events. "Affected" is exposure; "washed away" is loss. |

### 4.3 Response terms

| Term | Definition | Trap |
|---|---|---|
| **Relief Camp** | Facility where displaced people are sheltered. 90 open. | |
| **Relief Distribution Centre** | Facility distributing supplies to people **not** sheltering. 94 open. | A different thing from a camp. ASDMA reports "Relief Camps / Centres Opened: 184" as the sum — but the two serve different populations and must stay separable. |
| **Inmates** | People sheltering in relief camps. 28,695. | ASDMA's word. Retain it, however institutional it sounds — officers search for it. |
| **Non-Camp Inmates** | People served by distribution centres without sheltering. 51,777. | Terminologically awkward (they are not inmates of anything) but it is ASDMA's term. Conformist. |
| **Vulnerable Inmates** | *Our* derived term: Children + Pregnant/Lactating Mothers + Persons with Disability. | Clearly marked as derived, not an ASDMA figure. |
| **Relief Distributed** | Commodities issued. Rice/Dal/Salt in **Quintals (Q)**, Mustard Oil in **Litres (L)**. | 1 Q = 100 kg. Unit confusion here is a two-orders-of-magnitude error in ration planning. Units are part of the type. |
| **Rescue Agency** | NDRF, SDRF, DDRF, Army/Paramilitary, Civil Defence, Local People, Circle Office. | Free-text and repetitive in source (Sivasagar lists "Local People" four times). Normalise to a set. |

### 4.4 Infrastructure terms

| Term | Definition | Trap |
|---|---|---|
| **Embankment Breached** | Embankment failed — water is through. | **Categorically more serious than Affected.** ASDMA reports them as separate sections. Never merge. |
| **Embankment Affected** | Embankment damaged but holding. | |
| **Kuccha / Pukka** | Non-permanent / permanent construction. | |
| **SNR** | *Status Not Reported.* Appears in place of coordinates and figures. | Means **unknown**, not zero. |
| **Nil** | ASDMA's zero-or-nothing marker. | Context-dependent: in a count column it means 0; in a name column it means "no such item". |

### 4.5 Derived decision metrics (our language, explicitly marked as derived)

These do not exist in the bulletin. Each is labelled "derived" in the UI with its formula shown on hover, so no officer mistakes our arithmetic for ASDMA's reporting.

| Metric | Formula | Decision it drives | 2026-07-27 statewide value |
|---|---|---|---|
| **Camp Uptake Rate** | Inmates ÷ Affected Population | Is displacement being under-served, or are people staying put? | 28,695 ÷ 445,495 = **6.4%** |
| **Unsheltered Affected** | Affected Population − Inmates − Non-Camp Inmates | The population with no recorded touchpoint. The headline gap. | 445,495 − 28,695 − 51,777 = **365,023** |
| **Camp Load** | Inmates ÷ Relief Camps | Overcrowding. Drives "open more camps". | 28,695 ÷ 90 = **319 per camp** |
| **Ration Coverage Days** | (Rice Q × 100 kg) ÷ (Inmates × 0.6 kg/day) | Days until rice runs out at current caseload. | (1,191.09 × 100) ÷ (28,695 × 0.6) = **6.9 days** |
| **Vulnerable Load** | Vulnerable Inmates ÷ Inmates | Medical and nutrition planning. | (3,004 + 97 + 42) ÷ 28,695 = **11.0%** |
| **Rescue Asset Ratio** | Boats Deployed ÷ (Affected Population ÷ 1,000) | Where rescue capacity is thinnest per capita. | 67 ÷ 445.5 = **0.15 boats per 1,000** |
| **Severity Index** | Weighted, min–max normalised composite (§6.3) | Single ranking for triage. | Sivasagar highest |

> **Ration norm caveat.** 0.6 kg rice/person/day follows SDRF relief-norm convention. It is a **configurable assumption surfaced in the UI**, not a constant buried in code — a user who disagrees can change it and watch coverage days move. This is deliberate: the product's credibility depends on its assumptions being arguable.

---

## 5. Tactical Design

### 5.1 Bulletin Ingestion Context

**Aggregate root: `BulletinExtraction`**

Enforces the invariant that a report is either fully coherent or explicitly flagged — never quietly wrong.

```
BulletinExtraction (AR)
├── BulletinId          (VO)  content hash of the PDF — same file, same id
├── ReportDate          (VO)  parsed from "Assam Flood Report as on 27-07-2026"
├── GeneratedAt         (VO)  "Report Generated On: 27-07-2026 09:49 PM"
├── SectionExtraction[] (E)   one per recognised section
│   ├── SectionKind     (VO)  enum — 22 known kinds
│   ├── SourcePages     (VO)  provenance: which pages it spanned
│   └── ExtractionConfidence (VO) High | Degraded | Failed
└── ReconciliationReport (VO) per-section row-total vs stated-total checks
```

**Invariants**

1. A `BulletinExtraction` without a parseable `ReportDate` cannot be constructed. There is no "undated bulletin" state.
2. Every `SectionExtraction` records its source pages. Provenance is not optional — an officer must always be able to get back to the page.
3. **Totals are verified, not trusted.** ASDMA prints a Total row; we independently sum the district rows and compare. Mismatch produces a `ReconciliationFailure` and marks that section `Degraded` — it does not throw away the data, and it does not silently present it as sound.
4. `Failed` sections are surfaced in the UI as "could not read", never rendered as zero. **Zero and unknown are different facts** — the whole ACL exists to protect this distinction.

**Domain services**

- `SectionRecogniser` — locates section boundaries by the left-hand "Particulars" label, which is word-wrapped across lines in the source (`Infrastruct/ure/Damaged - /Road`) and must be reassembled before matching.
- `TabularReconstructor` — clusters positioned text runs into rows and columns geometrically. See ADR-0002 for why this is coordinate-based rather than regex-based.
- `InlineBreakdownParser` — parses the `(Nazira | 41), (Demow | 24)` mini-language into Revenue Circle figures. Two dialects exist: the simple `(Name | Number)` and the compound `(Mahmora | Population Affected: 67128 | Crop Area Submerged: 7340)`.

### 5.2 Situation Assessment Context

**Aggregate root: `DistrictSituation`**

```
DistrictSituation (AR)
├── DistrictName            (VO)
├── RevenueCircleSituation[] (E)
│   ├── CircleName          (VO)
│   ├── VillagesAffected    (VO) Count
│   ├── AffectedPopulation  (VO) {male, female, children, total}
│   └── CropAreaSubmerged   (VO) Hectares
├── HouseDamage             (VO) {fullyKuccha, fullyPukka, partialKuccha, partialPukka}
├── Casualties              (VO) {floodDeaths, generalDrownings, missing} — never summed
├── AnimalImpact            (VO) {affected, washedAway} × {big, small, poultry}
└── SeverityIndex           (VO) derived, computed by domain service
```

**Invariants**

1. `AffectedPopulation.total` must equal `male + female + children`, else the district is flagged `Degraded`. (The 2026-07-27 bulletin satisfies this: 187,890 + 183,461 + 74,144 = 445,495. ✓)
2. A District's figures must be ≥ the sum of its Revenue Circles' figures. Where DRIMS reports a district total exceeding the circle sum, the excess is retained as `unattributedToCircle` rather than being discarded or forced to balance.
3. `SeverityIndex` is never persisted from an external source — always computed, always from the current report.
4. Casualty figures are structurally prevented from being summed: `Casualties` exposes `floodDeaths` and `generalDrownings` but **no** `total` accessor. The type system enforces the ubiquitous language.

**Aggregate root: `RiverStatus`** — rivers above DL and above HFL, attributed to CWC with the 08:00 issue time. Small aggregate, but it is the leading indicator: it changes before the impact figures do.

### 5.3 Response Capacity Context

**Aggregate root: `ReliefOperation`** (per district)

```
ReliefOperation (AR)
├── CampNetwork          (E)
│   ├── ReliefCamp[]     count + per-circle breakdown
│   ├── DistributionCentre[]
│   ├── Inmates          (VO) {male, female, children, pregnantLactating, personsWithDisability}
│   └── NonCampInmates   (VO) {male, female, children, animals{big,small,poultry}}
├── ReliefDistributed    (VO) typed quantities — Quintals | Litres | Count
├── RescueDeployment     (E)  {agencies: Set, medicalTeams, boats, helicopters,
│                              personsEvacuatedByBoat, personsEvacuatedByHeli, animalsEvacuated}
└── ReliefAdequacy       (VO) derived: coverage days, camp load, vulnerable load
```

**Invariants**

1. Quantities are **typed by unit**. `Quintals(1191.092)` and `Litres(3513.53)` are different types; adding them is a compile error. This is not ceremony — it is the guard against the two-orders-of-magnitude ration error described in §4.3.
2. `Inmates.total` ≥ `pregnantLactating + personsWithDisability` — these are overlapping subsets of the population, not additional people.
3. `RationCoverageDays` requires a `RationNorm` to be supplied explicitly. There is no default parameter. A caller must state the assumption, which makes it visible and therefore arguable.
4. Rescue agency lists are `Set`s — the source's repeated "Local People, ... Local People" collapses to one member.

### 5.4 Infrastructure Impact Context

**Aggregate root: `DamageInventory`**

```
DamageInventory (AR)
├── RoadDamage[]        (E) {name, department, village, location, coords?, remarks}
├── BridgeDamage[]      (E)
├── EmbankmentBreach[]  (E) — distinct type from Affected. Deliberate.
├── EmbankmentAffected[](E)
├── SchoolDamage[]      (E) {elementary | secondary, name, department}
├── AnganwadiDamage[]   (E)
└── OtherDamage[]       (E) fisheries/ponds (Hect.), playfields (Sqm), ring bunds
```

**Invariants**

1. `EmbankmentBreach` and `EmbankmentAffected` are **separate types**, not one type with a flag. Severity asymmetry is encoded structurally; a UI cannot accidentally render them together.
2. `GeoCoordinate` is optional and validated against Assam's bounding box (89.7°E–96.0°E, 24.1°N–28.2°N). The source contains truncated values — bare `94` and `27` for the Charaideo fisheries rows — which fail precision validation and are retained as `ApproximateCoordinate`, mapped distinctly from precise points.
3. `"Nil"`-filled rows produce **no** entity. A district reporting "Nil" for roads has an empty collection, not an entity named "Nil".

### 5.5 Scenario Planning Context

**Aggregate root: `Scenario`**

```
Scenario (AR)
├── ScenarioName        (VO)
├── BaselineReportId    (VO) — always anchored to a real bulletin
├── ScenarioLever[]     (VO)
│   ├── PopulationGrowthFactor   e.g. +30% affected
│   ├── CampUptakeShift          e.g. uptake 6.4% → 25%
│   ├── DurationDays             e.g. sustained 5 days
│   ├── RationNorm               kg/person/day
│   └── AdditionalCampCapacity   per district
└── ProjectedOutcome    (VO) computed, never stored
```

**Domain service: `ProjectionEngine`**

Pure function: `(FloodSituationReport, ScenarioLever[]) → ProjectedOutcome`. No I/O, no clock, no randomness — trivially testable, which is the point.

**Invariants**

1. A `Scenario` always references a real baseline bulletin. There is no free-floating projection.
2. `ProjectedOutcome` is **never persisted** — always recomputed from baseline + levers, so a stale projection cannot survive a data correction.
3. Every projected figure carries a `Derivation` explaining its provenance in words: *"Rice runs out in 2.1 days: 25% uptake of 579,143 projected affected = 144,785 inmates × 0.6 kg × 100 = 86,871 kg/day demand vs 119,109 kg stock."* A projection a user cannot interrogate is a projection they should not trust.

**Worked example — the flagship scenario.** Baseline 2026-07-27: 445,495 affected, 6.4% uptake, 6.9 days of rice. Apply *+30% affected, uptake rises to 25%, sustained 5 days*: projected affected 579,143, projected inmates 144,785 (a 5× increase), camp load at current 90 camps = 1,609 per camp (5× the current 319), ration coverage collapses from 6.9 days to **1.4 days**. That single screen is the product's core value proposition, and it is arithmetic the PDF cannot do.

> **Rounding convention.** Projected people counts are **floored**. Two reasons: a fraction of a person is not a meaningful planning unit, and flooring keeps a projection from inflating itself through rounding artefacts as levers compound. The convention is stated here because `445,495 × 1.3` lands exactly on `.5`, where floor and round-half-up disagree — the kind of ambiguity that otherwise shows up as a failing test nobody can adjudicate. Coverage-day and load figures are unaffected either way.

### 5.6 Temporal Comparison Context

**Aggregate root: `BulletinTimeline`** — an ordered set of `FloodSituationReport`s, deduplicated by `BulletinId` (content hash), so loading the same PDF twice is idempotent.

**Invariants**

1. Reports are ordered by `ReportDate`, not load order.
2. Deltas are computed only between **adjacent** dates; a gap is reported as a gap, never silently interpolated. Interpolating flood data would be fabrication.
3. A single-report timeline is valid and yields no deltas — the first-run state, not an error.

---

## 6. Functional Requirements

### 6.1 Ingestion

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Load a DRIMS PDF by file picker or drag-and-drop | Must |
| FR-1.2 | Parse entirely **client-side**; the PDF never leaves the browser | Must |
| FR-1.3 | Extract all 22 recognised section kinds | Must |
| FR-1.4 | Reconcile every stated Total against independently summed rows; report mismatches | Must |
| FR-1.5 | Render partial results when some sections fail; never fail whole-document on one bad section | Must |
| FR-1.6 | Persist parsed reports to IndexedDB for offline re-use | Must |
| FR-1.7 | Load multiple bulletins to build a timeline | Must |
| FR-1.8 | Show extraction confidence per section, with page-level provenance | Must |
| FR-1.9 | Reject non-DRIMS PDFs with a clear, specific message | Should |
| FR-1.10 | Export the parsed report as JSON / CSV | Should |

### 6.2 Situation visualisation

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | **Situation Summary** — headline figures with the derived gap (365,023 unsheltered) given equal visual weight to the reported ones | Must |
| FR-2.2 | **District severity ranking** — sortable by any impact dimension | Must |
| FR-2.3 | **Drill-down** District → Revenue Circle without losing context | Must |
| FR-2.4 | **Rivers above DL/HFL** panel, attributed to CWC with issue time | Must |
| FR-2.5 | **Impact composition** — population, crop, houses, animals per district | Must |
| FR-2.6 | **Damage map** — lat/long infrastructure points, clustered, typed by damage class | Must |
| FR-2.7 | **District choropleth** — District boundaries are bundled (Census 2011 lineage, CC BY 4.0, ~18.5 kB gzipped), so this is **shipped**, not deferred. Shaded by a user-chosen measure; Districts reporting nil, Districts with the measure unreported, and Districts absent from the bulletin are three distinct treatments, never one (ADR-0009). Revenue Circle boundaries remain unavailable, and the UI says so. | Must (was Should) |
| FR-2.8 | Every figure traceable to its source page via a provenance affordance | Must |
| FR-2.9 | Casualty figures displayed with flood deaths and general drownings **visually separated**, never summed | Must |

### 6.3 Severity index

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Composite index over normalised affected population, villages affected, crop area, camp load, and casualties | Must |
| FR-3.2 | Weights **user-adjustable** — a District Commissioner weighting crop loss differently from the State Control Room is legitimate, not a bug | Must |
| FR-3.3 | Show the contribution breakdown per component | Must |
| FR-3.4 | Min–max normalise **within the loaded bulletin**, so the index is explicitly relative and never presented as an absolute score | Must |

Default weights — affected population 0.35, villages affected 0.15, crop area 0.15, camp load 0.20, casualties 0.15 — are a stated starting point, not a claim of objectivity. The UI says so.

### 6.4 Scenario planning

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Adjust levers: population growth, camp uptake, duration, ration norm, added capacity | Must |
| FR-4.2 | Recompute projections live (< 100 ms) | Must |
| FR-4.3 | Show **baseline vs projected** side by side, never projected alone | Must |
| FR-4.4 | Identify the **first failure point** — which district's capacity breaks first, and when | Must |
| FR-4.5 | Save, name, and compare scenarios | Should |
| FR-4.6 | Every projected figure carries a plain-language `Derivation` | Must |
| FR-4.7 | Projections visually distinct from reported figures — different typographic treatment, always labelled | Must |

### 6.5 Temporal comparison

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Trend lines for headline metrics across loaded bulletins | Must |
| FR-5.2 | Day-over-day deltas with direction and magnitude | Must |
| FR-5.3 | Flag districts newly affected or newly clear | Should |
| FR-5.4 | Show gaps in the timeline explicitly; never interpolate | Must |

---

## 7. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Parse a 31-page bulletin | < 5 s on a mid-range laptop |
| NFR-2 | Scenario recomputation | < 100 ms |
| NFR-3 | First contentful paint | < 1.5 s on 3G |
| NFR-4 | Bundle size (gzipped, excl. pdf.js worker) | < 300 KB |
| NFR-5 | **Zero network egress of bulletin content** | Absolute — enforced by CSP |
| NFR-6 | Works fully offline after first load | Must |
| NFR-7 | Accessibility | WCAG 2.1 AA |
| NFR-8 | Colour-blind-safe palettes; never colour alone to encode severity | Must |
| NFR-9 | Domain layer test coverage | > 90% |
| NFR-10 | Browser support | Last 2 versions of Chrome, Edge, Firefox, Safari |
| NFR-11 | Readable on a 1366×768 projector — the actual screen in most control rooms | Must |

**On NFR-5.** Flood bulletins are public data, so the confidentiality argument is weak. The real argument is operational: control rooms have unreliable connectivity, and a tool that needs a round-trip to parse is a tool that fails when it is most needed. Client-side parsing is a resilience decision that happens to also be a privacy decision.

---

## 8. Deployment

Static SPA on Netlify. No backend, no database, no API keys, no server-side state. `netlify.toml` pins the build, sets a CSP consistent with NFR-5, and configures SPA redirects. Deploy previews on PRs. See ADR-0007.

---

## 9. Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **DRIMS changes the PDF layout** | Critical — extraction breaks silently | Medium | Reconciliation (FR-1.4) turns silent breakage into loud breakage. Section recognition is label-driven, not position-driven, so column shifts degrade gracefully. Golden-file test against the 2026-07-27 bulletin. |
| **A future bulletin is scanned rather than digital** | Critical — no text layer | Low | Detect absent text layer and say so plainly rather than producing garbage. OCR is explicitly out of scope for v1. |
| **Revenue-circle boundary GeoJSON unavailable** | Low — District choropleth shipped; Revenue Circle shading still not possible | **Realised** (District part resolved 2026-07-28) | **District** boundaries turned out to be obtainable and are now bundled — Census 2011 lineage, CC BY 4.0, 18.5 kB gzipped — so FR-2.7 shipped as a District choropleth (ADR-0009). **Revenue Circle** boundaries remain unavailable, so the map is explicitly labelled as shading to District only: an unshaded Circle within a shaded District is stated in the UI to mean nothing. The Revenue Circle figures themselves are not lost — they are in the FR-2.3 drill-down. |
| **Severity index is misread as official** | High — reputational | Medium | Every derived figure labelled, formula shown, weights user-editable. The product's honesty about its own arithmetic is a feature. |
| **Truncated coordinates plot wrongly** | Medium | High (present in source) | Precision validation; `ApproximateCoordinate` rendered distinctly. |
| **Officers treat projections as forecasts** | High | Medium | FR-4.3 and FR-4.7 — projections never shown without baseline, always typographically distinct, always with derivation. |

---

## 10. Success Criteria

1. All seven §2.1 questions answerable in < 30 s from a cold start.
2. Every figure in the 2026-07-27 bulletin either extracted correctly or explicitly flagged — **nothing silently wrong**.
3. Reconciliation catches an injected corruption in a golden-file test.
4. Scenario recomputation under 100 ms.
5. Domain layer > 90% coverage, London-School TDD throughout.
6. Deploys to Netlify from a clean clone with no configuration.
7. A user who has never seen the console can name the three worst-affected districts within 30 seconds of loading the PDF.

---

## Appendix A — Section inventory (2026-07-27 bulletin)

| # | Section | Grain | Pages |
|---|---|---|---|
| 1 | Rivers above Danger Level / HFL | State | 1 |
| 2 | Districts Affected | State | 1 |
| 3 | Revenue Circles Affected | District | 1 |
| 4 | Villages Affected | District → Circle | 1 |
| 5 | Population and Crop Area Submerged | District → Circle | 1–2 |
| 6 | Relief Camps / Centres Opened | District → Circle | 2 |
| 7 | Inmates in Relief Camps | District → Circle | 2 |
| 8 | Non-Camp Inmates in Distribution Centres | District → Circle | 2 |
| 9 | Human Lives Lost — Confirmed | District → Circle | 3 |
| 10 | Human Lives Lost — Missing | District → Circle | 3 |
| 11 | Animals Affected | District | 3 |
| 12 | Animals Washed Away | District | 3 |
| 13 | Houses Damaged | District | 3–4 |
| 14 | Houses Damaged — Others | District | 4 |
| 15 | Rescue Operation | District | 4 |
| 16 | Relief Distributed | District | 4 |
| 17 | Relief Distributed — Others | District | 4 |
| 18 | Infrastructure Damaged — Road | District → Circle → item | 5–10 |
| 19 | Infrastructure Damaged — Bridge | District → Circle → item | 10 |
| 20 | Infrastructure Damaged — Embankment Breached | District → Circle → item | 10–11 |
| 21 | Infrastructure Damaged — Embankment Affected | District → Circle → item | 11–12 |
| 22 | Infrastructure Damaged — Others | District → Circle → item | 12–30 |
| 23 | Remarks | District | 30–31 |

## Appendix B — Statewide baseline, 2026-07-27

| Figure | Value |
|---|---|
| Districts affected | 6 (of 8 reporting) |
| Revenue Circles affected | 21 |
| Villages affected | 631 |
| Population affected | 445,495 (M 187,890 / F 183,461 / C 74,144) |
| Crop area submerged | 37,139.52 Hect. |
| Relief camps | 90 |
| Relief distribution centres | 94 |
| Camp inmates | 28,695 |
| Non-camp inmates | 51,777 |
| Confirmed flood deaths | 0 |
| Missing | 0 |
| Animals affected | 256,334 |
| Animals washed away | 26,679 |
| Houses fully/severely damaged | 176 |
| Houses partially damaged | 4,765 |
| Boats deployed | 67 |
| Medical teams | 179 |
| Rice distributed | 1,191.092 Q |
| Rivers above DL | Dhansiri (S) at Numaligarh |
| Rivers above HFL | Nil |

**Derived:** unsheltered affected **365,023** (81.9%) · camp uptake **6.4%** · camp load **319/camp** · ration coverage **6.9 days** · vulnerable load **11.0%** · rescue asset ratio **0.15 boats/1,000**

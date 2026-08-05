# PRD — Rehabilitation Economics

**A costed rehabilitation picture for the ASDMA flood bulletins: what was lost, what recovery requires, and what is unfunded.**

- **Status:** Draft for review
- **Depends on:** [`PRD.md`](PRD.md) (the situation console), ADR-0002, ADR-0005, ADR-0010
- **Companion:** [`FEASIBILITY-REHABILITATION-ECONOMICS.md`](FEASIBILITY-REHABILITATION-ECONOMICS.md)
- **Contact:** Mondweep Chakravorty — [LinkedIn](https://www.linkedin.com/in/mondweepchakravorty/)

---

## 1. The problem this solves

The console answers *what is happening*. Nobody can fund a response with that alone.

A district officer preparing a memorandum, an NGO writing an appeal, and a donor
deciding between two states all need the same thing and none of them can get it
from the bulletin: **a defensible number, decomposed, with its assumptions
visible.** Today that number is produced in a spreadsheet, by hand, from the same
PDFs — which means it is slow, unreproducible, and unauditable at exactly the
moment when it will be quoted in public.

The bulletin already carries the physical quantities. What it carries none of is
money: **across 23 sections and 190 district-days there is not one monetary
value.** Every figure is people, houses, hectares, animals, quintals or litres.

That single fact defines this entire design. A rupee figure here is always
**a quantity ASDMA reported multiplied by a rate somebody chose.** The first half
is auditable; the second is arguable. The product's job is to never let those two
halves be confused, and to make the arguable half visible, sourced and
changeable.

### 1.1 Who this is for

| Actor | Decision they are trying to make | What they need from us |
|---|---|---|
| **State/district relief officer** | What to claim in the SDRF/NDRF memorandum | Norm-anchored entitlements per District, traceable to the bulletin row |
| **NGO programme lead** | Where to send a fixed budget for maximum effect | Cost per beneficiary by intervention, ranked by District |
| **Fundraiser / communications** | What to put in an appeal without overclaiming | A headline figure with a stated basis and an honest range |
| **Institutional donor** | Whether the ask is proportionate | Decomposition to quantity × rate, with both sourced |
| **Auditor, later** | Whether the claim was reasonable at the time | The exact norm version and bulletin set used, reproducible |

The auditor is not an afterthought. Designing for reproducibility *after the
fact* is what separates this from a spreadsheet.

---

## 2. Scope

### In scope

- Valuing physical damage and loss the bulletins report, per District and statewide
- Estimating rehabilitation requirement from that valuation
- Comparing requirement against a funding envelope, and stating the gap
- Allocating a fixed envelope across Districts under a stated policy
- Exporting the whole derivation, assumptions included

### Explicitly out of scope

- **Payments, beneficiary lists, or entitlement adjudication.** This is a planning
  model, not a disbursement system. It never names a household.
- **Macroeconomic modelling** (GDP effect, multipliers, fiscal impact).
- **Predicting future floods.** Scenario Planning projects the next few days from
  the current situation; it does not forecast weather.
- **Replacing the SDRF/NDRF memorandum process.** We produce an input to it.

---

## 3. Domain-driven design

### 3.1 Why a new bounded context

Rehabilitation Economics is **not** an extension of Scenario Planning, and the
distinction is not administrative:

| | Scenario Planning | Rehabilitation Economics |
|---|---|---|
| Horizon | next 24–72 hours | next 6–24 months |
| Question | "do we have enough rice?" | "what will recovery cost?" |
| Actor | emergency operations | finance, programmes, donors |
| Truth standard | good enough to act on now | auditable months later |
| Language | camps, rations, capacity | damage, loss, needs, entitlement, envelope |

Two different languages for two different conversations is the textbook
signal for a context boundary. Forcing them together would produce a model
where `cost` means something different depending on who is reading.

### 3.2 Ubiquitous language — adopted, not invented

The vocabulary is taken from **Post-Disaster Needs Assessment (PDNA)**, the joint
EU/UN/World Bank methodology, because it is the language donors already
read appeals in. Inventing our own would make every output need translating.

| Term | Meaning here | Why it must not drift |
|---|---|---|
| **Damage** | Replacement value of physical assets destroyed or partly destroyed | A *stock* concept. Houses, livestock, infrastructure. |
| **Loss** | Value of economic flows foregone because of the disaster | A *flow* concept. Lost crop yield, lost wages, added relief cost. Never added to Damage without saying so — they are different kinds of number. |
| **Needs** | What recovery and reconstruction actually requires | Usually **exceeds** Damage: rebuilding to a better standard costs more than what was lost. Reporting Needs as equal to Damage is the most common way these figures are wrong. |
| **Entitlement** | What a beneficiary is owed under a published norm | Norm-defined, not estimated. Distinct from Needs. |
| **Caseload** | Number of beneficiary units qualifying for an entitlement | Households or persons — the unit is always stated, never implied. |
| **Norm / Unit Rate** | Published rupee rate per unit of damage | Has a version, an effective date and a citation, or it does not exist. |
| **Envelope** | Funds actually available | |
| **Gap** | Requirement − Envelope | Always signed and always shown, including when negative. |
| **Person-Day** | One person in one condition for one day | The unit that makes daily bulletins worth more than one bulletin. See §4.2. |

**ASDMA's vocabulary continues to bind** where the two meet. A `Kuccha` house is
a Kuccha house in this context too; we do not rename it "non-permanent dwelling"
because a norm schedule uses that phrase.

### 3.3 Context map

```
        ┌──────────────────────────┐
        │  Bulletin Ingestion      │
        └────────────┬─────────────┘
                     │ published language: FloodSituationReport
        ┌────────────▼─────────────┐     ┌────────────────────────┐
        │  Situation Assessment    │     │  Temporal Comparison   │
        └────────────┬─────────────┘     └───────────┬────────────┘
                     │ Customer/Supplier             │ Shared Kernel
                     │ (quantities per District)     │ (MeasureKind: flow|stock)
                     │                               │
        ┌────────────▼───────────────────────────────▼────────────┐
        │           REHABILITATION ECONOMICS  (new, core)         │
        │                                                          │
        │   DamageAndLossAssessment · RehabilitationPlan           │
        │   FundingScenario                                        │
        └────────────▲─────────────────────────────┬───────────────┘
                     │ Conformist + ACL            │ published language:
                     │                             │ CostedAssessment
        ┌────────────┴─────────────┐   ┌───────────▼────────────┐
        │  Cost Norm Catalogue     │   │  Appeal & Allocation   │
        │  (supporting subdomain)  │   │  (views, export)       │
        └──────────────────────────┘   └────────────────────────┘
```

**Relationships, and what each obliges us to do:**

- **Situation Assessment → Rehabilitation Economics: Customer/Supplier.** We are
  downstream and we conform. We must never ask the parser to change shape to suit
  a costing convenience.
- **Temporal Comparison ↔ Rehabilitation Economics: Shared Kernel.** Both depend
  on `MeasureKind` and the rule that a stock is never summed. This kernel is
  jointly owned; changing it requires changing both.
- **Cost Norm Catalogue → Rehabilitation Economics: Conformist, through an
  anti-corruption layer.** Norm schedules are published by others in their
  categories, not ours. The ACL maps their categories onto ASDMA's, and **refuses
  rather than guesses** when a category has no counterpart.
- **Rehabilitation Economics → Appeal & Allocation: published language.** A
  `CostedAssessment` is immutable and carries its own provenance, so a figure
  cannot be rendered without the evidence for it.

### 3.4 Aggregates and invariants

**`NormSchedule`** *(root of the Cost Norm Catalogue)*

A versioned set of unit rates.

1. Every rate carries `{ amount, currency, unit, effectiveFrom, citation }`. A rate
   without a citation cannot be constructed — it is not a rate, it is a guess.
2. Schedules are immutable and versioned. Recomputing a March assessment in
   October with October's rates must be an explicit act, never a silent one.
3. A schedule may be **incomplete**. Missing categories are `unknown`, never zero.

**`DamageAndLossAssessment`** *(root, core)*

Per District, over a stated period, from a stated bulletin set.

4. **Every monetary figure decomposes** to `(quantity, quantityProvenance, rate,
   rateProvenance)`. There is no constructor that takes a bare amount.
5. **Unknown propagates.** Unknown quantity or missing rate ⇒ unknown cost. Never
   ₹0. This is ADR-0005 carried into money, where it matters more: a zero in a
   funding table reads as "nothing needed here".
6. **Damage, Loss and Needs are separate fields with no total.** Exactly as
   `Casualties` has no `total` — you cannot accidentally add them, because there
   is nothing to add. Anyone wanting a combined figure must ask for it by name
   and gets a caveat with it.
7. An assessment is bound to the **bulletin ids** it was computed from. Not dates
   — ids, which are content hashes, so a re-issued bulletin invalidates it.

**`RehabilitationPlan`** *(root)*

8. Every line item traces to an assessment line. No free-floating costs.
9. Caseload never exceeds the assessed affected population for its District.
10. Phasing (relief / early recovery / reconstruction) is explicit; a plan without
    a horizon is not a plan.

**`FundingScenario`** *(root)*

11. Allocations sum to ≤ envelope. Enforced, not checked afterwards.
12. Gap is always present and signed. A fully funded scenario shows `+0`, not a
    blank.
13. An allocation policy is a named, stated strategy (`proportional-to-need`,
    `worst-first`, `fixed-per-district`) — never an unexplained split.

### 3.5 Value objects

| Type | Note |
|---|---|
| `Money` | Amount **+ currency + as-of date**. Never a bare `number`. |
| `UnitRate` | `Money` per typed unit (`per-house`, `per-hectare`, `per-person-day`). The unit is in the type, so a per-hectare rate cannot be applied to a headcount. |
| `PersonDays` | The integral unit (§4.2). Distinct from `Count`. |
| `Caseload` | Count **+ beneficiary unit** (`household` \| `person`). |
| `CostBasis` | `replacement` \| `compensation-norm` \| `market` — three different questions, never mixed silently. |
| `Confidence` | Reuses the existing `ExtractionConfidence` plus a norm-side confidence. |

---

## 4. What the daily bulletins make possible

### 4.1 The quantity base is complete

Measured across the bundled archive (20 July – 4 August 2026, 16 bulletins,
190 district-days): **zero unknowns** on every economically relevant measure —
crop area, population, houses by class, animals washed away, relief distributed,
camp inmates, flood deaths.

There is no imputation problem. The model does not have to guess at inputs.

### 4.2 Person-days: why sixteen bulletins beat one

This is the central technical idea and it is worth stating precisely.

`Population Affected` is a **stock**. Summing it across days is meaningless — the
same person affected on twelve days is one person, and the existing type system
already forbids it (`cumulativeOf` accepts only a `FlowMeasure`).

But integrating that stock over time is not summing it. It yields a **different
quantity in a different unit**: person-days. And person-days is exactly what
relief costs are denominated in — feeding someone costs per person per day.

From the bundled archive:

| Integral | Value | What it buys you |
|---|---|---|
| Camp-inmate-days | **302,253** | Cost of running camps at a per-inmate-per-day norm |
| Non-camp-inmate-days | **1,365,045** | Gratuitous relief to those outside camps |
| Population-affected-days | **6,235,154** | Exposure-duration; livelihood interruption |

A single bulletin gives a snapshot and cannot produce any of these. **This is the
capability the daily archive unlocks, and it is the strongest argument for the
whole feature.**

It also needs a new type-level rule, because integration *changes the unit*:
`integrate(stock) → PersonDays` must be as type-enforced as `cumulativeOf(flow)`
is today. See **ADR-0012**.

### 4.3 The physical loss base, measured

Already computed from the archive — these are the model's real inputs, not
illustrations:

| Basis | Quantity | Treatment |
|---|---|---|
| Houses fully/severely damaged | 3,494 | Flow, cumulative → Damage |
| Houses partially damaged | 15,859 | Flow, cumulative → Damage |
| Huts and cattle sheds | 8,727 | Flow, cumulative → Damage |
| Big animals washed away | 6,002 | Flow, cumulative → Damage |
| Small animals washed away | 13,333 | Flow, cumulative → Damage |
| Poultry washed away | 217,270 | Flow, cumulative → Damage |
| Flood deaths | 83 | Flow → ex gratia entitlement |
| **Peak** crop area submerged | 56,606.777 Ha | **Stock → peak, never summed** → Loss |
| **Peak** population affected | 721,024 | Stock → peak → caseload ceiling |

The crop line is the one most likely to be got wrong by a spreadsheet: summing
submerged hectares across sixteen days would report ~433,000 Ha in a state with
far less cropland under flood, because it counts the same field every day. Peak
is the correct basis, and the type system already knows it.

### 4.4 The bulletin schema and the norm schedule are near-isomorphic

`HouseDamage` splits Kuccha/Pukka and Fully-Severely/Partially. That is four
categories, and it is not an accident of layout — the existing code comment says
it plainly: *"The split drives compensation."* Indian relief norms are keyed on
exactly that split, because both the bulletin and the norms descend from the same
relief framework.

The same holds for livestock (big/small/poultry), ex gratia (deaths), and
gratuitous relief (person-days in and out of camps).

**Implication:** the mapping from bulletin fields to norm categories is mostly
one-to-one and needs no interpretation. That is a large part of why this is
feasible at all. Where it is *not* one-to-one — infrastructure, which the
bulletin itemises by name and department but never dimensions (a damaged road
with no length; an embankment with no breach width) — the model must refuse to
cost rather than invent. See the feasibility assessment, §4.

### 4.5 Back-testing against real expenditure

The bulletins report relief **actually distributed**: 21,680 quintals of rice,
4,217 of dal, 105,875 litres of mustard oil across the period.

That is in-kind expenditure already incurred, in physical units, which can be
valued independently. So the modelled relief requirement can be checked against
what was really handed out over the same days.

Very few models of this kind can be validated at all. This one can, and the
product should do it visibly: an officer who can see that the model's relief
estimate lands near the valued actual distribution has a reason to trust the
parts that cannot be checked.

---

## 5. Functional requirements

### Cost norms

- **FR-E1** Ships with at least one complete, cited norm schedule; the citation
  and effective date are visible wherever a figure derived from it appears.
- **FR-E2** Every rate is user-overridable, and an overridden rate is marked as
  overridden everywhere it contributes.
- **FR-E3** Multiple schedules coexist (e.g. a government norm and an NGO
  replacement-cost basis); the active one is always named on screen.
- **FR-E4** A missing rate yields an unknown cost and an explicit "not costed"
  line — never silent omission from a total, which would understate the ask.

### Assessment

- **FR-E5** Damage, Loss and Needs computed per District and statewide, each
  decomposed to quantity × rate.
- **FR-E6** Flows accumulate; stocks use peak; stocks integrated to person-days
  are labelled in person-days. The basis is shown for every line.
- **FR-E7** Every figure states the bulletin set it came from, by date range and
  count.
- **FR-E8** Districts with degraded or failed extraction are excluded from totals
  and listed separately as uncosted.

### Planning and funding

- **FR-E9** Requirement phased into relief / early recovery / reconstruction.
- **FR-E10** An envelope can be entered and the gap shown, per District and
  statewide.
- **FR-E11** A fixed envelope can be allocated under a named policy, with the
  policy's effect on each District visible.
- **FR-E12** Cost-per-beneficiary shown for each intervention, so two Districts
  can be compared on efficiency and not only on size.

### Honesty (these are requirements, not polish)

- **FR-E13** No monetary figure is ever displayed without its basis reachable in
  one interaction.
- **FR-E14** Modelled figures are visually distinct from reported quantities.
  A number we computed must never look like a number ASDMA published.
- **FR-E15** Every headline figure carries a range, not just a point estimate,
  driven by a stated rate sensitivity.
- **FR-E16** Export carries the full derivation: quantities, rates, citations,
  bulletin ids, schedule version, and the time of computation.
- **FR-E17** The model refuses to produce a statewide total when a District it
  should include could not be costed — it reports a floor and says so.

---

## 6. Non-functional requirements

| | Requirement | Basis |
|---|---|---|
| **NFR-E1** | No new network egress on the default path | ADR-0004 stands; see ADR-0013 |
| **NFR-E2** | Recomputation on an assumption change < 100 ms for 35 Districts | The whole point is watching a lever move a figure |
| **NFR-E3** | First-paint budget unchanged (300 kB) | ADR-0010; norms are small, but bundling must be measured |
| **NFR-E4** | Every derived figure reachable as text | NFR-8 in the parent PRD; a screen reader must get the basis too |
| **NFR-E5** | Deterministic: same bulletins + same schedule ⇒ byte-identical output | Auditability is meaningless without it |

---

## 7. What could make this untrustworthy

Stated plainly, because the failure mode of this feature is worse than the
failure mode of the console. A wrong situation figure misleads one officer for
one day. A wrong cost figure ends up in a press release.

| Risk | Control |
|---|---|
| A rate is wrong or out of date | Citation + effective date mandatory; schedule versioned; sensitivity range always shown |
| Damage and Loss silently added | No `total` field on the aggregate — the `Casualties` pattern |
| Crop area summed instead of peaked | Type system forbids `cumulativeOf(stock)`; already enforced |
| Person-days confused with people | `PersonDays` is a distinct type, not a `Count` |
| Uncosted Districts silently dropped, understating the ask | FR-E17: report a floor, name the omissions |
| The figure gets quoted without its basis | FR-E14/E15/E16; export always carries the derivation |
| Norms drift from what government actually pays | Back-test against distributed relief (§4.5); publish the comparison |

---

## 8. Open decisions

These are genuinely open and are the subject of the ADRs, not settled here:

1. **Where norms come from** and which ships by default — ADR-0011.
2. **How stock integration is typed** so person-days cannot leak into headcounts
   — ADR-0012.
3. **Whether any of this gains a backend** (Supabase), given that ADR-0004 makes
   zero egress a browser-enforced property and the README promises it — ADR-0013.

# Feasibility — Rehabilitation Economics

Assessed against the real bundled archive: 16 consecutive ASDMA bulletins,
20 July – 4 August 2026, 190 district-days. Every figure below was computed from
that data, not estimated.

**Verdict: feasible, and unusually well-supported on the quantity side — but it
is not a data problem, it is a norms problem.** The engineering is
straightforward arithmetic over data the console already holds. What decides
whether the output is trustworthy is entirely the unit rates, which do not exist
anywhere in the bulletin and must be sourced, cited and maintained.

---

## 1. Summary

| Dimension | Assessment |
|---|---|
| Input data availability | **Very strong** — 0 unknowns across 190 district-days on all 8 relevant measures |
| Input data granularity | **Strong** — per District, per day; Revenue Circle for some measures |
| Semantic fit to costing | **Strong** — bulletin categories are near-isomorphic to relief-norm categories (§3) |
| Time-series value | **Strong and distinctive** — person-day integrals are impossible from one bulletin (§2) |
| Infrastructure costing | **Weak** — itemised but undimensioned; must refuse rather than guess (§4) |
| Unit-rate availability | **The binding constraint** — nothing in-app; needs sourcing (§5) |
| Engineering effort | **Moderate** — new bounded context, ~4 aggregates, no new runtime dependency |
| Architectural risk | **Low if client-side; high if it drags in a backend** (§6) |
| Reputational risk | **Higher than anything shipped so far** — this feature produces quotable numbers (§7) |

---

## 2. What the daily archive uniquely enables

The strongest argument for building this is a capability a single bulletin cannot
provide at any level of effort.

`Population Affected` is a stock: summing it across days is meaningless and the
type system already refuses. But **integrating** a stock over time produces a
different quantity in a different unit — person-days — and relief costs are
denominated in exactly that unit.

Computed from the archive:

```
camp-inmate-days            302,253
non-camp-inmate-days      1,365,045
population-affected-days  6,235,154
```

Relief cost is a per-person-per-day norm multiplied by these. A one-bulletin
console can produce none of them. Sixteen bulletins can, and the number improves
every day the archive grows.

**This is the feature's centre of gravity.** If only one thing gets built, build
this.

---

## 3. The quantity base, measured

Cumulative flows (legitimately summable — new events each day):

| Basis | Quantity |
|---|---|
| Houses fully / severely damaged | 3,494 |
| Houses partially damaged | 15,859 |
| Huts and cattle sheds | 8,727 |
| Big animals washed away | 6,002 |
| Small animals washed away | 13,333 |
| Poultry washed away | 217,270 |
| Flood deaths | 83 |

Peak stocks (never summed — a level at an instant):

| Basis | Peak |
|---|---|
| Crop area submerged | 56,606.777 Ha |
| Population affected | 721,024 |
| Camp inmates | 37,724 |

**Completeness: zero unknowns** on all of these across 190 district-days. There
is no imputation problem — rare, and it removes an entire class of methodological
argument before it starts.

**Why the categories fit.** `HouseDamage` splits Kuccha/Pukka × Fully-Severely/
Partially. That is not a layout accident; the code comment has said so since the
parser was written — *"The split drives compensation."* The bulletin and the
relief norms descend from the same government framework, so the mapping is
largely one-to-one and needs no interpretive layer. The same is true of livestock
(big/small/poultry) and ex gratia (deaths).

This isomorphism is a large part of why the model is feasible. It is also
fragile in one direction: if a norm schedule uses categories ASDMA does not
report, the anti-corruption layer must refuse the mapping rather than approximate
it.

---

## 4. Where it does not work: infrastructure

The bulletin itemises infrastructure damage richly — 88 to 587 items per day,
each with a name, department, village, location and often coordinates. On
4 August: 131 items across `road` and `other`.

**But it never dimensions anything in a column.** A damaged road has no length
field. A breached embankment has no breach-width field. There is a count of
things and no structured measure of how much of each thing.

> **Correction, 2026-08-06.** The sentence above originally read "it never
> dimensions anything", and that was too strong. Measured across the 4,780
> infrastructure items in the archive, **501 (10.5%) carry a dimension in the
> free-text remarks**: road chainages (`Chainage 1300.00m to 2800.00m`), damage
> lengths (`The damage Length - 150.00m`), conductor runs (`0.3KM`), and fishery
> water areas (`23 fish tanks, covering a total water area of 6.50 hectares`).
>
> The structured claim stands — there is no dimension column. The absolute one
> does not. Those 501 items *could* be costed against the SDRF per-kilometre and
> per-culvert rates, via a second extractor over prose with its own confidence
> model. That is real, bounded work recovering roughly a tenth of the largest
> damage category, and it is scoped in
> [`FEASIBILITY-REPLACEMENT-COST.md`](FEASIBILITY-REPLACEMENT-COST.md) §3 rather
> than here. The recommendation below is unchanged: do not cost the other 90%.

Infrastructure is typically the largest single line in a real post-flood damage
assessment, and it is the one this data cannot support. The honest options:

1. **Do not cost it.** Report the item count and department, and state plainly
   that infrastructure is uncosted. Recommended.
2. **Cost by count × an average unit cost per item class.** Defensible only with
   a very wide range and a prominent caveat; an "average damaged road" is not a
   real thing.
3. **Let the user supply dimensions.** Correct but unusable at 500 items/day.

**Recommendation: option 1, with option 2 available behind an explicit opt-in
that forces a range.** Reporting a total that silently excludes the biggest
category would understate an appeal — so FR-E17 requires the omission be named,
and the headline must read as a floor.

This is the single largest limitation of the whole feature and it belongs in the
README's known limitations, not buried here.

---

## 5. The binding constraint: unit rates

**There is not one monetary value anywhere in the bulletin.** Confirmed across
all 23 sections. Every rupee the model produces will come from a rate we bring.

That makes rate sourcing the critical path — not the code. Three candidate
bases, which answer different questions and must never be blended:

| Basis | Answers | Fits | Caveat |
|---|---|---|---|
| **Government relief norms** (SDRF/NDRF schedule) | "What is payable?" | Officers writing memoranda | Entitlement, *not* the cost of recovery — usually well below replacement cost |
| **Replacement cost** | "What would it cost to rebuild?" | NGO/donor appeals, PDNA | Needs local market data; ages fast |
| **Programme cost** (organisation's own) | "What does it cost *us* to deliver?" | An NGO's own budgeting | Not transferable between organisations |

**The model must support all three as named, switchable schedules** and must
never mix them in one total. A figure computed on norm rates and a figure
computed on replacement cost are answers to different questions, and the most
common way assessments mislead is presenting one as the other.

**What I am not doing:** inventing rates. No rupee figure will be written into
this codebase without a citation and an effective date — the `NormSchedule`
aggregate makes an uncited rate unconstructable. Sourcing the first schedule is
work that needs a decision from you (§9), and it is the item on the critical
path.

---

## 6. Architectural fit

**The good news: this needs no new runtime capability.** It is arithmetic over
data already in memory, in a codebase that already has:

- flow/stock classification, type-enforced (`cumulativeOf` rejects a stock)
- unknown-is-not-zero carried in the type system end to end
- unit-typed quantities (`Hectares`, `Quintals`, `Count`)
- user-adjustable assumptions in the composition root, stated not hidden
- derived-figure badges showing the formula behind every computed number
- a fitness test enforcing the dependency rule

Every one of those is a control this feature needs and would otherwise have to
build. `Money` and `UnitRate` extend the existing quantity kernel rather than
replacing it.

**Effort estimate**

| Work | Size |
|---|---|
| `Money`, `UnitRate`, `PersonDays` value objects + kernel extension | Small |
| `NormSchedule` aggregate + bundled schedule + ACL | Medium |
| `DamageAndLossAssessment` + derivation | Medium |
| `RehabilitationPlan`, `FundingScenario`, allocation policies | Medium |
| UI: assessment view, funding view, norm editor, export | Medium–Large |
| Back-test against distributed relief | Small |
| **Sourcing and citing the first norm schedule** | **Unknown — your call, on the critical path** |

Roughly 60% of the effort is UI and export; the domain is comparatively small
because the hard invariants are already precedented.

---

## 7. The risk that matters

Everything shipped so far reports what ASDMA said. **This feature asserts what
something costs** — and that assertion will be quoted in an appeal, a memorandum,
or a press release, where it will lose its caveats on the way.

That asymmetry justifies controls stronger than the console's:

- Point estimates are **banned** at headline level; a range is mandatory (FR-E15)
- Modelled figures must be visually distinct from reported ones (FR-E14)
- Uncosted Districts and uncosted categories are named, and totals read as floors
  (FR-E17)
- Export carries schedule version + bulletin ids, so any figure can be reproduced
  exactly (FR-E16, NFR-E5)

**And the back-test.** The bulletins report relief *actually distributed* —
21,680 quintals of rice, 4,217 of dal, 105,875 litres of oil over the period.
That is real in-kind expenditure in physical units, so the modelled relief
requirement can be compared against what was genuinely handed out over the same
days.

Being able to validate a model of this kind at all is unusual. Doing it visibly
is the strongest available answer to "why should I believe this number", and it
should ship with the first version rather than being deferred.

---

## 8. What would change this verdict

| If this were true | Verdict becomes |
|---|---|
| No citable norm schedule can be obtained | **Marginal.** Ship the quantity aggregation and person-day integrals with user-supplied rates only, and call it a calculator rather than a model. |
| The bulletin stopped reporting the Kuccha/Pukka split | **Marginal.** The norm mapping collapses; house damage becomes one undifferentiated count. |
| Infrastructure dimensions became available | **Stronger.** The largest excluded category comes into scope. |
| Bulletins became available for a full season (~120 days) | **Much stronger.** Person-day integrals and back-testing both improve with length; a full season makes the model genuinely comparable year on year. |
| A backend were mandated for the core path | **Weaker** — see §6 and ADR-0013. Not because a backend is bad, but because zero-egress is currently a *browser-enforced* property and downgrading it to a promise costs more trust than a backend adds capability. |

---

## 9. Recommendation

**Build it, in this order:**

1. **Person-day integrals and cumulative physical loss**, with user-supplied
   rates and no bundled schedule. Delivers the distinctive capability immediately
   and needs no sourcing decision.
2. **The first cited norm schedule**, once sourced — this is the item that needs
   your decision.
3. **Funding scenarios and allocation**, which are only meaningful once 1 and 2
   produce a defensible requirement.
4. **Infrastructure**, last and possibly never, unless dimensions appear.

Two decisions are genuinely yours and block step 2, not step 1:

- Which norm basis ships as the default (§5)
- Whether this gains a backend (ADR-0013)

Step 1 can start immediately under either answer.

# ADR-0014: A constructed rate carries a derivation, not a citation

- **Status:** Accepted and implemented 2026-08-06 —
  `src/domain/economics/derivation.ts`, `replacement-cost.ts`, and the
  Replacement cost panel on Cumulative & Peak
- **Date:** 2026-08-06
- **Context:** [`FEASIBILITY-REPLACEMENT-COST.md`](../FEASIBILITY-REPLACEMENT-COST.md)
- **Relates to:** ADR-0011 (cost norms are cited), ADR-0005 (unknown is not zero),
  ADR-0006 (severity weights are user-set)

## Context

ADR-0011 established that **a rate that cannot cite its source cannot exist**, and
`unitRate` enforces it by throwing. That rule did its job: the SDRF schedule
shipped with a real MHA circular number attached to every rate, and the effective
dates it forced us to record are what revealed the schedule had expired before the
flood it would be applied to.

Replacement cost and working-capital loss do not fit that rule, and the reason is
not laziness. **There is no publication to cite.** Nobody publishes "the working
capital lost per hectare of submerged paddy in Assam". The figure has to be
*constructed*:

```
cost of cultivation per hectare   (CACP publishes this)
  × proportion of the season's inputs already spent   (our judgement)
  × proportion of the submerged area actually lost    (our judgement)
```

The first input is citable. The other two are not, and never will be — they are
judgements about how a flood interacts with a cropping calendar.

So there are exactly two ways forward, and one of them is a disaster:

1. Exempt these rates from ADR-0011 — "citation required, except when
   inconvenient". The rule would be dead within a release, and a constructed
   figure would sit next to a cited one looking identical.
2. Give constructed rates a discipline of their own, as strict as citation and
   different in kind.

The risk being managed is specific. A figure like "₹210 crore of working capital
lost" will be quoted in an appeal. It will lose its footnotes on the way. The
question is not whether the assumptions are written down somewhere — it is
whether the figure can be rendered, exported or copied *without* them.

## Decision

**Rate provenance becomes a tagged union. A rate is either cited or constructed,
and a constructed rate carries a derivation tree in place of a citation.**

### 1. Two provenances, neither optional

```ts
type RateProvenance =
  | { kind: 'cited'; citation: Citation }
  | { kind: 'constructed'; derivation: Derivation };
```

`unitRate` keeps throwing when a `cited` rate has a blank citation field, and
gains the same treatment for a `constructed` rate with an empty derivation. There
is still no way to construct a rate that says nothing about where it came from.

### 2. A derivation is a tree whose every leaf is owned

```ts
type DerivationInput =
  | { kind: 'published'; label: string; value: number; unit: string; citation: Citation }
  | { kind: 'assumed';   label: string; value: number; unit: string;
      low: number; high: number; reason: string };

type Derivation = {
  readonly formula: string;              // "cost of cultivation × inputs spent × area lost"
  readonly inputs: readonly DerivationInput[];
};
```

Every leaf is either **published** (and cites) or **assumed** (and states a range
and a reason). There is no third kind, and in particular there is no bare number.

An assumption without a `reason` is as unconstructable as a rate without a
citation. The reason is what a reviewer argues with; a range on its own only
tells them how uncertain we claim to be, not why.

### 3. A constructed figure is always an interval

Point estimates are **banned** at any level a reader sees. The interval is
computed by evaluating the derivation at its assumption bounds, not chosen for
presentation — so a wide interval is a real statement that the assumptions are
doing a lot of work, and narrowing it requires better assumptions rather than
better formatting.

This is the operational meaning of "transparent": the uncertainty is arithmetic
the reader can inspect, not a hedge in prose.

### 4. Cited and constructed never sum

Same rule `CostBasis` already enforces. A total mixing an SDRF entitlement with a
constructed replacement cost answers no question anybody asked. The types prevent
it and the UI names the basis at every point of use.

### 5. Distinct at every point of use, not once per page

A constructed figure must be visually distinguishable from a cited one wherever
it appears — table cell, headline, tooltip, export row. A single "these figures
are modelled" banner at the top of a page is exactly the control that fails when
one number is copied out of it.

### 6. Assumptions are adjustable, and adjusting them moves the figure live

Following ADR-0006, which made the severity index credible by making its weights
the user's. An assumption nobody can change is one nobody can disagree with, and
a model nobody can disagree with is not being taken seriously.

## Consequences

**ADR-0011 gets stronger, not weaker.** Today "cited" is the only kind of rate, so
the rule is enforced by there being no alternative. After this, "cited" is a
*choice* recorded in the type — and a reader can ask which rates are which and
get an answer, which they currently cannot.

**The console gains its first Loss figures.** Everything costed today is Damage or
assistance; working capital is neither, and the console cannot currently express
it at all. That is the point of the exercise.

**More is displayed per figure.** A constructed line needs its interval, its
formula and its inputs reachable. This is a real cost in screen space and it is
the cost of the feature — a constructed figure that renders as compactly as a
cited one is the failure mode.

**Ranges will be embarrassing at first, and that is the system working.** The
first working-capital interval will be wide, because the assumptions are weak.
The temptation will be to narrow it by choosing tighter bounds. The correct
response is to source a better parameter, and the width is what creates the
pressure to do so.

**Two figures for the same hectares.** The SDRF line already costs crop area at
the input-subsidy norm; a constructed line will cost the same hectares as working
capital lost. Both are legitimate, they answer different questions, and §4 stops
them being added. The UI must make the distinction obvious or this becomes the
feature's most likely misreading.

## As built

The first constructed schedule is the Pukka dwelling replacement cost, priced
from the Assam PWD Building Schedule of Rates. Five assumptions, five published
SOR lines:

| Input | Kind | Value | Range |
|---|---|---|---|
| Floor area of a replaced dwelling | assumed | 30 m² | 25–46.6 |
| Foundation earthwork per m² of floor | assumed | 0.15 m³/m² | 0.10–0.25 |
| Earthwork in excavation, ordinary soil | published | ₹108.82/m³ | Ch-1, item 1.1(A)(a) |
| Brick walling volume per m² of floor | assumed | 0.46 m³/m² | 0.35–0.60 |
| Brick work 1:5 incl. 20 mm plaster both faces | published | ₹6,138.40/m³ | Ch-33 composite |
| RCC roof slab volume per m² of floor | assumed | 0.11 m³/m² | 0.10–0.125 |
| RCC M20 superstructure to first floor | published | ₹6,241.39/m³ | Ch-2, item 2.2.1(I)(B) |
| Cement concrete flooring, 50 mm | published | ₹253.28/m² | Ch-2, item 2.1.2(b) |
| Uplift for openings, services and finishes | assumed | ×1.35 | 1.25–1.55 |
| GST uplift | assumed | ×1.18 | 1.12–1.18 |

**₹1,06,286 – ₹4,04,312 per dwelling, central ₹1,80,638** (₹6,021/m² at 30 m²).
Across the 3,494 houses the archive records as fully or severely damaged:
**₹37.1 crore – ₹141.3 crore, central ₹63.1 crore.**

Two things that vindicate the design rather than embarrass it:

**The interval is 165% of its centre.** That is the width the assumptions
actually produce, and it is uncomfortable — which is the point. The largest
contributor is the floor area, and it is also the input most easily replaced by
a real take-off. The number tells you where to spend the next hour.

**It sits above the SDRF figure, in the expected direction.** The same 3,494
houses attract ₹41.9 crore of SDRF assistance against a central replacement cost
of ₹63.1 crore — roughly 1.5×. Relief norms being well below replacement cost is
exactly what the literature says, so the two bases disagreeing by that margin is
a sanity check passing, not a contradiction. They are never summed.

Three refusals worth recording, because each was the tempting shortcut:

- **Kuccha dwellings are not costed.** A civil works schedule prices brick,
  cement and RCC; a Kuccha house is bamboo, timber and thatch. `KUCCHA_NOT_COSTED`
  is rendered where the figure would be, so the absence is an answer.
- **The SOR edition is cited as undated**, because no year appears anywhere in
  its text. Guessing one would have made the citation worse than useless.
- **GST is an input, not an afterthought.** The SOR states plainly that it
  excludes GST, so leaving it out would have understated by 18%.

## Amendment — reconstruction is a policy choice, and the model says so

The first version costed replacement like for like and declined to cost Kuccha
dwellings at all, noting that rebuilding them to a permanent standard "is a
policy choice, not a valuation". That choice has since been made: reconstruction
should mitigate future risk, so the aspiration is a Pukka dwelling even where a
Kuccha one stood — or failing that, Pukka defences under the Kuccha one.

**The measurement that makes this the dominant question.** Across the archive,
**91.2% of the dwellings destroyed outright were Kuccha** — 3,187 of 3,494. So
what a destroyed Kuccha house is rebuilt as moves the bill further than every
other assumption in this codebase combined. It is modelled as a **named policy
shown in full**, not as a constant, and not behind a selector that would let one
be chosen without seeing the others.

| Policy | Cost (central) | Uncosted | Effect on future risk |
|---|---|---|---|
| Like for like | ₹5.1 cr | 3,187 | Reproduces the exposure; the same flood destroys them again |
| Protect in place | ₹20.3 cr | 3,187 | Kuccha rebuilt as Kuccha on a raised Pukka plinth |
| Build back better | ₹76.1 cr | 0 | Removes exposure and vulnerability together |

A raised plinth with apron protection costs **₹45,263 per dwelling**, about 25%
of a full Pukka house, priced from three SOR lines (earth filling in plinth,
plinth brickwork, Ch-19 plinth protection).

**The finding worth carrying into a memorandum:** protect-in-place costs
₹21.4 crore, against **₹41.9 crore of SDRF assistance those same 3,494 houses
already attract**. Raising every destroyed dwelling above the flood line costs
roughly half what is already payable for them. That is a statement about
sequencing rather than about generosity, and it is the kind of claim this whole
apparatus exists to make defensible.

Three design consequences, each guarding a specific way this could mislead:

1. **Risk effect shares a table row with cost and cannot be read without it.**
   Split across two tables or hidden in a tooltip, the cheapest policy reads as
   the best — when the cheapest is the one that rebuilds the vulnerability.
2. **`protect-in-place` costs the defences under houses it cannot price.** A
   Kuccha superstructure is not priceable from a civil-works schedule under any
   policy, but the plinth beneath it is. That makes this the direct answer to
   "at least build suitable defences", and a real floor rather than an empty one.
3. **The only fully-costable policy must not read as the best-evidenced one.**
   `build-back-better` leaves nothing uncosted purely because it rebuilds in
   materials the schedule covers. Its caveat says so in those words: *"a fact
   about the schedule, not a reason to choose it."* Asserted in a test.

The raise height is the weakest input and admits it: the right height is the
highest flood level at that site, which the bulletin never reports, so 0.9 m
[0.6–1.5] is floodplain practice rather than a site figure. Per-site HFL data
would improve this more than anything else here.

## Alternatives considered

**Exempt constructed rates from ADR-0011.** Simplest. Rejected: a rule with a
convenience exemption is not a rule, and the exemption would be where every
future rate ended up.

**Keep constructed rates out of the product; export the quantities and let
analysts build their own.** Genuinely defensible, and it is what a spreadsheet
does today. Rejected because it moves the assumptions somewhere nobody can audit
them — the current state of the world, and the thing the PRD exists to improve
on. Better to make the assumptions explicit, adjustable and visible than to
disclaim responsibility for judgements the user will make anyway, less carefully.

**Treat assumptions as ordinary user settings, like the ration norm.** Close, and
partly adopted in §6. Insufficient on its own: the ration norm shapes an
operational estimate that lives for a day, whereas these figures get published and
must be reproducible months later. The derivation has to be recorded *with the
figure*, not just live in application state.

**One blended "best estimate" number with a confidence label.** What most
dashboards do. Rejected: a confidence label is a claim about a number, whereas an
interval computed from stated bounds is a property of it. The first can be
asserted; only the second can be checked.

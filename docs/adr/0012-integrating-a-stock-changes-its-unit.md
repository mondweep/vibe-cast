# ADR-0012: Integrating a stock changes its unit

- **Status:** Proposed
- **Date:** 2026-08-06
- **Context:** [`PRD-REHABILITATION-ECONOMICS.md`](../PRD-REHABILITATION-ECONOMICS.md) §4.2
- **Relates to:** ADR-0005 (unknown is not zero), `src/domain/timeline/measure.ts`

## Context

The codebase already enforces the flow/stock distinction in types:

```ts
export type MeasureKind = 'flow' | 'stock';
export const cumulativeOf = (t: Timeline, m: FlowMeasure) => …  // stocks rejected
```

`cumulativeOf(timeline, POPULATION_AFFECTED)` is a compile error, and rightly so:
the same person affected on twelve days is one person, and summing a stock
produces a number with no referent. This has already prevented real mistakes.

But the rehabilitation model needs something that *looks* like exactly that
forbidden operation. Relief costs are denominated per person per day, so the
model must add up daily camp-inmate levels across the period:

```
camp-inmate-days            302,253
non-camp-inmate-days      1,365,045
population-affected-days  6,235,154
```

These are legitimate and they are the feature's most valuable output — a single
bulletin cannot produce them at any level of effort.

The distinction is not a technicality. Summing a stock to get **people** is
wrong. Integrating a stock over time to get **person-days** is right. The
arithmetic is identical; the unit of the answer is not.

That is precisely the situation where a type system earns its keep, because the
two operations are indistinguishable at the level of `number`. Left untyped, the
first person to need person-days will reach for a plain `reduce` — and then
302,253 sits in a variable that could just as easily be read as a headcount, in a
codebase whose entire discipline is that units are explicit.

## Decision

**Integration is a distinct operation from summation, returns a distinct type,
and the existing prohibition stands unchanged.**

### 1. A new operation, not a relaxation

```ts
/** Sum a flow across days. Unit unchanged: people stay people. */
cumulativeOf(timeline, measure: FlowMeasure): Quantity

/** Integrate a stock across days. Unit CHANGES: people become person-days. */
integrateOverPeriod(timeline, measure: StockMeasure): PersonDays
```

`cumulativeOf` keeps rejecting stocks. `integrateOverPeriod` accepts **only**
stocks — integrating a flow is as meaningless in the other direction and is
rejected too. Each operation refuses the other's input.

### 2. `PersonDays` is not a `Count`

A distinct branded type, not an alias. `PersonDays` cannot be passed where a
headcount is expected, cannot be compared against `Population Affected`, and
cannot be rendered by the headcount formatter. Its unit suffix is `person-days`
and it is never abbreviated to "people" in any label.

### 3. Only rates in matching units can be applied

`UnitRate` carries its unit (ADR-0011). A `per-person-day` rate applies to
`PersonDays` and to nothing else; a `per-house` rate applies to a house count and
to nothing else. The unit mismatch is a compile error, not a review comment.

### 4. Gaps are holes, not zeroes

A missing bulletin is a day with no observation, not a day with nobody affected.
Integration over a period containing a gap yields a figure explicitly marked as a
**floor**, with the missing dates named — reusing the Trend view's existing
treatment of gaps rather than inventing a second convention. Interpolating across
a hole is prohibited, exactly as it is in the Trend view today.

## Consequences

**The most valuable output needs no cost data at all.** Person-day integrals are
quantities. They can ship, be verified against the bulletins and be useful before
any norm schedule is sourced — which is why the feasibility assessment
recommends building them first. This decision is what makes that sequencing
possible.

**A new type to thread through** formatters, view models and export. Real cost,
and the same cost `Quantity` and `Hectares` already paid. The alternative is a
`number` that means two different things.

**The existing prohibition gets stronger, not weaker.** A reader who finds
`integrateOverPeriod` and wonders whether the stock rule has been quietly relaxed
finds instead that it is enforced in both directions.

**Verification is straightforward and must be non-vacuous.** The guard is proved
by attempting `cumulativeOf(t, CAMP_INMATES)` and `integrateOverPeriod(t,
FLOOD_DEATHS)` and confirming both fail to compile — the same technique already
used to prove `cumulativeOf(t, POPULATION_AFFECTED)` fails with `TS2345`.

## Alternatives considered

**Reclassify camp inmates as a flow.** Would make `cumulativeOf` work
immediately. Rejected outright: it is a lie about the measure. Camp occupancy is
a level, the Trend view would then draw a cumulative line where a level belongs,
and peak occupancy — an operationally critical figure — would become
meaningless.

**Return a plain `Quantity` with unit `'person-days'`.** Lighter, and consistent
with how `Hectares` is handled. Rejected because `Quantity` comparisons and
formatters would accept it alongside headcounts; the unit string would be
documentation rather than enforcement, and the failure it must prevent is
precisely a person-day figure being read as people.

**Compute person-days in the composition layer, outside the domain.** Would avoid
a new domain type. Rejected: it is a domain concept with a domain invariant (no
interpolation across gaps), and pushing it outward would put that invariant in a
mapper where the architecture fitness test cannot defend it.

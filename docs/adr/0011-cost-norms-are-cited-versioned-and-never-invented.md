# ADR-0011: Cost norms are cited, versioned, and never invented

- **Status:** Proposed
- **Date:** 2026-08-06
- **Context:** [`PRD-REHABILITATION-ECONOMICS.md`](../PRD-REHABILITATION-ECONOMICS.md) §3.4, §5
- **Relates to:** ADR-0005 (unknown is not zero), ADR-0006 (severity index is user-weighted)

## Context

The bulletin contains no money. Across 23 sections and 190 district-days there is
not one monetary value — every figure is people, houses, hectares, animals,
quintals or litres.

So every rupee this model produces is **a quantity ASDMA reported multiplied by a
rate we brought**. The quantity half is auditable back to a printed Total row.
The rate half is a choice, and it is the half that will be argued about.

There are three defensible bases for that rate, and they answer different
questions:

- **Government relief norms** — what is *payable* under the SDRF/NDRF schedule.
- **Replacement cost** — what rebuilding would actually cost.
- **Programme cost** — what it costs a particular organisation to deliver.

A house-damage figure computed on norm rates and one computed on replacement cost
are not competing estimates of the same thing; they are answers to different
questions, and norm rates are typically well below replacement cost. Presenting
one as the other is the most common way assessments mislead.

Meanwhile the pull towards hard-coding is strong. It would be very easy to write
`const HOUSE_FULLY_DAMAGED = 120_000` and ship something that works. That
constant would then be indistinguishable from a fact, would age silently, and
would appear in a funding appeal with the authority of the bulletin behind it.

## Decision

**A rate that cannot cite its source cannot exist.**

### 1. Citation is a construction requirement, not a field

```ts
type UnitRate = {
  readonly amount: Money;          // amount + currency + as-of date
  readonly unit: RateUnit;         // 'per-house' | 'per-hectare' | 'per-person-day' | …
  readonly effectiveFrom: IsoDate;
  readonly citation: Citation;     // publisher, document, clause, retrieved-on
};
```

There is no constructor taking a bare number. `Citation` is required and
non-empty. This is deliberately more than documentation discipline: it makes the
easy wrong thing impossible to type.

### 2. Schedules are named, versioned and immutable

A `NormSchedule` is a complete set of rates with an identity
(`sdrf-2022`, `replacement-assam-2026`) and a version. Recomputing a March
assessment with October's rates must be an explicit act. An assessment records
the schedule version it used, so it can be reproduced exactly (NFR-E5).

### 3. Bases never mix in one total

A schedule declares its `CostBasis` — `compensation-norm`, `replacement`, or
`programme`. Figures from different bases cannot be summed; the type prevents it
and the UI always names the active schedule.

### 4. Incomplete schedules are normal, and say so

A schedule may lack a rate for a category. That yields an **unknown cost**, never
₹0, and an explicit "not costed" line. Silently omitting an uncosted category
from a total understates an appeal — a more damaging error here than
overstatement, because it is invisible.

### 5. Every rate is user-overridable, and an override is marked

Following ADR-0006's reasoning about severity weights: the credibility of the
model depends on the user being able to change any rate and watch the figures
move. An overridden rate is marked as overridden **everywhere it contributes**,
not just in the editor.

### 6. No rate ships without sourcing

No rupee figure enters this codebase without a citation and an effective date.
Until a schedule is sourced, the model ships with **no default schedule** and
requires user-supplied rates. That is a worse first-run experience and the
correct trade: a plausible invented default would be adopted wholesale and never
questioned.

## Consequences

**The first run is harder.** With no bundled schedule the model cannot produce a
rupee figure until the user supplies rates. Mitigated by the fact that the
highest-value output — person-day integrals and cumulative physical loss
(ADR-0012) — is a *quantity* and needs no rates at all.

**Sourcing is on the critical path**, and it is not an engineering task. This is
the item most likely to stall the feature, and naming it here is the point.

**Rates age.** `effectiveFrom` plus the assessment's recorded schedule version
makes ageing visible rather than silent, in the same way the staleness banner
handles the ageing archive.

**Three schedules is more work than one**, in the model and the UI. Accepted: the
alternative is a single basis silently answering the wrong question for two of
the three audiences the PRD names.

## Alternatives considered

**Hard-code a reasonable default schedule.** Fastest, and the thing most projects
do. Rejected: an uncited constant becomes a fact on contact with a funding
document, and there is no way to tell later which figures depended on it.

**Rates as ordinary user assumptions, like the ration norm.** Consistent with
ADR-0006 and initially attractive. Rejected as insufficient: a ration norm shapes
an operational estimate that lives for a day, whereas a rate schedule produces
figures that get published and must be reproducible months later. Citation and
versioning are needed on top of adjustability, not instead of it.

**Fetch rates from a live source.** Keeps them current, breaks ADR-0004's
zero-egress guarantee for a small, slow-changing dataset. Bundling at build time
is the established pattern here (bulletins, district boundaries) and costs
nothing in trust. See ADR-0013.

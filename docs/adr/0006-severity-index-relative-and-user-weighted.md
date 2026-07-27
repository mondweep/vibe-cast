# ADR-0006: Severity index is relative and user-weighted

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Situation Assessment swarm

## Context

Triage needs a ranking. The bulletin gives 8 districts × ~15 impact dimensions and no ordering; a State Control Room officer deciding where the next SDRF column goes must collapse that into a sequence.

Any collapse embeds a value judgement. Is 100,000 people affected worse than 8,000 hectares of crop lost? There is no objective answer — it depends on whether you are protecting lives this week or livelihoods this season. A District Commissioner and the State Control Room can legitimately disagree, and both can be right for their own decision.

The danger is a single opaque number that looks official. Officers under time pressure will treat "Severity: 87" as a fact about the world rather than an artefact of weights someone chose. Worse, they may believe ASDMA published it.

## Decision

A composite severity index that is **explicitly relative, explicitly weighted, and explicitly ours**.

1. **Relative, within the loaded bulletin.** Min–max normalise each component across the districts present in *this* bulletin. The index says "worst among today's affected districts", never "severe on an absolute scale". Cross-bulletin comparison of raw index values is meaningless and the UI says so.
2. **User-adjustable weights** (FR-3.2). Defaults — affected population 0.35, camp load 0.20, villages affected 0.15, crop area 0.15, casualties 0.15 — are a stated starting point, not a claim of objectivity. Adjusting them is expected use, not misuse.
3. **Contribution breakdown always available** (FR-3.3). Every score decomposes into its components, so an officer can see *why* Sivasagar ranks first rather than taking it on trust.
4. **Visibly derived.** The index carries a "derived" badge with its formula, distinguishing it from every figure ASDMA actually published.
5. **Never the only view.** The ranking table sorts by any raw dimension. An officer who distrusts the composite can rank by affected population alone and lose nothing.
6. **Degenerate case handled.** When every district shares a component value, min equals max; that component contributes zero rather than dividing by zero.

## Consequences

**Positive**

- Gives the triage ranking the product exists to provide, without laundering a judgement into a fact.
- Different users can encode different priorities, which reflects how these decisions are actually made.
- Transparency makes the index arguable — and an arguable number is one an officer can defend in a review.

**Negative**

- Two officers with different weights see different rankings. That is honest but can be confusing; mitigated by showing the active weights alongside the ranking at all times.
- Relative normalisation means a district's index can rise while its absolute situation improves, if others improve faster. Mitigated by the contribution breakdown and by trend views on raw figures rather than on the index.
- Adjustable weights invite gaming. Accepted: the raw dimensions remain visible, so gaming is detectable.

## Alternatives considered

- **Fixed official-looking index.** Rejected: hides the judgement and invites misreading as an ASDMA figure.
- **No index, raw dimensions only.** Rejected: pushes the collapse onto the officer at the moment they have least time. That is abdication dressed as neutrality.
- **Absolute scale calibrated on historical floods.** Attractive, and rejected for v1 only because we have one bulletin. Revisit once a multi-season archive exists — an absolute scale would be strictly better than a relative one.

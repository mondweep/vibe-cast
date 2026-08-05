# Assumptions register

Every judgement the Reconstruction Cost model makes, why it was made, and how
much of the answer it carries.

**This document is a companion, not the source.** The register is generated in
the app by walking the derivations, so it cannot go stale; this file explains the
ones that matter and records the reasoning that does not fit in a table cell.
See it live at `/reconstruction-cost`.

---

## The shape of every figure

The bulletins contain no money. Across 23 sections and 190 district-days there
is not one monetary value — every figure is people, houses, hectares or animals.
So every rupee in this model is:

```
quantity (ASDMA printed it)  ×  rate (published, cited)  ×  assumption (ours)
```

- **14 published rates**, each cited to its clause: the SDRF norms of assistance
  (MHA F. No. 33-03/2020-NDM-I (Vol-II), 10 October 2022) and the Assam PWD
  Building Schedule of Rates for Civil Works.
- **20 assumptions**, each with a range and a reason, listed below.

An assumption without a reason cannot be constructed — `derivation()` throws
(ADR-0014). The range is not decoration either: every constructed figure is an
interval computed by evaluating the formula at the assumption bounds, so the
width of a range *measures* how much of the answer is judgement rather than
signalling vague caution.

---

## Two measures, and they disagree

Each assumption carries two numbers, and confusing them sends you to argue about
the wrong thing:

- **Range (spread)** — the top of the plausible range divided by the bottom.
  *How unsure we are.*
- **Moves the answer by (swing)** — take that one assumption to each end of its
  range, hold every other at its middle value, and see how many rupees the total
  shifts. *What that uncertainty is actually worth.*

A wide range on a small line matters less than a narrow range on a large one:

| Assumption | Range | Moves the answer by |
|---|---|---|
| Average damaged road length | **7.5×** | ₹5.1 cr |
| Share of the SDRF ceiling actually needed | 3.3× | **₹55.0 cr** |

Ranking by range puts these in exactly the wrong order. The register sorts by
swing.

## The five that carry the answer

| Assumption | Used | Range | Moves the answer by |
|---|---|---|---|
| Share of the SDRF ceiling actually needed | 60% | 30–100% | ₹55.0 cr |
| Floor area of a replaced dwelling | 30 m² | 20–45 | ₹52.6 cr |
| Deposit to remove per homestead | 12 m³ | 5–25 | ₹33.6 cr |
| Share of submerged land carrying a clearable deposit | 20% | 8–40% | ₹32.6 cr |
| Share of affected households needing homestead clearance | 35% | 15–60% | ₹26.0 cr |

**This ranking corrected two earlier recommendations, both of which were wrong.**

First I said the finishes uplift was "the largest single judgement in the
derivation" and worth replacing with a real take-off. It moves the answer by
₹14 cr and ranks eighth.

Then, when the register was first built and sorted by *range*, I said the
dwelling costing was not where the uncertainty lived and that a sand-cast survey
and the road-length extractor were worth most. Also wrong: floor area is the
second-largest lever at ₹52.6 cr, and the road extractor is worth ₹5.1 cr —
about a twelfth of what the SDRF ceiling share is worth.

The lesson is in the method rather than the numbers: **an uncertainty measure
that ignores the size of the line it sits on will mis-rank, confidently.**

### Submerged is not silted

The single most consequential assumption, and the easiest expensive mistake in
the whole model.

56,607 hectares were under water at peak. Only a fraction carries enough deposit
to need clearing, and a smaller fraction again is sand-cast badly enough to be
out of cultivation. Deposition concentrates near breaches and where the channel
has moved; most submerged land drains and is sown again without clearance. The
SDRF rate applies only where deposit exceeds three inches **and is certified**.

Treating submerged area as silted area would overstate the line five-fold. There
is no figure in the bulletin to check the 20% against — a survey of sand-cast
area would improve this model more than any other single input.

### Land lost is a different event from land silted

The SDRF prices de-silting at ₹18,000/Ha and land loss at ₹47,000/Ha. That 2.6×
difference is the schedule's own signal that clearing a field and losing it are
not the same thing. Land loss is assumed at 3% [1–8%] — deliberately low, with a
wide multiple between the bounds, because attributing a specific area to one
flood needs survey data the bulletin does not carry and the honest position is
that we do not know.

### Average damaged road length

The weakest number in the public tier. The SDRF pays per kilometre; the bulletin
reports a road by name with no length. Where a length does appear in the remarks
it ranges from a 50 m breach to a 3 km stretch.

**About 10% of infrastructure items carry a dimension in prose**, and extracting
those would replace this assumption with measurement for a tenth of the tier.
That is the highest-value piece of parser work outstanding.

---

## Reference dwelling

| Assumption | Used | Range | Why |
|---|---|---|---|
| Floor area | 30 m² | 20–45 | PMAY-G sets a floor of 25 m² for a sanctioned unit |
| Foundation earthwork | 0.15 m³/m² | 0.10–0.25 | Floodplain soils are often poor and need sand filling |
| Brick walling volume | 0.46 m³/m² | 0.35–0.60 | ~22 m perimeter at 2.75 m × 230 mm for a 30 m² plan |
| RCC roof slab | 0.11 m³/m² | 0.10–0.125 | 110 mm slab, ordinary for a short residential span |
| Finishes uplift | ×1.35 | 1.25–1.55 | The priced items buy a shell with no openings, wiring or paint |
| GST uplift | ×1.18 | 1.12–1.18 | The schedule states GST is excluded |

**Two that lean, and say so in the code.** The plains house rate is used where
Assam has hill Districts entitled to ₹1,30,000 rather than ₹1,20,000; and the
milch rate is used for large animals where draught animals attract ₹32,000,
because the bulletin does not distinguish them.

## Flood resilience

| Assumption | Used | Range | Why |
|---|---|---|---|
| Plinth raise above ground | 0.9 m | 0.6–1.5 | Floodplain practice — see below |
| Plinth wall volume | 0.169 m³/m²/m | 0.13–0.24 | Perimeter × thickness ÷ floor area |
| Apron area | 0.73 m²/m² | 0.55–1.0 | A 1 m apron around a 22 m perimeter |

The raise height admits its own weakness: the correct height is the **highest
flood level at that site**, which the bulletin never reports. Per-site HFL data
would turn this from a general figure into a District-specific one.

## Household count

| Assumption | Used | Range | Why |
|---|---|---|---|
| People per household | 4.9 | 4.4–5.4 | Assam average, Census 2011 |

The bulletin counts people and never households, so every household figure in
the model rests on this one number. The flood-affected population is
predominantly rural, which argues for the upper half of the range.

---

## What is deliberately not assumed

Three places where the honest answer was silence rather than a number:

- **Kuccha superstructures are not costed.** A civil-works schedule prices brick,
  cement and RCC; a Kuccha house is bamboo, timber and thatch. Under
  *protect in place* the raised plinths beneath them **are** priced.
- **Railways and National Highways are absent from the public tier**, because
  they are absent from the source: four of 4,780 damaged-asset records mention a
  railway. ASDMA reports what State departments report to it.
- **Infrastructure beyond State-reported assets** — telecommunications,
  irrigation canals beyond embankments — is not separately reported.

## What the figures are not

- **The public tier is restoration, not reconstruction.** Its SDRF rates come
  from a chapter headed *"Repair/Restoration (Immediate Nature)"* — filling
  breaches, temporary approach repair, making a road passable.
- **The SDRF norms expired on 31 March 2026** and these bulletins are from
  August 2026. Indicative of scale, not an entitlement.
- **The Assam PWD schedule states no year anywhere in its text**, so its prices
  are of unknown vintage.
- **Nothing here is summed across tiers.** Household assets and public
  infrastructure are different claims on different payers.

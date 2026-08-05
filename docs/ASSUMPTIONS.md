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
| Share of the SDRF ceiling actually needed | 60% | 30–100% | ₹53.3 cr |
| Floor area of a replaced dwelling | 30 m² | 25–46.6 | ₹43.8 cr |
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

---

## Cross-examination against outside data

Every assumption above was taken back out and checked against whatever published
evidence could be found. The search changed four of them, confirmed one outright,
and — this is the part worth reading — **found nothing at all for the two that
move the most money.**

| Assumption | What the search found | Outcome |
|---|---|---|
| Average damaged road length | The archive itself states one for 200 of 645 road records | **Changed** 0.6 → 1.0 km, bounds 0.4–2.5 |
| Floor area of a replaced dwelling | PMAY-G minimum 25 m²; NSS 76th round rural average 46.6 m² | **Bounds sourced**, 20–45 → 25–46.6 |
| Floor area used to size the plinth | Same quantity, held separately, had drifted | **Aligned**, and a test now holds them together |
| Share rendered uncultivable | Dhemaji district land-use series | **Confirmed as the right order**, unchanged |
| People per household | Census 2011: 6,406,471 households, 31,205,576 people | **Confirmed outright**, 4.87 → 4.9 |
| Share of submerged land silted | Evidence points both ways, decisively neither | **Unchanged**, both sides recorded |
| Deposit per homestead | No source; the stated arithmetic did not reproduce the number | **Reason corrected** to area × depth |
| Share of households needing clearance | Nothing, in either direction | **Unchanged and unbacked** |
| Share of the SDRF ceiling actually needed | Nothing published per unit against the ceiling | **Unchanged and unbacked** |

**The two largest levers in the model are the two the search could not touch.**
The SDRF ceiling share (₹53.3 cr) would be settled by the ratio of assistance
actually disbursed to the ceiling claimable, per damaged asset; States report
SDRF spending in aggregate and CAG audits it in aggregate, and neither publishes
it per unit. The share of households needing homestead clearance (₹26.0 cr) has
no survey behind it because no survey separates "flooded" from "silted", and the
SDRF has no homestead de-silting item to have left a payout trail.

That is a finding, not a gap in the search. Roughly a third of the modelled
uncertainty rests on two numbers that nobody has published and this console
cannot derive.

### The one that turned out to be measurable all along

The road length was described here as *"the weakest number in the public tier"*
and the register said extracting the dimensions in the remarks would be worth
about ₹5 cr — the lowest-value fix of the five. Both were wrong in the same
direction, and for the same reason: **nobody had looked.**

The remarks state a damaged length for **200 of 645 road records — 31%, not the
10% previously claimed** — either outright (*"Approx. 0.5 KM"*) or as a chainage
range (*"Ch. 600 m to Ch. 900 m"*). Measured across those 200:

```
min 0.57 m   p25 0.40 km   median 1.15 km   mean 1.75 km   p75 2.50 km   max 9.9 km
```

The assumption in use was 0.6 km — **below the 25th percentile of what the source
already said.** It is now 1.0 km with the measured quartiles as bounds, and the
central sits slightly under the median as a discount for the stated subset
skewing towards serious failures. Six records were excluded as road totals or
chainage typos rather than damage lengths; one reads `Ch.0.550 KM to CH.0560 km`.

The next improvement is to stop averaging: price those 200 roads from their own
stated lengths and apply the assumption only to the 445 that state nothing.

### Submerged is not silted

The single most consequential assumption, and the easiest expensive mistake in
the whole model.

56,607 hectares were under water at peak. Only a fraction carries enough deposit
to need clearing, and a smaller fraction again is sand-cast badly enough to be
out of cultivation. Deposition concentrates near breaches and where the channel
has moved; most submerged land drains and is sown again without clearance. The
SDRF rate applies only where deposit exceeds three inches **and is certified**.

Treating submerged area as silted area would overstate the line five-fold. There
is no figure in the bulletin to check the 20% against.

**Checked against the literature, and it points both ways.** Das (2012), covering
1,059 households across 15 villages of Dhemaji, found roughly 83% of paddy land
facing sand deposition, and 39% of 346 plots tested in the Jiadhal basin carried
over 70% sand. That argues 20% is low. But Dhemaji is the chronic sand-casting
district and "facing deposition" is a far weaker test than the SDRF's certified
three inches — while the 2026 in-season reporting described only *several hundred
hectares* under siltation assessment in Dhemaji, against a statewide submerged
crop area in the tens of thousands of hectares. That argues 20% is high.

The central value is unchanged because the evidence supports moving it in both
directions and gives no basis for choosing. A certified sand-cast area survey
would still improve this model more than any other single input.

### Land lost is a different event from land silted

The SDRF prices de-silting at ₹18,000/Ha and land loss at ₹47,000/Ha. That 2.6×
difference is the schedule's own signal that clearing a field and losing it are
not the same thing. Land loss is assumed at 3% [1–8%] — deliberately low, with a
wide multiple between the bounds, because attributing a specific area to one
flood needs survey data the bulletin does not carry.

**Checked against Dhemaji, where this happens worst.** Its net sown area fell
about 11% (7,689 Ha) between 1992 and 2004-05 while fallow and uncultivable land
rose 35% (8,013 Ha); KVK records 3,830 Ha of recent sand deposits against
10,430 Ha of non-cultivable wasteland. Spread over thirteen years that is under
1% of the district's sown area lost per year — so 3% of one flood's submerged
area is the right order and, if anything, generous. Those are cumulative
district figures rather than a per-event share, which is why the bounds stay
wide and the central value did not move.

---

## Reference dwelling

| Assumption | Used | Range | Why |
|---|---|---|---|
| Floor area | 30 m² | 25–46.6 | PMAY-G statutory minimum, to the NSS 76th round rural average |
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
| Floor area protected | 30 m² | 25–46.6 | Held equal to the reference dwelling by a test |
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

**The only assumption a public source settles outright.** Census 2011 records
6,406,471 households in Assam against a population of 31,205,576 — an average of
4.87, which is what 4.9 rounds from; 5,420,877 of those households are rural.
That is why this range is narrow where every other range here is wide.

---

## What is deliberately not assumed

Three places where the honest answer was silence rather than a number:

- **Kuccha superstructures are not costed.** A civil-works schedule prices brick,
  cement and RCC; a Kuccha house is bamboo, timber and thatch. Under
  *protect in place* the raised plinths beneath them **are** priced.
- **Bridges and culverts are counted and not costed.** They *were* costed, at
  ₹3.24 lakh for every damaged bridge and culvert in Assam, because the ceiling
  applied per bridge was **₹60,000 — the identical constant the road line uses,
  where the SDRF states it per _kilometre_**. One number, two units. Under it a
  bridge whose remark reads `Washed away` cost ₹36,000.

  There is no per-bridge ceiling to substitute. The SDRF folds this work into
  the road item, and its own wording says what it buys: *"repair of breached
  culverts… providing diversions to the damaged/washed out portions of bridges
  to restore immediate connectivity… temporary repair of approaches"*. That is
  money to get traffic past a failed bridge, already inside the rate the Roads
  line applies. A separate figure could only invent a rate or charge twice, and
  ADR-0011 settles which of those is allowed: neither.

  What this leaves missing is large and named on the view: permanent
  reconstruction of a washed-away bridge runs to crores, against a public tier
  whose entire subtotal is tens of crores. The bulletin carries no span, width
  or class for any of these items, so nothing here can produce it.
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

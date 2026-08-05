# Feasibility — replacement cost and working-capital loss

Whether a *constructed* cost basis — one built from documented assumptions rather
than copied from a published schedule — can be made trustworthy on this data.

Assessed against the bundled archive: 16 bulletins, 20 July – 4 August 2026,
190 district-days, 4,780 infrastructure items. Every quantity below was measured,
not estimated.

**Verdict: feasible, and worth doing — but it is a different kind of artefact
from the SDRF costing, and the difference has to be visible in the product, not
just in a footnote.** The engineering is easy. What decides whether the output is
honest is whether a reader can tell, at a glance, that they are looking at
something we constructed rather than something a government published.

---

## 1. Why this is a genuinely different problem

The SDRF costing (ADR-0011) has two layers:

```
quantity (ASDMA printed it)  ×  rate (MHA published it)
```

Both halves are citable. Nobody has to trust our judgement about anything.

Replacement cost and working-capital loss have **three**:

```
quantity (ASDMA printed it)
  ×  parameter (someone published it — a wage, a yield, a market price)
  ×  behavioural assumption (WE chose it — who, how long, how much of it)
```

That third layer is new and it is where all the risk lives. "56,607 hectares were
submerged" is a fact. "₹8,500 per hectare" is a published norm. But **"the crop
was a total loss on 60% of it, and the working capital already sunk into that
crop was 40% of the cost of cultivation"** is a judgement — defensible, arguable,
and entirely ours.

The user's instinct is the right one: this is fine *if the assumptions are
documented and the arithmetic is transparent*. But "documented" has to mean
something stronger than a paragraph in a README. It has to mean each assumption
is a first-class, individually adjustable, individually labelled input, and that
no figure derived from one can be displayed without it.

---

## 2. Damage and Loss are different limbs, and the model currently has only one

PDNA separates them, and the separation is not academic:

| | What it is | What the console has today |
|---|---|---|
| **Damage** | Replacement value of destroyed physical assets | The SDRF costing — houses, livestock, huts |
| **Loss** | Economic flows foregone because of the disaster | **Nothing at all** |

Working capital is squarely a **Loss** concept, and the console currently cannot
express it. That is the honest gap this proposal fills.

It also exposes a subtlety in what already shipped. The crop line currently costs
peak submerged hectares at the SDRF input-subsidy rate of ₹8,500/ha. That is
neither Damage nor Loss — it is *assistance payable*, a third thing again. It is
correctly labelled as a compensation-norm figure, but it should not be mistaken
for either the value of the crop lost or the working capital sunk into it. Those
are three different numbers for the same hectares, and a model offering all three
must never let them be added.

---

## 3. What the bulletin supports, measured

### Strong — quantity is present and complete

| Loss category | Bulletin basis | Measured over the archive |
|---|---|---|
| **Agricultural working capital** | Peak crop area submerged | 56,606.777 Ha |
| **Livestock productive capital** | Large/small animals washed away | 6,002 / 13,333 |
| **Poultry stock** | Poultry washed away | 217,270 |
| **Livelihood interruption** | Population-affected-days | 6,235,154 person-days |
| **Displacement duration** | Camp-inmate-days | 302,253 person-days |

Zero unknowns on all of these across 190 district-days. The quantity layer is
not the constraint.

### Partial — a correction to what I told you earlier

I previously assessed infrastructure as uncostable because *"the bulletin never
dimensions anything"*. **That was too strong, and the data says so.**

Of 4,780 infrastructure items, **501 (10.5%) carry a dimension in the remarks
field** — road chainages, damage lengths, conductor runs, pond areas:

```
[PWD (Roads)] Kanu Gaon No. 1 under PMGSY  ::  Chainage 1300.00m to 2800.00m
[PWD (Roads)] Seuji Pather to Kaitong      ::  The damage Length - 150.00m
[APDCL]       CONDUCTOR DAMAGED            ::  0.3KM
[Fishery]     DFDO, Nagaon                 ::  23 fish tanks, covering a total
                                               water area of 6.50 hectares
```

The structured claim was right — there is no dimension *column*. The stronger
claim was wrong: dimensions exist, in prose, for a tenth of items, in half a
dozen incompatible formats. The SDRF norms are per kilometre of road and per
culvert, so those 501 items **could** be costed with an extraction step of their
own.

That is a real, bounded piece of work and it should be scoped honestly: a second
parser, over free text, with its own confidence model, recovering perhaps a tenth
of the largest damage category. Worth doing eventually. Not worth blocking this
on.

### Blocked — and it is the department column, not the data

Department attribution decides which norm applies, and it is currently broken by
the same wrapped-cell defect the District names had:

```
Education 920 · Deptt. 793 · PWD (Roads) 692 · Women & 550 · PHE 398
Fishery 396 · Child 256 · Water 102 · Resource 70
```

`Water` + `Resource` is *Water Resource Deptt.* `Women &` + `Child` is *Women &
Child Development*. `Deptt.` is the orphaned tail of several. Until that is
repaired, department-keyed costing would silently mis-file a third of items.

**This is a prerequisite, it is the same class of bug already fixed once for
District names, and the fix is likely small.**

---

## 4. Parameter sourceability — the real constraint

Each parameter needs a citation of the same standard ADR-0011 demands of a rate.

| Parameter | Published? | State |
|---|---|---|
| Rural wage rate (livelihood loss) | Yes, annually | **In flux.** MGNREGA was replaced by the VB-G RAM G Act on **1 July 2026** — three weeks before these bulletins — with a reported ₹300/day floor. The parameter changed *during* the event being modelled. |
| Cost of cultivation per hectare | Yes — CACP, per state per crop | Sourceable, but crop-specific, and the bulletin does not say which crop was submerged |
| Livestock replacement value | Partly — SDRF gives assistance, not market value | Market value needs a separate source |
| Pond stocking cost per hectare | Fisheries department schedules | Not yet sought |
| Building construction cost | State PWD schedule of rates | Published, revised annually |

Two lessons from the SDRF sourcing exercise that apply directly:

1. **Indian government PDFs are frequently scanned images.** Both copies of the
   SDRF annexure I retrieved had no text layer; several official portals returned
   503. Budget for manual transcription.
2. **Effective dates matter more than expected.** The SDRF schedule I sourced
   *expired on 31 March 2026*, before the flood it would be applied to. The
   MGNREGA-to-VB-G transition lands mid-archive. A parameter without an effective
   date is not usable here.

---

## 5. The design answer: rate provenance as a type

The one thing that must not happen is a constructed rate rendering
indistinguishably from a cited one. ADR-0011 says *"a rate that cannot cite its
source cannot exist"*, and a constructed rate has no source to cite — so it needs
a different, equally strict discipline rather than an exemption.

Proposed (ADR-0014): **`RateProvenance` becomes a tagged union.**

```
cited        → a published rate; carries a Citation          (SDRF today)
constructed  → derived; carries a Derivation, not a Citation
```

A `Derivation` names every input, and each input is itself either `cited` (a
published wage, a CACP cost of cultivation) or `assumed` (our judgement, with a
plausible range and a one-line reason). So a constructed rate is a small tree,
every leaf of which is either sourced or explicitly owned.

Consequences that make it honest rather than merely traceable:

- A constructed figure **always** displays with a range, never a point estimate —
  the range being what the assumption bounds produce, computed rather than
  decorative.
- Constructed and cited figures **cannot be summed**. Same rule as `CostBasis`
  today: they answer different questions.
- The UI must distinguish them visually, at every point of use, not once at
  the top of a page.
- Every assumption is adjustable, and the figure moves while you watch — the
  ADR-0006 principle that made severity weights credible.

---

## 6. What could go wrong, and what stops it

| Risk | Control |
|---|---|
| A constructed figure is quoted as if published | Provenance in the type, distinct rendering, mandatory range |
| Assumptions accumulate until nobody can see the whole chain | Derivation tree is data and is rendered whole; an assumption not in it cannot affect a figure |
| Damage, Loss and assistance get added together | No total across bases — the `Casualties` no-total pattern |
| The 60%-total-loss kind of assumption becomes folklore | Every assumption carries a stated range and a reason; the range drives the displayed interval |
| Parameters silently age | `effectiveFrom`/`effectiveTo` already exist and already caught the SDRF expiry |
| It gets used for entitlement claims | Replacement cost is explicitly not assistance; the schedule's `basis` says so and the export carries it |

---

## 7. Recommendation

**Build it, in this order.** Steps 1 and 2 need no new external data at all.

1. **`RateProvenance` and the derivation tree** (ADR-0014), plus the range
   arithmetic. Pure domain work, no sourcing, and it is the thing everything else
   depends on.
2. **Livelihood interruption from person-days** — the one loss category whose
   quantity is already computed, already verified, and already back-tested
   against distributed relief. One published parameter (the wage) and two
   assumptions (participation rate, days lost per affected person).
3. **Agricultural working capital**, once a CACP cost-of-cultivation figure is
   sourced. Highest value, because crop area is the largest quantity in the
   bulletin.
4. **Fix the department column**, then revisit infrastructure with the prose
   extractor for the 501 dimensioned items.

Two things I need from you before step 3, and neither blocks steps 1–2:

- Whether **replacement cost** or **loss** is the primary framing you want. They
  are both legitimate and they answer different donor questions; the model can
  hold both, but the default matters.
- Any Assam-specific cost data you already have — a state PWD schedule of rates,
  a departmental cost-of-cultivation figure, an NGO's own programme costs. A
  sourced local parameter beats anything I can derive from national averages.

/**
 * Rehabilitation Economics — restoring what the water left behind, at two
 * different levels.
 *
 * ---------------------------------------------------------------------------
 * Why micro and macro are separate totals and never one
 * ---------------------------------------------------------------------------
 *
 * A household's losses and a state's losses are both real and they are not the
 * same kind of claim:
 *
 *   MICRO  What belongs to a household — its dwelling, its land, its animals,
 *          and the silt now sitting on both. Recovery here is a transfer to
 *          identifiable families, and the caseload is households.
 *   MACRO  Roads, bridges, embankments, schools, water schemes. Recovery is
 *          public works, the caseload is assets, and no household receives it.
 *
 * PDNA separates them as private and public sector damage, and the separation
 * is load-bearing rather than tidy: an appeal that adds them produces a figure
 * where a road and a family's home are interchangeable, and a per-household
 * comparison built on the combined total is nonsense. They are reported
 * side by side here and there is no combined field to render by accident.
 *
 * ---------------------------------------------------------------------------
 * The sequencing point that makes silt its own line
 * ---------------------------------------------------------------------------
 *
 * Sand and silt have to come off a field before it can be sown and out of a
 * house before it can be rebuilt. So de-silting is not a smaller version of
 * reconstruction — it is a **precondition** for it, and a plan that funds
 * rebuilding without funding clearance has funded work that cannot start.
 *
 * It is also the one part of this whole model with **cited** rates rather than
 * constructed ones: the SDRF schedule prices de-silting per hectare directly,
 * so the rate half needs no assumptions at all. The judgement is entirely in
 * *how much* land is silted, which the bulletin does not report.
 *
 * ---------------------------------------------------------------------------
 * Submerged is not silted
 * ---------------------------------------------------------------------------
 *
 * The single most important assumption here. 56,607 hectares were under water
 * at peak; only a fraction of that carries enough deposit to need clearing, and
 * a smaller fraction again is sand-cast badly enough to be out of cultivation.
 * Sand deposition concentrates near breaches and channel migration, not evenly
 * across the flooded area. Treating submerged area as silted area would
 * overstate this line several times over, and it is the easiest mistake here to
 * make silently.
 *
 * Pure. No I/O, no clock.
 */

import { derivation, evaluate, type Derivation, type Interval } from './derivation';
import type { Citation } from './money';

const MHA_2022: Omit<Citation, 'clause'> = {
  publisher: 'Ministry of Home Affairs, Government of India',
  document:
    'Revised list of items and norms of assistance from the State Disaster Response Fund ' +
    '(SDRF) and National Disaster Response Fund (NDRF) for the period 2022-23 to 2025-26',
  reference: 'F. No. 33-03/2020-NDM-I (Vol-II) dated 10 October 2022',
  source:
    'Reproduced by DDMA Kokrajhar, Government of Assam — ' +
    'kokrajhar.assam.gov.in/sites/default/files/public_utility/' +
    'Revised%20SDRF%20Norms%20&%20Assistance.pdf',
  retrievedOn: '2026-08-06',
};

const sdrf = (label: string, value: number, unit: string, clause: string) =>
  ({ kind: 'published' as const, label, value, unit, citation: { ...MHA_2022, clause } });

// ---------------------------------------------------------------------------
// Micro — land and homestead restoration
// ---------------------------------------------------------------------------

/**
 * De-silting agricultural land, per hectare of land *actually silted*.
 *
 * The rate is cited and needs no assumption. The whole judgement is the share
 * of submerged land that carries a clearable deposit.
 */
const agriculturalDesilting = (submergedHectares: number): Derivation =>
  derivation({
    formula: 'peak submerged area × share carrying clearable deposit × SDRF de-silting rate',
    inputs: [
      {
        kind: 'assumed',
        label: 'Peak submerged area',
        value: submergedHectares,
        unit: 'Ha',
        low: submergedHectares,
        high: submergedHectares,
        reason:
          'Read from the bulletins as a peak, not a sum — submerged area is a stock and the ' +
          'same field under water on twelve days is one field. Fixed rather than ranged ' +
          'because it is measured, not judged.',
      },
      {
        kind: 'assumed',
        label: 'Share of submerged land carrying a clearable deposit',
        value: 0.2,
        unit: 'share',
        low: 0.08,
        high: 0.4,
        reason:
          'SUBMERGED IS NOT SILTED. Deposition concentrates near breaches and where the ' +
          'channel has moved, not evenly across the flooded area; most submerged land drains ' +
          'and is sown again without clearance. The SDRF rate applies only where deposit ' +
          'exceeds 3 inches and is certified. The published evidence points BOTH WAYS and ' +
          'neither side of it is decisive: Das (2012), surveying 1,059 households across 15 ' +
          'villages of Dhemaji, found roughly 83% of paddy land facing sand deposition, and ' +
          '39% of 346 plots tested in the Jiadhal basin carried over 70% sand — but Dhemaji ' +
          'is the chronic sand-casting district and "facing deposition" is a weaker test than ' +
          'the SDRF\'s 3-inch certified threshold. Against that, the 2026 in-season ' +
          'assessment described only several hundred hectares under siltation assessment in ' +
          'Dhemaji, against a statewide submerged crop area in the tens of thousands of ' +
          'hectares. The central value is unchanged at 20% because the search found support ' +
          'for both a higher and a lower figure and no basis for preferring either.',
      },
      sdrf(
        'De-silting / removal of debris, deposit over 3 inches',
        18_000,
        '₹/Ha',
        'Agriculture — de-silting of agricultural land',
      ),
    ],
    combine: ([area = 0, share = 0, rate = 0]) => area * share * rate,
  });

/**
 * Land taken out of cultivation by sand casting or channel change.
 *
 * A different loss from de-silting and a much worse one: this is land that
 * cannot be cleared back into use in a season. The SDRF prices it separately
 * and at nearly three times the de-silting rate, which is the schedule's own
 * signal that the two are not the same event.
 */
const landLostToSandCasting = (submergedHectares: number): Derivation =>
  derivation({
    formula: 'peak submerged area × share rendered uncultivable × SDRF land-loss rate',
    inputs: [
      {
        kind: 'assumed',
        label: 'Peak submerged area',
        value: submergedHectares,
        unit: 'Ha',
        low: submergedHectares,
        high: submergedHectares,
        reason: 'As above — measured, not judged.',
      },
      {
        kind: 'assumed',
        label: 'Share rendered uncultivable by sand casting or channel change',
        value: 0.03,
        unit: 'share',
        low: 0.01,
        high: 0.08,
        reason:
          'A small fraction of a small fraction: land is lost this way only where the river ' +
          'has laid deep sand or moved its bank. Checked against Dhemaji, the worst-affected ' +
          'district: its net sown area fell about 11% (7,689 Ha) between 1992 and 2004-05 ' +
          'while fallow and uncultivable land rose 35% (8,013 Ha), and KVK records 3,830 Ha ' +
          'of recent sand deposits against 10,430 Ha of non-cultivable wasteland. Spread ' +
          'over thirteen years that is under 1% of the district\'s sown area lost per year, ' +
          'in the district where this happens worst — so 3% of a single flood\'s submerged ' +
          'area is of the right order and, if anything, generous. Those are cumulative ' +
          'district figures rather than a per-event share, which is why the bounds stay wide.',
      },
      sdrf(
        'Loss of land by landslide, avalanche, change of course of rivers',
        47_000,
        '₹/Ha',
        'Agriculture — loss of land',
      ),
    ],
    combine: ([area = 0, share = 0, rate = 0]) => area * share * rate,
  });

/**
 * Clearing silt out of homesteads so rebuilding can begin.
 *
 * Priced per household rather than per hectare, because the unit of work is a
 * house plot. There is no SDRF rate for this — the schedule's de-silting item
 * is agricultural — so it is constructed from the Assam PWD excavation rate for
 * slushy soil.
 */
const homesteadClearance = (householdsAffected: number): Derivation =>
  derivation({
    formula: 'households needing clearance × volume per homestead × excavation rate × GST',
    inputs: [
      {
        kind: 'assumed',
        label: 'Households affected',
        value: householdsAffected,
        unit: 'households',
        low: householdsAffected,
        high: householdsAffected,
        reason:
          'Derived from peak affected population and an assumed household size. Fixed here ' +
          'because the uncertainty in it belongs to the household-size assumption, not to ' +
          'this line, and ranging it twice would double-count that uncertainty.',
      },
      {
        kind: 'assumed',
        label: 'Share of affected households needing homestead clearance',
        value: 0.35,
        unit: 'share',
        low: 0.15,
        high: 0.6,
        reason:
          'Being flooded and being left with a clearable deposit are different things. Homes ' +
          'on higher ground drain clean; those near a breach are filled. The bulletin reports ' +
          'neither, so this is judgement — and it STAYED judgement after searching. No survey ' +
          'of Assam homesteads separates "flooded" from "silted", and the SDRF has no ' +
          'homestead de-silting item to have generated a payout record. This is the one ' +
          'assumption on this view for which the search produced nothing at all, in either ' +
          'direction. Read the ₹26 cr it moves as unbacked.',
      },
      {
        kind: 'assumed',
        label: 'Deposit to remove per homestead',
        value: 12,
        unit: 'm³',
        low: 5,
        high: 25,
        reason:
          'Area × depth, stated so both halves can be argued with separately. The area ' +
          'cleared is the dwelling footprint plus the working yard around it — call it ' +
          '70–80 m², not the 30 m² of the house alone, because a homestead with silt only ' +
          'inside the walls is not habitable either. At 150 mm of deposit that is about ' +
          '12 m³. The bounds correspond to roughly 50 m² at 100 mm and 100 m² at 250 mm. ' +
          'The area × depth form is the one FEMA and USACE use for post-flood debris ' +
          'estimation, but their generation rates are for structural debris — drywall, ' +
          'insulation, contents — and do not transfer to river silt, so the rate is not ' +
          'borrowed, only the shape of the calculation.',
      },
      {
        kind: 'published',
        label: 'Excavation in slushy soil, incl. dewatering and disposal',
        value: 276.81,
        unit: '₹/m³',
        citation: {
          publisher: 'Public Works Department (Buildings), Government of Assam',
          document: 'Assam PWD Building Schedule of Rates for Civil Works',
          reference: 'Edition undated — no year appears anywhere in the document text',
          clause: 'Ch-1, item 1.4(a), slushy/marshy soil within Guwahati city',
          source: 'docs/reference/assam-pwd-buildings-schedule-of-rates-civil-works.pdf',
          retrievedOn: '2026-08-06',
        },
      },
      {
        kind: 'assumed',
        label: 'GST uplift',
        value: 1.18,
        unit: '×',
        low: 1.12,
        high: 1.18,
        reason: 'The schedule states GST is excluded and must be added separately.',
      },
    ],
    combine: ([households = 0, share = 0, volume = 0, rate = 0, gst = 0]) =>
      households * share * volume * rate * gst,
  });

// ---------------------------------------------------------------------------
// Macro — public infrastructure
// ---------------------------------------------------------------------------

/**
 * What the bulletin lets us cost at the public level, and what it does not.
 *
 * The SDRF prices most of this per *asset* — a ceiling per school, per water
 * scheme, per transformer — which suits a bulletin that counts items and
 * dimensions almost none of them. Roads are the exception: the SDRF rate is per
 * kilometre and the bulletin has no length column, so an average damaged length
 * has to be applied to the count.
 *
 * That average used to be the weakest number in this tier, until somebody read
 * the remarks: **200 of the 645 road records state a damaged length**, either
 * outright or as a chainage range. The assumption is now their measured
 * distribution rather than a guess, and the weakest number here is instead the
 * share of the SDRF ceiling actually needed, which nothing published can check.
 */
export type InfrastructureCounts = {
  readonly roads: number | undefined;
  readonly bridges: number | undefined;
  readonly embankmentsBreached: number | undefined;
  readonly embankmentsAffected: number | undefined;
  /** Everything the bulletin files as `other`: schools, anganwadi, water, power. */
  readonly other: number | undefined;
};

const roadRestoration = (count: number): Derivation =>
  derivation({
    formula: 'damaged road items × average damaged length × SDRF rural road repair rate',
    inputs: [
      {
        kind: 'assumed',
        label: 'Damaged road items reported',
        value: count,
        unit: 'items',
        low: count,
        high: count,
        reason: 'Counted from the bulletin listing. Measured, not judged.',
      },
      {
        kind: 'assumed',
        label: 'Average damaged length per reported road',
        value: 1.0,
        unit: 'km',
        low: 0.4,
        high: 2.5,
        reason:
          'MEASURED FROM THE ARCHIVE, not judged. The SDRF pays per kilometre and the ' +
          'bulletin names a road without a length column — but 200 of the 645 road records ' +
          '(31%) state a damaged length in their remarks, either outright ("Approx. 0.5 KM") ' +
          'or as a chainage range ("Ch. 600 m to Ch. 900 m"). Those 200 run from 0.57 m to ' +
          '9.9 km, median 1.15 km, mean 1.75 km, quartiles 0.40 and 2.50 km. The bounds here ' +
          'are those quartiles. The central 1.0 km sits just below the measured median, a ' +
          'small discount because an engineer is likelier to record a length for a serious ' +
          'failure than for a road merely overtopped — that discount is itself a judgement, ' +
          'and a weak one now that a third of records are measured rather than a tenth. Six ' +
          'records were excluded as road totals or chainage typos rather than damage lengths ' +
          '(one reads "Ch.0.550 KM to CH.0560 km"). The previous central of 0.6 km sat below ' +
          'the measured 25th percentile.',
      },
      sdrf(
        'Repair of rural/village roads with culverts, normal areas',
        60_000,
        '₹/km',
        'Repair/restoration of damaged infrastructure — rural roads',
      ),
    ],
    combine: ([items = 0, km = 0, rate = 0]) => items * km * rate,
  });

const perAsset = (
  label: string,
  count: number,
  rate: number,
  clause: string,
  rateLabel: string,
): Derivation =>
  derivation({
    formula: `${label} × SDRF ceiling per unit`,
    inputs: [
      {
        kind: 'assumed',
        label,
        value: count,
        unit: 'items',
        low: count,
        high: count,
        reason: 'Counted from the bulletin listing. Measured, not judged.',
      },
      {
        kind: 'assumed',
        label: 'Share of the SDRF ceiling actually needed',
        value: 0.6,
        unit: 'share',
        low: 0.3,
        high: 1.0,
        reason:
          'The SDRF figure is a CEILING per damaged unit, not a flat payment — "as per ' +
          'actual, subject to a ceiling of Rs 2.00 lakh". Most damaged assets need less than ' +
          'the ceiling; a few need all of it. Applying the ceiling to every item would ' +
          'overstate the tier, which is why this share exists rather than being assumed away. ' +
          'THIS IS THE LARGEST LEVER IN THE WHOLE MODEL and it has no external check. What ' +
          'would settle it is the ratio of SDRF assistance actually disbursed to the ceiling ' +
          'that could have been claimed, per damaged asset. States report SDRF expenditure in ' +
          'aggregate and CAG audits it in aggregate; neither publishes it per unit against ' +
          'the ceiling. So 60% is a guess about how far below a cap real repairs land, and ' +
          'the ₹55 crore it moves rests on nothing published.',
      },
      sdrf(rateLabel, rate, '₹/unit', clause),
    ],
    combine: ([items = 0, share = 0, rate_ = 0]) => items * share * rate_,
  });

export type RecoveryLine = {
  readonly label: string;
  readonly tier: 'micro' | 'macro';
  readonly derivation: Derivation;
  readonly interval: Interval;
};

const line = (label: string, tier: 'micro' | 'macro', spec: Derivation): RecoveryLine => ({
  label,
  tier,
  derivation: spec,
  interval: evaluate(spec),
});

/** Land and homestead restoration — the work that must precede rebuilding. */
export const microRecoveryLines = (input: {
  readonly submergedHectares: number;
  readonly householdsAffected: number;
}): readonly RecoveryLine[] => [
  line('Homestead silt clearance', 'micro', homesteadClearance(input.householdsAffected)),
  line('Agricultural land de-silting', 'micro', agriculturalDesilting(input.submergedHectares)),
  line(
    'Land lost to sand casting or channel change',
    'micro',
    landLostToSandCasting(input.submergedHectares),
  ),
];

/** Public infrastructure. Reported separately and never added to the micro tier. */
export const macroRecoveryLines = (counts: InfrastructureCounts): readonly RecoveryLine[] => {
  const out: RecoveryLine[] = [];
  if (counts.roads !== undefined) out.push(line('Roads', 'macro', roadRestoration(counts.roads)));
  // Bridges and culverts are NOT a line here. See `BRIDGES_NOT_COSTED`.
  const embankments =
    counts.embankmentsBreached === undefined || counts.embankmentsAffected === undefined
      ? undefined
      : counts.embankmentsBreached + counts.embankmentsAffected;
  if (embankments !== undefined) {
    out.push(
      line(
        'Embankments breached and affected',
        'macro',
        perAsset(
          'Damaged embankment sections reported',
          embankments,
          200_000,
          'Repair/restoration — minor irrigation works, ceiling per damaged scheme',
          'Minor irrigation scheme repair, ceiling per scheme',
        ),
      ),
    );
  }
  if (counts.other !== undefined) {
    out.push(
      line(
        'Schools, anganwadi, water supply, power and other assets',
        'macro',
        perAsset(
          'Other damaged public assets reported',
          counts.other,
          200_000,
          'Repair/restoration — schools, PHC/CHC and drinking water schemes, ceiling per unit',
          'Repair ceiling per damaged school, health centre or water scheme',
        ),
      ),
    );
  }
  return out;
};

export const sumLines = (lines: readonly RecoveryLine[]): Interval =>
  lines.reduce<Interval>(
    (acc, l) => ({
      low: acc.low + l.interval.low,
      central: acc.central + l.interval.central,
      high: acc.high + l.interval.high,
    }),
    { low: 0, central: 0, high: 0 },
  );

/**
 * What the macro tier cannot see at all.
 *
 * Rendered wherever the macro total appears, because a public-infrastructure
 * figure that silently omits the railway is not a public-infrastructure figure.
 */
/**
 * What the macro rates actually buy, which is less than the word suggests.
 *
 * The SDRF chapter these rates come from is headed **"Repair/Restoration
 * (Immediate Nature) of Damaged Infrastructure"**, and the wording is not
 * decoration: the items beneath it are filling breaches, providing diversions,
 * temporary repair of approaches, granular sub-base over damaged stretches. It
 * is the money to make a road passable again, not the money to rebuild it.
 *
 * So the macro subtotal is a **restoration** figure and calling it
 * reconstruction would overstate what has been funded and understate what is
 * still needed. Permanent reconstruction of the same assets would be a
 * different and considerably larger number, priced from the PWD schedule of
 * rates rather than the SDRF, and the bulletin does not carry the dimensions to
 * build it.
 */
export const MACRO_IS_RESTORATION_NOT_RECONSTRUCTION =
  'These are RESTORATION figures, not reconstruction. The SDRF rates used here come from a ' +
  'chapter headed "Repair/Restoration (Immediate Nature) of Damaged Infrastructure" — filling ' +
  'breaches, temporary repair of approaches, making a road passable. Rebuilding the same ' +
  'assets permanently would cost considerably more, and the bulletin does not carry the ' +
  'dimensions needed to price it.';

/**
 * Why bridges and culverts carry a count and no cost.
 *
 * ---------------------------------------------------------------------------
 * A rate that was the road rate wearing a different unit
 * ---------------------------------------------------------------------------
 *
 * This line used to exist, and it produced **₹3.24 lakh for every damaged
 * bridge and culvert in Assam**. The figure was absurd and its cause was
 * simple: the ceiling applied per bridge was ₹60,000 — the identical constant
 * the road line uses, where the SDRF states it **per kilometre**. The same
 * number carried across into a different unit. Under it, `Ladoigarh Br. 16/2`,
 * whose remark reads `Washed away`, was priced at ₹36,000.
 *
 * ---------------------------------------------------------------------------
 * Why the answer is a gap and not a better rate
 * ---------------------------------------------------------------------------
 *
 * There is no per-bridge ceiling in the SDRF to substitute. The schedule folds
 * this work into the ROAD item, and its own wording says what it buys:
 * *"repair of breached culverts… providing diversions to the damaged/washed out
 * portions of bridges to restore immediate connectivity… temporary repair of
 * approaches to bridges"*. That is the money to get traffic past a failed
 * bridge, not the money to rebuild one — and it is already inside the rate the
 * road line applies.
 *
 * So a separate per-bridge figure has only two available forms and both are
 * wrong: invent a ceiling nothing publishes, or re-count work the road line has
 * already paid for. ADR-0011 settles it — a rate that cannot cite its source
 * cannot exist — so the count is reported and the cost is not.
 *
 * The real number this leaves missing is large and worth naming: permanent
 * reconstruction of a washed-away bridge is priced in crores from a works
 * schedule, against a macro tier whose whole subtotal is tens of crores. The
 * bulletin carries no span, width or class for any of these items, so nothing
 * here can produce it.
 */
export const BRIDGES_NOT_COSTED =
  'Bridges and culverts are counted here and deliberately NOT costed. The SDRF has no ' +
  'per-bridge ceiling to apply: it folds this work into the road item, where what it buys is ' +
  '"repair of breached culverts", "diversions to the damaged/washed out portions of bridges" ' +
  'and "temporary repair of approaches" — money to get traffic past a failed bridge, already ' +
  'inside the rate the Roads line uses. A separate figure would either invent a rate nothing ' +
  'publishes or charge twice for the same work. Rebuilding a washed-away bridge permanently ' +
  'is a much larger number, priced in crores from a works schedule, and the bulletin carries ' +
  'no span, width or class for any of these items to build it from.';

export const MACRO_NOT_COVERED =
  'Railways are not in this total, and cannot be: across 4,780 damaged-asset records in the ' +
  'archive, four mention a railway at all. ASDMA reports what State departments report to it, ' +
  'and the railway is a Central undertaking that reports elsewhere — so its damage is absent ' +
  'from the source rather than small. National Highways are under-represented for the same ' +
  'reason. Telecommunications and irrigation canals beyond embankments are likewise not ' +
  'separately reported. This total covers State-reported assets only and should be read as ' +
  'one part of the public bill, not the whole of it.';

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
          'exceeds 3 inches and is certified. This share is the largest judgement on this ' +
          'view and there is no figure in the bulletin to check it against.',
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
          'has laid deep sand or moved its bank. Assam loses land to Brahmaputra erosion ' +
          'every year, but attributing a specific area to one flood needs survey data the ' +
          'bulletin does not carry. Kept deliberately low with a wide multiple between the ' +
          'bounds, because the honest position is that we do not know.',
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
          'neither, so this is judgement.',
      },
      {
        kind: 'assumed',
        label: 'Deposit to remove per homestead',
        value: 12,
        unit: 'm³',
        low: 5,
        high: 25,
        reason:
          'A 30 m² dwelling plus its immediate yard, with roughly 150–250 mm of deposit, is ' +
          'of the order of 10–15 m³. The upper bound covers deep sand near a breach.',
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
 * kilometre and the bulletin gives a count, so an average damaged length has to
 * be assumed, and it is the weakest number in this tier.
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
        value: 0.6,
        unit: 'km',
        low: 0.2,
        high: 1.5,
        reason:
          'THE WEAKEST NUMBER IN THIS TIER. The SDRF pays per kilometre and the bulletin ' +
          'reports a road by name with no length. Where a length does appear in the remarks ' +
          'it ranges from a 50 m breach to a 3 km stretch. About 10% of items carry a ' +
          'dimension in prose and extracting those would replace this assumption with ' +
          'measurement for a tenth of the tier.',
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
          'overstate the tier, which is why this share exists rather than being assumed away.',
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
  if (counts.bridges !== undefined) {
    out.push(
      line(
        'Bridges and culverts',
        'macro',
        perAsset(
          'Damaged bridges and culverts reported',
          counts.bridges,
          60_000,
          'Repair/restoration — RCC culvert/bridge, normal areas',
          'Repair of RCC culvert/bridge, normal areas',
        ),
      ),
    );
  }
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

export const MACRO_NOT_COVERED =
  'Railways are not in this total, and cannot be: across 4,780 damaged-asset records in the ' +
  'archive, four mention a railway at all. ASDMA reports what State departments report to it, ' +
  'and the railway is a Central undertaking that reports elsewhere — so its damage is absent ' +
  'from the source rather than small. National Highways are under-represented for the same ' +
  'reason. Telecommunications and irrigation canals beyond embankments are likewise not ' +
  'separately reported. This total covers State-reported assets only and should be read as ' +
  'one part of the public bill, not the whole of it.';

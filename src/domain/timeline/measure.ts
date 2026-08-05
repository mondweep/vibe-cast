/**
 * Temporal Comparison — what a bulletin figure *is* over time (PRD §5.6).
 *
 * Every figure ASDMA prints is one of two things, and the difference decides
 * what arithmetic is legal on it across days:
 *
 *  - A **flow** counts events that happened in the reporting period. Flood
 *    deaths, houses damaged, animals washed away, persons evacuated. Each day's
 *    figure is new: 5 deaths on the 20th and 21 on the 21st are 26 different
 *    people. Summing a flow across bulletins is the whole point of it.
 *
 *  - A **stock** is the state of the world at one instant. Population Affected,
 *    Inmates in Relief Camps, Relief Camps opened, Crop Area Submerged. The
 *    same person affected on six consecutive days is *one* person, not six, and
 *    the same camp counted on six days is one camp. **Summing a stock across
 *    bulletins produces a number that means nothing and reads like a
 *    catastrophe.** For a stock the honest answers are its peak, the day it
 *    peaked, and its latest value.
 *
 * That distinction is modelled here rather than written in a comment, because a
 * comment does not stop anyone. `cumulativeOf` in `period-totals` accepts a
 * `FlowMeasure` and nothing else, so `cumulativeOf(timeline, POPULATION_AFFECTED)`
 * is a compile error, not a bad screenshot in a District Commissioner's briefing.
 *
 * Two further rules are carried through from the shared kernel:
 *
 *  - **Unknown is never zero** (ADR-0005). A reading whose value could not be
 *    read is `undefined`, and every figure derived from it says how many
 *    District rows were missing.
 *  - **Flood deaths and general drownings are never added together** (PRD
 *    §4.2). They are two separate measures here and there is no measure that
 *    combines them, so the sum cannot be written by accident.
 *
 * Pure. No I/O, no clock.
 */

import type {
  DistrictReport,
  FloodSituationReport,
} from '../shared/flood-situation-report';
import type { Quantity } from '../shared/quantity';
import { isKnown, sumQuantities, valueOf } from '../shared/quantity';

// ---------------------------------------------------------------------------
// Kind
// ---------------------------------------------------------------------------

/**
 * `flow` = events counted within the reporting period; summable across days.
 * `stock` = a level at one instant; never summable across days.
 */
export type MeasureKind = 'flow' | 'stock';

/** Where a statewide figure came from. Never blurred: ADR-0005, PRD §4.5. */
export type MeasureSource =
  /** The Total row ASDMA printed. Their number stays their number. */
  | 'asdma-state-total'
  /** Summed from the District rows here, because ASDMA prints no state total. */
  | 'district-rows'
  /** Counted from the bulletin's own itemised listing. */
  | 'bulletin-listing';

export type MeasureReading = {
  /** `undefined`, never 0, when nothing usable was reported. */
  readonly value: number | undefined;
  readonly unit: string;
  readonly source: MeasureSource;
  /**
   * How many District rows carried no figure for this measure. Non-zero means
   * the reading is a floor — "at least this many" — not a complete count.
   */
  readonly districtRowsNotReporting: number;
};

export type MeasureKey =
  // stocks
  | 'districts-affected'
  | 'revenue-circles-affected'
  | 'villages-affected'
  | 'population-affected'
  | 'crop-area-submerged'
  | 'relief-camps'
  | 'relief-distribution-centres'
  | 'camp-inmates'
  | 'non-camp-inmates'
  | 'persons-missing'
  | 'infrastructure-items-damaged'
  // flows
  | 'flood-deaths'
  | 'general-drownings'
  | 'houses-fully-severely-damaged'
  | 'houses-partially-damaged'
  | 'huts-and-cattle-sheds-damaged'
  | 'big-animals-washed-away'
  | 'small-animals-washed-away'
  | 'poultry-washed-away'
  | 'persons-evacuated-by-boat';

export type Measure<K extends MeasureKind = MeasureKind> = {
  readonly key: MeasureKey;
  /** ASDMA's own heading, so the console and the PDF read the same. */
  readonly label: string;
  readonly kind: K;
  readonly unit: string;
  /** Decimal places for display. Crop Area Submerged is the only fractional one. */
  readonly precision: number;
  /** Why it is a flow or a stock, in words an officer can argue with. */
  readonly rationale: string;
  readonly read: (report: FloodSituationReport) => MeasureReading;
};

/** A measure it is legal to total across bulletins. */
export type FlowMeasure = Measure<'flow'>;
/** A measure it is never legal to total across bulletins. */
export type StockMeasure = Measure<'stock'>;

/**
 * The narrowing every caller must pass through to reach a cumulative.
 *
 * Present as a named predicate rather than an inline `=== 'flow'` so that the
 * refusal to total a stock is a thing in the code with a name, not the absence
 * of a branch somebody can add back.
 */
export const isSummableAcrossBulletins = (measure: Measure): measure is FlowMeasure =>
  measure.kind === 'flow';

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

const fromStateTotal =
  <U extends string>(pick: (report: FloodSituationReport) => Quantity<U>) =>
  (report: FloodSituationReport): MeasureReading => {
    const quantity = pick(report);
    return {
      value: valueOf(quantity),
      unit: quantity.unit,
      source: 'asdma-state-total',
      districtRowsNotReporting: 0,
    };
  };

/**
 * Sum the District rows, skipping the ones that reported nothing and saying how
 * many were skipped.
 *
 * Skipping rather than poisoning the total is deliberate and it is the only
 * place in this context where an unknown does not simply propagate. A statewide
 * figure of "unknown" because one District row is blank tells an officer
 * nothing; "at least 5, and 5 District rows did not report" tells them both the
 * floor and its weakness. The count travels with the value so the caller cannot
 * present the floor as a complete count (ADR-0005).
 */
const fromDistrictRows =
  <U extends string>(unit: U, per: (district: DistrictReport) => Quantity<U>) =>
  (report: FloodSituationReport): MeasureReading => {
    const parts = report.districts.map(per);
    const known = parts.filter(isKnown);
    return {
      value: known.length === 0 ? undefined : known.reduce((acc, q) => acc + q.value, 0),
      unit,
      source: 'district-rows',
      districtRowsNotReporting: parts.length - known.length,
    };
  };

/**
 * Add up columns *within* one District row. If any column is unreported the
 * District's figure is unknown — a partially-read row is not a smaller row.
 */
const withinDistrict = <U extends string>(
  unit: U,
  parts: readonly Quantity<U>[],
): Quantity<U> => {
  const { total, hadUnknowns } = sumQuantities(unit, parts);
  return hadUnknowns ? { kind: 'unknown', unit } : total;
};

const countItemsListed = (report: FloodSituationReport): MeasureReading => ({
  value: report.infrastructureDamage.length,
  unit: 'count',
  source: 'bulletin-listing',
  districtRowsNotReporting: 0,
});

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

/** Preserves the literal `kind`, so `FLOOD_DEATHS` really is a `FlowMeasure`. */
const measure = <K extends MeasureKind>(spec: Measure<K>): Measure<K> => spec;

const POINT_IN_TIME =
  'A level at the moment the bulletin was compiled. The same person, camp or ' +
  'hectare appears again in tomorrow’s bulletin, so adding the days together ' +
  'would count them twice. Peak and latest are the only honest summaries.';

const WITHIN_THE_DAY =
  'Counted for the reporting period, so each bulletin reports new events. ' +
  'Adding the days together is what the figure is for.';

export const POPULATION_AFFECTED = measure<'stock'>({
  key: 'population-affected',
  label: 'Population Affected',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.populationAffected),
});

export const CAMP_INMATES = measure<'stock'>({
  key: 'camp-inmates',
  label: 'Inmates in Relief Camps',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.campInmates),
});

export const NON_CAMP_INMATES = measure<'stock'>({
  key: 'non-camp-inmates',
  label: 'Non-Camp Inmates',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.nonCampInmates),
});

export const RELIEF_CAMPS = measure<'stock'>({
  key: 'relief-camps',
  label: 'Relief Camps',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.reliefCamps),
});

export const RELIEF_DISTRIBUTION_CENTRES = measure<'stock'>({
  key: 'relief-distribution-centres',
  label: 'Relief Distribution Centres',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.reliefDistributionCentres),
});

export const CROP_AREA_SUBMERGED = measure<'stock'>({
  key: 'crop-area-submerged',
  label: 'Crop Area Submerged',
  kind: 'stock',
  unit: 'Hect',
  precision: 2,
  rationale:
    'The area under water when the bulletin was compiled. A field still ' +
    'submerged tomorrow is the same field, so the days are not added; the ' +
    'peak is the largest area recorded at once.',
  read: fromStateTotal((r) => r.statewideTotals.cropAreaSubmerged),
});

export const DISTRICTS_AFFECTED = measure<'stock'>({
  key: 'districts-affected',
  label: 'Districts Affected',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.districtsAffected),
});

export const REVENUE_CIRCLES_AFFECTED = measure<'stock'>({
  key: 'revenue-circles-affected',
  label: 'Revenue Circles Affected',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.revenueCirclesAffected),
});

export const VILLAGES_AFFECTED = measure<'stock'>({
  key: 'villages-affected',
  label: 'Villages Affected',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: POINT_IN_TIME,
  read: fromStateTotal((r) => r.statewideTotals.villagesAffected),
});

/**
 * A stock, and the classification that most often gets this wrong: somebody
 * missing on Monday and still missing on Tuesday is one missing person. The
 * figure falls when they are found, which a cumulative could never do.
 */
export const PERSONS_MISSING = measure<'stock'>({
  key: 'persons-missing',
  label: 'Human Lives Lost — Missing',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale:
    'Being missing is a state, not an event: the same person is counted again ' +
    'every day they are still missing, and the figure falls when they are ' +
    'found. Totalling it across bulletins would count one person many times.',
  read: fromDistrictRows('count', (d) => d.casualties.missing),
});

/**
 * A stock by caution, not by conviction.
 *
 * The bulletin itemises damage by name — this road, that embankment — and the
 * same named item plausibly appears on more than one day, so a total across
 * bulletins could count one breach repeatedly. Where the flow/stock reading is
 * not certain, no cumulative is offered.
 */
export const INFRASTRUCTURE_ITEMS_DAMAGED = measure<'stock'>({
  key: 'infrastructure-items-damaged',
  label: 'Infrastructure Items Damaged',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale:
    'The bulletin lists damaged infrastructure by name, and the same road or ' +
    'embankment can be listed again the next day. Because we cannot tell a ' +
    're-listing from a new failure, these are never totalled across bulletins.',
  read: countItemsListed,
});

/**
 * The flow the whole feature turns on.
 *
 * Never added to General Drownings — they are separate measures with no
 * combining measure, because PRD §4.2 says summing them overstates flood
 * mortality and the type system is a better guarantee of that than a comment.
 */
export const FLOOD_DEATHS = measure<'flow'>({
  key: 'flood-deaths',
  label: 'Human Lives Lost — Flood',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale:
    'Deaths reported in the period covered by each bulletin. A death is an ' +
    'event, not a state, so the bulletins are added — and never added to ' +
    'General Drownings, which are not flood deaths (PRD §4.2).',
  read: fromDistrictRows('count', (d) => d.casualties.floodDeaths),
});

export const GENERAL_DROWNINGS = measure<'flow'>({
  key: 'general-drownings',
  label: 'Human Lives Lost — Other Drowning',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale:
    'Non-flood drownings reported in the period covered by each bulletin. ' +
    'Totalled on their own and never folded into flood mortality (PRD §4.2).',
  read: fromDistrictRows('count', (d) => d.casualties.generalDrownings),
});

export const HOUSES_FULLY_SEVERELY_DAMAGED = measure<'flow'>({
  key: 'houses-fully-severely-damaged',
  label: 'Houses Damaged — Fully / Severely',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale: WITHIN_THE_DAY,
  read: fromDistrictRows('count', (d) =>
    withinDistrict('count', [d.houses.fullySeverelyKuccha, d.houses.fullySeverelyPukka]),
  ),
});

export const HOUSES_PARTIALLY_DAMAGED = measure<'flow'>({
  key: 'houses-partially-damaged',
  label: 'Houses Damaged — Partially',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale: WITHIN_THE_DAY,
  read: fromDistrictRows('count', (d) =>
    withinDistrict('count', [d.houses.partiallyKuccha, d.houses.partiallyPukka]),
  ),
});

export const HUTS_AND_CATTLE_SHEDS_DAMAGED = measure<'flow'>({
  key: 'huts-and-cattle-sheds-damaged',
  label: 'Huts and Cattle Sheds Damaged',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale: WITHIN_THE_DAY,
  read: fromDistrictRows('count', (d) =>
    withinDistrict('count', [d.houses.otherHuts, d.houses.otherCattleSheds]),
  ),
});

export const BIG_ANIMALS_WASHED_AWAY = measure<'flow'>({
  key: 'big-animals-washed-away',
  label: 'Big Animals Washed Away',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale:
    'Washed away is loss, not exposure: an animal lost on Monday is not lost ' +
    'again on Tuesday, so the bulletins are added. Animals *Affected* is a ' +
    'different, point-in-time figure and is not totalled.',
  read: fromDistrictRows('count', (d) => d.animals.washedAway.big),
});

export const SMALL_ANIMALS_WASHED_AWAY = measure<'flow'>({
  key: 'small-animals-washed-away',
  label: 'Small Animals Washed Away',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale: 'Washed away is loss, not exposure. See Big Animals Washed Away.',
  read: fromDistrictRows('count', (d) => d.animals.washedAway.small),
});

export const POULTRY_WASHED_AWAY = measure<'flow'>({
  key: 'poultry-washed-away',
  label: 'Poultry Washed Away',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale: 'Washed away is loss, not exposure. See Big Animals Washed Away.',
  read: fromDistrictRows('count', (d) => d.animals.washedAway.poultry),
});

export const PERSONS_EVACUATED_BY_BOAT = measure<'flow'>({
  key: 'persons-evacuated-by-boat',
  label: 'Persons Evacuated by Boat',
  kind: 'flow',
  unit: 'count',
  precision: 0,
  rationale:
    'An evacuation carried out in the period covered by the bulletin. Each ' +
    'day’s rescues are additional to the day before’s.',
  read: fromDistrictRows('count', (d) => d.rescue.personsEvacuatedByBoat),
});

/** Every measure, keyed. Exhaustive: a new `MeasureKey` will not compile until listed. */
export const MEASURES: Readonly<Record<MeasureKey, Measure>> = {
  'population-affected': POPULATION_AFFECTED,
  'camp-inmates': CAMP_INMATES,
  'non-camp-inmates': NON_CAMP_INMATES,
  'relief-camps': RELIEF_CAMPS,
  'relief-distribution-centres': RELIEF_DISTRIBUTION_CENTRES,
  'crop-area-submerged': CROP_AREA_SUBMERGED,
  'districts-affected': DISTRICTS_AFFECTED,
  'revenue-circles-affected': REVENUE_CIRCLES_AFFECTED,
  'villages-affected': VILLAGES_AFFECTED,
  'persons-missing': PERSONS_MISSING,
  'infrastructure-items-damaged': INFRASTRUCTURE_ITEMS_DAMAGED,
  'flood-deaths': FLOOD_DEATHS,
  'general-drownings': GENERAL_DROWNINGS,
  'houses-fully-severely-damaged': HOUSES_FULLY_SEVERELY_DAMAGED,
  'houses-partially-damaged': HOUSES_PARTIALLY_DAMAGED,
  'huts-and-cattle-sheds-damaged': HUTS_AND_CATTLE_SHEDS_DAMAGED,
  'big-animals-washed-away': BIG_ANIMALS_WASHED_AWAY,
  'small-animals-washed-away': SMALL_ANIMALS_WASHED_AWAY,
  'poultry-washed-away': POULTRY_WASHED_AWAY,
  'persons-evacuated-by-boat': PERSONS_EVACUATED_BY_BOAT,
};

/**
 * The flows a period summary totals, in the order it lists them.
 *
 * Typed `FlowMeasure[]`, so a stock cannot be added to this list — the mistake
 * is caught where the list is written rather than where the total is drawn.
 */
export const CUMULATIVE_MEASURES: readonly FlowMeasure[] = [
  FLOOD_DEATHS,
  GENERAL_DROWNINGS,
  HOUSES_FULLY_SEVERELY_DAMAGED,
  HOUSES_PARTIALLY_DAMAGED,
  HUTS_AND_CATTLE_SHEDS_DAMAGED,
  BIG_ANIMALS_WASHED_AWAY,
  SMALL_ANIMALS_WASHED_AWAY,
  POULTRY_WASHED_AWAY,
  PERSONS_EVACUATED_BY_BOAT,
];

/**
 * The stocks worth integrating into person-days (ADR-0012), in listing order.
 *
 * A deliberately short list, and the shortness is the point. Integrating a
 * stock is only meaningful when the resulting person-days *mean* something, and
 * they mean something only for stocks counting **people**: relief is costed per
 * person per day, so camp-inmate-days and non-camp-inmate-days are what a
 * budget is actually built from, and population-affected-days is the exposure
 * that drives livelihood interruption.
 *
 * `CROP_AREA_SUBMERGED` is a stock and is deliberately absent: hectare-days is
 * arithmetically computable and answers no question anybody asks — crop loss is
 * driven by peak submerged area, not by how long the water sat. `RELIEF_CAMPS`
 * is absent for the same reason; camp-days is a facilities-management figure,
 * not a relief cost.
 *
 * A stock reaching this list should have to justify itself in those terms.
 */
export const EXPOSURE_MEASURES: readonly StockMeasure[] = [
  CAMP_INMATES,
  NON_CAMP_INMATES,
  POPULATION_AFFECTED,
];

/** The stocks a period summary reports as peak and latest, in listing order. */
export const PEAK_ONLY_MEASURES: readonly StockMeasure[] = [
  POPULATION_AFFECTED,
  CAMP_INMATES,
  NON_CAMP_INMATES,
  RELIEF_CAMPS,
  CROP_AREA_SUBMERGED,
  VILLAGES_AFFECTED,
  DISTRICTS_AFFECTED,
  PERSONS_MISSING,
  INFRASTRUCTURE_ITEMS_DAMAGED,
];

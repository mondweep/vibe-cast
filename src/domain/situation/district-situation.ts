/**
 * SITUATION ASSESSMENT (Core) — the `DistrictSituation` aggregate root.
 *
 * PRD §5.2. Turns one `DistrictReport` from the published language into the
 * shape the ranking and severity services consume, enforcing the aggregate's
 * invariants along the way.
 *
 * The governing principle is that a failed invariant *degrades* the district —
 * it never throws it away and never quietly repairs it. An officer must be able
 * to see both the figure ASDMA printed and the fact that it does not add up.
 *
 * Pure. No I/O, no clock.
 */

import type { DistrictName } from '../shared/administrative-unit';
import type {
  AffectedPopulation,
  AnimalImpact,
  Casualties,
  DistrictReport,
  ExtractionConfidence,
  HouseDamage,
  RevenueCircleImpact,
} from '../shared/flood-situation-report';
import type { Count, Hectares, Quantity } from '../shared/quantity';
import { isKnown, sumQuantities, valueOf } from '../shared/quantity';

export type SituationDegradationReason =
  /** male + female + children ≠ total (PRD §5.2 invariant 1). */
  | 'population-components-do-not-sum-to-total'
  /** A component or the total is unknown, so invariant 1 cannot be checked. */
  | 'population-coherence-unverifiable'
  /** The Revenue Circles sum above the District figure (PRD §5.2 invariant 2). */
  | 'circle-sum-exceeds-district-total'
  /** A District or Circle figure is unknown, so invariant 2 cannot be checked. */
  | 'circle-reconciliation-unverifiable';

export type SituationDegradation = {
  readonly reason: SituationDegradationReason;
  /** The field the check was about, in ubiquitous language. */
  readonly field: string;
  /** Plain language, with the numbers in it, for the UI to show verbatim. */
  readonly detail: string;
};

/**
 * The part of a District's figures that its Revenue Circles do not account for.
 *
 * PRD §5.2 invariant 2: where DRIMS reports a District total exceeding the sum
 * of its Circles, the excess is *retained* here rather than discarded or forced
 * to balance. Operationally this is real — it is population known to be
 * affected but not yet attributed to a Circle.
 */
export type UnattributedToCircle = {
  readonly villagesAffected: Count;
  readonly populationAffected: Count;
  readonly cropAreaSubmerged: Hectares;
  readonly reliefCamps: Count;
  readonly campInmates: Count;
};

/**
 * Whether the District is in trouble, quiet, or silent.
 *
 * PRD §4.1: Dhemaji and Dibrugarh report all-zero rows. They are *reported and
 * quiet*, not absent, and the distinction must survive into the UI — an empty
 * row means "we asked and the answer was nothing", not "we do not know".
 */
export type DistrictActivity = 'affected' | 'reported-and-quiet' | 'unreported';

export type DistrictSituation = {
  readonly district: DistrictName;
  readonly circles: readonly RevenueCircleImpact[];
  readonly villagesAffected: Count;
  readonly population: AffectedPopulation;
  readonly cropAreaSubmerged: Hectares;
  readonly reliefCamps: Count;
  /** Inmates in Relief Camps — ASDMA's word, retained (PRD §4.3). */
  readonly campInmates: Count;
  readonly nonCampInmates: Count;
  /**
   * Flood deaths, general drownings and missing persons, structurally
   * unsummable: the published-language type exposes no `total` and this
   * aggregate adds none (PRD §5.2 invariant 4).
   */
  readonly casualties: Casualties;
  readonly houses: HouseDamage;
  readonly animals: AnimalImpact;
  readonly unattributedToCircle: UnattributedToCircle;
  readonly activity: DistrictActivity;
  /** `high` or `degraded`. A district is never `failed` — that is a section-level state. */
  readonly confidence: Extract<ExtractionConfidence, 'high' | 'degraded'>;
  readonly degradations: readonly SituationDegradation[];
};

// ---------------------------------------------------------------------------
// Invariant 1 — the population split must add up
// ---------------------------------------------------------------------------

const checkPopulationCoherence = (
  population: AffectedPopulation,
): readonly SituationDegradation[] => {
  const components = sumQuantities('count', [
    population.male,
    population.female,
    population.children,
  ]);

  if (components.hadUnknowns || !isKnown(components.total) || !isKnown(population.total)) {
    return [
      {
        reason: 'population-coherence-unverifiable',
        field: 'Affected Population',
        detail:
          'Male + Female + Children could not be checked against the stated Total ' +
          'because at least one figure was not reported. Unknown is not zero.',
      },
    ];
  }

  if (components.total.value === population.total.value) return [];

  return [
    {
      reason: 'population-components-do-not-sum-to-total',
      field: 'Affected Population',
      detail:
        `Male + Female + Children = ${components.total.value} ` +
        `but ASDMA states a Total Population of ${population.total.value}.`,
    },
  ];
};

// ---------------------------------------------------------------------------
// Invariant 2 — a District is at least the sum of its Revenue Circles
// ---------------------------------------------------------------------------

type Reconciliation<U extends string> = {
  readonly excess: Quantity<U>;
  readonly degradation?: SituationDegradation;
};

const reconcileAgainstCircles = <U extends string>(
  unit: U,
  field: string,
  districtFigure: Quantity<U>,
  circleFigures: readonly Quantity<U>[],
): Reconciliation<U> => {
  // No Revenue Circles reported: there is nothing to reconcile against, and the
  // whole District figure is by definition unattributed.
  if (circleFigures.length === 0) return { excess: districtFigure };

  const circles = sumQuantities(unit, circleFigures);
  const districtValue = valueOf(districtFigure);
  const circleValue = valueOf(circles.total);

  if (circles.hadUnknowns || districtValue === undefined || circleValue === undefined) {
    return {
      excess: { kind: 'unknown', unit },
      degradation: {
        reason: 'circle-reconciliation-unverifiable',
        field,
        detail:
          `${field} could not be reconciled against its Revenue Circles because at ` +
          'least one figure was not reported. Unknown is not zero.',
      },
    };
  }

  if (circleValue > districtValue) {
    return {
      excess: { kind: 'known', unit, value: 0 },
      degradation: {
        reason: 'circle-sum-exceeds-district-total',
        field,
        detail:
          `Revenue Circles sum to ${circleValue} for ${field}, above the District ` +
          `figure of ${districtValue}. The District figure is retained as ASDMA printed it.`,
      },
    };
  }

  return { excess: { kind: 'known', unit, value: districtValue - circleValue } };
};

// ---------------------------------------------------------------------------

const positive = (q: Quantity<string>): boolean => {
  const v = valueOf(q);
  return v !== undefined && v > 0;
};

const anyKnown = (quantities: readonly Quantity<string>[]): boolean => quantities.some(isKnown);

const activityOf = (report: DistrictReport): DistrictActivity => {
  const headline = [
    report.population.total,
    report.villagesAffected,
    report.cropAreaSubmerged,
    report.campInmates.total,
  ];
  if (!anyKnown(headline)) return 'unreported';
  return headline.some(positive) ? 'affected' : 'reported-and-quiet';
};

/**
 * Build a `DistrictSituation` from the published language.
 *
 * Never throws on bad data: PRD §5.2 requires incoherent districts to be
 * flagged `Degraded`, which is a state, not an exception.
 */
export const districtSituationFrom = (report: DistrictReport): DistrictSituation => {
  const circles = report.revenueCircles;

  const villages = reconcileAgainstCircles(
    'count',
    'Villages Affected',
    report.villagesAffected,
    circles.map((c) => c.villagesAffected),
  );
  const population = reconcileAgainstCircles(
    'count',
    'Affected Population',
    report.population.total,
    circles.map((c) => c.populationAffected),
  );
  const crop = reconcileAgainstCircles(
    'Hect',
    'Crop Area Submerged',
    report.cropAreaSubmerged,
    circles.map((c) => c.cropAreaSubmerged),
  );
  const camps = reconcileAgainstCircles(
    'count',
    'Relief Camps',
    report.reliefCamps,
    circles.map((c) => c.reliefCamps),
  );
  const inmates = reconcileAgainstCircles(
    'count',
    'Inmates',
    report.campInmates.total,
    circles.map((c) => c.campInmates),
  );

  const degradations: SituationDegradation[] = [
    ...checkPopulationCoherence(report.population),
    ...[villages, population, crop, camps, inmates]
      .map((r) => r.degradation)
      .filter((d): d is SituationDegradation => d !== undefined),
  ];

  return {
    district: report.district,
    circles,
    villagesAffected: report.villagesAffected,
    population: report.population,
    cropAreaSubmerged: report.cropAreaSubmerged,
    reliefCamps: report.reliefCamps,
    campInmates: report.campInmates.total,
    nonCampInmates: report.nonCampInmates.total,
    casualties: report.casualties,
    houses: report.houses,
    animals: report.animals,
    unattributedToCircle: {
      villagesAffected: villages.excess,
      populationAffected: population.excess,
      cropAreaSubmerged: crop.excess,
      reliefCamps: camps.excess,
      campInmates: inmates.excess,
    },
    activity: activityOf(report),
    confidence: degradations.length === 0 ? 'high' : 'degraded',
    degradations,
  };
};

/** Convenience for a whole bulletin. */
export const districtSituationsFrom = (
  reports: readonly DistrictReport[],
): readonly DistrictSituation[] => reports.map(districtSituationFrom);

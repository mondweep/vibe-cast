/**
 * Scenario Planning — failure points (FR-4.4).
 *
 * "If the affected population grows 30%, which district's camp capacity fails
 * first?" is question 6 of PRD §2.1, and this is the answer to it.
 *
 * The whole ordered sequence is returned rather than only the first failure,
 * because a control room does not want to be told once that Dhemaji breaks — it
 * wants the running order, so it can pre-position for the second and third
 * failures before the first has finished happening.
 *
 * A district whose figures cannot support a judgement is listed as
 * `notAssessable` with a reason. It is never quietly reported as sound; an
 * absent figure is not a safe one.
 */

import { valueOf } from '../shared/quantity';
import type { DistrictName } from '../shared/administrative-unit';
import { formatDecimal, formatInteger, statedDerivation } from './derivation';
import type { Derivation } from './derivation';
import type { ProjectedDistrictOutcome, ProjectedOutcome } from './projection-engine';
import { ScenarioInvariantError } from './scenario';

/**
 * How many people one relief camp can hold.
 *
 * An assumption, not an ASDMA figure — the bulletin reports camps and inmates
 * but never a capacity. It is stated at the call site for the same reason the
 * ration norm is: so a user who disagrees can change it and watch the answer
 * move.
 */
export type CapacityAssumptions = {
  readonly campCapacityPerCamp: number;
};

export type FailureMode = 'camp-capacity' | 'ration-exhaustion';

export type FailurePoint = {
  readonly district: DistrictName;
  readonly mode: FailureMode;
  /** Days from the start of the scenario. 0 means "already broken on arrival". */
  readonly dayOfFailure: number;
  /** How far past breaking point: >1 is failure. Used only to order equal days. */
  readonly pressureRatio: number;
  readonly derivation: Derivation;
};

export type NotAssessable = {
  readonly district: DistrictName;
  readonly mode: FailureMode;
  readonly reason: string;
};

export type FailureAnalysis = {
  /** Ordered: earliest failure first, hardest-pressed district first on a tie. */
  readonly failurePoints: readonly FailurePoint[];
  readonly notAssessable: readonly NotAssessable[];
};

const INMATES_UNKNOWN = 'The number of inmates under this scenario is not known.';

const campCapacityFailure = (
  district: ProjectedDistrictOutcome,
  capacityPerCamp: number,
): FailurePoint | NotAssessable | undefined => {
  const inmates = valueOf(district.projectedInmates.value);
  const camps = valueOf(district.reliefCampsAvailable);

  if (inmates === undefined) {
    return { district: district.district, mode: 'camp-capacity', reason: INMATES_UNKNOWN };
  }
  if (camps === undefined) {
    return {
      district: district.district,
      mode: 'camp-capacity',
      reason: 'The number of relief camps open was not reported for this district.',
    };
  }
  // Nobody to shelter is not a capacity failure, and saying so would be noise.
  if (inmates === 0) return undefined;

  const places = camps * capacityPerCamp;
  if (inmates <= places) return undefined;

  return {
    district: district.district,
    mode: 'camp-capacity',
    dayOfFailure: 0,
    pressureRatio: places > 0 ? inmates / places : Number.POSITIVE_INFINITY,
    derivation: statedDerivation(
      'camp capacity failure',
      `${district.district} runs out of relief camp places immediately — ` +
        `${formatInteger(inmates)} projected inmates against ${formatInteger(places)} places ` +
        `(${formatInteger(camps)} relief camps × ${formatInteger(capacityPerCamp)} people). ` +
        `${formatInteger(inmates - places)} people would have nowhere to shelter.`,
      [
        { label: 'Projected inmates', value: formatInteger(inmates), source: 'derived' },
        { label: 'Relief camps available', value: formatInteger(camps), source: 'derived' },
        {
          label: 'Camp capacity assumption',
          value: `${formatInteger(capacityPerCamp)} people per relief camp`,
          source: 'assumption',
        },
      ],
    ),
  };
};

const rationFailure = (
  district: ProjectedDistrictOutcome,
  horizonDays: number,
): FailurePoint | NotAssessable | undefined => {
  const inmates = valueOf(district.projectedInmates.value);
  if (inmates === undefined) {
    return { district: district.district, mode: 'ration-exhaustion', reason: INMATES_UNKNOWN };
  }
  // No inmates means no rice is drawn down. Silence is the honest answer.
  if (inmates === 0) return undefined;

  const stockKg = valueOf(district.baseline.riceStockKilograms);
  if (stockKg === undefined) {
    return {
      district: district.district,
      mode: 'ration-exhaustion',
      reason:
        'Rice stock was not reported for this district, and an unreported stock is not an empty one.',
    };
  }

  const coverage = valueOf(district.rationCoverage.value);
  const dailyDemand = valueOf(district.projectedDailyRiceDemand.value);
  if (coverage === undefined || dailyDemand === undefined) {
    return {
      district: district.district,
      mode: 'ration-exhaustion',
      reason: 'Ration coverage could not be computed for this district.',
    };
  }
  if (coverage > horizonDays) return undefined;

  return {
    district: district.district,
    mode: 'ration-exhaustion',
    dayOfFailure: coverage,
    pressureRatio: coverage > 0 ? horizonDays / coverage : Number.POSITIVE_INFINITY,
    derivation: statedDerivation(
      'ration exhaustion',
      `${district.district} runs out of rice on day ${formatDecimal(coverage, 1)} of a ` +
        `${formatDecimal(horizonDays, 0)}-day scenario — ${formatInteger(stockKg)} kg in stock ` +
        `against ${formatInteger(dailyDemand)} kg/day of demand for ${formatInteger(inmates)} ` +
        `projected inmates. That leaves ${formatDecimal(horizonDays - coverage, 1)} days of the ` +
        `scenario without rice.`,
      [
        { label: 'Rice in stock', value: `${formatInteger(stockKg)} kg`, source: 'reported' },
        {
          label: 'Projected daily demand',
          value: `${formatInteger(dailyDemand)} kg/day`,
          source: 'derived',
        },
        { label: 'Projected inmates', value: formatInteger(inmates), source: 'derived' },
        {
          label: 'Scenario duration',
          value: `${formatDecimal(horizonDays, 0)} days`,
          source: 'lever',
        },
      ],
    ),
  };
};

const isFailurePoint = (
  candidate: FailurePoint | NotAssessable | undefined,
): candidate is FailurePoint => candidate !== undefined && 'dayOfFailure' in candidate;

const isNotAssessable = (
  candidate: FailurePoint | NotAssessable | undefined,
): candidate is NotAssessable => candidate !== undefined && 'reason' in candidate;

/**
 * Order failures the way a control room would read them: soonest first, and
 * where two districts break on the same day, the one under most pressure first.
 * District name is the final tie-break so the list never reorders itself
 * between two identical runs.
 */
const byUrgency = (a: FailurePoint, b: FailurePoint): number =>
  a.dayOfFailure - b.dayOfFailure ||
  b.pressureRatio - a.pressureRatio ||
  a.district.localeCompare(b.district);

export const identifyFailurePoints = (
  outcome: ProjectedOutcome,
  assumptions: CapacityAssumptions,
): FailureAnalysis => {
  const { campCapacityPerCamp } = assumptions;
  if (!Number.isFinite(campCapacityPerCamp) || campCapacityPerCamp <= 0) {
    throw new ScenarioInvariantError(
      'Camp capacity must be stated as a positive number of people per relief camp.',
    );
  }

  const assessments = outcome.districts.flatMap((district) => [
    campCapacityFailure(district, campCapacityPerCamp),
    rationFailure(district, outcome.horizonDays),
  ]);

  return {
    failurePoints: assessments.filter(isFailurePoint).sort(byUrgency),
    notAssessable: assessments.filter(isNotAssessable),
  };
};

/** FR-4.4's headline: the single district that breaks first. */
export const firstFailurePoint = (analysis: FailureAnalysis): FailurePoint | undefined =>
  analysis.failurePoints[0];

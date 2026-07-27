/**
 * `ProjectedOutcome` → the Scenario Planner's view models.
 *
 * Every row pairs the baseline with the projection and carries the engine's own
 * plain-language derivation through to the UI (FR-4.6). Nothing is summarised
 * away: if the engine could not project a figure it says why, and that sentence
 * is what the officer reads — not a dash with no explanation behind it.
 */

import { valueOf } from '../domain/shared/quantity';
import type { Quantity } from '../domain/shared/quantity';
import type { ProjectedFigure } from '../domain/scenario/derivation';
import type { ProjectedOutcome } from '../domain/scenario/projection-engine';
import { firstFailurePoint, type FailureAnalysis } from '../domain/scenario/failure-point';
import {
  NOT_REPORTED,
  formatNumber,
  type FirstFailurePointViewModel,
  type ScenarioComparisonRow,
} from '../adapters/ui/view-models';

const show = (
  quantity: Quantity<string> | undefined,
  precision: number,
  suffix?: string,
): string => {
  const value = quantity === undefined ? undefined : valueOf(quantity);
  if (value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  const body = formatNumber(value, precision);
  return suffix === undefined ? body : `${body} ${suffix}`;
};

/**
 * Which way is worse for this metric.
 *
 * Stated per row rather than inferred, because "up" is bad for camp load and
 * good for days of rice remaining, and a single sign convention would get one
 * of them backwards.
 */
type Worse = 'higher' | 'lower';

const directionOf = (
  baseline: Quantity<string> | undefined,
  projected: Quantity<string> | undefined,
  worse: Worse,
): ScenarioComparisonRow['direction'] => {
  const from = baseline === undefined ? undefined : valueOf(baseline);
  const to = projected === undefined ? undefined : valueOf(projected);
  if (from === undefined || to === undefined || from === to) return 'unchanged';
  const rose = to > from;
  return rose === (worse === 'higher') ? 'worse' : 'better';
};

type RowSpec = {
  readonly key: string;
  readonly metric: string;
  readonly baseline: Quantity<string>;
  readonly projected: ProjectedFigure<Quantity<string>>;
  readonly precision: number;
  readonly suffix?: string;
  readonly worse: Worse;
};

const rowFrom = (spec: RowSpec): ScenarioComparisonRow => ({
  key: spec.key,
  metric: spec.metric,
  baseline: show(spec.baseline, spec.precision, spec.suffix),
  projected: show(spec.projected.value, spec.precision, spec.suffix),
  derivation: spec.projected.derivation.explanation,
  direction: directionOf(spec.baseline, spec.projected.value, spec.worse),
});

export const scenarioComparisonsFrom = (
  outcome: ProjectedOutcome,
): readonly ScenarioComparisonRow[] => {
  const { baseline, ...projection } = outcome.statewide;

  return [
    rowFrom({
      key: 'affected',
      metric: 'Population Affected',
      baseline: baseline.affected,
      projected: projection.projectedAffected,
      precision: 0,
      worse: 'higher',
    }),
    rowFrom({
      key: 'inmates',
      metric: 'Inmates in Relief Camps',
      baseline: baseline.inmates,
      projected: projection.projectedInmates,
      precision: 0,
      worse: 'higher',
    }),
    rowFrom({
      key: 'camp-load',
      metric: 'Camp Load',
      baseline: baseline.campLoad,
      projected: projection.projectedCampLoad,
      precision: 0,
      suffix: 'per Relief Camp',
      worse: 'higher',
    }),
    rowFrom({
      key: 'ration-days',
      metric: 'Ration Coverage Days',
      baseline: baseline.rationCoverage,
      projected: projection.rationCoverage,
      precision: 1,
      suffix: 'days',
      worse: 'lower',
    }),
    {
      key: 'camps',
      metric: 'Relief Camps',
      baseline: show(baseline.reliefCamps, 0),
      projected: show(projection.reliefCampsAvailable, 0),
      derivation:
        directionOf(baseline.reliefCamps, projection.reliefCampsAvailable, 'lower') === 'unchanged'
          ? 'No additional Relief Camps are opened in this scenario.'
          : `Additional Relief Camps opened under this scenario, spread evenly across the ` +
            `Districts in the ${outcome.baselineReportDate} bulletin. Where ASDMA would site ` +
            `them is not something this console can know.`,
      direction: directionOf(baseline.reliefCamps, projection.reliefCampsAvailable, 'lower'),
    },
  ];
};

/**
 * The single District that breaks first (FR-4.4).
 *
 * `null` — not an empty object — when nothing breaks inside the horizon, so the
 * UI can say "no District exhausts its capacity" rather than rendering a blank.
 */
export const firstFailureFrom = (
  analysis: FailureAnalysis,
): FirstFailurePointViewModel | null => {
  const failure = firstFailurePoint(analysis);
  if (failure === undefined) return null;
  return {
    district: failure.district,
    description: failure.derivation.explanation,
    dayIndex: failure.dayOfFailure,
  };
};

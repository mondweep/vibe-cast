/**
 * Temporal Comparison — day-over-day deltas (FR-5.2).
 *
 * "What changed since yesterday?" is question 7 of PRD §2.1, and the difference
 * between a receding flood and a building one.
 *
 * Two rules do most of the work here:
 *
 *  - **Only adjacent dates are compared.** A pair of bulletins two days apart
 *    is not a day-over-day delta, and labelling it as one would quietly halve
 *    the apparent rate of change. Such pairs are skipped and surfaced instead
 *    by `gap-detection`.
 *  - **An unknown is never a zero.** If either side of a comparison was not
 *    reported, the direction is `unknown` and there is no magnitude. A district
 *    that stopped reporting has not stopped flooding.
 */

import { valueOf } from '../shared/quantity';
import type { Quantity } from '../shared/quantity';
import type { FloodSituationReport, ReportDate } from '../shared/flood-situation-report';
import type { BulletinTimeline } from './bulletin-timeline';

export type HeadlineMetric =
  | 'districts-affected'
  | 'revenue-circles-affected'
  | 'villages-affected'
  | 'population-affected'
  | 'crop-area-submerged'
  | 'relief-camps'
  | 'relief-distribution-centres'
  | 'camp-inmates'
  | 'non-camp-inmates';

export type Direction = 'increase' | 'decrease' | 'unchanged' | 'unknown';

export type MetricDelta = {
  readonly metric: HeadlineMetric;
  /** ASDMA's own wording, so the console and the PDF read the same. */
  readonly label: string;
  readonly unit: string;
  readonly previous: number | undefined;
  readonly current: number | undefined;
  /** Unsigned size of the change; the sign lives in `direction`. */
  readonly magnitude: number | undefined;
  /** Change as a proportion of yesterday. `undefined` where yesterday was zero. */
  readonly proportionChange: number | undefined;
  readonly direction: Direction;
};

export type DayOverDayDelta = {
  readonly from: ReportDate;
  readonly to: ReportDate;
  readonly metrics: readonly MetricDelta[];
};

type MetricSpec = {
  readonly metric: HeadlineMetric;
  readonly label: string;
  readonly read: (report: FloodSituationReport) => Quantity<string>;
};

/** The summary figures of the bulletin's first two pages, in bulletin order. */
const HEADLINE_METRICS: readonly MetricSpec[] = [
  {
    metric: 'districts-affected',
    label: 'Districts Affected',
    read: (r) => r.statewideTotals.districtsAffected,
  },
  {
    metric: 'revenue-circles-affected',
    label: 'Revenue Circles Affected',
    read: (r) => r.statewideTotals.revenueCirclesAffected,
  },
  {
    metric: 'villages-affected',
    label: 'Villages Affected',
    read: (r) => r.statewideTotals.villagesAffected,
  },
  {
    metric: 'population-affected',
    label: 'Population Affected',
    read: (r) => r.statewideTotals.populationAffected,
  },
  {
    metric: 'crop-area-submerged',
    label: 'Crop Area Submerged',
    read: (r) => r.statewideTotals.cropAreaSubmerged,
  },
  {
    metric: 'relief-camps',
    label: 'Relief Camps',
    read: (r) => r.statewideTotals.reliefCamps,
  },
  {
    metric: 'relief-distribution-centres',
    label: 'Relief Distribution Centres',
    read: (r) => r.statewideTotals.reliefDistributionCentres,
  },
  {
    metric: 'camp-inmates',
    label: 'Inmates in Relief Camps',
    read: (r) => r.statewideTotals.campInmates,
  },
  {
    metric: 'non-camp-inmates',
    label: 'Non-Camp Inmates',
    read: (r) => r.statewideTotals.nonCampInmates,
  },
];

const directionOf = (
  previous: number | undefined,
  current: number | undefined,
): Direction => {
  if (previous === undefined || current === undefined) return 'unknown';
  if (current > previous) return 'increase';
  if (current < previous) return 'decrease';
  return 'unchanged';
};

const deltaOf = (
  spec: MetricSpec,
  previousReport: FloodSituationReport,
  currentReport: FloodSituationReport,
): MetricDelta => {
  const previousQuantity = spec.read(previousReport);
  const currentQuantity = spec.read(currentReport);
  const previous = valueOf(previousQuantity);
  const current = valueOf(currentQuantity);
  const known = previous !== undefined && current !== undefined;

  return {
    metric: spec.metric,
    label: spec.label,
    unit: currentQuantity.unit,
    previous,
    current,
    magnitude: known ? Math.abs(current - previous) : undefined,
    // A rise from zero has no meaningful percentage; reporting one would be
    // arithmetic theatre.
    proportionChange: known && previous !== 0 ? (current - previous) / previous : undefined,
    direction: directionOf(previous, current),
  };
};

/** Compare two bulletins directly. Adjacency is the caller's business here. */
export const compareReports = (
  previous: FloodSituationReport,
  current: FloodSituationReport,
): readonly MetricDelta[] => HEADLINE_METRICS.map((spec) => deltaOf(spec, previous, current));

/**
 * Deltas for every genuinely consecutive pair of bulletins.
 *
 * Pairs separated by a missing day are omitted, not stretched to fit — see
 * `gap-detection`, which reports those days as an explicit gap.
 */
export const dayOverDayDeltas = (timeline: BulletinTimeline): readonly DayOverDayDelta[] =>
  timeline.successivePairs
    .filter((pair) => pair.spanDays === 1)
    .map((pair) => ({
      from: pair.previous.reportDate,
      to: pair.current.reportDate,
      metrics: compareReports(pair.previous, pair.current),
    }));

export const deltaFor = (
  deltas: readonly MetricDelta[],
  metric: HeadlineMetric,
): MetricDelta | undefined => deltas.find((d) => d.metric === metric);

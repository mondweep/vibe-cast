/**
 * `BulletinTimeline` → the Trend view's models (FR-5.1, FR-5.2, FR-5.4).
 *
 * The timeline accumulates across loads, so this is the only view whose input
 * is every bulletin the officer has dropped in rather than the latest one.
 *
 * Two rules are carried through from the Temporal Comparison context and must
 * not be softened here:
 *
 *  - A missing day is reported as a gap and never interpolated. The gap list
 *    goes to the UI intact so the line breaks visibly.
 *  - A delta is computed only between genuinely adjacent bulletin dates. Two
 *    bulletins three days apart do not make a day-over-day change.
 */

import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import type { BulletinTimeline } from '../domain/timeline/bulletin-timeline';
import { dayOverDayDeltas, deltaFor, type HeadlineMetric } from '../domain/timeline/delta';
import { detectGaps } from '../domain/timeline/gap-detection';
import { MEASURES, type Measure } from '../domain/timeline/measure';
import { seriesOf } from '../domain/timeline/period-totals';
import type { ConsoleData } from '../adapters/ui/console-app';
import type {
  DeltaViewModel,
  TrendMetricKey,
  TrendObservation,
} from '../adapters/ui/view-models';

const directionOf = (
  from: number | undefined,
  to: number | undefined,
): DeltaViewModel['direction'] => {
  if (from === undefined || to === undefined) return 'unknown';
  if (to > from) return 'up';
  if (to < from) return 'down';
  return 'unchanged';
};

const deltaRow = (
  metricLabel: string,
  fromDate: string,
  toDate: string,
  from: number | undefined,
  to: number | undefined,
  derived: boolean,
): DeltaViewModel => ({
  metricLabel,
  fromDate,
  toDate,
  from,
  to,
  // Unknown on either side means there is no change to report. A district that
  // stopped reporting has not stopped flooding.
  delta: from === undefined || to === undefined ? undefined : to - from,
  direction: directionOf(from, to),
  derived,
});

/** The reported series the Trend view offers, in the order it lists them. */
const REPORTED_ROWS: readonly { readonly metric: HeadlineMetric; readonly label: string }[] = [
  { metric: 'population-affected', label: 'Population Affected' },
  { metric: 'camp-inmates', label: 'Inmates in Relief Camps' },
  { metric: 'relief-camps', label: 'Relief Camps' },
];

export type TrendViewModel = ConsoleData['trend'];

/**
 * Which Temporal Comparison measure each dropdown entry plots.
 *
 * A `Record` over every `TrendMetricKey`, so adding an option to the dropdown
 * without saying what it plots is a compile error rather than a chart that
 * silently keeps drawing Population Affected — which is exactly the defect this
 * mapping exists to close.
 *
 * `undefined` means the series is not a reported measure at all: Unsheltered
 * Affected is the Situation Assessment context's derived figure, supplied by
 * the injected reader below.
 */
const SERIES_MEASURE: Readonly<Record<TrendMetricKey, Measure | undefined>> = {
  affectedPopulation: MEASURES['population-affected'],
  campInmates: MEASURES['camp-inmates'],
  reliefCamps: MEASURES['relief-camps'],
  cropAreaSubmerged: MEASURES['crop-area-submerged'],
  floodDeaths: MEASURES['flood-deaths'],
  unshelteredAffected: undefined,
};

const observationsFor = (
  timeline: BulletinTimeline,
  metric: TrendMetricKey,
  unshelteredOf: (report: FloodSituationReport) => number | undefined,
): readonly TrendObservation[] => {
  const measure = SERIES_MEASURE[metric];
  if (measure === undefined) {
    return timeline.reports.map((report) => ({
      date: String(report.reportDate),
      value: unshelteredOf(report),
    }));
  }
  return seriesOf(timeline, measure).map((point) => ({
    date: String(point.date),
    // Stays `undefined` where the bulletin reported nothing, so the chart
    // draws a hole rather than a drop to zero (ADR-0005).
    value: point.value,
  }));
};

/**
 * @param unshelteredOf the Situation Assessment context's Unsheltered Affected
 *        for one bulletin — injected rather than recomputed here, so the trend
 *        line and the Situation Summary can never disagree about the same day.
 * @param metric which series to plot. Chosen by the officer in the Trend view
 *        and echoed up to the composition root, which is the only layer that
 *        can read the timeline.
 */
export const trendFrom = (
  timeline: BulletinTimeline,
  unshelteredOf: (report: FloodSituationReport) => number | undefined,
  metric: TrendMetricKey = 'affectedPopulation',
): TrendViewModel => {
  const byDate = new Map<string, FloodSituationReport>(
    timeline.reports.map((report) => [String(report.reportDate), report]),
  );

  const observations = observationsFor(timeline, metric, unshelteredOf);

  const deltas: DeltaViewModel[] = [];
  for (const day of dayOverDayDeltas(timeline)) {
    const from = String(day.from);
    const to = String(day.to);

    for (const row of REPORTED_ROWS) {
      const metric = deltaFor(day.metrics, row.metric);
      if (metric === undefined) continue;
      deltas.push(deltaRow(row.label, from, to, metric.previous, metric.current, false));
    }

    const previousReport = byDate.get(from);
    const currentReport = byDate.get(to);
    if (previousReport !== undefined && currentReport !== undefined) {
      deltas.push(
        deltaRow(
          'Unsheltered Affected',
          from,
          to,
          unshelteredOf(previousReport),
          unshelteredOf(currentReport),
          true,
        ),
      );
    }
  }

  return {
    metricKey: metric,
    observations,
    gaps: detectGaps(timeline).map((gap) => ({
      afterDate: String(gap.after),
      beforeDate: String(gap.before),
      missingDates: gap.missingDates.map(String),
    })),
    deltas,
    bulletinCount: timeline.reports.length,
  };
};

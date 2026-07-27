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

import { valueOf } from '../domain/shared/quantity';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import type { BulletinTimeline } from '../domain/timeline/bulletin-timeline';
import { dayOverDayDeltas, deltaFor, type HeadlineMetric } from '../domain/timeline/delta';
import { detectGaps } from '../domain/timeline/gap-detection';
import type { ConsoleData } from '../adapters/ui/console-app';
import type { DeltaViewModel, TrendObservation } from '../adapters/ui/view-models';

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
 * @param unshelteredOf the Situation Assessment context's Unsheltered Affected
 *        for one bulletin — injected rather than recomputed here, so the trend
 *        line and the Situation Summary can never disagree about the same day.
 */
export const trendFrom = (
  timeline: BulletinTimeline,
  unshelteredOf: (report: FloodSituationReport) => number | undefined,
): TrendViewModel => {
  const byDate = new Map<string, FloodSituationReport>(
    timeline.reports.map((report) => [String(report.reportDate), report]),
  );

  const observations: readonly TrendObservation[] = timeline.reports.map((report) => ({
    date: String(report.reportDate),
    value: valueOf(report.statewideTotals.populationAffected),
  }));

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

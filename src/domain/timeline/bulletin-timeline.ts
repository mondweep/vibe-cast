/**
 * Temporal Comparison — the `BulletinTimeline` aggregate (PRD §5.6).
 *
 * An ordered set of `FloodSituationReport`s, deduplicated by `BulletinId`.
 * Because that id is a content hash of the PDF, dropping the same file in twice
 * is idempotent — which matters, because an officer under pressure will do
 * exactly that.
 *
 * Invariants:
 *   1. Reports are ordered by `reportDate`, not by load order.
 *   2. One report per calendar day. A re-issued bulletin for a day already held
 *      supersedes the one it corrects, so "day-over-day" always has exactly one
 *      "day" on each side.
 *   3. A single-report timeline is valid and yields no deltas. That is the
 *      first-run state, not an error.
 */

import type { FloodSituationReport, ReportDate } from '../shared/flood-situation-report';
import { compareReportDates, daysBetween, isValidReportDate } from './report-date';

export class TimelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimelineError';
  }
}

/**
 * Two reports that sit next to each other in the timeline.
 *
 * `spanDays` is 1 for genuinely consecutive bulletins and larger where days are
 * missing. Downstream code uses it to refuse to compare across a gap.
 */
export type ReportPair = {
  readonly previous: FloodSituationReport;
  readonly current: FloodSituationReport;
  readonly spanDays: number;
};

export type BulletinTimeline = {
  /** Ordered by `reportDate`, earliest first. */
  readonly reports: readonly FloodSituationReport[];
  readonly earliest: FloodSituationReport | undefined;
  readonly latest: FloodSituationReport | undefined;
  /** Every neighbouring pair, whatever the span between them. */
  readonly successivePairs: readonly ReportPair[];
  readonly add: (report: FloodSituationReport) => BulletinTimeline;
};

const validate = (report: FloodSituationReport): void => {
  if (report === undefined || report === null) {
    throw new TimelineError('A timeline holds bulletins; there is nothing to add.');
  }
  if (typeof report.bulletinId !== 'string' || report.bulletinId.trim().length === 0) {
    throw new TimelineError(
      'This report has no bulletin id. Deduplication depends on the content hash of the PDF.',
    );
  }
  if (typeof report.reportDate !== 'string' || !isValidReportDate(report.reportDate)) {
    throw new TimelineError(
      `"${String(report.reportDate)}" is not a usable report date (YYYY-MM-DD). ` +
        'There is no undated bulletin.',
    );
  }
};

const pairsOf = (reports: readonly FloodSituationReport[]): readonly ReportPair[] =>
  reports.slice(1).map((current, index) => {
    const previous = reports[index] as FloodSituationReport;
    return {
      previous,
      current,
      spanDays: daysBetween(previous.reportDate, current.reportDate),
    };
  });

const build = (ordered: readonly FloodSituationReport[]): BulletinTimeline => ({
  reports: ordered,
  earliest: ordered[0],
  latest: ordered[ordered.length - 1],
  successivePairs: pairsOf(ordered),
  add: (report) => {
    validate(report);
    // Same file, same id: nothing changes. Same day, different file: the newer
    // arrival is treated as ASDMA's correction and supersedes.
    if (ordered.some((held) => held.bulletinId === report.bulletinId)) return build(ordered);
    const withoutThatDay = ordered.filter((held) => held.reportDate !== report.reportDate);
    return build(
      [...withoutThatDay, report].sort((a, b) => compareReportDates(a.reportDate, b.reportDate)),
    );
  },
});

export const emptyTimeline = (): BulletinTimeline => build([]);

export const bulletinTimeline = (
  reports: readonly FloodSituationReport[],
): BulletinTimeline => reports.reduce<BulletinTimeline>((t, r) => t.add(r), emptyTimeline());

/** Every calendar day for which the timeline holds a bulletin. */
export const datesCovered = (timeline: BulletinTimeline): readonly ReportDate[] =>
  timeline.reports.map((r) => r.reportDate);

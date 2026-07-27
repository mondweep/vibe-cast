/**
 * Temporal Comparison — gap detection (FR-5.4, PRD §5.6 invariant 2).
 *
 * A day for which no bulletin was loaded is reported as a gap and nothing else.
 * It is never filled by interpolating between the days either side of it.
 *
 * The temptation is real — a smooth trend line looks more professional than one
 * with a hole in it — and it must be refused. An interpolated figure for a day
 * ASDMA did not report is a number this product invented about a flood. If a
 * District Commissioner moves boats on the strength of it, the console has lied
 * to them. A visible hole is the honest rendering, and it also tells the user
 * something true: go and find the missing PDF.
 */

import type { ReportDate } from '../shared/flood-situation-report';
import type { BulletinTimeline } from './bulletin-timeline';
import { datesInBetween } from './report-date';

export type TimelineGap = {
  /** The last bulletin before the gap. */
  readonly after: ReportDate;
  /** The first bulletin after it. */
  readonly before: ReportDate;
  readonly missingDates: readonly ReportDate[];
  readonly missingDays: number;
  /** Plain language for the user, in the same register as a `Derivation`. */
  readonly explanation: string;
};

const listDates = (dates: readonly ReportDate[]): string =>
  dates.length === 1
    ? (dates[0] as string)
    : `${dates.slice(0, -1).join(', ')} and ${dates[dates.length - 1] as string}`;

export const detectGaps = (timeline: BulletinTimeline): readonly TimelineGap[] =>
  timeline.successivePairs
    .filter((pair) => pair.spanDays > 1)
    .map((pair) => {
      const after = pair.previous.reportDate;
      const before = pair.current.reportDate;
      const gapDates = datesInBetween(after, before);
      return {
        after,
        before,
        missingDates: gapDates,
        missingDays: gapDates.length,
        explanation:
          `No bulletin was loaded for ${listDates(gapDates)}. The gap between ${after} and ` +
          `${before} is shown as a gap; flood figures are never estimated for a day ASDMA ` +
          `did not report.`,
      };
    });

export const hasGaps = (timeline: BulletinTimeline): boolean => detectGaps(timeline).length > 0;

/** Every calendar day inside the timeline's span for which no bulletin is held. */
export const missingDates = (timeline: BulletinTimeline): readonly ReportDate[] =>
  detectGaps(timeline).flatMap((gap) => gap.missingDates);

export const coversDate = (timeline: BulletinTimeline, date: string): boolean =>
  timeline.reports.some((report) => report.reportDate === date);

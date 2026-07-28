/**
 * Temporal Comparison — what the loaded bulletins add up to (FR-5.1, FR-5.4).
 *
 * "How many have died in this flood?" and "how bad did it get?" are the two
 * questions a daily bulletin cannot answer on its own, and the two an officer
 * asks first. This module answers them from the timeline — and refuses, by
 * construction, to answer the third question people try to ask, which is "how
 * many people have been affected in total?"
 *
 * There is no such number. Population Affected is a *stock* (see `measure.ts`):
 * the same person appears in six consecutive bulletins because they are still
 * affected, not because six people are. `cumulativeOf` takes a `FlowMeasure`
 * and nothing else, so that question cannot be asked of it in TypeScript at
 * all; `peakOf` takes any measure, because "the worst it got, and when" is
 * meaningful for both kinds.
 *
 * Every figure here travels with the coverage that produced it. A total over a
 * period with two missing days is *not* a total for that period, and it says
 * so — in the same object, so the caveat cannot be dropped on the way to the
 * screen. A bare "41 deaths" is a claim this data does not support; "41 across
 * 6 bulletins, 20–27 July, 2 days missing" is one it does.
 *
 * Pure. No I/O, no clock.
 */

import type { ReportDate } from '../shared/flood-situation-report';
import type { BulletinTimeline } from './bulletin-timeline';
import { detectGaps } from './gap-detection';
import type { FlowMeasure, Measure, MeasureReading } from './measure';
import { daysBetween } from './report-date';

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

/** What the loaded bulletins actually cover, and what they do not. */
export type PeriodCoverage = {
  readonly from: ReportDate | undefined;
  readonly to: ReportDate | undefined;
  readonly bulletinCount: number;
  /** Calendar days between the first and last bulletin, inclusive. */
  readonly spanDays: number;
  readonly missingDates: readonly ReportDate[];
  readonly missingDays: number;
  readonly hasGaps: boolean;
  /** The period in one clause: "6 bulletins, 2026-07-20 to 2026-07-27, 2 days missing". */
  readonly description: string;
};

const listDates = (dates: readonly ReportDate[]): string => dates.join(', ');

const describe = (
  bulletinCount: number,
  from: ReportDate | undefined,
  to: ReportDate | undefined,
  missing: readonly ReportDate[],
): string => {
  if (bulletinCount === 0 || from === undefined || to === undefined) {
    return 'no bulletins loaded';
  }
  const bulletins = `${bulletinCount} bulletin${bulletinCount === 1 ? '' : 's'}`;
  const range = from === to ? from : `${from} to ${to}`;
  if (bulletinCount === 1) return `${bulletins}, ${range}`;
  const gap =
    missing.length === 0
      ? 'no days missing'
      : `${missing.length} day${missing.length === 1 ? '' : 's'} missing (${listDates(missing)})`;
  return `${bulletins}, ${range}, ${gap}`;
};

export const periodCoverage = (timeline: BulletinTimeline): PeriodCoverage => {
  const from = timeline.earliest?.reportDate;
  const to = timeline.latest?.reportDate;
  const missingDates = detectGaps(timeline).flatMap((gap) => gap.missingDates);

  return {
    from,
    to,
    bulletinCount: timeline.reports.length,
    spanDays: from === undefined || to === undefined ? 0 : daysBetween(from, to) + 1,
    missingDates,
    missingDays: missingDates.length,
    hasGaps: missingDates.length > 0,
    description: describe(timeline.reports.length, from, to, missingDates),
  };
};

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export type MeasureObservation = {
  readonly date: ReportDate;
  /** `undefined`, never 0, on a bulletin that did not report the measure. */
  readonly value: number | undefined;
  readonly reading: MeasureReading;
};

/**
 * One point per loaded bulletin, in date order.
 *
 * Missing days are *not* in this series and are never filled in. They are
 * reported separately by `gap-detection`, so the caller renders a hole rather
 * than a line (PRD §5.6 invariant 2).
 */
export const seriesOf = (
  timeline: BulletinTimeline,
  measure: Measure,
): readonly MeasureObservation[] =>
  timeline.reports.map((report) => {
    const reading = measure.read(report);
    return { date: report.reportDate, value: reading.value, reading };
  });

// ---------------------------------------------------------------------------
// Shared shape
// ---------------------------------------------------------------------------

/**
 * How much of the period a figure actually saw.
 *
 * `partial` is the common case and the important one: a total computed over a
 * period with missing days, or over bulletins with unreported District rows, is
 * a floor, not a count.
 */
export type FigureCompleteness = 'complete' | 'partial' | 'unavailable';

type Shortfall = {
  readonly datesNotReporting: readonly ReportDate[];
  readonly districtRowsNotReporting: number;
};

const shortfallOf = (observations: readonly MeasureObservation[]): Shortfall => ({
  datesNotReporting: observations.filter((o) => o.value === undefined).map((o) => o.date),
  districtRowsNotReporting: observations.reduce(
    (acc, o) => acc + o.reading.districtRowsNotReporting,
    0,
  ),
});

const completenessOf = (
  counted: number,
  shortfall: Shortfall,
  coverage: PeriodCoverage,
): FigureCompleteness => {
  if (counted === 0) return 'unavailable';
  if (
    coverage.hasGaps ||
    shortfall.datesNotReporting.length > 0 ||
    shortfall.districtRowsNotReporting > 0
  ) {
    return 'partial';
  }
  return 'complete';
};

const rowsClause = (rows: number): string =>
  `${rows} District row${rows === 1 ? '' : 's'} carried no figure for it, so the true ` +
  'figure is higher';

const notReportingClause = (dates: readonly ReportDate[]): string =>
  `${dates.length} loaded bulletin${dates.length === 1 ? '' : 's'} (${listDates(dates)}) ` +
  'did not report it';

const sentence = (clauses: readonly string[]): string =>
  clauses.filter((clause) => clause.length > 0).join(' ');

// ---------------------------------------------------------------------------
// Cumulative — flows only
// ---------------------------------------------------------------------------

export type CumulativeFigure = {
  readonly measure: FlowMeasure;
  /** `undefined`, never 0, when no loaded bulletin reported the measure. */
  readonly total: number | undefined;
  /** How many bulletins contributed a figure. */
  readonly bulletinsCounted: number;
  readonly datesNotReporting: readonly ReportDate[];
  readonly districtRowsNotReporting: number;
  readonly completeness: FigureCompleteness;
  readonly coverage: PeriodCoverage;
  readonly formula: string;
  /** The sum with this timeline's numbers in it: "5 + 21 + 9 + 4 + 2 + 0 = 41". */
  readonly substitution: string;
  /** What an officer must know before quoting the number. Never empty. */
  readonly caveat: string;
};

/**
 * Total a flow across the loaded bulletins.
 *
 * Only a `FlowMeasure` type-checks here. That is the guarantee: to total
 * Population Affected somebody would have to reclassify it as a flow in
 * `measure.ts`, in front of the rationale explaining why it is not.
 */
export const cumulativeOf = (
  timeline: BulletinTimeline,
  measure: FlowMeasure,
): CumulativeFigure => {
  const coverage = periodCoverage(timeline);
  const observations = seriesOf(timeline, measure);
  const reported = observations.filter((o) => o.value !== undefined);
  const shortfall = shortfallOf(observations);
  const total =
    reported.length === 0 ? undefined : reported.reduce((acc, o) => acc + (o.value as number), 0);
  const completeness = completenessOf(reported.length, shortfall, coverage);

  const caveat = sentence([
    `Derived here, not reported by ASDMA: cumulative over ${coverage.description}.`,
    coverage.hasGaps
      ? `No bulletin covers the missing day${coverage.missingDays === 1 ? '' : 's'}, so ` +
        'anything reported on them is not in this total. Nothing is estimated for them.'
      : '',
    shortfall.datesNotReporting.length > 0
      ? `${notReportingClause(shortfall.datesNotReporting)}.`
      : '',
    shortfall.districtRowsNotReporting > 0 ? `${rowsClause(shortfall.districtRowsNotReporting)}.` : '',
  ]);

  return {
    measure,
    total,
    bulletinsCounted: reported.length,
    datesNotReporting: shortfall.datesNotReporting,
    districtRowsNotReporting: shortfall.districtRowsNotReporting,
    completeness,
    coverage,
    formula: `Sum of ${measure.label} over every loaded bulletin`,
    substitution:
      reported.length === 0
        ? '—'
        : `${reported.map((o) => String(o.value)).join(' + ')} = ${String(total)}`,
    caveat,
  };
};

// ---------------------------------------------------------------------------
// Peak and latest — both kinds
// ---------------------------------------------------------------------------

export type PeakFigure = {
  readonly measure: Measure;
  /** The highest value any loaded bulletin reported. `undefined` if none did. */
  readonly value: number | undefined;
  /** The earliest date that reached it — the day the level was first that bad. */
  readonly onDate: ReportDate | undefined;
  readonly latest: number | undefined;
  readonly latestDate: ReportDate | undefined;
  readonly bulletinsCounted: number;
  readonly datesNotReporting: readonly ReportDate[];
  readonly districtRowsNotReporting: number;
  readonly completeness: FigureCompleteness;
  readonly coverage: PeriodCoverage;
  readonly caveat: string;
};

/**
 * The highest value reported, and the day it was reported.
 *
 * Ties go to the earliest date: the question is when the situation first
 * reached that level, not when it last did.
 *
 * Accepts any measure. A peak is meaningful for a flow too — the worst single
 * day for flood deaths is a real and useful figure — and unlike a total it
 * double-counts nothing.
 */
export const peakOf = (timeline: BulletinTimeline, measure: Measure): PeakFigure => {
  const coverage = periodCoverage(timeline);
  const observations = seriesOf(timeline, measure);
  const reported = observations.filter((o) => o.value !== undefined);
  const shortfall = shortfallOf(observations);

  const peak = reported.reduce<MeasureObservation | undefined>(
    (best, o) => (best === undefined || (o.value as number) > (best.value as number) ? o : best),
    undefined,
  );
  const latest = reported[reported.length - 1];
  const completeness = completenessOf(reported.length, shortfall, coverage);

  const caveat = sentence([
    `Derived here, not reported by ASDMA: highest and latest across ${coverage.description}.`,
    measure.kind === 'stock'
      ? 'This is a point-in-time figure, so it is never totalled across bulletins — the ' +
        'same people, camps or hectares are counted again in every bulletin.'
      : 'This is the worst single bulletin, not a total.',
    coverage.hasGaps
      ? `The peak may have fallen on one of the missing day${
          coverage.missingDays === 1 ? '' : 's'
        }, for which no bulletin is loaded.`
      : '',
    shortfall.datesNotReporting.length > 0
      ? `${notReportingClause(shortfall.datesNotReporting)}.`
      : '',
    shortfall.districtRowsNotReporting > 0 ? `${rowsClause(shortfall.districtRowsNotReporting)}.` : '',
  ]);

  return {
    measure,
    value: peak?.value,
    onDate: peak?.date,
    latest: latest?.value,
    latestDate: latest?.date,
    bulletinsCounted: reported.length,
    datesNotReporting: shortfall.datesNotReporting,
    districtRowsNotReporting: shortfall.districtRowsNotReporting,
    completeness,
    coverage,
    caveat,
  };
};

/**
 * Temporal Comparison — integrating a stock over the loaded bulletins (ADR-0012).
 *
 * ---------------------------------------------------------------------------
 * Why this is not the thing `cumulativeOf` refuses to do
 * ---------------------------------------------------------------------------
 *
 * `period-totals.ts` will not total a stock, and it is right not to:
 * `cumulativeOf(timeline, POPULATION_AFFECTED)` is a compile error because the
 * same person appears in sixteen consecutive bulletins for being still
 * affected, not for being sixteen people. Summing a stock produces a number
 * with no referent.
 *
 * This module performs the identical arithmetic and is not that mistake,
 * because the answer is in a different unit. Adding daily camp occupancy does
 * not give people; it gives **person-days**, which is a real quantity, is the
 * unit relief is costed in, and cannot be obtained from a single bulletin at
 * any level of effort.
 *
 *     Σ (people)  read as people      → meaningless, and refused
 *     Σ (people)  read as person-days → the exposure integral, and the point
 *
 * Since the two differ only in the unit of the result, the unit is the thing
 * carrying the distinction, and `PersonDays` is therefore a separate type
 * rather than a `Count` with a label. A caller cannot hand 302,253 person-days
 * to something expecting a headcount.
 *
 * The prohibition is enforced in both directions. This function takes a
 * `StockMeasure` and nothing else: integrating a flow is as meaningless the
 * other way round — Σ(deaths per day) over time is not "death-days" — so
 * `integrateOverPeriod(timeline, FLOOD_DEATHS)` does not compile either. Read
 * together with `cumulativeOf`, the pair says a measure gets exactly one legal
 * treatment across time, decided by its kind.
 *
 * ---------------------------------------------------------------------------
 * Gaps are holes, not zeroes
 * ---------------------------------------------------------------------------
 *
 * A missing bulletin is a day nobody reported, not a day nobody was in a camp.
 * A camp holding 100 on the 20th and 100 on the 23rd almost certainly held
 * people on the 21st and 22nd, and this module will not add 200 person-days
 * for them. The figure is a **floor**, the missing dates travel with it, and
 * interpolation is refused exactly as the Trend view refuses to draw across a
 * gap.
 *
 * Pure. No I/O, no clock.
 */

import type { ReportDate } from '../shared/flood-situation-report';
import type { PersonDays } from '../shared/quantity';
import { personDays, unknownPersonDays } from '../shared/quantity';
import type { BulletinTimeline } from './bulletin-timeline';
import type { StockMeasure } from './measure';
import { periodCoverage, seriesOf, type FigureCompleteness, type PeriodCoverage } from './period-totals';

export type StockIntegral = {
  /** The stock that was integrated. Its own unit is NOT the result's unit. */
  readonly measure: StockMeasure;
  /** Person-days. `unknown`, never zero, when no bulletin reported the measure. */
  readonly total: PersonDays;
  /** How many bulletins contributed a level to the integral. */
  readonly daysCounted: number;
  readonly datesNotReporting: readonly ReportDate[];
  readonly districtRowsNotReporting: number;
  readonly completeness: FigureCompleteness;
  readonly coverage: PeriodCoverage;
  readonly formula: string;
  /** The sum with this timeline's numbers in it: "20 + 21 + 22 = 63". */
  readonly substitution: string;
  /** What must be known before quoting the number. Never empty. */
  readonly caveat: string;
};

const sentence = (clauses: readonly string[]): string =>
  clauses.filter((clause) => clause.length > 0).join(' ');

/**
 * Integrate a stock across the loaded bulletins, in person-days.
 *
 * Only a `StockMeasure` type-checks here, and only `PersonDays` comes out.
 */
export const integrateOverPeriod = (
  timeline: BulletinTimeline,
  measure: StockMeasure,
): StockIntegral => {
  const coverage = periodCoverage(timeline);
  const observations = seriesOf(timeline, measure);
  const reported = observations.filter((observation) => observation.value !== undefined);

  const datesNotReporting = observations
    .filter((observation) => observation.value === undefined)
    .map((observation) => observation.date);
  const districtRowsNotReporting = observations.reduce(
    (acc, observation) => acc + observation.reading.districtRowsNotReporting,
    0,
  );

  const total: PersonDays =
    reported.length === 0
      ? unknownPersonDays()
      : personDays(reported.reduce((acc, observation) => acc + (observation.value as number), 0));

  // A day nobody reported and a day that is missing entirely are different
  // holes, and either one makes this a floor rather than a total.
  const completeness: FigureCompleteness =
    reported.length === 0
      ? 'unavailable'
      : coverage.hasGaps || datesNotReporting.length > 0 || districtRowsNotReporting > 0
        ? 'partial'
        : 'complete';

  const caveat = sentence([
    `Derived here, not reported by ASDMA: ${measure.label} integrated over ` +
      `${coverage.description}.`,
    'This is a count of person-days — one person for one day — and not a count of people.',
    coverage.hasGaps
      ? `No bulletin covers the missing day${coverage.missingDays === 1 ? '' : 's'}, so no ` +
        'person-days are counted for them. Nothing is estimated for them, which makes this a ' +
        'floor rather than a total.'
      : '',
    datesNotReporting.length > 0
      ? `${datesNotReporting.length} loaded bulletin${datesNotReporting.length === 1 ? '' : 's'} ` +
        `(${datesNotReporting.join(', ')}) did not report it.`
      : '',
    districtRowsNotReporting > 0
      ? `${districtRowsNotReporting} District row${districtRowsNotReporting === 1 ? '' : 's'} ` +
        'carried no figure for it, so the true figure is higher.'
      : '',
  ]);

  return {
    measure,
    total,
    daysCounted: reported.length,
    datesNotReporting,
    districtRowsNotReporting,
    completeness,
    coverage,
    formula: `Sum of ${measure.label} across every loaded bulletin, in person-days`,
    substitution:
      reported.length === 0
        ? '—'
        : `${reported.map((observation) => String(observation.value)).join(' + ')} = ${String(
            total.kind === 'known' ? total.value : '',
          )}`,
    caveat,
  };
};

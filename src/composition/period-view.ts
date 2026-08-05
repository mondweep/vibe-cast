/**
 * `BulletinTimeline` → the Cumulative & Peak view's model (FR-5.1, PRD §5.6).
 *
 * The user-facing point of this view is one question a daily bulletin cannot
 * answer: *what has this flood cost so far?* The engineering point is that the
 * obvious way to answer it is wrong. Adding Population Affected across six
 * bulletins yields 3,205,823 — a number that would lead a bulletin, and that
 * counts the same person up to six times.
 *
 * So nothing here decides what may be summed. The Temporal Comparison context
 * does, in `domain/timeline/measure`, and it decides it in the type system:
 * `cumulativeOf` accepts a `FlowMeasure`, `CUMULATIVE_MEASURES` is a list of
 * them, and a stock cannot reach either. This module walks those two lists and
 * renames what comes back.
 *
 * Every row carries its caveat from the domain unchanged. A total over a period
 * with two missing days is not a total for that period, and the sentence saying
 * so is part of the figure rather than a footnote the layout can lose.
 */

import type { BulletinTimeline } from '../domain/timeline/bulletin-timeline';
import {
  CAMP_INMATES,
  CUMULATIVE_MEASURES,
  EXPOSURE_MEASURES,
  NON_CAMP_INMATES,
  POPULATION_AFFECTED,
  RICE_DISTRIBUTED,
  PEAK_ONLY_MEASURES,
  type FlowMeasure,
  type StockMeasure,
} from '../domain/timeline/measure';
import { integrateOverPeriod } from '../domain/timeline/stock-integral';
import { impliedRation } from '../domain/economics/relief-adequacy';
import { relativeWidth } from '../domain/economics/derivation';
import { KUCCHA_NOT_COSTED, pukkaDwellingReplacement } from '../domain/economics/replacement-cost';
import { HOUSES_FULLY_SEVERELY_DAMAGED } from '../domain/timeline/measure';
import { personDays, quintals, unknownPersonDays, unknownQuintals } from '../domain/shared/quantity';
import {
  cumulativeOf,
  peakOf,
  periodCoverage,
  type PeriodCoverage,
} from '../domain/timeline/period-totals';
import type {
  PeriodBackTestViewModel,
  PeriodDerivationInputViewModel,
  PeriodReplacementViewModel,
  PeriodCoverageViewModel,
  PeriodExposureViewModel,
  PeriodFigureViewModel,
  PeriodSummaryViewModel,
} from '../adapters/ui/view-models';

const coverageViewModel = (coverage: PeriodCoverage): PeriodCoverageViewModel => ({
  bulletinCount: coverage.bulletinCount,
  fromDate: coverage.from === undefined ? undefined : String(coverage.from),
  toDate: coverage.to === undefined ? undefined : String(coverage.to),
  missingDates: coverage.missingDates.map(String),
  description: coverage.description,
});

/**
 * A flow: totalled, and also given the worst single bulletin, because "41
 * deaths, 21 of them on 21 July" is a different operational picture from 41
 * spread evenly.
 */
const cumulativeRow = (
  timeline: BulletinTimeline,
  measure: FlowMeasure,
): PeriodFigureViewModel => {
  const total = cumulativeOf(timeline, measure);
  const peak = peakOf(timeline, measure);

  return {
    key: measure.key,
    label: measure.label,
    kind: 'flow',
    precision: measure.precision,
    rationale: measure.rationale,
    cumulative: total.total,
    cumulativeWorkings: total.substitution,
    peak: peak.value,
    peakDate: peak.onDate === undefined ? undefined : String(peak.onDate),
    latest: peak.latest,
    latestDate: peak.latestDate === undefined ? undefined : String(peak.latestDate),
    completeness: total.completeness,
    caveat: total.caveat,
  };
};

/**
 * A stock: peak and latest, and no `cumulative` field at all.
 *
 * The absence is the design. There is no total to render, no placeholder to
 * mistake for one, and no code path that could produce one — the row simply
 * does not have the property.
 */
const peakRow = (timeline: BulletinTimeline, measure: StockMeasure): PeriodFigureViewModel => {
  const peak = peakOf(timeline, measure);

  return {
    key: measure.key,
    label: measure.label,
    kind: 'stock',
    precision: measure.precision,
    rationale: measure.rationale,
    peak: peak.value,
    peakDate: peak.onDate === undefined ? undefined : String(peak.onDate),
    latest: peak.latest,
    latestDate: peak.latestDate === undefined ? undefined : String(peak.latestDate),
    completeness: peak.completeness,
    caveat: peak.caveat,
  };
};

/**
 * A stock integrated over the period, in person-days.
 *
 * Note what this row does NOT have: a `peak`. A peak person-day figure is not a
 * thing — the integral is the whole period by definition — and offering an
 * empty column for one would invite somebody to fill it.
 *
 * The unit is copied out explicitly rather than left implicit in the number,
 * because this is the boundary where a typed `PersonDays` becomes a plain
 * `number` for rendering, and the unit is all that survives to say what the
 * number is.
 */
const exposureRow = (
  timeline: BulletinTimeline,
  measure: StockMeasure,
): PeriodExposureViewModel => {
  const integral = integrateOverPeriod(timeline, measure);

  return {
    key: measure.key,
    label: measure.label,
    unit: integral.total.unit,
    personDays: integral.total.kind === 'known' ? integral.total.value : undefined,
    daysCounted: integral.daysCounted,
    workings: integral.substitution,
    completeness: integral.completeness,
    caveat: integral.caveat,
  };
};

/**
 * The back-test: distributed rice against each candidate exposure.
 *
 * This is the only place the two contexts meet, and they meet as data. The
 * economics context is handed person-days and quintals; it never reaches into
 * the timeline for them, which is what keeps the boundary in
 * `architecture.test.ts` honest.
 *
 * The three bases are a judgement about the response, not arithmetic, and they
 * are listed widest-denominator-last so the spread reads as a narrowing. All
 * three are shown because the bulletin never says who the relief reached, and
 * the spread between them is more informative than any one of them.
 */
const backTestRows = (timeline: BulletinTimeline): readonly PeriodBackTestViewModel[] => {
  const integralOf = (measure: typeof CAMP_INMATES) => integrateOverPeriod(timeline, measure).total;
  const camp = integralOf(CAMP_INMATES);
  const nonCamp = integralOf(NON_CAMP_INMATES);
  const affected = integralOf(POPULATION_AFFECTED);

  // Camp and non-camp are two disjoint populations, so their person-days add.
  // If either is unknown the sum is unknown rather than the other one alone —
  // a partial denominator would inflate the rate and look like generosity.
  const both =
    camp.kind === 'known' && nonCamp.kind === 'known'
      ? personDays(camp.value + nonCamp.value)
      : unknownPersonDays();

  const rice = cumulativeOf(timeline, RICE_DISTRIBUTED);

  return impliedRation(rice.total === undefined ? unknownQuintals() : quintals(rice.total), [
    { label: 'Camp inmates', personDays: camp },
    { label: 'Camp and non-camp inmates', personDays: both },
    { label: 'All affected', personDays: affected },
  ]);
};

/**
 * The constructed replacement cost, applied to the houses actually destroyed.
 *
 * Note what is NOT done here: the interval is not collapsed to its centre for
 * convenience, and the inputs are not summarised. Both are carried whole,
 * because a constructed figure that renders as compactly as a published one is
 * exactly the failure ADR-0014 exists to prevent.
 */
const replacementRow = (timeline: BulletinTimeline): PeriodReplacementViewModel => {
  const cost = pukkaDwellingReplacement();
  const houses = cumulativeOf(timeline, HOUSES_FULLY_SEVERELY_DAMAGED).total;

  const inputs: readonly PeriodDerivationInputViewModel[] = cost.derivation.inputs.map((input) =>
    input.kind === 'assumed'
      ? {
          kind: 'assumed',
          label: input.label,
          value: input.value,
          unit: input.unit,
          low: input.low,
          high: input.high,
          reason: input.reason,
        }
      : {
          kind: 'published',
          label: input.label,
          value: input.value,
          unit: input.unit,
          citation: `${input.citation.document} — ${input.citation.clause}`,
        },
  );

  return {
    label: cost.label,
    quantity: houses,
    quantityLabel: 'houses fully or severely damaged',
    unitLow: cost.interval.low,
    unitCentral: cost.interval.central,
    unitHigh: cost.interval.high,
    totalLow: houses === undefined ? undefined : houses * cost.interval.low,
    totalCentral: houses === undefined ? undefined : houses * cost.interval.central,
    totalHigh: houses === undefined ? undefined : houses * cost.interval.high,
    formula: cost.derivation.formula,
    inputs,
    judgementSharePercent: Math.round(relativeWidth(cost.interval) * 100),
    caveat: cost.caveat,
    notCosted: KUCCHA_NOT_COSTED,
  };
};

export const periodSummaryFrom = (timeline: BulletinTimeline): PeriodSummaryViewModel => ({
  coverage: coverageViewModel(periodCoverage(timeline)),
  cumulative: CUMULATIVE_MEASURES.map((measure) => cumulativeRow(timeline, measure)),
  peaks: PEAK_ONLY_MEASURES.map((measure) => peakRow(timeline, measure)),
  exposure: EXPOSURE_MEASURES.map((measure) => exposureRow(timeline, measure)),
  backTest: backTestRows(timeline),
  replacement: replacementRow(timeline),
});

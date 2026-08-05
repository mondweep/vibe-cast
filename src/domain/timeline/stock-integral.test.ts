/**
 * Integrating a stock over the loaded bulletins (ADR-0012).
 *
 * The arithmetic is a sum. Everything under test is the discipline around it:
 * that the unit changes, that a flow is refused as firmly as `cumulativeOf`
 * refuses a stock, and that a gap makes the answer a floor rather than a total.
 *
 * London School: the measure is injected and its `read` is a double, so these
 * assert the contract `integrateOverPeriod` has with a `StockMeasure` — how
 * many times it reads, and what it does with what it gets back — rather than
 * re-testing the real catalogue's arithmetic.
 */

import { describe, expect, it, vi } from 'vitest';
import { count } from '../shared/quantity';
import { aReport } from '../scenario/__fixtures__/report-builder';
import { bulletinTimeline, emptyTimeline } from './bulletin-timeline';
import type { FloodSituationReport } from '../shared/flood-situation-report';
import type { MeasureReading, StockMeasure } from './measure';
import { CAMP_INMATES } from './measure';
import { integrateOverPeriod } from './stock-integral';

const bulletin = (date: string, affected: number): FloodSituationReport =>
  aReport({
    id: `sha256:${date}`,
    date,
    statewide: { populationAffected: count(affected) },
  });

const reading = (value: number | undefined, notReporting = 0): MeasureReading => ({
  value,
  unit: 'count',
  source: 'asdma-state-total',
  districtRowsNotReporting: notReporting,
});

/**
 * A stock measure whose reader is a double.
 *
 * `kind: 'stock'` is what makes it acceptable to `integrateOverPeriod`; the
 * reader is what the tests control.
 */
const aStockMeasure = (read: (r: FloodSituationReport) => MeasureReading): StockMeasure => ({
  key: 'camp-inmates',
  label: 'Inmates in Relief Camps',
  kind: 'stock',
  unit: 'count',
  precision: 0,
  rationale: 'a level at the moment the bulletin was compiled',
  read,
});

describe('integrateOverPeriod', () => {
  it('reads the measure once per bulletin and sums what it is given', () => {
    const read = vi.fn(() => reading(100));
    const measure = aStockMeasure(read);
    const timeline = bulletinTimeline([
      bulletin('2026-07-20', 1),
      bulletin('2026-07-21', 2),
      bulletin('2026-07-22', 3),
    ]);

    const result = integrateOverPeriod(timeline, measure);

    expect(read).toHaveBeenCalledTimes(3);
    expect(result.total).toEqual({ kind: 'known', unit: 'person-days', value: 300 });
  });

  it('returns person-days, not the measure’s own unit', () => {
    // The whole point of ADR-0012. The reader hands back `count`; integrating
    // it over time produces a different quantity, and the unit must say so or
    // 302,253 person-days can be read as 302,253 people.
    const measure = aStockMeasure(() => reading(50));
    const timeline = bulletinTimeline([bulletin('2026-07-20', 1), bulletin('2026-07-21', 2)]);

    const result = integrateOverPeriod(timeline, measure);

    expect(result.total.unit).toBe('person-days');
    expect(result.measure.unit).toBe('count');
  });

  it('is unknown, never zero, when no bulletin reported the measure', () => {
    // ADR-0005 through to the integral: nobody reported camp inmates is not
    // the same fact as nobody was in a camp.
    const measure = aStockMeasure(() => reading(undefined));
    const timeline = bulletinTimeline([bulletin('2026-07-20', 1), bulletin('2026-07-21', 2)]);

    const result = integrateOverPeriod(timeline, measure);

    expect(result.total).toEqual({ kind: 'unknown', unit: 'person-days' });
    expect(result.daysCounted).toBe(0);
    // `unavailable`, the same word `cumulativeOf` uses. Asserted because
    // omitting it let a completeness of `'none'` — a value the type does not
    // have — pass every test in this file while failing the type check.
    expect(result.completeness).toBe('unavailable');
  });

  it('counts only the days that reported, and names the ones that did not', () => {
    const measure = aStockMeasure((report) =>
      String(report.reportDate) === '2026-07-21' ? reading(undefined) : reading(10),
    );
    const timeline = bulletinTimeline([
      bulletin('2026-07-20', 1),
      bulletin('2026-07-21', 2),
      bulletin('2026-07-22', 3),
    ]);

    const result = integrateOverPeriod(timeline, measure);

    expect(result.total).toEqual({ kind: 'known', unit: 'person-days', value: 20 });
    expect(result.daysCounted).toBe(2);
    expect(result.datesNotReporting.map(String)).toEqual(['2026-07-21']);
    expect(result.completeness).toBe('partial');
  });

  it('is a floor when a day is missing, and never interpolates across the hole', () => {
    // 21 and 22 July are absent entirely. A camp holding 100 people on the 20th
    // and 100 on the 23rd very likely held people in between, and this must not
    // quietly add 200 person-days for them.
    const measure = aStockMeasure(() => reading(100));
    const timeline = bulletinTimeline([bulletin('2026-07-20', 1), bulletin('2026-07-23', 2)]);

    const result = integrateOverPeriod(timeline, measure);

    expect(result.total).toEqual({ kind: 'known', unit: 'person-days', value: 200 });
    expect(result.completeness).toBe('partial');
    expect(result.coverage.missingDates.map(String)).toEqual(['2026-07-21', '2026-07-22']);
    expect(result.caveat).toMatch(/Nothing is estimated for them/);
  });

  it('is complete only when every day in the span reported', () => {
    const measure = aStockMeasure(() => reading(100));
    const timeline = bulletinTimeline([
      bulletin('2026-07-20', 1),
      bulletin('2026-07-21', 2),
      bulletin('2026-07-22', 3),
    ]);

    expect(integrateOverPeriod(timeline, measure).completeness).toBe('complete');
  });

  it('shows its working, so the figure can be argued with', () => {
    const measure = aStockMeasure((report) =>
      reading(Number(String(report.reportDate).slice(-2))),
    );
    const timeline = bulletinTimeline([
      bulletin('2026-07-20', 1),
      bulletin('2026-07-21', 2),
      bulletin('2026-07-22', 3),
    ]);

    const result = integrateOverPeriod(timeline, measure);

    expect(result.substitution).toBe('20 + 21 + 22 = 63');
    expect(result.formula).toMatch(/person-day/i);
  });

  it('never presents itself as an ASDMA figure', () => {
    const measure = aStockMeasure(() => reading(10));
    const timeline = bulletinTimeline([bulletin('2026-07-20', 1)]);

    expect(integrateOverPeriod(timeline, measure).caveat).toMatch(
      /Derived here, not reported by ASDMA/,
    );
  });

  it('says a person-day is not a person, in words', () => {
    // The caveat is the only thing travelling with this number if it is copied
    // into a spreadsheet, so the unit confusion has to be refused in prose too,
    // not only in the type.
    const measure = aStockMeasure(() => reading(10));
    const timeline = bulletinTimeline([bulletin('2026-07-20', 1), bulletin('2026-07-21', 2)]);

    expect(integrateOverPeriod(timeline, measure).caveat).toMatch(/not a count of people/i);
  });

  it('is unknown for an empty timeline, and reads nothing', () => {
    const read = vi.fn(() => reading(100));

    const result = integrateOverPeriod(emptyTimeline(), aStockMeasure(read));

    expect(read).not.toHaveBeenCalled();
    expect(result.total).toEqual({ kind: 'unknown', unit: 'person-days' });
  });

  it('carries the District rows that did not report, so the floor is visible', () => {
    const measure = aStockMeasure(() => reading(10, 3));
    const timeline = bulletinTimeline([bulletin('2026-07-20', 1), bulletin('2026-07-21', 2)]);

    const result = integrateOverPeriod(timeline, measure);

    expect(result.districtRowsNotReporting).toBe(6);
    expect(result.completeness).toBe('partial');
    expect(result.caveat).toMatch(/the true figure is higher/);
  });

  it('accepts a real stock measure from the catalogue', () => {
    // Guards against the doubles above being the only thing that fits: if the
    // signature drifted so that no real `StockMeasure` type-checked, every test
    // above would still pass.
    const timeline = bulletinTimeline([bulletin('2026-07-20', 1)]);

    expect(integrateOverPeriod(timeline, CAMP_INMATES).total.unit).toBe('person-days');
  });
});

/**
 * Person-day exposure in the Cumulative & Peak view model.
 *
 * The mapper decides nothing about what may be integrated — `EXPOSURE_MEASURES`
 * does, and the type system backs it. What is under test here is that the
 * person-day figure reaches the view still labelled as person-days, and that
 * the caveat travels with it rather than being dropped in the rename.
 */

import { describe, expect, it } from 'vitest';
import { count } from '../domain/shared/quantity';
import { aReport } from '../domain/scenario/__fixtures__/report-builder';
import { bulletinTimeline, emptyTimeline } from '../domain/timeline/bulletin-timeline';
import { periodSummaryFrom } from './period-view';

const bulletin = (date: string, campInmates: number) =>
  aReport({
    id: `sha256:${date}`,
    date,
    statewide: { campInmates: count(campInmates) },
  });

describe('period summary — exposure', () => {
  it('reports camp-inmate-days as person-days, not as a headcount', () => {
    const summary = periodSummaryFrom(
      bulletinTimeline([bulletin('2026-07-20', 100), bulletin('2026-07-21', 150)]),
    );

    const campDays = summary.exposure.find((figure) => figure.key === 'camp-inmates');
    expect(campDays?.personDays).toBe(250);
    expect(campDays?.unit).toBe('person-days');
  });

  it('never labels a person-day figure as people', () => {
    // The failure this exists to prevent: 250 person-days read as 250 people.
    const summary = periodSummaryFrom(
      bulletinTimeline([bulletin('2026-07-20', 100), bulletin('2026-07-21', 150)]),
    );

    for (const figure of summary.exposure) {
      expect(figure.unit).toBe('person-days');
      expect(figure.caveat).toMatch(/not a count of people/i);
    }
  });

  it('carries the working and the caveat from the domain unchanged', () => {
    const summary = periodSummaryFrom(
      bulletinTimeline([bulletin('2026-07-20', 100), bulletin('2026-07-21', 150)]),
    );

    const campDays = summary.exposure.find((figure) => figure.key === 'camp-inmates');
    expect(campDays?.workings).toBe('100 + 150 = 250');
    expect(campDays?.caveat).toMatch(/Derived here, not reported by ASDMA/);
  });

  it('marks a figure spanning a gap as partial, and names the missing days', () => {
    const summary = periodSummaryFrom(
      bulletinTimeline([bulletin('2026-07-20', 100), bulletin('2026-07-23', 100)]),
    );

    const campDays = summary.exposure.find((figure) => figure.key === 'camp-inmates');
    expect(campDays?.completeness).toBe('partial');
    expect(campDays?.caveat).toMatch(/Nothing is estimated for them/);
  });

  it('is undefined, never zero, when nothing reported', () => {
    const summary = periodSummaryFrom(emptyTimeline());

    for (const figure of summary.exposure) {
      expect(figure.personDays).toBeUndefined();
      expect(figure.completeness).toBe('unavailable');
    }
  });

  it('offers exposure only for stocks that count people', () => {
    // Hectare-days is computable and meaningless. Camp-days is a facilities
    // figure. Neither belongs in a view whose figures feed a relief budget.
    const summary = periodSummaryFrom(bulletinTimeline([bulletin('2026-07-20', 100)]));

    expect(summary.exposure.map((figure) => figure.key)).toEqual([
      'camp-inmates',
      'non-camp-inmates',
      'population-affected',
    ]);
  });
});

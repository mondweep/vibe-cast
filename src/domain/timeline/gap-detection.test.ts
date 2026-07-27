import { describe, expect, it } from 'vitest';

import { count } from '../shared/quantity';
import { bulletinTimeline, emptyTimeline } from './bulletin-timeline';
import { dayOverDayDeltas } from './delta';
import { coversDate, detectGaps, hasGaps, missingDates } from './gap-detection';
import { aReport } from '../scenario/__fixtures__/report-builder';

const on = (date: string, populationAffected = count(445_495)) =>
  aReport({ id: `sha256:${date}`, date, statewide: { populationAffected } });

describe('a missing day is a gap, never an interpolation (PRD §5.6 invariant 2)', () => {
  // The 27th and the 29th are loaded. The 28th was never published.
  const timeline = bulletinTimeline([on('2026-07-27', count(445_495)), on('2026-07-29', count(600_000))]);

  it('reports the missing day explicitly', () => {
    expect(detectGaps(timeline)).toEqual([
      {
        after: '2026-07-27',
        before: '2026-07-29',
        missingDates: ['2026-07-28'],
        missingDays: 1,
        explanation:
          'No bulletin was loaded for 2026-07-28. The gap between 2026-07-27 and 2026-07-29 is ' +
          'shown as a gap; flood figures are never estimated for a day ASDMA did not report.',
      },
    ]);
  });

  it('produces no figures for the missing day — interpolating flood data would be fabrication', () => {
    expect(coversDate(timeline, '2026-07-28')).toBe(false);
    expect(timeline.reports.some((r) => r.reportDate === '2026-07-28')).toBe(false);
    expect(dayOverDayDeltas(timeline)).toEqual([]);
    expect(
      dayOverDayDeltas(timeline).some((d) => d.from === '2026-07-28' || d.to === '2026-07-28'),
    ).toBe(false);
  });

  it('still knows about the days it does hold', () => {
    expect(coversDate(timeline, '2026-07-27')).toBe(true);
    expect(coversDate(timeline, '2026-07-29')).toBe(true);
  });

  it('answers the blunt question: is this timeline continuous?', () => {
    expect(hasGaps(timeline)).toBe(true);
    expect(
      hasGaps(bulletinTimeline([on('2026-07-27'), on('2026-07-28'), on('2026-07-29')])),
    ).toBe(false);
  });

  it('lists every missing day across the whole timeline', () => {
    const patchy = bulletinTimeline([on('2026-07-27'), on('2026-07-31'), on('2026-08-02')]);

    expect(missingDates(patchy)).toEqual([
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-08-01',
    ]);
  });

  it('reports a multi-day outage as one gap with every day named', () => {
    const patchy = bulletinTimeline([on('2026-07-27'), on('2026-07-31')]);

    expect(detectGaps(patchy)[0]).toMatchObject({
      missingDays: 3,
      missingDates: ['2026-07-28', '2026-07-29', '2026-07-30'],
    });
  });
});

describe('a continuous or trivially short timeline has nothing to report', () => {
  it('finds no gap in consecutive bulletins', () => {
    expect(detectGaps(bulletinTimeline([on('2026-07-27'), on('2026-07-28')]))).toEqual([]);
  });

  it('finds no gap in a single-bulletin timeline — that is the first-run state', () => {
    expect(detectGaps(bulletinTimeline([on('2026-07-27')]))).toEqual([]);
    expect(hasGaps(bulletinTimeline([on('2026-07-27')]))).toBe(false);
  });

  it('finds no gap in an empty timeline', () => {
    expect(detectGaps(emptyTimeline())).toEqual([]);
    expect(missingDates(emptyTimeline())).toEqual([]);
    expect(coversDate(emptyTimeline(), '2026-07-27')).toBe(false);
  });
});

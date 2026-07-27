import { describe, expect, it } from 'vitest';

import { count, hectares, unknownCount } from '../shared/quantity';
import { bulletinTimeline, emptyTimeline } from './bulletin-timeline';
import { compareReports, dayOverDayDeltas, deltaFor } from './delta';
import { aReport } from '../scenario/__fixtures__/report-builder';
import type { ReportSpec } from '../scenario/__fixtures__/report-builder';

const bulletin = (date: string, statewide: ReportSpec['statewide']) =>
  aReport({ id: `sha256:${date}`, date, statewide });

describe('day-over-day deltas (FR-5.2)', () => {
  const timeline = bulletinTimeline([
    bulletin('2026-07-27', {
      populationAffected: count(445_495),
      campInmates: count(28_695),
      reliefCamps: count(90),
      villagesAffected: count(631),
    }),
    bulletin('2026-07-28', {
      populationAffected: count(512_000),
      campInmates: count(28_695),
      reliefCamps: count(84),
      villagesAffected: count(700),
    }),
  ]);

  it('reports direction and magnitude for each headline metric', () => {
    const [today] = dayOverDayDeltas(timeline);
    const affected = deltaFor(today?.metrics ?? [], 'population-affected');

    expect(today?.from).toBe('2026-07-27');
    expect(today?.to).toBe('2026-07-28');
    expect(affected).toMatchObject({
      label: 'Population Affected',
      previous: 445_495,
      current: 512_000,
      direction: 'increase',
      magnitude: 66_505,
    });
    expect(affected?.proportionChange).toBeCloseTo(0.14928, 5);
  });

  it('calls a fall a fall', () => {
    const [today] = dayOverDayDeltas(timeline);

    expect(deltaFor(today?.metrics ?? [], 'relief-camps')).toMatchObject({
      label: 'Relief Camps',
      direction: 'decrease',
      magnitude: 6,
    });
  });

  it('reports an unchanged figure as unchanged, with a magnitude of zero', () => {
    const [today] = dayOverDayDeltas(timeline);

    expect(deltaFor(today?.metrics ?? [], 'camp-inmates')).toMatchObject({
      label: 'Inmates in Relief Camps',
      direction: 'unchanged',
      magnitude: 0,
    });
  });

  it('covers every headline metric of the bulletin summary', () => {
    const [today] = dayOverDayDeltas(timeline);

    expect(today?.metrics.map((m) => m.metric)).toEqual([
      'districts-affected',
      'revenue-circles-affected',
      'villages-affected',
      'population-affected',
      'crop-area-submerged',
      'relief-camps',
      'relief-distribution-centres',
      'camp-inmates',
      'non-camp-inmates',
    ]);
  });

  it('keeps ASDMA units on the metrics that carry one', () => {
    const [today] = dayOverDayDeltas(timeline);

    expect(deltaFor(today?.metrics ?? [], 'crop-area-submerged')?.unit).toBe('Hect');
    expect(deltaFor(today?.metrics ?? [], 'camp-inmates')?.unit).toBe('count');
  });
});

describe('a delta is never invented out of an unknown', () => {
  it('reports an unknown on either side as unknown, not as zero and not as a fall', () => {
    const deltas = compareReports(
      aReport({ date: '2026-07-27', statewide: { populationAffected: count(445_495) } }),
      aReport({ date: '2026-07-28', statewide: { populationAffected: unknownCount() } }),
    );

    expect(deltaFor(deltas, 'population-affected')).toMatchObject({
      previous: 445_495,
      current: undefined,
      direction: 'unknown',
      magnitude: undefined,
      proportionChange: undefined,
    });
  });

  it('gives no proportion where yesterday was zero, rather than an infinite rise', () => {
    const deltas = compareReports(
      aReport({ date: '2026-07-27', statewide: { villagesAffected: count(0) } }),
      aReport({ date: '2026-07-28', statewide: { villagesAffected: count(631) } }),
    );

    expect(deltaFor(deltas, 'villages-affected')).toMatchObject({
      direction: 'increase',
      magnitude: 631,
      proportionChange: undefined,
    });
  });

  it('handles a fractional ASDMA figure without pretending to precision it lacks', () => {
    const deltas = compareReports(
      aReport({ date: '2026-07-27', statewide: { cropAreaSubmerged: hectares(37_139.52) } }),
      aReport({ date: '2026-07-28', statewide: { cropAreaSubmerged: hectares(40_000.5) } }),
    );

    expect(deltaFor(deltas, 'crop-area-submerged')?.magnitude).toBeCloseTo(2_860.98, 2);
  });
});

describe('deltas are computed only between adjacent dates (PRD §5.6 invariant 2)', () => {
  it('yields nothing at all from a single bulletin — the first-run state', () => {
    const timeline = emptyTimeline().add(aReport({ id: 'sha256:one', date: '2026-07-27' }));

    expect(dayOverDayDeltas(timeline)).toEqual([]);
  });

  it('yields nothing from an empty timeline', () => {
    expect(dayOverDayDeltas(emptyTimeline())).toEqual([]);
  });

  it('refuses to compare across a missing day', () => {
    const timeline = bulletinTimeline([
      aReport({ id: 'sha256:27', date: '2026-07-27' }),
      aReport({ id: 'sha256:29', date: '2026-07-29' }),
    ]);

    expect(dayOverDayDeltas(timeline)).toEqual([]);
  });

  it('compares the pairs it can and skips the pair it cannot', () => {
    const timeline = bulletinTimeline([
      aReport({ id: 'sha256:27', date: '2026-07-27' }),
      aReport({ id: 'sha256:29', date: '2026-07-29' }),
      aReport({ id: 'sha256:30', date: '2026-07-30' }),
    ]);

    expect(dayOverDayDeltas(timeline).map((d) => [d.from, d.to])).toEqual([
      ['2026-07-29', '2026-07-30'],
    ]);
  });
});

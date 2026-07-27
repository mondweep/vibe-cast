import { describe, expect, it } from 'vitest';

import { count, hectares, unknownCount, unknownHectares } from '../../domain/shared/quantity';
import { reconcile, reconcileDrims, reconcileQuantities } from './reconciliation';

const value = (n: number) => ({ kind: 'value' as const, value: n });

describe('reconcile', () => {
  it('is silent when ASDMA’s total matches our sum', () => {
    // Animals Affected, 2026-07-27: the eight district rows sum to the printed 256334.
    expect(
      reconcile('animals-affected', 'Total', 256334, [8492, 0, 0, 8745, 21409, 0, 11961, 205727]),
    ).toBeUndefined();
  });

  it('reports both numbers when they disagree, without correcting either', () => {
    expect(reconcile('relief-camps-opened', 'Relief Camp', 90, [11, 0, 0, 7, 14, 0, 0, 57])).toEqual({
      section: 'relief-camps-opened',
      column: 'Relief Camp',
      statedTotal: 90,
      computedTotal: 89,
    });
  });

  it('absorbs DRIMS float noise rather than crying wolf', () => {
    // Crop area: the circle figures carry IEEE artefacts, so the sum lands a
    // few ulps away from the printed 37139.52.
    const rows = [17649, 0, 0, 2411.5, 3345.62, 0.9, 319, 13413.5];
    expect(reconcile('population-and-crop-area-submerged', 'Crop Area', 37139.52, rows)).toBeUndefined();
  });

  it('does not absorb a real discrepancy hiding behind the epsilon', () => {
    const failure = reconcile('population-and-crop-area-submerged', 'Crop Area', 37139.6, [
      17649, 0, 0, 2411.5, 3345.62, 0.9, 319, 13413.5,
    ]);
    expect(failure).toMatchObject({ statedTotal: 37139.6 });
    expect(failure?.computedTotal).toBeCloseTo(37139.52, 6);
  });

  it('scales its tolerance with the magnitude of the figure', () => {
    // A 1e-7 absolute drift on a 445,495 population is float noise.
    expect(reconcile('villages-affected', 'Total', 445495.0000001, [445495])).toBeUndefined();
    // The same drift on a count of 3 deaths would not be, but 1 death is caught either way.
    expect(reconcile('lives-lost-confirmed', 'Total', 1, [0, 0, 0])).toMatchObject({
      statedTotal: 1,
      computedTotal: 0,
    });
  });

  it('honours a caller-supplied epsilon', () => {
    expect(
      reconcile('relief-distributed', 'Rice', 100, [99.99], { absoluteEpsilon: 0.005 }),
    ).toEqual({
      section: 'relief-distributed',
      column: 'Rice',
      statedTotal: 100,
      computedTotal: 99.99,
    });
    expect(
      reconcile('relief-distributed', 'Rice', 100, [99.99], { absoluteEpsilon: 0.05 }),
    ).toBeUndefined();
  });

  it('treats an empty row set as a sum of zero, which a non-zero total contradicts', () => {
    expect(reconcile('animals-affected', 'Total', 5, [])).toEqual({
      section: 'animals-affected',
      column: 'Total',
      statedTotal: 5,
      computedTotal: 0,
    });
    expect(reconcile('animals-affected', 'Total', 0, [])).toBeUndefined();
  });

  it('says nothing when the stated total is not a number at all', () => {
    expect(reconcile('animals-affected', 'Total', Number.NaN, [1, 2])).toBeUndefined();
  });

  it('carries the section kind through, so the UI can point at the right table', () => {
    expect(reconcile('houses-damaged', 'Partially Total', 4765, [1])).toMatchObject({
      section: 'houses-damaged',
      column: 'Partially Total',
    });
  });
});

describe('reconcileDrims', () => {
  it('reconciles parsed cells', () => {
    expect(
      reconcileDrims('inmates-in-relief-camps', 'Total', value(28695), [
        value(1609),
        { kind: 'zero' },
        { kind: 'zero' },
        value(618),
        value(1773),
        { kind: 'zero' },
        { kind: 'zero' },
        value(24695),
      ]),
    ).toBeUndefined();
  });

  it('counts a Nil row as the zero it is', () => {
    expect(reconcileDrims('animals-affected', 'Big', value(3), [value(3), { kind: 'zero' }])).toBeUndefined();
  });

  it('abandons the check when a row is unknown, rather than accusing ASDMA of our own gap', () => {
    expect(
      reconcileDrims('lives-lost-confirmed', 'Flood Death', value(4), [
        value(1),
        { kind: 'unknown' },
      ]),
    ).toBeUndefined();
  });

  it('abandons the check when the stated total itself is unknown', () => {
    expect(reconcileDrims('animals-affected', 'Total', { kind: 'unknown' }, [value(1)])).toBeUndefined();
  });
});

describe('reconcileQuantities', () => {
  it('reconciles published-language quantities of the same unit', () => {
    expect(
      reconcileQuantities('population-and-crop-area-submerged', 'Crop Area', hectares(37139.52), [
        hectares(17649),
        hectares(2411.5),
        hectares(3345.62),
        hectares(0.9),
        hectares(319),
        hectares(13413.5),
      ]),
    ).toBeUndefined();
  });

  it('reports a genuine mismatch', () => {
    expect(reconcileQuantities('villages-affected', 'Total', count(631), [count(600)])).toEqual({
      section: 'villages-affected',
      column: 'Total',
      statedTotal: 631,
      computedTotal: 600,
    });
  });

  it('abandons the check on an unknown row', () => {
    expect(
      reconcileQuantities('villages-affected', 'Total', count(631), [count(600), unknownCount()]),
    ).toBeUndefined();
  });

  it('abandons the check on an unknown total', () => {
    expect(
      reconcileQuantities('population-and-crop-area-submerged', 'Crop Area', unknownHectares(), [
        hectares(1),
      ]),
    ).toBeUndefined();
  });
});

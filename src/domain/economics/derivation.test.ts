/**
 * Sensitivity: what each assumption is actually worth in rupees.
 *
 * The point these assert is that SPREAD and SWING can disagree, and that when
 * they do it is swing that tells a reader where to spend attention.
 */

import { describe, expect, it } from 'vitest';
import { derivation, evaluate, sensitivity } from './derivation';

const aCitation = {
  publisher: 'PWD',
  document: 'SOR',
  reference: 'undated',
  clause: 'Ch-1',
  source: 'docs/reference/x.pdf',
  retrievedOn: '2026-08-06',
};


describe('sensitivity', () => {
  const spec = derivation({
    formula: 'a × b × rate',
    inputs: [
      // Wide range, small effect.
      { kind: 'assumed', label: 'wide but weak', value: 2, unit: 'x', low: 1, high: 8, reason: 'r' },
      // Narrow range, large effect.
      { kind: 'assumed', label: 'narrow but strong', value: 100, unit: 'x', low: 90, high: 130, reason: 'r' },
      { kind: 'published', label: 'rate', value: 10, unit: '₹', citation: aCitation },
    ],
    combine: ([a = 0, b = 0, r = 0]) => a * b * r,
  });

  it('measures the rupees an assumption moves, not the width of its range', () => {
    const s = sensitivity(spec);

    // wide: (8−1) × 100 × 10 = 7,000.  narrow: 2 × (130−90) × 10 = 800.
    expect(s.find((x) => x.label === 'wide but weak')?.swing).toBe(7000);
    expect(s.find((x) => x.label === 'narrow but strong')?.swing).toBe(800);
    // …and reports both measures, so the two can be seen to disagree.
    expect(s.find((x) => x.label === 'wide but weak')?.spread).toBe(8);
    expect(s.find((x) => x.label === 'narrow but strong')?.spread).toBeCloseTo(1.44, 2);
  });

  it('scales by the caseload, so per-unit and total derivations compare', () => {
    // Without this a per-dwelling assumption looks 3,494x less important than
    // one already expressed as a statewide total.
    expect(sensitivity(spec, 1000)[0]?.swing).toBe(7_000_000);
  });

  it('holds every other assumption at its central value', () => {
    // One-at-a-time. Moving them together would report the corner of the whole
    // interval against each input and make them all look equally important.
    const s = sensitivity(spec);
    const total = s.reduce((n, x) => n + x.swing, 0);
    const whole = evaluate(spec);

    expect(total).not.toBe(whole.high - whole.low);
  });

  it('ignores published rates and fixed measured quantities', () => {
    expect(sensitivity(spec).map((s) => s.label)).toEqual(['wide but weak', 'narrow but strong']);
  });

  it('takes the absolute swing, because a formula need not be increasing', () => {
    const falling = derivation({
      formula: '100 − a',
      inputs: [{ kind: 'assumed', label: 'a', value: 5, unit: 'x', low: 1, high: 9, reason: 'r' }],
      combine: ([a = 0]) => 100 - a,
    });

    expect(sensitivity(falling)[0]?.swing).toBe(8);
  });
});

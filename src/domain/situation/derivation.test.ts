import { describe, expect, it } from 'vitest';

import { count, hectares, unknownCount } from '../shared/quantity';
import {
  derivation,
  derivedDifference,
  derivedQuotient,
  describeDerivation,
  operandOf,
} from './derivation';

describe('Derivation', () => {
  it('carries a machine-readable metric, formula and substitution', () => {
    const d = derivation('Camp Uptake Rate', 'Inmates ÷ Affected Population', '28695 ÷ 445495');

    expect(d).toEqual({
      metric: 'Camp Uptake Rate',
      formula: 'Inmates ÷ Affected Population',
      substitution: '28695 ÷ 445495',
    });
  });

  it('omits the note key entirely when no note is supplied', () => {
    expect('note' in derivation('m', 'f', 's')).toBe(false);
  });

  it('renders a single hover string including the note', () => {
    const d = derivation('Camp Load', 'Inmates ÷ Relief Camps', '28695 ÷ 90', 'derived, not ASDMA');

    expect(describeDerivation(d)).toBe(
      'Camp Load = Inmates ÷ Relief Camps = 28695 ÷ 90 (derived, not ASDMA)',
    );
  });

  it('renders without parentheses when there is no note', () => {
    expect(describeDerivation(derivation('m', 'a ÷ b', '1 ÷ 2'))).toBe('m = a ÷ b = 1 ÷ 2');
  });
});

describe('operandOf', () => {
  it('renders a known quantity as its number', () => {
    expect(operandOf(hectares(37139.52))).toBe('37139.52');
  });

  it('renders an unknown quantity as the word unknown, never as zero', () => {
    expect(operandOf(unknownCount())).toBe('unknown');
    expect(operandOf(unknownCount())).not.toBe('0');
  });
});

describe('derivedQuotient', () => {
  const spec = { metric: 'Camp Load', formula: 'Inmates ÷ Relief Camps', unit: 'inmates/camp' };

  it('divides and records the substitution', () => {
    const q = derivedQuotient({ ...spec, numerator: 28695, denominator: 90 });

    expect(q.outcome).toBe('value');
    expect(q.value).toBeCloseTo(318.8333, 4);
    expect(q.unit).toBe('inmates/camp');
    expect(q.completeness).toBe('complete');
    expect(q.derivation.substitution).toBe('28695 ÷ 90');
  });

  it('propagates unknown-ness rather than treating an unknown as zero', () => {
    const q = derivedQuotient({ ...spec, numerator: undefined, denominator: 90 });

    expect(q.outcome).toBe('unknown');
    expect(q.value).toBeUndefined();
    expect(q.completeness).toBe('unavailable');
    expect(q.derivation.substitution).toBe('unknown ÷ 90');
  });

  it('propagates an unknown denominator too', () => {
    const q = derivedQuotient({ ...spec, numerator: 1, denominator: undefined });
    expect(q.outcome).toBe('unknown');
  });

  it('reports an unbounded result rather than dividing by zero', () => {
    const q = derivedQuotient({ ...spec, numerator: 28695, denominator: 0 });

    expect(q.outcome).toBe('unbounded');
    expect(q.value).toBe(Number.POSITIVE_INFINITY);
    expect(q.completeness).toBe('complete');
  });

  it('treats zero over zero as zero, distinguishably', () => {
    const q = derivedQuotient({ ...spec, numerator: 0, denominator: 0 });

    expect(q.outcome).toBe('zero-over-zero');
    expect(q.value).toBe(0);
  });

  it('threads an explanatory note into the derivation', () => {
    const q = derivedQuotient({ ...spec, numerator: 1, denominator: 2, note: 'derived' });
    expect(q.derivation.note).toBe('derived');
  });
});

describe('derivedDifference', () => {
  it('subtracts each term in order and shows the arithmetic', () => {
    const d = derivedDifference({
      metric: 'Unsheltered Affected',
      formula: 'Affected Population − Inmates − Non-Camp Inmates',
      unit: 'people',
      minuend: 445495,
      subtrahends: [28695, 51777],
    });

    expect(d.value).toBe(365023);
    expect(d.completeness).toBe('complete');
    expect(d.derivation.substitution).toBe('445495 − 28695 − 51777');
  });

  it('is unavailable when any term is unknown', () => {
    const d = derivedDifference({
      metric: 'Unsheltered Affected',
      formula: 'a − b',
      unit: 'people',
      minuend: 445495,
      subtrahends: [undefined],
    });

    expect(d.value).toBeUndefined();
    expect(d.completeness).toBe('unavailable');
    expect(d.derivation.substitution).toBe('445495 − unknown');
  });

  it('is unavailable when the minuend is unknown', () => {
    const d = derivedDifference({
      metric: 'x',
      formula: 'a − b',
      unit: 'people',
      minuend: undefined,
      subtrahends: [1],
    });
    expect(d.completeness).toBe('unavailable');
  });

  it('carries a note when supplied', () => {
    const d = derivedDifference({
      metric: 'x',
      formula: 'a − b',
      unit: 'people',
      minuend: 2,
      subtrahends: [1],
      note: 'derived',
    });
    expect(d.derivation.note).toBe('derived');
  });
});

describe('quantity interop', () => {
  it('accepts values pulled out of shared-kernel quantities', () => {
    const q = derivedQuotient({
      metric: 'x',
      formula: 'a ÷ b',
      unit: 'ratio',
      numerator: count(3143).kind === 'known' ? 3143 : undefined,
      denominator: 28695,
    });
    expect(q.value).toBeCloseTo(0.10953, 5);
  });
});

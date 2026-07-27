import { describe, expect, it } from 'vitest';

import { derivation, derivedQuotient, describeDerivation, showOperand } from './derivation';

describe('Derivation', () => {
  it('always carries a note — a derived figure with no caveat is not a derived figure', () => {
    const d = derivation(
      'Ration Coverage Days',
      '(Rice Q × 100 kg) ÷ (Inmates × kg/person/day)',
      '119109.2 ÷ (28695 × 0.6)',
      'derived — assumes 0.6 kg/person/day',
    );

    expect(d.note).toBe('derived — assumes 0.6 kg/person/day');
  });

  it('renders one line for a tooltip', () => {
    expect(describeDerivation(derivation('Camp Load', 'a ÷ b', '28695 ÷ 90', 'derived'))).toBe(
      'Camp Load = a ÷ b = 28695 ÷ 90 (derived)',
    );
  });
});

describe('showOperand', () => {
  it('rounds DRIMS float noise at presentation, not at storage', () => {
    expect(showOperand(1191.092 * 100)).toBe('119109.2');
    expect(1191.092 * 100).not.toBe(119109.2);
  });

  it('says unknown rather than printing a stand-in zero', () => {
    expect(showOperand(undefined)).toBe('unknown');
  });

  it('leaves an ordinary integer alone', () => {
    expect(showOperand(28695)).toBe('28695');
  });
});

describe('derivedQuotient', () => {
  const spec = {
    metric: 'Camp Load',
    formula: 'Inmates ÷ Relief Camps',
    unit: 'inmates per Relief Camp',
    note: 'derived',
  };

  it('accepts a hand-written substitution when the real sum is wordier than n ÷ d', () => {
    const q = derivedQuotient({
      ...spec,
      numerator: 119109.2,
      denominator: 17217,
      substitution: '119109.2 ÷ (28695 × 0.6)',
    });

    expect(q.derivation.substitution).toBe('119109.2 ÷ (28695 × 0.6)');
    expect(q.outcome).toBe('value');
  });

  it('falls back to n ÷ d', () => {
    expect(derivedQuotient({ ...spec, numerator: 28695, denominator: 90 }).derivation.substitution).toBe(
      '28695 ÷ 90',
    );
  });

  it('distinguishes unknown from unbounded from zero-over-zero', () => {
    expect(derivedQuotient({ ...spec, numerator: undefined, denominator: 90 }).outcome).toBe(
      'unknown',
    );
    expect(derivedQuotient({ ...spec, numerator: 1, denominator: undefined }).outcome).toBe(
      'unknown',
    );
    expect(derivedQuotient({ ...spec, numerator: 1, denominator: 0 }).outcome).toBe('unbounded');
    expect(derivedQuotient({ ...spec, numerator: 0, denominator: 0 }).outcome).toBe(
      'zero-over-zero',
    );
  });
});

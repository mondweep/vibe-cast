import { describe, expect, it } from 'vitest';

import { count, quintals, unknownCount, unknownQuintals } from '../shared/quantity';
import { SDRF_RICE_NORM, rationCoverageDays, rationNorm } from './ration-coverage';

describe('RationNorm', () => {
  it('is a stated, arguable assumption carrying its own label', () => {
    const norm = rationNorm(0.6, 'SDRF relief-norm convention');

    expect(norm).toEqual({
      kilogramsPerPersonPerDay: 0.6,
      label: 'SDRF relief-norm convention',
    });
  });

  it('publishes the SDRF convention as a named constant a caller must pass explicitly', () => {
    expect(SDRF_RICE_NORM.kilogramsPerPersonPerDay).toBe(0.6);
    expect(SDRF_RICE_NORM.label).toMatch(/SDRF/);
  });

  it('rejects a non-positive norm — it is nonsense, not data', () => {
    expect(() => rationNorm(0, 'zero')).toThrow(RangeError);
    expect(() => rationNorm(-0.6, 'negative')).toThrow(RangeError);
  });

  it('has NO default: rationCoverageDays takes the norm as a required third argument', () => {
    // PRD §5.3 invariant 3 — the assumption must be visible at the call site.
    expect(rationCoverageDays.length).toBe(3);
  });
});

describe('rationCoverageDays — verified against PRD Appendix B', () => {
  it('(1191.092 × 100) ÷ (28695 × 0.6) = 6.9 days', () => {
    const coverage = rationCoverageDays(quintals(1191.092), count(28695), SDRF_RICE_NORM);

    expect(coverage.kind).toBe('days');
    expect(coverage.days).toBeCloseTo(6.918116, 6);
    expect((coverage.days ?? 0).toFixed(1)).toBe('6.9');
    expect(coverage.completeness).toBe('complete');
  });

  it('shows the arithmetic so an officer can argue with it', () => {
    const coverage = rationCoverageDays(quintals(1191.092), count(28695), SDRF_RICE_NORM);

    expect(coverage.derivation.metric).toBe('Ration Coverage Days');
    expect(coverage.derivation.formula).toBe('(Rice Q × 100 kg) ÷ (Inmates × kg/person/day)');
    expect(coverage.derivation.substitution).toBe('119109.2 ÷ (28695 × 0.6)');
    expect(coverage.derivation.note).toContain('SDRF relief-norm convention');
  });

  it('carries the norm it was computed with', () => {
    const coverage = rationCoverageDays(quintals(100), count(1000), SDRF_RICE_NORM);
    expect(coverage.norm).toBe(SDRF_RICE_NORM);
  });

  it('moves when the assumption moves — a doubled norm halves the coverage', () => {
    const base = rationCoverageDays(quintals(1191.092), count(28695), SDRF_RICE_NORM);
    const doubled = rationCoverageDays(
      quintals(1191.092),
      count(28695),
      rationNorm(1.2, 'twice SDRF'),
    );

    expect(doubled.days).toBeCloseTo((base.days ?? 0) / 2, 8);
  });
});

describe('edge cases that must not become divide-by-zero', () => {
  it('reports unbounded coverage when there are no Inmates', () => {
    const coverage = rationCoverageDays(quintals(1191.092), count(0), SDRF_RICE_NORM);

    expect(coverage.kind).toBe('unbounded-no-inmates');
    expect(coverage.days).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(coverage.days ?? 0)).toBe(false);
    expect(coverage.completeness).toBe('complete');
  });

  it('reports zero days, distinguishably, when there is no rice but there are Inmates', () => {
    const coverage = rationCoverageDays(quintals(0), count(28695), SDRF_RICE_NORM);

    expect(coverage.kind).toBe('exhausted');
    expect(coverage.days).toBe(0);
  });

  it('treats no rice and no inmates as unbounded, not exhausted', () => {
    expect(rationCoverageDays(quintals(0), count(0), SDRF_RICE_NORM).kind).toBe(
      'unbounded-no-inmates',
    );
  });
});

describe('unknown quantities', () => {
  it('never treats unknown rice as zero rice', () => {
    const coverage = rationCoverageDays(unknownQuintals(), count(28695), SDRF_RICE_NORM);

    expect(coverage.kind).toBe('unknown');
    expect(coverage.days).toBeUndefined();
    expect(coverage.completeness).toBe('unavailable');
    expect(coverage.derivation.substitution).toContain('unknown');
  });

  it('never treats unknown Inmates as zero inmates', () => {
    const coverage = rationCoverageDays(quintals(1191.092), unknownCount(), SDRF_RICE_NORM);

    expect(coverage.kind).toBe('unknown');
    expect(coverage.days).toBeUndefined();
  });
});

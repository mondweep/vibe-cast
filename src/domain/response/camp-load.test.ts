import { describe, expect, it } from 'vitest';

import type { CampInmates } from '../shared/flood-situation-report';
import { count, unknownCount } from '../shared/quantity';
import {
  DEFAULT_VULNERABILITY_POLICY,
  campLoad,
  vulnerabilityPolicy,
  vulnerableInmates,
  vulnerableLoad,
} from './camp-load';

const inmates = (over: Partial<CampInmates> = {}): CampInmates => ({
  total: count(28695),
  male: count(13402),
  female: count(12150),
  children: count(3004),
  pregnantOrLactating: count(97),
  personsWithDisability: count(42),
  ...over,
});

describe('campLoad — verified against PRD Appendix B', () => {
  it('28695 Inmates ÷ 90 Relief Camps = 319 per camp', () => {
    const load = campLoad(count(28695), count(90));

    expect(load.kind).toBe('load');
    expect(load.inmatesPerCamp).toBeCloseTo(318.8333, 4);
    expect(Math.round(load.inmatesPerCamp ?? 0)).toBe(319);
    expect(load.completeness).toBe('complete');
  });

  it('shows its arithmetic', () => {
    const load = campLoad(count(28695), count(90));

    expect(load.derivation.metric).toBe('Camp Load');
    expect(load.derivation.formula).toBe('Inmates ÷ Relief Camps');
    expect(load.derivation.substitution).toBe('28695 ÷ 90');
    expect(load.derivation.note).toMatch(/derived/i);
  });
});

describe('campLoad — zero Relief Camps', () => {
  it('is a distinguishable, alarming state when there are Inmates but no camps', () => {
    const load = campLoad(count(500), count(0));

    expect(load.kind).toBe('no-camps-but-inmates');
    expect(load.inmatesPerCamp).toBe(Number.POSITIVE_INFINITY);
    expect(load.completeness).toBe('complete');
  });

  it('does not throw for zero camps', () => {
    expect(() => campLoad(count(500), count(0))).not.toThrow();
  });

  it('is a quiet, ordinary state when there are neither camps nor Inmates', () => {
    const load = campLoad(count(0), count(0));

    expect(load.kind).toBe('no-camps-no-inmates');
    expect(load.inmatesPerCamp).toBe(0);
  });
});

describe('campLoad — unknown quantities', () => {
  it('never treats unknown Inmates as zero', () => {
    const load = campLoad(unknownCount(), count(90));

    expect(load.kind).toBe('unknown');
    expect(load.inmatesPerCamp).toBeUndefined();
    expect(load.completeness).toBe('unavailable');
  });

  it('never treats an unknown Relief Camp count as zero', () => {
    expect(campLoad(count(1), unknownCount()).kind).toBe('unknown');
  });
});

describe('VulnerabilityPolicy', () => {
  it('defaults to Children + Pregnant/Lactating Mothers + Persons with Disability', () => {
    expect(DEFAULT_VULNERABILITY_POLICY.components).toEqual([
      'children',
      'pregnantOrLactating',
      'personsWithDisability',
    ]);
    expect(DEFAULT_VULNERABILITY_POLICY.label).toBe(
      'Children + Pregnant/Lactating Mothers + Persons with Disability',
    );
  });

  it('is substitutable — a planner may count only Persons with Disability', () => {
    const policy = vulnerabilityPolicy(['personsWithDisability'], 'Persons with Disability only');

    expect(vulnerableInmates(inmates(), policy)).toEqual(count(42));
  });

  it('rejects an empty policy — a vulnerability definition of nothing is not a definition', () => {
    expect(() => vulnerabilityPolicy([], 'nothing')).toThrow(RangeError);
  });
});

describe('vulnerableInmates', () => {
  it('sums 3004 + 97 + 42 = 3143 for the statewide 2026-07-27 figures', () => {
    expect(vulnerableInmates(inmates(), DEFAULT_VULNERABILITY_POLICY)).toEqual(count(3143));
  });

  it('propagates unknown-ness rather than under-counting', () => {
    expect(
      vulnerableInmates(inmates({ children: unknownCount() }), DEFAULT_VULNERABILITY_POLICY),
    ).toEqual(unknownCount());
  });
});

describe('vulnerableLoad — verified against PRD Appendix B', () => {
  it('3143 ÷ 28695 = 11.0%', () => {
    const load = vulnerableLoad(inmates(), DEFAULT_VULNERABILITY_POLICY);

    expect(load.fraction).toBeCloseTo(0.1095313, 7);
    expect(((load.fraction ?? 0) * 100).toFixed(1)).toBe('11.0');
    expect(load.vulnerableInmates).toEqual(count(3143));
    expect(load.completeness).toBe('complete');
  });

  it('shows its arithmetic and names the policy it used', () => {
    const load = vulnerableLoad(inmates(), DEFAULT_VULNERABILITY_POLICY);

    expect(load.derivation.metric).toBe('Vulnerable Load');
    expect(load.derivation.formula).toBe('Vulnerable Inmates ÷ Inmates');
    expect(load.derivation.substitution).toBe('3143 ÷ 28695');
    expect(load.derivation.note).toContain(
      'Children + Pregnant/Lactating Mothers + Persons with Disability',
    );
    expect(load.policy).toBe(DEFAULT_VULNERABILITY_POLICY);
  });

  it('is zero, not a divide-by-zero, for a district with no Inmates at all', () => {
    const none = inmates({
      total: count(0),
      children: count(0),
      pregnantOrLactating: count(0),
      personsWithDisability: count(0),
    });

    const load = vulnerableLoad(none, DEFAULT_VULNERABILITY_POLICY);

    expect(load.fraction).toBe(0);
    expect(Number.isNaN(load.fraction ?? 0)).toBe(false);
  });

  it('is unavailable when the Inmates total is unknown', () => {
    const load = vulnerableLoad(inmates({ total: unknownCount() }), DEFAULT_VULNERABILITY_POLICY);

    expect(load.fraction).toBeUndefined();
    expect(load.completeness).toBe('unavailable');
  });
});

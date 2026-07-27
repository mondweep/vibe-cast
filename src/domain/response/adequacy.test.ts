import { describe, expect, it } from 'vitest';

import { count, quintals, unknownCount, unknownQuintals } from '../shared/quantity';
import type { CampInmates } from '../shared/flood-situation-report';
import { INDICATIVE_ADEQUACY_THRESHOLDS, assessReliefAdequacy } from './adequacy';
import { DEFAULT_VULNERABILITY_POLICY, campLoad, vulnerableLoad } from './camp-load';
import { SDRF_RICE_NORM, rationCoverageDays } from './ration-coverage';

const inmates = (over: Partial<CampInmates> = {}): CampInmates => ({
  total: count(28695),
  male: count(13402),
  female: count(12150),
  children: count(3004),
  pregnantOrLactating: count(97),
  personsWithDisability: count(42),
  ...over,
});

const statewide = () => ({
  rationCoverage: rationCoverageDays(quintals(1191.092), count(28695), SDRF_RICE_NORM),
  campLoad: campLoad(count(28695), count(90)),
  vulnerableLoad: vulnerableLoad(inmates(), DEFAULT_VULNERABILITY_POLICY),
});

describe('thresholds are injected, not hard-coded', () => {
  it('publishes an indicative set that a caller must pass explicitly', () => {
    expect(assessReliefAdequacy.length).toBe(2);
    expect(INDICATIVE_ADEQUACY_THRESHOLDS.rationCoverageDays.critical).toBeGreaterThan(0);
    expect(INDICATIVE_ADEQUACY_THRESHOLDS.inmatesPerCamp.critical).toBeGreaterThan(
      INDICATIVE_ADEQUACY_THRESHOLDS.inmatesPerCamp.strained,
    );
  });

  it('lets a substituted threshold set change the judgement without touching the arithmetic', () => {
    const input = statewide();

    const lenient = assessReliefAdequacy(input, {
      rationCoverageDays: { critical: 1, strained: 2 },
      inmatesPerCamp: { critical: 5000, strained: 4000 },
      vulnerableLoad: { critical: 0.9, strained: 0.8 },
    });
    const strict = assessReliefAdequacy(input, {
      rationCoverageDays: { critical: 30, strained: 60 },
      inmatesPerCamp: { critical: 10, strained: 5 },
      vulnerableLoad: { critical: 0.01, strained: 0.005 },
    });

    expect(lenient.grade).toBe('adequate');
    expect(strict.grade).toBe('critical');
  });
});

describe('assessReliefAdequacy — the 2026-07-27 statewide picture', () => {
  const adequacy = assessReliefAdequacy(statewide(), INDICATIVE_ADEQUACY_THRESHOLDS);

  it('combines the three derived metrics into one judgement', () => {
    expect(adequacy.rationCoverage.days).toBeCloseTo(6.918116, 6);
    expect(adequacy.campLoad.inmatesPerCamp).toBeCloseTo(318.8333, 4);
    expect(adequacy.vulnerableLoad.fraction).toBeCloseTo(0.1095313, 7);
  });

  it('grades 6.9 days of rice and 319 per camp as strained, not adequate', () => {
    expect(adequacy.grade).toBe('strained');
    expect(adequacy.completeness).toBe('complete');
  });

  it('explains each aspect so the judgement can be argued with', () => {
    expect(adequacy.findings.map((f) => f.aspect)).toEqual([
      'rationCoverage',
      'campLoad',
      'vulnerableLoad',
    ]);
    for (const finding of adequacy.findings) {
      expect(finding.detail.length).toBeGreaterThan(0);
      expect(finding.derivation.formula.length).toBeGreaterThan(0);
    }
  });
});

describe('grading', () => {
  const thresholds = INDICATIVE_ADEQUACY_THRESHOLDS;

  const gradeOf = (input: Parameters<typeof assessReliefAdequacy>[0]) =>
    assessReliefAdequacy(input, thresholds).grade;

  it('is adequate when every aspect is comfortable', () => {
    expect(
      gradeOf({
        rationCoverage: rationCoverageDays(quintals(10000), count(1000), SDRF_RICE_NORM),
        campLoad: campLoad(count(1000), count(50)),
        vulnerableLoad: vulnerableLoad(
          inmates({ total: count(1000), children: count(10), pregnantOrLactating: count(1), personsWithDisability: count(1) }),
          DEFAULT_VULNERABILITY_POLICY,
        ),
      }),
    ).toBe('adequate');
  });

  it('is critical when rice runs out inside the critical window', () => {
    expect(
      gradeOf({
        ...statewide(),
        rationCoverage: rationCoverageDays(quintals(10), count(28695), SDRF_RICE_NORM),
      }),
    ).toBe('critical');
  });

  it('is critical when there are Inmates but no Relief Camps at all', () => {
    const adequacy = assessReliefAdequacy(
      { ...statewide(), campLoad: campLoad(count(500), count(0)) },
      thresholds,
    );

    expect(adequacy.grade).toBe('critical');
    expect(adequacy.findings[1]!.detail).toMatch(/no Relief Camps/i);
  });

  it('treats unbounded ration coverage (no Inmates) as adequate, not as a failure', () => {
    const adequacy = assessReliefAdequacy(
      {
        rationCoverage: rationCoverageDays(quintals(0), count(0), SDRF_RICE_NORM),
        campLoad: campLoad(count(0), count(0)),
        vulnerableLoad: vulnerableLoad(
          inmates({
            total: count(0),
            children: count(0),
            pregnantOrLactating: count(0),
            personsWithDisability: count(0),
          }),
          DEFAULT_VULNERABILITY_POLICY,
        ),
      },
      thresholds,
    );

    expect(adequacy.grade).toBe('adequate');
  });

  it('takes the worst aspect as the overall grade', () => {
    const adequacy = assessReliefAdequacy(
      { ...statewide(), campLoad: campLoad(count(28695), count(2)) },
      thresholds,
    );

    expect(adequacy.findings.map((f) => f.grade)).toContain('critical');
    expect(adequacy.grade).toBe('critical');
  });
});

describe('partial data', () => {
  it('says so rather than grading on data it does not have', () => {
    const adequacy = assessReliefAdequacy(
      {
        ...statewide(),
        rationCoverage: rationCoverageDays(unknownQuintals(), count(28695), SDRF_RICE_NORM),
      },
      INDICATIVE_ADEQUACY_THRESHOLDS,
    );

    expect(adequacy.completeness).toBe('partial');
    expect(adequacy.findings[0]!.grade).toBe('indeterminate');
    expect(adequacy.grade).toBe('strained');
  });

  it('is indeterminate overall when nothing at all is known', () => {
    const adequacy = assessReliefAdequacy(
      {
        rationCoverage: rationCoverageDays(unknownQuintals(), unknownCount(), SDRF_RICE_NORM),
        campLoad: campLoad(unknownCount(), unknownCount()),
        vulnerableLoad: vulnerableLoad(
          inmates({ total: unknownCount() }),
          DEFAULT_VULNERABILITY_POLICY,
        ),
      },
      INDICATIVE_ADEQUACY_THRESHOLDS,
    );

    expect(adequacy.grade).toBe('indeterminate');
    expect(adequacy.completeness).toBe('unavailable');
  });
});

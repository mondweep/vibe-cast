import { rankAssociations, MIN_NIGHTS_FOR_ASSOCIATION } from '../src/insight/correlation';
import { concludeTrial, baselineWindow, type Trial } from '../src/insight/trial';
import { coach } from '../src/insight/coaching';
import { emptyFactors, UNKNOWN, type JournalEntry } from '../src/journal/factors';
import type { RedFlag } from '../src/safeguarding/red-flags';
import { nightStub } from './helpers';

const night = (date: string, snoreIndex: number, version = '1.0.0') =>
  nightStub({ nightId: date, date, snoreIndex, analyserVersion: version });

const entry = (date: string, alcoholUnits: number | typeof UNKNOWN): JournalEntry => ({
  userId: 'u1',
  date,
  factors: { ...emptyFactors(), alcoholUnits },
  recordedAt: 0,
});

const dates = (n: number) =>
  Array.from({ length: n }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);

describe('factor associations', () => {
  it('reports nothing below the minimum night count (FR-I1)', () => {
    const d = dates(5);
    const report = rankAssociations(
      d.map((x, i) => night(x, 10 + i)),
      d.map((x, i) => entry(x, i)),
    );
    expect(report.sufficient).toBe(false);
    expect(report.associations).toEqual([]);
    expect(MIN_NIGHTS_FOR_ASSOCIATION).toBe(7);
  });

  it('ranks a real association and labels it as association, not causation (FR-I2)', () => {
    const d = dates(10);
    const report = rankAssociations(
      d.map((x, i) => night(x, 5 + i * 2)),
      d.map((x, i) => entry(x, i)),
    );
    expect(report.sufficient).toBe(true);
    const alcohol = report.associations.find((a) => a.factor === 'alcoholUnits');
    expect(alcohol?.direction).toBe('increases');
    expect(alcohol?.r).toBeGreaterThan(0.9);
    expect(alcohol?.associationNotCausation).toBe(true);
    expect(alcohol?.n).toBe(10);
  });

  /**
   * The test that justifies the anti-corruption layer existing.
   *
   * Five nights where alcohol was recorded show a strong positive
   * relationship. Five further nights had a high Snore Index but no alcohol
   * answer at all. Counting those unknowns as zero would insert five
   * (0 units, high SI) points and drag the correlation negative — telling
   * the user that drinking *reduces* their snoring.
   */
  it('excludes unknown factor values rather than counting them as zero (I-J3)', () => {
    const d = dates(10);
    const nights = [
      ...d.slice(0, 5).map((x, i) => night(x, 5 + i * 5)),   // SI 5,10,15,20,25
      ...d.slice(5).map((x) => night(x, 30)),                 // SI 30, alcohol unknown
    ];
    const journal = [
      ...d.slice(0, 5).map((x, i) => entry(x, i * 2)),        // 0,2,4,6,8 units
      ...d.slice(5).map((x) => entry(x, UNKNOWN)),
    ];

    const report = rankAssociations(nights, journal);
    const alcohol = report.associations.find((a) => a.factor === 'alcoholUnits');

    expect(alcohol?.n).toBe(5);
    expect(alcohol?.direction).toBe('increases');
    expect(alcohol?.r).toBeGreaterThan(0.9);

    // Prove the naive treatment really would have flipped the sign.
    const zeroed = rankAssociations(
      nights,
      [...d.slice(0, 5).map((x, i) => entry(x, i * 2)), ...d.slice(5).map((x) => entry(x, 0))],
    );
    const zeroedAlcohol = zeroed.associations.find((a) => a.factor === 'alcoholUnits');
    expect(zeroedAlcohol?.direction).toBe('decreases');
  });

  it('ignores nights whose analysis was insufficient', () => {
    const d = dates(10);
    const nights = d.map((x, i) =>
      i < 3
        ? nightStub({ nightId: x, date: x, status: 'insufficient', snoreIndex: null })
        : night(x, 5 + i),
    );
    const report = rankAssociations(nights, d.map((x, i) => entry(x, i)));
    expect(report.nightsConsidered).toBe(7);
  });
});

describe('Trials', () => {
  const trial = (over: Partial<Trial>): Trial => ({
    id: 't1',
    intervention: { factor: 'alcoholUnits', description: 'No alcohol after 7pm' },
    startedAt: 0,
    baselineNights: [],
    interventionNights: [],
    ...over,
  });

  it('refuses a verdict with too few baseline nights (I-I1)', () => {
    const v = concludeTrial(
      trial({
        baselineNights: dates(4).map((d) => night(d, 20)),
        interventionNights: dates(6).map((d) => night(`b${d}`, 10)),
      }),
    );
    expect(v.outcome).toBe('inconclusive');
    expect(v.reason).toBe('insufficient_baseline_nights');
  });

  it('refuses a verdict with too few intervention nights (I-I1)', () => {
    const v = concludeTrial(
      trial({
        baselineNights: dates(6).map((d) => night(d, 20)),
        interventionNights: dates(4).map((d) => night(`b${d}`, 10)),
      }),
    );
    expect(v.reason).toBe('insufficient_intervention_nights');
  });

  it('refuses a verdict across an analyser version boundary (ADR-009)', () => {
    const v = concludeTrial(
      trial({
        baselineNights: dates(8).map((d) => night(d, 20, '1.0.0')),
        interventionNights: dates(8).map((d) => night(`b${d}`, 10, '1.1.0')),
      }),
    );
    expect(v.outcome).toBe('inconclusive');
    expect(v.reason).toBe('analyser_version_mismatch');
  });

  it('reports an improvement when the index falls substantially', () => {
    const v = concludeTrial(
      trial({
        baselineNights: dates(10).map((d, i) => night(d, 24 + (i % 3))),
        interventionNights: dates(10).map((d, i) => night(`b${d}`, 11 + (i % 3))),
      }),
    );
    expect(v.outcome).toBe('improved');
    expect(v.deltaSnoreIndex).toBeLessThan(0);
    expect(v.confidence).toBe('high');
  });

  it('reports no change when the difference is within noise', () => {
    const v = concludeTrial(
      trial({
        baselineNights: dates(10).map((d, i) => night(d, 20 + (i % 4))),
        interventionNights: dates(10).map((d, i) => night(`b${d}`, 20 + (i % 4))),
      }),
    );
    expect(v.outcome).toBe('no_change');
  });

  it('always states a confidence, whatever the outcome (I-I3)', () => {
    const outcomes = [
      concludeTrial(trial({})),
      concludeTrial(
        trial({
          baselineNights: dates(10).map((d, i) => night(d, 24 + (i % 3))),
          interventionNights: dates(10).map((d, i) => night(`b${d}`, 11 + (i % 3))),
        }),
      ),
    ];
    for (const v of outcomes) expect(['low', 'moderate', 'high']).toContain(v.confidence);
  });

  it('excludes index-less nights from the baseline window (I-I4)', () => {
    const usableNights = dates(3).map((d) => night(d, 15));
    const rejected = dates(3).map((d) =>
      nightStub({ nightId: `r${d}`, date: `r${d}`, status: 'insufficient', snoreIndex: null }),
    );
    expect(baselineWindow([...usableNights, ...rejected])).toHaveLength(3);
  });
});

describe('coaching precedence over safeguarding (FR-I6, ADR-010)', () => {
  const flag: RedFlag = {
    code: 'RF-2-witnessed-pauses',
    title: 'Witnessed pauses in breathing',
    message: 'Please speak to a doctor.',
    urgency: 'prompt',
  };

  const strongReport = () => {
    const d = dates(10);
    return rankAssociations(
      d.map((x, i) => night(x, 5 + i * 3)),
      d.map((x, i) => entry(x, i)),
    );
  };

  it('suppresses coaching entirely while a Red Flag is active', () => {
    const out = coach(strongReport(), [flag]);
    expect(out.kind).toBe('suppressed');
  });

  it('does not offer a recommendation alongside the escalation', () => {
    const out = coach(strongReport(), [flag]);
    expect(out).not.toHaveProperty('recommendation');
  });

  it('would have had a strong recommendation to make, proving suppression is real', () => {
    const out = coach(strongReport(), []);
    expect(out.kind).toBe('recommendation');
  });

  it('reports insufficient data rather than guessing below the night threshold', () => {
    const d = dates(4);
    const report = rankAssociations(
      d.map((x, i) => night(x, 10 + i)),
      d.map((x, i) => entry(x, i)),
    );
    expect(coach(report, []).kind).toBe('insufficient_data');
  });
});

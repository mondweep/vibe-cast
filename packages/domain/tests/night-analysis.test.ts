import {
  analyseNight,
  ANALYSER_VERSION,
  bandFor,
  labelFor,
  MIN_MONITORED_MS_FOR_INDEX,
} from '../src/analysis/night-analysis';
import { breathingRun, candidate, HOUR_MS } from './helpers';

describe('NightAnalysis', () => {
  const base = { nightId: 'n1', date: '2026-09-16', startMs: 0 };

  it('reports a null Snore Index below one monitored hour, never zero (I-A1)', () => {
    const a = analyseNight({ ...base, candidates: [], stopMs: 20 * 60_000 });
    expect(a.snoreIndex).toBeNull();
    expect(a.status).toBe('insufficient');
  });

  it('computes episodes per monitored hour above the threshold', () => {
    const candidates = breathingRun(8);
    const a = analyseNight({ ...base, candidates, stopMs: 4 * HOUR_MS });
    expect(a.status).toBe('analysed');
    expect(a.snoreIndex).toBeCloseTo(8 / 4, 5);
  });

  it('excludes interrupted time from monitored time so SI is not inflated (ADR-007)', () => {
    const candidates = breathingRun(8);
    const uninterrupted = analyseNight({ ...base, candidates, stopMs: 4 * HOUR_MS });
    const interrupted = analyseNight({
      ...base,
      candidates,
      stopMs: 4 * HOUR_MS,
      interruptedMs: 2 * HOUR_MS,
    });
    expect(interrupted.monitoredMs).toBe(2 * HOUR_MS);
    expect(interrupted.snoreIndex).toBeCloseTo(4, 5);
    expect(interrupted.snoreIndex as number).toBeGreaterThan(uninterrupted.snoreIndex as number);
    expect(interrupted.wasInterrupted).toBe(true);
  });

  it('excludes episodes outside the monitored window (I-A3)', () => {
    const inside = breathingRun(5);
    const outside = candidate({ startMs: 10 * HOUR_MS, durationMs: 1_000 });
    const a = analyseNight({
      ...base,
      candidates: [...inside, outside],
      stopMs: 4 * HOUR_MS,
    });
    for (const e of a.episodes) {
      expect(e.startMs + e.durationMs).toBeLessThanOrEqual(4 * HOUR_MS);
    }
  });

  it('keeps the snore time fraction within 0..1 (I-A2)', () => {
    const a = analyseNight({ ...base, candidates: breathingRun(50), stopMs: 4 * HOUR_MS });
    expect(a.snoreTimeFraction).toBeGreaterThanOrEqual(0);
    expect(a.snoreTimeFraction).toBeLessThanOrEqual(1);
  });

  it('stamps the analyser version on every result (FR-A4)', () => {
    const a = analyseNight({ ...base, candidates: [], stopMs: 4 * HOUR_MS });
    expect(a.analyserVersion).toBe(ANALYSER_VERSION);
  });

  it('is immutable and reproducible (I-A4)', () => {
    const input = { ...base, candidates: breathingRun(6), stopMs: 4 * HOUR_MS };
    expect(JSON.stringify(analyseNight(input))).toBe(JSON.stringify(analyseNight(input)));
  });

  it('lists quiet periods without treating them as apnoea evidence', () => {
    const early = breathingRun(3);
    const late = breathingRun(3).map((c) => ({
      ...c,
      startMs: c.startMs + 2 * HOUR_MS,
      endMs: c.endMs + 2 * HOUR_MS,
    }));
    const a = analyseNight({ ...base, candidates: [...early, ...late], stopMs: 4 * HOUR_MS });
    expect(a.quietPeriods.length).toBeGreaterThan(0);
    // The type carries no field asserting a respiratory event of any kind.
    expect(Object.keys(a.quietPeriods[0])).toEqual(['startMs', 'durationMs']);
  });

  describe('intensity bands at their exact boundaries', () => {
    it.each([
      [0, 'quiet'], [4.99, 'quiet'],
      [5, 'mild'], [9.99, 'mild'],
      [10, 'moderate'], [19.99, 'moderate'],
      [20, 'loud'], [45, 'loud'],
    ])('%d dB above baseline is %s', (db, expected) => {
      expect(bandFor(db as number)).toBe(expected);
    });
  });

  describe('Snore Index labels', () => {
    it('returns no label when there is no index', () => {
      expect(labelFor(null)).toBeNull();
    });
    it.each([
      [4.9, 'minimal'], [5, 'light'], [14.9, 'light'],
      [15, 'moderate'], [29.9, 'moderate'], [30, 'heavy'],
    ])('SI %d is labelled %s', (si, expected) => {
      expect(labelFor(si as number)).toBe(expected);
    });
  });

  it('uses a one-hour minimum for the index', () => {
    expect(MIN_MONITORED_MS_FOR_INDEX).toBe(HOUR_MS);
  });
});

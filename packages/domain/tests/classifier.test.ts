import { classify, classifyAll, CLASSIFIER_THRESHOLDS } from '../src/analysis/classifier';
import { breathingRun, candidate } from './helpers';

describe('acoustic classifier', () => {
  it('accepts a well-formed snore within a breathing rhythm', () => {
    const run = breathingRun(5);
    const result = classify(run[2], run);
    expect(result.isSnore).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  describe('each predicate rejects a specific named confounder', () => {
    it('rejects speech on low-band energy ratio', () => {
      // Speech energy sits mostly in 300–3400 Hz, well above the snore band.
      const run = breathingRun(5, { lowBandRatio: 0.35 });
      const result = classify(run[2], run);
      expect(result.isSnore).toBe(false);
      expect(result.reasons).toContain('low_band_ratio_too_low');
    });

    it('rejects a fan or white-noise machine on spectral flatness', () => {
      // Broadband noise is flat; snoring is tonal and harmonic.
      const run = breathingRun(5, { spectralFlatness: 0.85 });
      const result = classify(run[2], run);
      expect(result.isSnore).toBe(false);
      expect(result.reasons).toContain('too_noise_like');
    });

    it('rejects an isolated door slam on periodicity', () => {
      const lone = candidate({ startMs: 100_000, durationMs: 600 });
      const result = classify(lone, [lone]);
      expect(result.isSnore).toBe(false);
      expect(result.reasons).toContain('not_periodic');
    });

    it('rejects a sub-300 ms blip on duration', () => {
      const run = breathingRun(5, { durationMs: 150 });
      const result = classify(run[2], run);
      expect(result.isSnore).toBe(false);
      expect(result.reasons).toContain('too_short');
    });

    it('rejects a run longer than one respiratory event', () => {
      const run = breathingRun(5, { durationMs: 9_000 });
      const result = classify(run[2], run);
      expect(result.isSnore).toBe(false);
      expect(result.reasons).toContain('too_long');
    });
  });

  it('records every failing reason, not just the first (ADR-002 explainability)', () => {
    const lone = candidate({ lowBandRatio: 0.2, spectralFlatness: 0.9, startMs: 500_000 });
    const result = classify(lone, [lone]);
    expect(result.reasons).toEqual(
      expect.arrayContaining(['low_band_ratio_too_low', 'too_noise_like', 'not_periodic']),
    );
  });

  it('is deterministic: the same input yields byte-identical output (ADR-009)', () => {
    const run = breathingRun(6);
    expect(JSON.stringify(classifyAll(run))).toBe(JSON.stringify(classifyAll(run)));
  });

  it('exposes its thresholds as named constants', () => {
    expect(CLASSIFIER_THRESHOLDS.minLowBandRatio).toBe(0.55);
    expect(CLASSIFIER_THRESHOLDS.maxSpectralFlatness).toBe(0.4);
  });
});

import { median } from '../shared/types';
import type { SessionMs } from '../shared/types';

export const BASELINE_WINDOW_MS = 60_000;
export const BASELINE_RECOMPUTE_INTERVAL_MS = 5_000;
export const CALIBRATION_MS = 60_000;

interface Sample {
  readonly tMs: SessionMs;
  readonly rmsDb: number;
}

/**
 * The rolling loudness of the quiet room (PRD §8 stage 2).
 *
 * All detection thresholds are expressed relative to this value, because the
 * microphone is uncalibrated (ADR-002).
 *
 * The subtle requirement, and the reason this is its own class: the baseline
 * is updated **only from frames that are not currently inside a Candidate**.
 * Without that exclusion, a sustained loud passage drags the baseline upward
 * until the snoring sits below its own threshold and hides itself.
 */
export class AmbientBaseline {
  private readonly samples: Sample[] = [];
  private cachedDb = NaN;
  private lastComputedAtMs = -Infinity;
  private firstSampleAtMs: SessionMs | null = null;
  private latestAtMs: SessionMs = 0;

  /**
   * @param inCandidate true when this frame is part of a run of loud frames,
   *   in which case it is observed for timing purposes but excluded from the
   *   median.
   */
  observe(tMs: SessionMs, rmsDb: number, inCandidate: boolean): void {
    if (this.firstSampleAtMs === null) this.firstSampleAtMs = tMs;
    this.latestAtMs = tMs;

    if (!inCandidate) {
      this.samples.push({ tMs, rmsDb });
    }

    // Drop anything outside the rolling window.
    const cutoff = tMs - BASELINE_WINDOW_MS;
    while (this.samples.length > 0 && this.samples[0].tMs < cutoff) {
      this.samples.shift();
    }

    if (tMs - this.lastComputedAtMs >= BASELINE_RECOMPUTE_INTERVAL_MS) {
      // Only recompute when there is something quiet to measure. During a
      // long continuous noise every quiet sample ages out of the window, and
      // recomputing from an empty set would yield NaN — which would in turn
      // make every loudness comparison false and silently stop detection.
      // Holding the last known good level is the honest fallback.
      if (this.samples.length > 0) {
        this.cachedDb = median(this.samples.map((s) => s.rmsDb));
      }
      this.lastComputedAtMs = tMs;
    }
  }

  /**
   * Invariant I-C1: no Candidates may be produced until the baseline has
   * calibrated over at least 60 s of audio.
   */
  get isCalibrated(): boolean {
    if (this.firstSampleAtMs === null) return false;
    return this.latestAtMs - this.firstSampleAtMs >= CALIBRATION_MS && this.samples.length > 0;
  }

  /** Fraction of calibration complete, 0..1, for the UI progress indicator. */
  get calibrationProgress(): number {
    if (this.firstSampleAtMs === null) return 0;
    return Math.min(1, (this.latestAtMs - this.firstSampleAtMs) / CALIBRATION_MS);
  }

  /** The current baseline level in dB, or NaN before the first computation. */
  get valueDb(): number {
    if (Number.isNaN(this.cachedDb) && this.samples.length > 0) {
      return median(this.samples.map((s) => s.rmsDb));
    }
    return this.cachedDb;
  }
}

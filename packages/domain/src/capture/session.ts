import { AmbientBaseline } from './ambient-baseline';
import { CandidateBuilder, type Candidate } from './candidate';
import type { FrameFeatures } from './frame';

/** PRD §8 stage 3 — user-selectable detection threshold, in dB above baseline. */
export const SENSITIVITY_DB = {
  sensitive: 6,
  normal: 8,
  strict: 12,
} as const;

export type Sensitivity = keyof typeof SENSITIVITY_DB;

/**
 * The Sleep Capture aggregate root: the device-side execution of one Night.
 *
 * Deliberately has no dependency on a microphone, a clock or storage — frames
 * are pushed in from the adapter side (ADR-004). That is what makes an
 * eight-hour overnight behaviour testable in milliseconds.
 */
export class Session {
  private readonly baseline = new AmbientBaseline();
  private readonly builder = new CandidateBuilder();
  private readonly thresholdDb: number;
  private stopped = false;

  constructor(sensitivity: Sensitivity = 'normal') {
    this.thresholdDb = SENSITIVITY_DB[sensitivity];
  }

  /**
   * Process one frame, returning any Candidates it completed.
   *
   * Note the ordering: loudness is judged against the baseline *before* the
   * frame is fed back into it, and the frame is then excluded from the median
   * if it was loud. This is what stops sustained snoring from raising the
   * baseline until it hides itself.
   */
  pushFrame(frame: FrameFeatures): Candidate[] {
    if (this.stopped) return [];

    // Invariant I-C1: nothing is detected until calibration completes.
    if (!this.baseline.isCalibrated) {
      this.baseline.observe(frame.tMs, frame.rmsDb, false);
      return [];
    }

    const baselineDb = this.baseline.valueDb;
    const isLoud = frame.rmsDb > baselineDb + this.thresholdDb;
    this.baseline.observe(frame.tMs, frame.rmsDb, isLoud);
    return this.builder.push(frame, baselineDb, isLoud);
  }

  /** Close the Session, flushing any run still open. */
  stop(): Candidate[] {
    if (this.stopped) return [];
    this.stopped = true;
    return this.builder.flush();
  }

  get isCalibrated(): boolean {
    return this.baseline.isCalibrated;
  }

  get calibrationProgress(): number {
    return this.baseline.calibrationProgress;
  }

  /** Current loudness above baseline, for the live monitoring screen (FR-C5). */
  currentIntensityDb(frame: FrameFeatures): number {
    const b = this.baseline.valueDb;
    return Number.isNaN(b) ? 0 : Math.max(0, frame.rmsDb - b);
  }
}

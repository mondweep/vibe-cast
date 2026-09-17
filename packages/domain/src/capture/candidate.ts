import type { RelativeDb, SessionMs } from '../shared/types';
import { mean } from '../shared/types';
import { FRAME_DURATION_MS, type FrameFeatures } from './frame';

/**
 * A contiguous run of Loud Frames — a *possible* snore, not yet judged.
 *
 * This is the Published Language between Sleep Capture and Snore Analysis
 * (PRD §4.3). Capture knows nothing about the Snore Index; Analysis knows
 * nothing about microphones. It is JSON-serialisable and, per ADR-001,
 * carries no sample data.
 */
export interface Candidate {
  readonly startMs: SessionMs;
  readonly endMs: SessionMs;
  readonly durationMs: number;
  /** Peak frame loudness within the run, uncalibrated dB. */
  readonly peakDb: number;
  /** The Ambient Baseline at the moment of detection. */
  readonly baselineDb: number;
  /** Invariant I-A5: peak above baseline, always relative. */
  readonly intensityDb: RelativeDb;
  readonly lowBandRatio: number;
  readonly spectralFlatness: number;
  readonly frameCount: number;
}

export const MERGE_GAP_MS = 200;
export const MIN_CANDIDATE_MS = 300;
export const MAX_CANDIDATE_MS = 6_000;

interface LoudFrame {
  readonly frame: FrameFeatures;
  readonly baselineDb: number;
}

/**
 * PRD §8 stage 4 — group contiguous Loud Frames into Candidates.
 *
 * Gaps shorter than {@link MERGE_GAP_MS} are absorbed into the run, because a
 * single snore's envelope dips without ending. Runs shorter than
 * {@link MIN_CANDIDATE_MS} are discarded as blips. Runs longer than
 * {@link MAX_CANDIDATE_MS} are split at their quietest interior frame — not
 * their midpoint, which would cut a snore in half as readily as between two.
 */
export class CandidateBuilder {
  private run: LoudFrame[] = [];
  private gap: LoudFrame[] = [];

  /**
   * Feed one frame. Returns any Candidates completed by this frame.
   *
   * Invariant I-C3: Candidates never overlap and are emitted in ascending
   * time order, which follows from frames arriving in order and a run being
   * closed before the next begins.
   */
  push(frame: FrameFeatures, baselineDb: number, isLoud: boolean): Candidate[] {
    if (isLoud) {
      // Any pending gap is short by construction: a gap reaching MERGE_GAP_MS
      // closes the run in the quiet branch below, so it cannot survive to here.
      if (this.run.length > 0 && this.gap.length > 0) {
        this.run.push(...this.gap);
        this.gap = [];
      }
      this.run.push({ frame, baselineDb });
      return [];
    }

    if (this.run.length === 0) return [];

    this.gap.push({ frame, baselineDb });
    const gapSpanMs = frame.tMs + FRAME_DURATION_MS - this.gap[0].frame.tMs;
    if (gapSpanMs >= MERGE_GAP_MS) {
      const emitted = this.closeRun();
      this.gap = [];
      return emitted;
    }
    return [];
  }

  /** Close any open run. Called when the Session stops. */
  flush(): Candidate[] {
    const emitted = this.closeRun();
    this.gap = [];
    return emitted;
  }

  private closeRun(): Candidate[] {
    if (this.run.length === 0) return [];
    const run = this.run;
    this.run = [];
    return splitAndFilter(run);
  }
}

function splitAndFilter(run: LoudFrame[]): Candidate[] {
  const candidate = toCandidate(run);
  if (candidate.durationMs < MIN_CANDIDATE_MS) return [];
  if (candidate.durationMs <= MAX_CANDIDATE_MS) return [candidate];

  // Split at the quietest frame in the middle half of the run.
  //
  // Searching the whole interior looks more natural but is a trap: on a run
  // of near-constant loudness the quietest frame is index 1, so each
  // recursion shaves a single frame off the front, that sliver is discarded
  // as shorter than MIN_CANDIDATE_MS, and a twelve-second run collapses to
  // its last six seconds. Restricting the search to the middle half
  // guarantees both sides are substantial and the recursion halves.
  const lo = Math.max(1, Math.floor(run.length * 0.25));
  const hi = Math.min(run.length - 1, Math.ceil(run.length * 0.75));
  let quietestIndex = lo;
  let quietestDb = Infinity;
  for (let i = lo; i < hi; i += 1) {
    if (run[i].frame.rmsDb < quietestDb) {
      quietestDb = run[i].frame.rmsDb;
      quietestIndex = i;
    }
  }
  const left = run.slice(0, quietestIndex);
  const right = run.slice(quietestIndex);
  if (left.length === 0 || right.length === 0) return [candidate];
  return [...splitAndFilter(left), ...splitAndFilter(right)];
}

function toCandidate(run: LoudFrame[]): Candidate {
  const first = run[0];
  const last = run[run.length - 1];
  const startMs = first.frame.tMs;
  const endMs = last.frame.tMs + FRAME_DURATION_MS;

  let peakDb = -Infinity;
  let baselineAtPeak = first.baselineDb;
  for (const lf of run) {
    if (lf.frame.rmsDb > peakDb) {
      peakDb = lf.frame.rmsDb;
      baselineAtPeak = lf.baselineDb;
    }
  }

  return {
    startMs,
    endMs,
    durationMs: endMs - startMs,
    peakDb,
    baselineDb: baselineAtPeak,
    intensityDb: Math.max(0, peakDb - baselineAtPeak),
    lowBandRatio: mean(run.map((lf) => lf.frame.lowBandRatio)),
    spectralFlatness: mean(run.map((lf) => lf.frame.spectralFlatness)),
    frameCount: run.length,
  };
}

import type { NightDate, NightId, RelativeDb, SessionMs } from '../shared/types';
import type { Candidate } from '../capture/candidate';
import { classifyAll } from './classifier';

/**
 * Bumped whenever any threshold, predicate or formula changes (ADR-009).
 * Minor bump = classifier-only change, replayable over stored Candidates.
 * Major bump = framing change, not replayable.
 */
export const ANALYSER_VERSION = '1.0.0';

/** PRD §7. Boundaries are inclusive-lower, exclusive-upper. */
export type IntensityBand = 'quiet' | 'mild' | 'moderate' | 'loud';

export const BAND_LOWER_BOUNDS_DB = {
  quiet: 0,
  mild: 5,
  moderate: 10,
  loud: 20,
} as const;

export function bandFor(intensityDb: RelativeDb): IntensityBand {
  if (intensityDb >= BAND_LOWER_BOUNDS_DB.loud) return 'loud';
  if (intensityDb >= BAND_LOWER_BOUNDS_DB.moderate) return 'moderate';
  if (intensityDb >= BAND_LOWER_BOUNDS_DB.mild) return 'mild';
  return 'quiet';
}

/** One inhalation/exhalation snore event. Identity is nightId + startMs. */
export interface SnoreEpisode {
  readonly startMs: SessionMs;
  readonly durationMs: number;
  readonly intensityDb: RelativeDb;
  readonly band: IntensityBand;
}

/** A gap of at least 10 minutes with no Snore Episode. */
export const QUIET_PERIOD_MIN_MS = 600_000;

export interface QuietPeriod {
  readonly startMs: SessionMs;
  readonly durationMs: number;
}

export type NightStatus = 'analysed' | 'insufficient';

/** Below this, a Snore Index would be arithmetic noise rather than a measure. */
export const MIN_MONITORED_MS_FOR_INDEX = 3_600_000;

export interface NightAnalysis {
  readonly nightId: NightId;
  readonly date: NightDate;
  readonly status: NightStatus;
  readonly monitoredMs: number;
  readonly interruptedMs: number;
  /**
   * Invariant I-A1: episodes per monitored hour, and **null — not zero —**
   * below one monitored hour. A twenty-minute nap must never report
   * "no snoring detected".
   *
   * This is deliberately NOT an Apnoea-Hypopnoea Index and must never be
   * presented as one (PRD §0).
   */
  readonly snoreIndex: number | null;
  /** Invariant I-A2: 0..1. */
  readonly snoreTimeFraction: number;
  readonly episodeCount: number;
  readonly episodes: readonly SnoreEpisode[];
  readonly bandDistribution: Readonly<Record<IntensityBand, number>>;
  readonly peakIntensityDb: RelativeDb | null;
  readonly medianIntensityDb: RelativeDb | null;
  readonly quietPeriods: readonly QuietPeriod[];
  readonly analyserVersion: string;
  readonly wasInterrupted: boolean;
}

export interface AnalyseNightInput {
  readonly nightId: NightId;
  readonly date: NightDate;
  readonly candidates: readonly Candidate[];
  readonly startMs: SessionMs;
  readonly stopMs: SessionMs;
  /** Time the app was not actually listening — excluded from monitoredMs. */
  readonly interruptedMs?: number;
}

/**
 * Build the immutable NightAnalysis for one Night (PRD §7).
 *
 * Invariant I-A4: the result is never mutated. Re-analysis produces a new
 * value with a new analyserVersion rather than silently changing a number the
 * user has already seen.
 */
export function analyseNight(input: AnalyseNightInput): NightAnalysis {
  const interruptedMs = input.interruptedMs ?? 0;

  // ADR-007: time we were not listening must not inflate the Snore Index by
  // shrinking the denominator's honesty. It is removed from monitored time.
  const monitoredMs = Math.max(0, input.stopMs - input.startMs - interruptedMs);

  // Invariant I-A3: only candidates wholly inside the monitored window count.
  const inWindow = input.candidates.filter(
    (c) => c.startMs >= input.startMs && c.endMs <= input.stopMs,
  );

  const episodes: SnoreEpisode[] = classifyAll(inWindow)
    .filter((c) => c.isSnore)
    .map((c) => ({
      startMs: c.candidate.startMs,
      durationMs: c.candidate.durationMs,
      intensityDb: c.candidate.intensityDb,
      band: bandFor(c.candidate.intensityDb),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const snoringMs = episodes.reduce((acc, e) => acc + e.durationMs, 0);
  const status: NightStatus =
    monitoredMs < MIN_MONITORED_MS_FOR_INDEX ? 'insufficient' : 'analysed';

  const intensities = episodes.map((e) => e.intensityDb).sort((a, b) => a - b);

  return {
    nightId: input.nightId,
    date: input.date,
    status,
    monitoredMs,
    interruptedMs,
    snoreIndex:
      status === 'analysed' ? episodes.length / (monitoredMs / 3_600_000) : null,
    snoreTimeFraction: monitoredMs > 0 ? Math.min(1, snoringMs / monitoredMs) : 0,
    episodeCount: episodes.length,
    episodes,
    bandDistribution: {
      quiet: episodes.filter((e) => e.band === 'quiet').length,
      mild: episodes.filter((e) => e.band === 'mild').length,
      moderate: episodes.filter((e) => e.band === 'moderate').length,
      loud: episodes.filter((e) => e.band === 'loud').length,
    },
    peakIntensityDb: intensities.length > 0 ? intensities[intensities.length - 1] : null,
    medianIntensityDb:
      intensities.length > 0 ? intensities[Math.floor(intensities.length / 2)] : null,
    quietPeriods: findQuietPeriods(episodes, input.startMs, input.stopMs),
    analyserVersion: ANALYSER_VERSION,
    wasInterrupted: interruptedMs > 0,
  };
}

/**
 * Stretches of silence, reported descriptively only.
 *
 * PRD §0 and FR-A6: a Quiet Period is **not** evidence of an apnoea. A
 * bedside microphone cannot distinguish "not snoring" from "not breathing",
 * and the UI must say so wherever these are shown.
 */
function findQuietPeriods(
  episodes: readonly SnoreEpisode[],
  startMs: SessionMs,
  stopMs: SessionMs,
): QuietPeriod[] {
  const periods: QuietPeriod[] = [];
  let cursor = startMs;
  for (const e of episodes) {
    const gap = e.startMs - cursor;
    if (gap >= QUIET_PERIOD_MIN_MS) periods.push({ startMs: cursor, durationMs: gap });
    cursor = Math.max(cursor, e.startMs + e.durationMs);
  }
  const tail = stopMs - cursor;
  if (tail >= QUIET_PERIOD_MIN_MS) periods.push({ startMs: cursor, durationMs: tail });
  return periods;
}

/** PRD §7 — product framing only. Explicitly non-clinical. */
export type SnoreIndexLabel = 'minimal' | 'light' | 'moderate' | 'heavy';

export function labelFor(snoreIndex: number | null): SnoreIndexLabel | null {
  if (snoreIndex === null) return null;
  if (snoreIndex < 5) return 'minimal';
  if (snoreIndex < 15) return 'light';
  if (snoreIndex < 30) return 'moderate';
  return 'heavy';
}

import type { Candidate } from '../capture/candidate';

/**
 * PRD §8 stage 5 — the acoustic classifier.
 *
 * ADR-002 chose a transparent four-predicate rule over a neural network
 * precisely so the app can answer "why wasn't that a snore?". Every rejection
 * carries its reason.
 *
 * Changing any constant here is an analyser change and requires an
 * ANALYSER_VERSION bump (ADR-009).
 */
export const CLASSIFIER_THRESHOLDS = {
  /** Snoring is soft-tissue vibration: low-frequency and harmonically rich. */
  minLowBandRatio: 0.55,
  /** The envelope of one respiratory event. */
  minDurationMs: 300,
  maxDurationMs: 6_000,
  /** Snoring is tonal. Fan hum, rain and white-noise machines are not. */
  maxSpectralFlatness: 0.4,
  /** The gap to neighbours must be consistent with a respiratory cycle. */
  minPeriodicityScore: 0.5,
} as const;

/** A human respiratory cycle during sleep. */
export const RESPIRATORY_CYCLE_MIN_MS = 2_000;
export const RESPIRATORY_CYCLE_MAX_MS = 8_000;

export type RejectionReason =
  | 'low_band_ratio_too_low'
  | 'too_short'
  | 'too_long'
  | 'too_noise_like'
  | 'not_periodic';

export interface Classification {
  readonly candidate: Candidate;
  readonly isSnore: boolean;
  /** Empty when accepted. Explainability is a product requirement (ADR-002). */
  readonly reasons: readonly RejectionReason[];
  readonly periodicityScore: number;
}

/**
 * How well a candidate's spacing from its neighbours matches breathing.
 *
 * An isolated bang — a door, a single cough — scores 0 and is rejected. A
 * candidate with at least one neighbour inside the respiratory window scores
 * highly. This is the predicate that separates "a noise happened" from
 * "someone is breathing loudly, repeatedly".
 */
export function periodicityScore(
  candidate: Candidate,
  neighbours: readonly Candidate[],
): number {
  let best = 0;
  for (const other of neighbours) {
    if (other === candidate) continue;
    const gapMs =
      other.startMs > candidate.startMs
        ? other.startMs - candidate.endMs
        : candidate.startMs - other.endMs;
    if (gapMs < 0) continue;
    if (gapMs >= RESPIRATORY_CYCLE_MIN_MS && gapMs <= RESPIRATORY_CYCLE_MAX_MS) {
      best = Math.max(best, 1);
    } else {
      // Decay smoothly outside the window rather than cliff-edging, so a
      // slightly irregular breather is not discarded wholesale.
      const distance =
        gapMs < RESPIRATORY_CYCLE_MIN_MS
          ? RESPIRATORY_CYCLE_MIN_MS - gapMs
          : gapMs - RESPIRATORY_CYCLE_MAX_MS;
      best = Math.max(best, Math.max(0, 1 - distance / RESPIRATORY_CYCLE_MAX_MS));
    }
  }
  return best;
}

/** Classify one Candidate in the context of its neighbours. */
export function classify(
  candidate: Candidate,
  neighbours: readonly Candidate[],
): Classification {
  const reasons: RejectionReason[] = [];
  const t = CLASSIFIER_THRESHOLDS;

  if (candidate.lowBandRatio < t.minLowBandRatio) reasons.push('low_band_ratio_too_low');
  if (candidate.durationMs < t.minDurationMs) reasons.push('too_short');
  if (candidate.durationMs > t.maxDurationMs) reasons.push('too_long');
  if (candidate.spectralFlatness > t.maxSpectralFlatness) reasons.push('too_noise_like');

  const periodicity = periodicityScore(candidate, neighbours);
  if (periodicity < t.minPeriodicityScore) reasons.push('not_periodic');

  return {
    candidate,
    isSnore: reasons.length === 0,
    reasons,
    periodicityScore: periodicity,
  };
}

/** Classify a whole night's Candidates, each against the others. */
export function classifyAll(candidates: readonly Candidate[]): Classification[] {
  return candidates.map((c) => classify(c, candidates));
}

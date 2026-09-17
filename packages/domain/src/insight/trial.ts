import type { NightAnalysis } from '../analysis/night-analysis';
import type { FactorName } from '../journal/anti-corruption';
import type { TrialId } from '../shared/types';
import { mean, stdDev } from '../shared/types';

/** Invariant I-I1: neither side of the comparison may be thinner than this. */
export const MIN_BASELINE_NIGHTS = 5;
export const MIN_INTERVENTION_NIGHTS = 5;
export const BASELINE_WINDOW_NIGHTS = 14;

export interface Intervention {
  readonly factor: FactorName;
  readonly description: string;
}

export type VerdictOutcome = 'improved' | 'no_change' | 'worse' | 'inconclusive';

export type InconclusiveReason =
  | 'insufficient_baseline_nights'
  | 'insufficient_intervention_nights'
  | 'analyser_version_mismatch';

export type Confidence = 'low' | 'moderate' | 'high';

/**
 * A Trial's outcome.
 *
 * Invariant I-I3: `confidence` is a required field and the only constructor
 * is {@link makeVerdict}, so a Verdict without a stated confidence is
 * unrepresentable rather than merely discouraged. Over-claiming is a
 * compile error.
 */
export interface Verdict {
  readonly outcome: VerdictOutcome;
  readonly confidence: Confidence;
  /** Change in mean Snore Index. Negative is an improvement. */
  readonly deltaSnoreIndex: number | null;
  /** Standardised effect size (Cohen's d). */
  readonly effectSize: number | null;
  readonly baselineN: number;
  readonly interventionN: number;
  readonly reason?: InconclusiveReason;
}

export function makeVerdict(v: Verdict): Verdict {
  return Object.freeze({ ...v });
}

export interface Trial {
  readonly id: TrialId;
  readonly intervention: Intervention;
  readonly startedAt: number;
  readonly baselineNights: readonly NightAnalysis[];
  readonly interventionNights: readonly NightAnalysis[];
}

function usable(nights: readonly NightAnalysis[]): NightAnalysis[] {
  // I-I4: a rejected or index-less night cannot contribute to a Verdict.
  return nights.filter((n) => n.status === 'analysed' && n.snoreIndex !== null);
}

/**
 * The most recent nights without an active Intervention (PRD §4.1).
 * Newest-first input is assumed.
 */
export function baselineWindow(nights: readonly NightAnalysis[]): NightAnalysis[] {
  return usable(nights).slice(0, BASELINE_WINDOW_NIGHTS);
}

/**
 * Judge a Trial.
 *
 * Three things this refuses to do, each of which a less careful version would
 * do happily: judge on too few nights; judge across an analyser version
 * boundary, where it would be measuring our code change rather than the
 * user's behaviour change (ADR-009); and state an outcome without a
 * confidence.
 */
export function concludeTrial(trial: Trial): Verdict {
  const baseline = usable(trial.baselineNights);
  const intervention = usable(trial.interventionNights);

  if (baseline.length < MIN_BASELINE_NIGHTS) {
    return makeVerdict({
      outcome: 'inconclusive',
      confidence: 'low',
      deltaSnoreIndex: null,
      effectSize: null,
      baselineN: baseline.length,
      interventionN: intervention.length,
      reason: 'insufficient_baseline_nights',
    });
  }

  if (intervention.length < MIN_INTERVENTION_NIGHTS) {
    return makeVerdict({
      outcome: 'inconclusive',
      confidence: 'low',
      deltaSnoreIndex: null,
      effectSize: null,
      baselineN: baseline.length,
      interventionN: intervention.length,
      reason: 'insufficient_intervention_nights',
    });
  }

  // ADR-009: a trial straddling a deploy is measuring the wrong thing.
  const versions = new Set([...baseline, ...intervention].map((n) => n.analyserVersion));
  if (versions.size > 1) {
    return makeVerdict({
      outcome: 'inconclusive',
      confidence: 'low',
      deltaSnoreIndex: null,
      effectSize: null,
      baselineN: baseline.length,
      interventionN: intervention.length,
      reason: 'analyser_version_mismatch',
    });
  }

  const b = baseline.map((n) => n.snoreIndex as number);
  const i = intervention.map((n) => n.snoreIndex as number);
  const delta = mean(i) - mean(b);

  const sb = stdDev(b);
  const si = stdDev(i);
  const pooled = Math.sqrt(
    ((b.length - 1) * sb * sb + (i.length - 1) * si * si) / (b.length + i.length - 2),
  );
  const d = pooled > 0 ? delta / pooled : 0;
  const magnitude = Math.abs(d);

  const outcome: VerdictOutcome =
    magnitude < 0.2 ? 'no_change' : delta < 0 ? 'improved' : 'worse';

  // Confidence is driven by effect size and by how much data backs it.
  const n = Math.min(b.length, i.length);
  let confidence: Confidence = 'low';
  if (magnitude >= 0.8 && n >= 10) confidence = 'high';
  else if (magnitude >= 0.5 && n >= 7) confidence = 'moderate';
  else if (outcome === 'no_change' && n >= 10) confidence = 'moderate';

  return makeVerdict({
    outcome,
    confidence,
    deltaSnoreIndex: delta,
    effectSize: d,
    baselineN: b.length,
    interventionN: i.length,
  });
}

/**
 * STOP-BANG — a validated screening questionnaire for obstructive sleep
 * apnoea risk.
 *
 * It is a *screening* instrument, deliberately sensitive rather than
 * specific. A high score means "this warrants a clinical conversation", not
 * "you have sleep apnoea". Invariant I-S4 forbids any output here from
 * asserting the presence or absence of a disease.
 */
export interface StopBangAnswers {
  /** S — Snoring loudly enough to be heard through a closed door. */
  readonly snoringLoudly: boolean;
  /** T — Tired, fatigued or sleepy during the daytime. */
  readonly tiredDuringDay: boolean;
  /** O — Anyone has observed you stop breathing during sleep. */
  readonly observedApnoea: boolean;
  /** P — Treated or untreated high blood pressure. */
  readonly highBloodPressure: boolean;
  /** B — BMI over 35 kg/m². */
  readonly bmiOver35: boolean;
  /** A — Age over 50. */
  readonly ageOver50: boolean;
  /** N — Neck circumference over 40 cm. */
  readonly neckOver40cm: boolean;
  /** G — The instrument's own item is male sex. Self-reported; may be declined. */
  readonly maleSex: boolean;
}

export type StopBangItem = keyof StopBangAnswers;

export const STOP_BANG_ITEMS: readonly StopBangItem[] = [
  'snoringLoudly',
  'tiredDuringDay',
  'observedApnoea',
  'highBloodPressure',
  'bmiOver35',
  'ageOver50',
  'neckOver40cm',
  'maleSex',
];

export type RiskBand = 'low' | 'intermediate' | 'high';

export interface StopBangResult {
  readonly score: number;
  readonly band: RiskBand;
}

/** A partially-completed screen. Values may be undefined. */
export type PartialStopBangAnswers = Partial<StopBangAnswers>;

export function isComplete(answers: PartialStopBangAnswers): answers is StopBangAnswers {
  return STOP_BANG_ITEMS.every((item) => typeof answers[item] === 'boolean');
}

/**
 * Score a completed screen.
 *
 * Invariant I-S1: a partial answer set yields **no band at all** — not a low
 * one. Treating unanswered items as "no" would systematically under-screen
 * exactly the users who abandoned the questionnaire.
 */
export function scoreStopBang(answers: PartialStopBangAnswers): StopBangResult | null {
  if (!isComplete(answers)) return null;
  const score = STOP_BANG_ITEMS.reduce(
    (acc, item) => acc + (answers[item] ? 1 : 0),
    0,
  );
  return { score, band: bandForScore(score) };
}

/** Invariant I-S2 — published thresholds: 0–2 low, 3–4 intermediate, ≥5 high. */
export function bandForScore(score: number): RiskBand {
  if (score >= 5) return 'high';
  if (score >= 3) return 'intermediate';
  return 'low';
}

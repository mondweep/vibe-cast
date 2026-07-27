/**
 * RESPONSE CAPACITY (Core) — derived-metric plumbing.
 *
 * PRD §4.5 requires that every figure we invent, as opposed to every figure
 * ASDMA reports, is labelled *derived* and shows its formula on hover. That
 * obligation is met structurally here: a derived metric is not a bare number,
 * it is a number travelling with the sum that produced it.
 *
 * **Why this is not shared with the Situation Assessment context.** It looks
 * like duplication and is not. Bounded contexts integrate through the published
 * language and the shared kernel, and never reach into one another — that rule
 * is enforced by `src/architecture.test.ts`. The shared kernel is deliberately
 * tiny (PRD §3.3: `AdministrativeUnit`, `ReportDate`, quantity types) and
 * widening it to carry presentation-shaped helpers would trade a small, honest
 * duplication for a large, permanent coupling. Two contexts happening to
 * describe their arithmetic the same way is a coincidence, not a dependency.
 *
 * Pure. No I/O, no clock.
 */

/**
 * How much of the input a metric actually had.
 *
 * `partial` is the important one: a figure computed from data containing
 * unknowns is still shown, but it must announce that it is incomplete rather
 * than passing as a full count (PRD §3.3).
 */
export type MetricCompleteness = 'complete' | 'partial' | 'unavailable';

/** The machine-readable provenance of a derived figure. */
export type Derivation = {
  /** Our name for the metric, e.g. "Ration Coverage Days". */
  readonly metric: string;
  /** The formula in ubiquitous language, e.g. "Inmates ÷ Relief Camps". */
  readonly formula: string;
  /** The same formula with this bulletin's numbers substituted in. */
  readonly substitution: string;
  /** What an officer should know before believing the number. */
  readonly note: string;
};

export const derivation = (
  metric: string,
  formula: string,
  substitution: string,
  note: string,
): Derivation => ({ metric, formula, substitution, note });

/** One line suitable for a tooltip. */
export const describeDerivation = (d: Derivation): string =>
  `${d.metric} = ${d.formula} = ${d.substitution} (${d.note})`;

/**
 * Render a number for a formula string.
 *
 * DRIMS emits float artefacts such as `2025.9200000000003`, and the arithmetic
 * we do on them produces more. Rounding happens here — at presentation — and
 * never at storage, so reconciliation still compares like with like.
 */
export const showOperand = (n: number | undefined): string =>
  n === undefined ? 'unknown' : String(Number(n.toFixed(6)));

/**
 * What happened when we divided.
 *
 * `unbounded` is a real, reportable state — 28,695 Inmates across 0 Relief
 * Camps is alarming, not an error — so it is distinguished from `unknown` (we
 * do not know) and from `zero-over-zero` (nothing is happening).
 */
export type QuotientOutcome = 'value' | 'unbounded' | 'zero-over-zero' | 'unknown';

export type DerivedQuotient = {
  /** `undefined` only when the inputs were unknown — never a stand-in zero. */
  readonly value: number | undefined;
  readonly unit: string;
  readonly outcome: QuotientOutcome;
  readonly derivation: Derivation;
  readonly completeness: MetricCompleteness;
};

export const derivedQuotient = (spec: {
  readonly metric: string;
  readonly formula: string;
  readonly unit: string;
  readonly numerator: number | undefined;
  readonly denominator: number | undefined;
  readonly note: string;
  /** Overrides the default `n ÷ d` rendering when the real sum is wordier. */
  readonly substitution?: string;
}): DerivedQuotient => {
  const substitution =
    spec.substitution ?? `${showOperand(spec.numerator)} ÷ ${showOperand(spec.denominator)}`;
  const d = derivation(spec.metric, spec.formula, substitution, spec.note);

  if (spec.numerator === undefined || spec.denominator === undefined) {
    return {
      value: undefined,
      unit: spec.unit,
      outcome: 'unknown',
      derivation: d,
      completeness: 'unavailable',
    };
  }

  if (spec.denominator === 0) {
    const zeroOverZero = spec.numerator === 0;
    return {
      value: zeroOverZero ? 0 : Number.POSITIVE_INFINITY,
      unit: spec.unit,
      outcome: zeroOverZero ? 'zero-over-zero' : 'unbounded',
      derivation: d,
      completeness: 'complete',
    };
  }

  return {
    value: spec.numerator / spec.denominator,
    unit: spec.unit,
    outcome: 'value',
    derivation: d,
    completeness: 'complete',
  };
};

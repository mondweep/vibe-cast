/**
 * Situation Assessment — derived-metric plumbing.
 *
 * PRD §4.5 requires that every figure we invent (as opposed to every figure
 * ASDMA reports) is labelled *derived* and shows its formula on hover, so that
 * no officer mistakes our arithmetic for ASDMA's reporting. That obligation is
 * met structurally: a derived metric is not a bare number, it is a number
 * travelling with the sum that produced it.
 *
 * The same plumbing is used by the Response Capacity context, which is
 * downstream of Situation Assessment in the context map (PRD §3.3,
 * Customer/Supplier). Nothing here imports from Response Capacity.
 *
 * Pure. No I/O, no clock.
 */

import type { Quantity } from '../shared/quantity';
import { isKnown } from '../shared/quantity';

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
  /** Our name for the metric, e.g. "Camp Uptake Rate". */
  readonly metric: string;
  /** The formula in ubiquitous language, e.g. "Inmates ÷ Affected Population". */
  readonly formula: string;
  /** The same formula with this bulletin's numbers substituted in. */
  readonly substitution: string;
  /** Anything an officer should know before believing the number. */
  readonly note?: string;
};

export const derivation = (
  metric: string,
  formula: string,
  substitution: string,
  note?: string,
): Derivation =>
  note === undefined
    ? { metric, formula, substitution }
    : { metric, formula, substitution, note };

/** One line suitable for a tooltip. */
export const describeDerivation = (d: Derivation): string =>
  `${d.metric} = ${d.formula} = ${d.substitution}${d.note === undefined ? '' : ` (${d.note})`}`;

export type DerivedMetric<T> = {
  /** `undefined` when the metric could not be computed — never a stand-in zero. */
  readonly value: T | undefined;
  readonly unit: string;
  readonly derivation: Derivation;
  readonly completeness: MetricCompleteness;
};

/** Render a shared-kernel quantity as a formula operand. Unknown says so. */
export const operandOf = <U extends string>(q: Quantity<U>): string =>
  isKnown(q) ? String(q.value) : 'unknown';

/**
 * Render a number for a formula string.
 *
 * DRIMS emits float artefacts such as `2025.9200000000003`, and the arithmetic
 * we do on them produces more. Rounding happens here — at presentation — and
 * never at storage, so reconciliation still compares like with like.
 */
export const showOperand = (n: number | undefined): string =>
  n === undefined ? 'unknown' : String(Number(n.toFixed(6)));

const operand = showOperand;

/**
 * What happened when we divided.
 *
 * `unbounded` is a real, reportable state — 28,695 Inmates across 0 Relief
 * Camps is alarming, not an error — so it is distinguished from `unknown`
 * (we do not know) and from `zero-over-zero` (nothing is happening).
 */
export type QuotientOutcome = 'value' | 'unbounded' | 'zero-over-zero' | 'unknown';

export type DerivedQuotient = DerivedMetric<number> & { readonly outcome: QuotientOutcome };

export const derivedQuotient = (spec: {
  readonly metric: string;
  readonly formula: string;
  readonly unit: string;
  readonly numerator: number | undefined;
  readonly denominator: number | undefined;
  readonly note?: string;
  /** Overrides the default `n ÷ d` rendering when the real sum is wordier. */
  readonly substitution?: string;
}): DerivedQuotient => {
  const substitution =
    spec.substitution ?? `${operand(spec.numerator)} ÷ ${operand(spec.denominator)}`;
  const d = derivation(spec.metric, spec.formula, substitution, spec.note);

  if (spec.numerator === undefined || spec.denominator === undefined) {
    return {
      value: undefined,
      unit: spec.unit,
      derivation: d,
      completeness: 'unavailable',
      outcome: 'unknown',
    };
  }

  if (spec.denominator === 0) {
    const zeroOverZero = spec.numerator === 0;
    return {
      value: zeroOverZero ? 0 : Number.POSITIVE_INFINITY,
      unit: spec.unit,
      derivation: d,
      completeness: 'complete',
      outcome: zeroOverZero ? 'zero-over-zero' : 'unbounded',
    };
  }

  return {
    value: spec.numerator / spec.denominator,
    unit: spec.unit,
    derivation: d,
    completeness: 'complete',
    outcome: 'value',
  };
};

export const derivedDifference = (spec: {
  readonly metric: string;
  readonly formula: string;
  readonly unit: string;
  readonly minuend: number | undefined;
  readonly subtrahends: readonly (number | undefined)[];
  readonly note?: string;
}): DerivedMetric<number> => {
  const substitution = [spec.minuend, ...spec.subtrahends].map(operand).join(' − ');
  const d = derivation(spec.metric, spec.formula, substitution, spec.note);

  const anyUnknown = spec.minuend === undefined || spec.subtrahends.some((t) => t === undefined);
  if (anyUnknown) {
    return { value: undefined, unit: spec.unit, derivation: d, completeness: 'unavailable' };
  }

  const value = spec.subtrahends.reduce<number>((acc, t) => acc - (t as number), spec.minuend);
  return { value, unit: spec.unit, derivation: d, completeness: 'complete' };
};

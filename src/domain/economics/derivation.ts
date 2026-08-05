/**
 * Rehabilitation Economics — rates we constructed, and the arithmetic that
 * makes them arguable (ADR-0014).
 *
 * ---------------------------------------------------------------------------
 * Why this is not a hole in ADR-0011
 * ---------------------------------------------------------------------------
 *
 * ADR-0011 says a rate that cannot cite its source cannot exist, and `unitRate`
 * throws to enforce it. That works while every rate is copied from a published
 * schedule.
 *
 * Replacement cost cannot be copied from anywhere. **Nobody publishes "the cost
 * of replacing a flood-destroyed dwelling in rural Assam".** The Assam PWD
 * Schedule of Rates prices *components* — a cubic metre of brickwork, a square
 * metre of CGI roofing — and getting from those to a cost per house requires
 * deciding how big the house is and what it is made of. Those decisions are
 * ours, and no citation will ever exist for them.
 *
 * So a constructed rate carries a **derivation** in place of a citation: a
 * formula plus every input, where each input is either
 *
 *   - `published` — a real SOR line, with a citation and an item number, or
 *   - `assumed`   — our judgement, with a low/high range and a written reason.
 *
 * There is no third kind and there is no bare number. The discipline is as
 * strict as citation; it is just a different discipline. An assumption without a
 * reason is as unconstructable as a rate without a publisher.
 *
 * ---------------------------------------------------------------------------
 * The range is computed, not chosen
 * ---------------------------------------------------------------------------
 *
 * `evaluate` returns low, central and high by running the formula at the
 * assumption bounds. That matters: a wide interval is then a *measurement* of
 * how much work the assumptions are doing, not a hedge someone picked. Narrowing
 * it requires a better assumption, which is the pressure this design exists to
 * create.
 *
 * Pure. No I/O, no clock.
 */

import type { Citation } from './money';

export type PublishedInput = {
  readonly kind: 'published';
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly citation: Citation;
};

export type AssumedInput = {
  readonly kind: 'assumed';
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  /** The plausible bounds. `low <= value <= high`, enforced. */
  readonly low: number;
  readonly high: number;
  /** Why this value, in a sentence a reviewer can disagree with. Required. */
  readonly reason: string;
};

export type DerivationInput = PublishedInput | AssumedInput;

export type Derivation = {
  /** The formula in words, e.g. "wall volume per m² × brickwork rate". */
  readonly formula: string;
  readonly inputs: readonly DerivationInput[];
  /**
   * Combine the inputs into one number.
   *
   * Takes the input values in declaration order, so the formula string and the
   * function cannot drift apart without the inputs list changing too.
   */
  readonly combine: (values: readonly number[]) => number;
};

export type Interval = {
  readonly low: number;
  readonly central: number;
  readonly high: number;
};

const blank = (value: string): boolean => value.trim() === '';

/**
 * Build a derivation, or throw.
 *
 * Same posture as `unitRate`: a malformed derivation is a programming error in a
 * hard-coded schedule, and it should stop a test rather than reach a screen.
 */
export const derivation = (spec: Derivation): Derivation => {
  if (spec.inputs.length === 0) {
    throw new Error('A derivation must name its inputs (ADR-0014); none were given.');
  }
  for (const input of spec.inputs) {
    if (blank(input.label) || blank(input.unit)) {
      throw new Error(`Every derivation input needs a label and a unit; got "${input.label}".`);
    }
    if (input.kind === 'assumed') {
      if (blank(input.reason)) {
        throw new Error(
          `The assumption "${input.label}" has no reason. An assumption a reviewer ` +
            'cannot argue with is not documented, it is only recorded (ADR-0014).',
        );
      }
      if (!(input.low <= input.value && input.value <= input.high)) {
        throw new Error(
          `The assumption "${input.label}" has value ${String(input.value)} outside its ` +
            `range ${String(input.low)}–${String(input.high)}.`,
        );
      }
    }
  }
  return spec;
};

/**
 * Evaluate a derivation at its central values and at its assumption bounds.
 *
 * Published inputs are held fixed — they are not ours to vary. Only assumptions
 * move, which is what makes the width of the interval mean "this is how much our
 * judgement is worth" rather than "this is how uncertain everything is".
 *
 * The bounds are found by evaluating every combination of assumption extremes
 * and taking the min and max, rather than by assuming the formula is monotonic
 * in each input. Most are, but a formula with a division or a subtraction is not,
 * and silently reporting a low that is not the lowest would be worse than not
 * reporting one.
 */
export const evaluate = (spec: Derivation): Interval => {
  const central = spec.combine(spec.inputs.map((input) => input.value));

  const assumedIndices = spec.inputs
    .map((input, index) => (input.kind === 'assumed' ? index : -1))
    .filter((index) => index >= 0);

  if (assumedIndices.length === 0) return { low: central, central, high: central };

  // 2^n corners. Guarded because the schedules here have a handful of
  // assumptions each and an accidental explosion should be loud, not slow.
  if (assumedIndices.length > 12) {
    throw new Error(
      `A derivation with ${String(assumedIndices.length)} assumptions is too uncertain to ` +
        'be worth evaluating; decompose it or source more of its inputs.',
    );
  }

  const results: number[] = [];
  for (let corner = 0; corner < 2 ** assumedIndices.length; corner++) {
    const values = spec.inputs.map((input) => input.value);
    assumedIndices.forEach((inputIndex, bit) => {
      const input = spec.inputs[inputIndex] as AssumedInput;
      values[inputIndex] = (corner >> bit) & 1 ? input.high : input.low;
    });
    results.push(spec.combine(values));
  }

  return { low: Math.min(...results), central, high: Math.max(...results) };
};

export type Sensitivity = {
  readonly label: string;
  /** high ÷ low of the assumption's own range. */
  readonly spread: number;
  /** Rupees the answer moves when ONLY this assumption goes low→high. */
  readonly swing: number;
};

/**
 * One-at-a-time sensitivity: what each assumption is actually worth.
 *
 * ---------------------------------------------------------------------------
 * Why spread was the wrong measure
 * ---------------------------------------------------------------------------
 *
 * The obvious ranking is by how wide an assumption's range is — high ÷ low —
 * and it is misleading, because a wide range on a small line moves the total
 * less than a narrow range on a large one. Measured against this model:
 *
 *   average damaged road length   7.5× spread   moves ₹5.1 cr
 *   share of the SDRF ceiling     3.3× spread   moves ₹55.0 cr
 *
 * Ranking by spread puts the first above the second and sends the reader to
 * argue about the wrong number. Ranking by **rupee swing** — move one
 * assumption to each bound, hold every other at its central value, and take the
 * difference — puts them in the order a reader should actually spend attention
 * in.
 *
 * `scale` is the caseload the derivation is applied to (3,494 dwellings, say),
 * so a per-unit derivation and an already-total one come out comparable.
 * Without it a per-dwelling assumption looks a thousand times less important
 * than it is.
 */
export const sensitivity = (spec: Derivation, scale = 1): readonly Sensitivity[] =>
  spec.inputs
    .map((input, index) => {
      if (input.kind !== 'assumed' || input.low === input.high) return undefined;
      const at = (value: number) =>
        spec.combine(spec.inputs.map((other, j) => (j === index ? value : other.value))) * scale;
      return {
        label: input.label,
        spread: input.low === 0 ? Number.POSITIVE_INFINITY : input.high / input.low,
        // Absolute, because a formula need not be increasing in every input.
        swing: Math.abs(at(input.high) - at(input.low)),
      };
    })
    .filter((s): s is Sensitivity => s !== undefined);

/** How much of the answer is our judgement: the interval width over its centre. */
export const relativeWidth = (interval: Interval): number =>
  interval.central === 0 ? 0 : (interval.high - interval.low) / interval.central;

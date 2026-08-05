/**
 * Rehabilitation Economics — applying a rate to a quantity.
 *
 * One multiplication, surrounded by the reasons not to do it.
 *
 * ---------------------------------------------------------------------------
 * A cost is never a bare number
 * ---------------------------------------------------------------------------
 *
 * `CostedLine` has no constructor taking an amount. The amount is *derived*
 * from a quantity and a rate, and both travel with it, so a figure on a screen
 * can always be decomposed into the half ASDMA reported and the half we chose.
 * That decomposition is the product's entire claim to being usable in a funding
 * document rather than a spreadsheet nobody can check.
 *
 * ---------------------------------------------------------------------------
 * Not costed is not zero, and not costed is not silent
 * ---------------------------------------------------------------------------
 *
 * Three things produce no figure: an unreported quantity, a schedule with no
 * rate for the category, and a rate whose unit does not match. All three yield
 * `undefined` rather than `0`, and all three are *named* in the total's caveat.
 *
 * The second one is the dangerous one. Infrastructure is typically the largest
 * line in a real damage assessment and this data cannot support it, so a total
 * that quietly excluded it would look complete while understating an appeal by
 * a wide margin. Understatement is the worse error here precisely because it is
 * invisible — nobody audits a number for being too small.
 *
 * Pure. No I/O, no clock.
 */

import type { Quantity } from '../shared/quantity';
import { isKnown } from '../shared/quantity';
import { formatMoney, type Citation, type Money, type UnitRate } from './money';

export type CostedLine = {
  /** What was costed, in the bulletin's own words. */
  readonly label: string;
  /** `undefined`, never zero, when the line could not be costed. */
  readonly amount: Money | undefined;
  readonly costed: boolean;
  /** Why there is no figure. Present exactly when `costed` is false. */
  readonly reasonNotCosted?: string;
  /** The quantity as reported, for the decomposition. */
  readonly quantity: number | undefined;
  readonly rate: UnitRate | undefined;
  readonly citation: Citation | undefined;
  /** "10 × ₹1,20,000 = ₹12,00,000", or "—". */
  readonly workings: string;
};

/**
 * Cost one line.
 *
 * The rate is optional because a schedule is legitimately incomplete
 * (ADR-0011 §4); `undefined` means "this schedule has no rate for this", which
 * is a different fact from "the quantity was not reported" and produces a
 * different sentence.
 */
export const costOf = <U extends string>(
  label: string,
  quantity: Quantity<U>,
  rate: UnitRate | undefined,
): CostedLine => {
  if (rate === undefined) {
    return {
      label,
      amount: undefined,
      costed: false,
      reasonNotCosted: `${label}: the active schedule has no rate for this, so it is not costed.`,
      quantity: isKnown(quantity) ? quantity.value : undefined,
      rate: undefined,
      citation: undefined,
      workings: '—',
    };
  }

  if (!isKnown(quantity)) {
    return {
      label,
      amount: undefined,
      costed: false,
      reasonNotCosted: `${label}: the quantity was not reported, so it is not costed.`,
      quantity: undefined,
      rate,
      citation: rate.citation,
      workings: '—',
    };
  }

  const amount: Money = {
    amount: quantity.value * rate.amount.amount,
    currency: rate.amount.currency,
    asOf: rate.amount.asOf,
  };

  return {
    label,
    amount,
    costed: true,
    quantity: quantity.value,
    rate,
    citation: rate.citation,
    workings: `${quantity.value.toLocaleString('en-IN')} × ${formatMoney(rate.amount)} = ${formatMoney(amount)}`,
  };
};

export type CostedTotal = {
  /** `undefined`, never zero, when nothing could be costed. */
  readonly amount: Money | undefined;
  /** The labels of every line that produced no figure. Never hidden. */
  readonly uncostedLines: readonly string[];
  /**
   * True when anything went uncosted, so the total is "at least this much".
   *
   * Not a formatting hint. A total with an uncosted infrastructure line is a
   * materially different claim from a complete one, and the difference has to
   * survive being copied into a memorandum.
   */
  readonly isFloor: boolean;
  readonly caveat: string;
};

/**
 * Add costed lines, and refuse to let the uncosted ones vanish.
 *
 * Lines are summed only when they share a currency — which today is always
 * true, and is asserted rather than assumed so a second currency cannot be
 * silently added to a rupee total.
 */
export const totalOf = (lines: readonly CostedLine[]): CostedTotal => {
  const costed = lines.filter((line) => line.amount !== undefined);
  const uncostedLines = lines.filter((line) => line.amount === undefined).map((line) => line.label);

  const currencies = new Set(costed.map((line) => line.amount?.currency));
  if (currencies.size > 1) {
    throw new Error(
      `Cannot total money in more than one currency: ${[...currencies].join(', ')}.`,
    );
  }

  const amount: Money | undefined =
    costed.length === 0
      ? undefined
      : {
          amount: costed.reduce((acc, line) => acc + (line.amount?.amount ?? 0), 0),
          currency: costed[0]?.amount?.currency ?? 'INR',
          asOf: costed[0]?.amount?.asOf ?? '',
        };

  const isFloor = uncostedLines.length > 0;

  return {
    amount,
    uncostedLines,
    isFloor,
    caveat: isFloor
      ? `Derived here, not reported by ASDMA. This is a floor — at least this much — because ` +
        `${String(uncostedLines.length)} item${uncostedLines.length === 1 ? '' : 's'} could not be ` +
        `costed and ${uncostedLines.length === 1 ? 'is' : 'are'} not included: ` +
        `${uncostedLines.join(', ')}.`
      : 'Derived here, not reported by ASDMA. Every line in this total carries a rate and a ' +
        'quantity; open a line to see both.',
  };
};

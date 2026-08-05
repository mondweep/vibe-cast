/**
 * Rehabilitation Economics — money, and the citation that makes it sayable.
 *
 * ADR-0011 in types. The bulletin contains no money at all, so every rupee this
 * context produces is a quantity ASDMA reported multiplied by a rate somebody
 * chose. The quantity half is auditable back to a printed Total row. The rate
 * half is a choice, and the whole design here exists to stop that choice
 * becoming invisible.
 *
 * The rule: **a rate that cannot cite its source cannot be constructed.** Not
 * "should not" — `unitRate` throws. It would otherwise be very easy to write
 *
 *     const HOUSE_FULLY_DAMAGED = 120_000;
 *
 * and ship something that works. That constant would then be indistinguishable
 * from a fact, would age silently, and would reach a funding appeal carrying
 * the authority of the bulletin behind it.
 *
 * Pure. No I/O, no clock — `asOf` and `effectiveFrom` are supplied, never read
 * from a system clock, so a costing is reproducible.
 */

/** Only one currency today. Present so an amount is never a bare number. */
export type Currency = 'INR';

/**
 * An amount of money, with the date its value is stated as of.
 *
 * `asOf` is not decoration: ₹1,20,000 in a 2022 schedule and ₹1,20,000 today
 * are different amounts of assistance, and the difference is exactly what
 * silently ages an assessment.
 */
export type Money = {
  readonly amount: number;
  readonly currency: Currency;
  /** ISO date the amount is stated as of. */
  readonly asOf: string;
};

/**
 * Where a rate came from, in enough detail to find it again.
 *
 * Every field is required. A citation with an empty publisher or reference is
 * not a citation, and `unitRate` refuses it — the check is on content, not on
 * the field being present, because `''` satisfies a type and proves nothing.
 */
export type Citation = {
  /** The body that published it, e.g. "Ministry of Home Affairs". */
  readonly publisher: string;
  /** The document, e.g. "Revised list of items and norms of assistance…". */
  readonly document: string;
  /** The circular or file number, e.g. "33-03/2020-NDM-I (Vol-II)". */
  readonly reference: string;
  /** Where in it, e.g. "Annexure, Housing". */
  readonly clause: string;
  /** Where this copy was obtained, so a reader can check it. */
  readonly source: string;
  /** ISO date it was retrieved. */
  readonly retrievedOn: string;
};

/**
 * What a rate is per.
 *
 * In the type, so a per-hectare rate cannot be applied to a headcount and a
 * per-person-day rate cannot be applied to a stock of people. The unit mismatch
 * is a compile error rather than a review comment (ADR-0012 §3).
 */
export type RateUnit =
  | 'per-house'
  | 'per-hut'
  | 'per-cattle-shed'
  | 'per-large-animal'
  | 'per-small-animal'
  | 'per-bird'
  | 'per-hectare'
  | 'per-deceased-person'
  | 'per-person-day';

/**
 * Which question a schedule answers. Never mixed in one total.
 *
 * A house-damage figure on norm rates and one on replacement cost are not
 * competing estimates of the same thing — norm rates are assistance, and are
 * typically well below what rebuilding costs. Presenting one as the other is
 * the most common way an assessment misleads.
 */
export type CostBasis = 'compensation-norm' | 'replacement' | 'programme';

export type UnitRate = {
  readonly amount: Money;
  readonly unit: RateUnit;
  /** ISO date the rate takes effect. */
  readonly effectiveFrom: string;
  /**
   * ISO date it ceases to apply, when the publisher set one.
   *
   * Government schedules routinely carry an end date — the SDRF norms below run
   * "till the financial year 2025-26" — and an assessment computed outside that
   * window is using a rate its publisher no longer stands behind. Recording it
   * is what lets the model say so instead of quietly producing a number.
   */
  readonly effectiveTo?: string;
  readonly citation: Citation;
};

const blank = (value: string): boolean => value.trim() === '';

/**
 * Construct a rate, or throw.
 *
 * Throwing rather than returning a result type is deliberate and narrow: a
 * missing citation is a programming error in a hard-coded schedule, not a
 * runtime condition a caller can handle. It should stop a test, loudly, at the
 * moment somebody adds a rate they cannot source.
 */
export const unitRate = (spec: UnitRate): UnitRate => {
  const { publisher, document, reference, clause, source, retrievedOn } = spec.citation;
  if (
    [publisher, document, reference, clause, source, retrievedOn].some(blank)
  ) {
    throw new Error(
      `A rate must cite its source (ADR-0011). Missing citation detail for a ` +
        `${spec.unit} rate of ${String(spec.amount.amount)} ${spec.amount.currency}.`,
    );
  }
  if (!Number.isFinite(spec.amount.amount) || spec.amount.amount < 0) {
    throw new Error(`A rate must be a non-negative finite amount, got ${String(spec.amount.amount)}.`);
  }
  return spec;
};

/** Format for display. Indian grouping, because the audience reads lakhs. */
export const formatMoney = (money: Money): string =>
  `₹${money.amount.toLocaleString('en-IN')}`;

/**
 * Rehabilitation Economics — comparing a compensation demand against what
 * reconstruction actually costs.
 *
 * ---------------------------------------------------------------------------
 * The comparison that is easy to make dishonestly
 * ---------------------------------------------------------------------------
 *
 * A public demand for "₹10 lakh per affected household" and a reconstruction
 * estimate look like the same kind of number and are not. Set side by side
 * without care they produce a headline — "the demand is 190 times the cost of
 * rebuilding" — that is arithmetically true and substantively worthless.
 *
 * **Almost the entire gap is the denominator, not the rate.**
 *
 *   houses destroyed outright ....................    3,494 households
 *   households affected (peak, at 4.9 people each)  ~147,000 households
 *
 * So roughly **98% of the households a per-affected-household payment would
 * reach did not lose their dwelling**. They were inundated, displaced, lost a
 * standing crop, lost earnings, lost stored grain and possessions. A
 * reconstruction cost values none of that, because it prices bricks.
 *
 * The two figures therefore answer different questions:
 *
 *   reconstruction  "what would it cost to rebuild what was destroyed?"
 *   the demand      "what should a flood-affected household receive?"
 *
 * The first is an engineering estimate. The second is a claim about what people
 * are owed, which no schedule of rates can settle. This module compares them
 * and refuses to net them off, subtract one from the other, or call either one
 * correct.
 *
 * ---------------------------------------------------------------------------
 * What it can honestly say
 * ---------------------------------------------------------------------------
 *
 * Held at a common denominator, the comparison becomes informative rather than
 * rhetorical: for a household that *did* lose its dwelling, ₹10 lakh is about
 * four and a half times what rebuilding it to a permanent standard on a raised
 * plinth costs. That is not an argument that the demand is too high — it is a
 * statement that the demand covers considerably more than a house, which is
 * what its proponents say it is for.
 *
 * Pure. No I/O, no clock.
 */

import type { Interval } from './derivation';
import type { Money } from './money';

/**
 * A stated compensation figure being compared against.
 *
 * Deliberately NOT a `UnitRate`. A rate is something the model multiplies by a
 * quantity to produce a cost; this is a claim somebody has made in public, and
 * treating it as a rate would let it be summed into totals as though the model
 * endorsed it. `source` says who is asking, never "norm" or "schedule".
 */
export type CompensationBenchmark = {
  readonly label: string;
  readonly amountPerHousehold: Money;
  /** Who is asking, and in what forum. Never presented as an entitlement. */
  readonly source: string;
};

export type BenchmarkComparison = {
  readonly benchmark: CompensationBenchmark;

  /** Households whose dwelling was destroyed outright. */
  readonly dwellingsDestroyed: number | undefined;
  /** Households affected, derived from people affected and an assumed size. */
  readonly householdsAffected: number | undefined;
  /** Affected households per destroyed dwelling — the size of the gap. */
  readonly denominatorRatio: number | undefined;
  /** Share of affected households that did NOT lose a dwelling, as a percent. */
  readonly notDestroyedSharePercent: number | undefined;

  /** The demand, paid to every affected household. */
  readonly demandAcrossAffected: Interval | undefined;
  /** The demand, paid only to households that lost a dwelling. */
  readonly demandAcrossDestroyed: number | undefined;
  /** Reconstruction of every destroyed dwelling, build-back-better. */
  readonly reconstructionOfDestroyed: Interval | undefined;

  /** Demand ÷ reconstruction, for ONE household that lost its dwelling. */
  readonly perHouseholdMultiple: number | undefined;

  /** Why the two are not the same question. Never omitted. */
  readonly caveat: string;
};

const CAVEAT =
  'These two figures answer different questions and must not be netted off against each ' +
  'other. Reconstruction prices rebuilding what was destroyed; the demand is a claim about ' +
  'what a flood-affected household should receive, which no schedule of rates can settle. ' +
  'Almost all of the difference between the totals is the denominator, not the rate: the ' +
  'demand would reach every affected household, and most of those did not lose a dwelling. ' +
  'The household count is derived from people affected using an assumed household size, ' +
  'because the bulletin reports people and never households.';

/**
 * Compare a stated per-household demand against reconstruction.
 *
 * `affectedPeople` should be a peak, never a sum — affected population is a
 * stock and adding it across days counts the same person repeatedly (ADR-0012).
 */
export const compareWithBenchmark = (
  benchmark: CompensationBenchmark,
  input: {
    readonly affectedPeople: number | undefined;
    readonly dwellingsDestroyed: number | undefined;
    /** People per household. An assumption; the bulletin never reports it. */
    readonly householdSize: { readonly central: number; readonly low: number; readonly high: number };
    /** Cost of rebuilding one dwelling to a permanent standard, raised. */
    readonly reconstructionPerDwelling: Interval;
  },
): BenchmarkComparison => {
  const { affectedPeople, dwellingsDestroyed, householdSize, reconstructionPerDwelling } = input;
  const perHousehold = benchmark.amountPerHousehold.amount;

  const householdsAffected =
    affectedPeople === undefined ? undefined : affectedPeople / householdSize.central;

  // A LARGER household size means FEWER households, so the bounds cross over:
  // the high household-size bound produces the low household count and thus the
  // low demand. Getting this backwards would report the range inverted.
  const demandAcrossAffected: Interval | undefined =
    affectedPeople === undefined
      ? undefined
      : {
          low: (affectedPeople / householdSize.high) * perHousehold,
          central: (affectedPeople / householdSize.central) * perHousehold,
          high: (affectedPeople / householdSize.low) * perHousehold,
        };

  const reconstructionOfDestroyed: Interval | undefined =
    dwellingsDestroyed === undefined
      ? undefined
      : {
          low: reconstructionPerDwelling.low * dwellingsDestroyed,
          central: reconstructionPerDwelling.central * dwellingsDestroyed,
          high: reconstructionPerDwelling.high * dwellingsDestroyed,
        };

  const denominatorRatio =
    householdsAffected === undefined || dwellingsDestroyed === undefined || dwellingsDestroyed === 0
      ? undefined
      : householdsAffected / dwellingsDestroyed;

  return {
    benchmark,
    dwellingsDestroyed,
    householdsAffected,
    denominatorRatio,
    notDestroyedSharePercent:
      householdsAffected === undefined || dwellingsDestroyed === undefined || householdsAffected === 0
        ? undefined
        : ((householdsAffected - dwellingsDestroyed) / householdsAffected) * 100,
    demandAcrossAffected,
    demandAcrossDestroyed:
      dwellingsDestroyed === undefined ? undefined : dwellingsDestroyed * perHousehold,
    reconstructionOfDestroyed,
    perHouseholdMultiple:
      reconstructionPerDwelling.central === 0
        ? undefined
        : perHousehold / reconstructionPerDwelling.central,
    caveat: CAVEAT,
  };
};

/**
 * The ₹10 lakh demand.
 *
 * Recorded as a benchmark with its source stated as a public demand, so it can
 * never be mistaken for an entitlement the model has verified. The figure is
 * the one being asked for, not one this console derived or endorses.
 */
export const TEN_LAKH_DEMAND: CompensationBenchmark = {
  label: '₹10 lakh per affected household',
  amountPerHousehold: { amount: 1_000_000, currency: 'INR', asOf: '2026-08-06' },
  source:
    'A publicly stated demand, not a published norm and not an entitlement. It is shown here ' +
    'to be compared against, not because this console has assessed it as correct.',
};

/**
 * People per household in Assam.
 *
 * Assumed, and it has to be: the bulletin counts people and never households,
 * so every household figure on this view rests on this one number. 4.9 is the
 * Assam average from Census 2011; the range spans urban households (smaller)
 * and rural ones (larger), and the flood-affected population is predominantly
 * rural, which argues for the upper half of the range.
 *
 * **Checked and confirmed.** Census 2011 records 6,406,471 households in Assam
 * against a population of 31,205,576 — an average of 4.87, which is what 4.9
 * rounds from. Of those households 5,420,877 are rural. This is the only
 * assumption in the model that a public source settles outright, and it is the
 * reason the household-size range is narrow where the others are wide.
 */
export const ASSAM_HOUSEHOLD_SIZE = { central: 4.9, low: 4.4, high: 5.4 } as const;

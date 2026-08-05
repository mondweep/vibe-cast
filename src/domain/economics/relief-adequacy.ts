/**
 * Rehabilitation Economics — checking the exposure model against reality.
 *
 * ---------------------------------------------------------------------------
 * Why this exists before anything that costs money
 * ---------------------------------------------------------------------------
 *
 * The rehabilitation model's central quantity is person-days (ADR-0012), and
 * person-days are a *derived* figure: nothing in the bulletin states them, so
 * nothing in the bulletin contradicts them either. A derived figure that cannot
 * be checked is a figure people are entitled to disbelieve.
 *
 * It can be checked here, and cheaply. The bulletin reports relief **actually
 * distributed** — rice and dal in quintals, mustard oil in litres — which is
 * real expenditure already incurred, stated in physical units. Divide it by the
 * person-days and the answer is the ration rate that was genuinely delivered.
 *
 * No rates. No currency. No norm schedule. This works today, before anything in
 * ADR-0011 is sourced, and it is the strongest available answer to "why should
 * I believe your person-day number".
 *
 * ---------------------------------------------------------------------------
 * The denominator is the finding
 * ---------------------------------------------------------------------------
 *
 * The numerator is solid: ASDMA printed it. The denominator is a genuine
 * question, because the bulletin never says who the relief reached. Camp
 * inmates certainly. People outside camps, largely — that is what a Relief
 * Distribution Centre is for. The wider affected population, sometimes.
 *
 * Those three denominators differ by an order of magnitude, so the implied
 * ration does too. This module therefore reports **one rate per basis** and
 * refuses to pick. A single number here would be manufactured precision, and
 * the spread between the bases is more informative than any one of them: it is
 * the honest width of what the data can tell you.
 *
 * ---------------------------------------------------------------------------
 * What this is not
 * ---------------------------------------------------------------------------
 *
 * It is not a compliance check. What was handed out and what people were owed
 * are different facts, and this module knows nothing about entitlement — that
 * belongs with the norm schedules of ADR-0011. A delivered rate below a norm
 * may mean under-provision, or may mean the denominator is wrong, or may mean
 * relief arrived in a lump on a day this window does not cover.
 *
 * Pure. No I/O, no clock. Depends on the shared kernel only, so the
 * Rehabilitation Economics context stays isolated from Temporal Comparison —
 * exposure arrives as data, computed by the caller.
 */

import type { PersonDays, Quintals } from '../shared/quantity';
import { isKnown, quintalsToKilograms } from '../shared/quantity';

/**
 * One candidate answer to "who was being fed", with its exposure.
 *
 * Supplied by the caller rather than derived here, because choosing the bases
 * is a judgement about the response and not arithmetic.
 */
export type ExposureBasis = {
  /** How this population is described on screen, e.g. "Camp inmates". */
  readonly label: string;
  readonly personDays: PersonDays;
};

export type ImpliedRation = {
  readonly basis: string;
  /**
   * Kilograms per person per day as actually delivered. `undefined`, never 0,
   * when the quantity was unreported, the exposure is unknown, or the exposure
   * is zero.
   */
  readonly kgPerPersonPerDay: number | undefined;
  /** The division with real numbers in it, so it can be checked by hand. */
  readonly workings: string;
  /** What must be known before quoting the rate. Never empty. */
  readonly caveat: string;
};

const format = (value: number, dp: number): string =>
  value.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const CAVEAT =
  'Derived here, not reported by ASDMA. This is what was distributed divided by the ' +
  'exposure, so it is the rate delivered and not the rate anyone was entitled to — ' +
  'entitlement is a norm question and this figure knows nothing about norms. The ' +
  'bulletin does not say who the relief reached, so the basis is a choice: compare the ' +
  'bases rather than quoting one.';

/**
 * The ration rate implied by relief actually distributed, one rate per basis.
 *
 * Returns an entry per basis in the order given, so a caller can render the
 * spread. An empty basis list yields an empty result rather than a total.
 */
export const impliedRation = (
  distributed: Quintals,
  bases: readonly ExposureBasis[],
): readonly ImpliedRation[] => {
  const kilograms = quintalsToKilograms(distributed);

  return bases.map((basis): ImpliedRation => {
    // Every one of these three refusals is an ADR-0005 case: unreported relief,
    // unknown exposure and zero exposure are all "we cannot say", and none of
    // them is a ration of nothing. Zero exposure matters most — it is what an
    // empty timeline produces, and dividing by it yields Infinity, which would
    // render as a very confident number.
    if (!isKnown(kilograms) || !isKnown(basis.personDays) || basis.personDays.value === 0) {
      return {
        basis: basis.label,
        kgPerPersonPerDay: undefined,
        workings: '—',
        caveat: CAVEAT,
      };
    }

    const rate = kilograms.value / basis.personDays.value;

    return {
      basis: basis.label,
      kgPerPersonPerDay: rate,
      workings:
        `${format(isKnown(distributed) ? distributed.value : 0, 0)} quintals = ` +
        `${format(kilograms.value, 0)} kg ÷ ${format(basis.personDays.value, 0)} person-days = ` +
        `${format(rate, 3)} kg`,
      caveat: CAVEAT,
    };
  });
};

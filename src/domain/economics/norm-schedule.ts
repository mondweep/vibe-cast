/**
 * Rehabilitation Economics — the cost norm catalogue (ADR-0011).
 *
 * ---------------------------------------------------------------------------
 * Why the categories look like the bulletin
 * ---------------------------------------------------------------------------
 *
 * `HouseDamage` in the published language splits Kuccha/Pukka and
 * Fully-Severely/Partially. That is four categories, and it is not an accident
 * of layout — the parser's own comment has said so since it was written: *"the
 * split drives compensation."*
 *
 * The reason is that DRIMS and the SDRF norms descend from the same relief
 * framework, so the bulletin reports damage in the categories assistance is
 * paid in. The mapping below is therefore mostly one-to-one and needs no
 * interpretation, which is a large part of why this feature is feasible at all.
 *
 * Where it is *not* one-to-one, the schedule says nothing rather than
 * approximating. Infrastructure is the big one: the bulletin itemises hundreds
 * of damaged assets and dimensions none of them — a road with no length, an
 * embankment with no breach width — and the SDRF rates for those are per
 * kilometre and per culvert. There is no honest multiplication to do, so there
 * is no rate here for it.
 *
 * Pure data. No I/O, no clock.
 */

import { unitRate, type CostBasis, type UnitRate } from './money';

/**
 * A category a rate can be attached to.
 *
 * Named after what the bulletin reports, not after what the schedule calls it,
 * so the mapping is visible at the point of use rather than buried in an
 * adapter.
 */
export type NormCategory =
  | 'house-fully-severely-damaged'
  | 'house-partially-damaged-pucca'
  | 'house-partially-damaged-kuccha'
  | 'hut-destroyed'
  | 'cattle-shed-damaged'
  | 'large-animal-lost'
  | 'small-animal-lost'
  | 'poultry-lost'
  | 'flood-death'
  | 'crop-area-lost'
  | 'gratuitous-relief-per-person-day';

export type NormSchedule = {
  readonly id: string;
  readonly name: string;
  readonly basis: CostBasis;
  readonly version: string;
  /** ISO date the schedule takes effect. */
  readonly effectiveFrom: string;
  /** ISO date it ceases to apply, when the publisher set one. */
  readonly effectiveTo?: string;
  /**
   * Rates by category. **Deliberately partial.** A category with no rate yields
   * an unknown cost and an explicit "not costed" line, never ₹0 — silently
   * dropping an uncosted category from a total understates an appeal, which is
   * a more damaging error here than overstatement because it is invisible.
   */
  readonly rates: Partial<Record<NormCategory, UnitRate>>;
};

const MHA_2022 = {
  publisher: 'Ministry of Home Affairs, Government of India',
  document:
    'Revised list of items and norms of assistance from the State Disaster Response Fund ' +
    '(SDRF) and National Disaster Response Fund (NDRF) for the period 2022-23 to 2025-26',
  reference: 'F. No. 33-03/2020-NDM-I (Vol-II) dated 10 October 2022',
  source:
    'Reproduced by DDMA Kokrajhar, Government of Assam — ' +
    'https://kokrajhar.assam.gov.in/sites/default/files/public_utility/' +
    'Revised%20SDRF%20Norms%20&%20Assistance.pdf',
  retrievedOn: '2026-08-06',
} as const;

const cite = (clause: string) => ({ ...MHA_2022, clause });

/** ₹, as of the circular's date. Amounts are stated, not indexed. */
const rupees = (amount: number) => ({ amount, currency: 'INR' as const, asOf: '2022-10-10' });

const EFFECTIVE_FROM = '2022-10-10';
/** "…effective from the date of issue of this letter till the financial year 2025-26." */
const EFFECTIVE_TO = '2026-03-31';

const norm = (amount: number, unit: UnitRate['unit'], clause: string): UnitRate =>
  unitRate({
    amount: rupees(amount),
    unit,
    effectiveFrom: EFFECTIVE_FROM,
    effectiveTo: EFFECTIVE_TO,
    citation: cite(clause),
  });

/**
 * The SDRF schedule as it applies in Assam, 2022-23 to 2025-26.
 *
 * WHAT IS DELIBERATELY MISSING, and why each absence is the honest answer:
 *
 *   - **Infrastructure.** The norms pay per kilometre of road and per culvert;
 *     the bulletin reports named items without dimensions. Nothing to multiply.
 *   - **Gratuitous relief per person-day.** The norm is not a fixed rupee
 *     figure — it is "the actual rate of MNREGA per day or the average rate of
 *     all States/UTs per day, whichever is lower", which is a different
 *     publication with its own effective dates. Inventing a number to stand in
 *     for it would be exactly what ADR-0011 forbids. The person-day exposure is
 *     still reported as a quantity, and the back-test still checks it.
 *   - **Hilly-area house rate (₹1,30,000).** The schedule carries the plains
 *     rate. Assam has hill Districts — Karbi Anglong, Dima Hasao — so this
 *     understates them, and the rate is user-overridable per ADR-0011 §5.
 *
 * AND THE ONE THAT MATTERS MOST: this schedule **expired on 31 March 2026**.
 * The bulletins it would be applied to are from July and August 2026, which is
 * financial year 2026-27 — the first year of the Sixteenth Finance Commission
 * cycle, and one year beyond what this circular covers. A successor very likely
 * exists and could not be verified. `effectiveTo` is set so the model can say
 * this rather than quietly producing a confident number; see `appliesOn`.
 */
export const SDRF_ASSAM_2022: NormSchedule = {
  id: 'sdrf-assam-2022',
  name: 'SDRF norms of assistance (India), 2022-23 to 2025-26',
  basis: 'compensation-norm',
  version: '2022-10-10',
  effectiveFrom: EFFECTIVE_FROM,
  effectiveTo: EFFECTIVE_TO,
  rates: {
    // "Fully/Severely damaged/destroyed houses (Pucca/Kutcha): 1,20,000 (plain
    // areas)". One rate covers both Pucca and Kuccha at this severity — the
    // schedule stops distinguishing them once the house is gone.
    'house-fully-severely-damaged': norm(120_000, 'per-house', 'Housing — fully/severely damaged, plain areas'),
    'house-partially-damaged-pucca': norm(6_500, 'per-house', 'Housing — partially damaged, Pucca'),
    'house-partially-damaged-kuccha': norm(4_000, 'per-house', 'Housing — partially damaged, Kutcha'),
    'hut-destroyed': norm(8_000, 'per-hut', 'Housing — huts'),
    'cattle-shed-damaged': norm(3_000, 'per-cattle-shed', 'Housing — cattle shed attached with house'),
    // "Buffalo/cow/camel/yak/Mithun etc. - 37,500". Draught animals are 32,000
    // and the bulletin does not distinguish them, so the milch rate is used and
    // this line therefore leans high for draught-heavy Districts.
    'large-animal-lost': norm(37_500, 'per-large-animal', 'Animal Husbandry — milch animals'),
    'small-animal-lost': norm(4_000, 'per-small-animal', 'Animal Husbandry — sheep/goat/pig'),
    'poultry-lost': norm(100, 'per-bird', 'Animal Husbandry — poultry, per bird'),
    'flood-death': norm(400_000, 'per-deceased-person', 'Ex-gratia payment to families of deceased persons'),
    // "Input subsidy (crop loss is more than 33%) … 8,500/- Ha. in rain fed
    // areas". NOT interchangeable with submerged area — see `costing.ts`.
    'crop-area-lost': norm(8_500, 'per-hectare', 'Agriculture — input subsidy, rain-fed areas'),
  },
};

/** Every schedule the console ships with. */
export const NORM_SCHEDULES: readonly NormSchedule[] = [SDRF_ASSAM_2022];

export type SchedulePeriodCheck =
  | { readonly applies: true }
  | { readonly applies: false; readonly reason: string };

/**
 * Whether a schedule covers a date, and if not, why not in words.
 *
 * This is the guard that stops the model's headline defect: applying an expired
 * schedule and presenting the result as an entitlement. It does not refuse to
 * compute — an out-of-period figure is still the best available indication —
 * but the reason travels with the number so it cannot be quoted bare.
 */
export const appliesOn = (schedule: NormSchedule, isoDate: string): SchedulePeriodCheck => {
  if (isoDate < schedule.effectiveFrom) {
    return {
      applies: false,
      reason:
        `${schedule.name} takes effect on ${schedule.effectiveFrom}, which is after ` +
        `${isoDate}. These rates did not apply to this bulletin.`,
    };
  }
  if (schedule.effectiveTo !== undefined && isoDate > schedule.effectiveTo) {
    return {
      applies: false,
      reason:
        `${schedule.name} ceased to apply on ${schedule.effectiveTo}, and this bulletin is ` +
        `dated ${isoDate}. The figures below use rates their publisher no longer stands ` +
        `behind, because no successor schedule has been sourced. Treat them as indicative ` +
        `of scale, not as an entitlement.`,
    };
  }
  return { applies: true };
};

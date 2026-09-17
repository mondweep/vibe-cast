import { UNKNOWN, isKnown, type JournalFactors, type FactorValue } from './factors';

/**
 * The anti-corruption layer between Sleep Journal and Insight & Coaching
 * (PRD §4.3).
 *
 * The journal stores what the user *said* — "2 glasses of wine", "stuffy
 * nose". Insight needs comparable numbers. Putting that translation here
 * means journal UX can change freely without touching the correlation engine,
 * and the correlation engine never has to know what a glass of wine is.
 */

/** A UK unit is 10 ml of pure alcohol. A 175 ml glass of 12 % wine is ~2.1. */
export const UNITS_PER_WINE_GLASS_175ML = 2.1;
export const UNITS_PER_PINT_BEER_4PC = 2.3;
export const UNITS_PER_SPIRIT_MEASURE_25ML = 1.0;

export interface DrinkTally {
  readonly wineGlasses?: number;
  readonly beerPints?: number;
  readonly spiritMeasures?: number;
}

/**
 * Translate a drink tally into alcohol units.
 *
 * An entirely empty tally is UNKNOWN, not zero — the user told us nothing.
 * A tally with an explicit zero in it is a real zero: they told us they had
 * none. Preserving that distinction is the whole point of this layer.
 */
export function toAlcoholUnits(tally: DrinkTally | undefined): FactorValue<number> {
  if (tally === undefined) return UNKNOWN;
  const entries = [tally.wineGlasses, tally.beerPints, tally.spiritMeasures];
  if (entries.every((e) => e === undefined)) return UNKNOWN;
  return (
    (tally.wineGlasses ?? 0) * UNITS_PER_WINE_GLASS_175ML +
    (tally.beerPints ?? 0) * UNITS_PER_PINT_BEER_4PC +
    (tally.spiritMeasures ?? 0) * UNITS_PER_SPIRIT_MEASURE_25ML
  );
}

/** Numeric encoding of a Factor for correlation, or null when unknown. */
export function toNumericFactor(value: FactorValue<unknown>): number | null {
  if (!isKnown(value)) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 'back') return 1;
  if (value === 'side') return 0;
  if (value === 'front') return 0;
  return null;
}

export type FactorName = keyof JournalFactors;

export const MODIFIABLE_FACTORS: readonly FactorName[] = [
  'alcoholUnits',
  'lastDrinkMinutesBeforeBed',
  'caffeineAfter2pm',
  'lastMealMinutesBeforeBed',
  'nasalCongestion',
  'intendedPosition',
  'bedtimeMinutes',
  'weightKg',
];

/**
 * Project a JournalEntry's factors into the numeric space Insight works in.
 * Unknown factors come through as null and are excluded from each factor's n
 * downstream, rather than being silently counted as zero.
 */
export function projectFactors(
  factors: JournalFactors,
): Readonly<Record<FactorName, number | null>> {
  const out: Partial<Record<FactorName, number | null>> = {};
  for (const name of MODIFIABLE_FACTORS) {
    out[name] = toNumericFactor(factors[name]);
  }
  return out as Record<FactorName, number | null>;
}

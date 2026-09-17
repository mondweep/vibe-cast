import type { NightDate, UserId } from '../shared/types';

/**
 * A Factor value that the user did not supply.
 *
 * Invariant I-J3, and the single most important idea in this module:
 * **silence is not a zero.** A month of unanswered alcohol questions must not
 * look like a month of teetotalism, or the correlation engine will confidently
 * report the opposite of the truth.
 */
export const UNKNOWN = Symbol('unknown');
export type Unknown = typeof UNKNOWN;
export type FactorValue<T> = T | Unknown;

export function isKnown<T>(v: FactorValue<T>): v is T {
  return v !== UNKNOWN;
}

export type SleepPosition = 'back' | 'side' | 'front' | 'unsure';

/** v1 Factors (FR-J2). */
export interface JournalFactors {
  readonly alcoholUnits: FactorValue<number>;
  /** Minutes before bedtime that the last drink was finished. */
  readonly lastDrinkMinutesBeforeBed: FactorValue<number>;
  readonly caffeineAfter2pm: FactorValue<boolean>;
  readonly lastMealMinutesBeforeBed: FactorValue<number>;
  /** 0 = clear, 3 = fully blocked. */
  readonly nasalCongestion: FactorValue<number>;
  readonly intendedPosition: FactorValue<SleepPosition>;
  /** Minutes past midnight; negative before midnight. */
  readonly bedtimeMinutes: FactorValue<number>;
  readonly weightKg: FactorValue<number>;
}

export interface JournalEntry {
  readonly userId: UserId;
  /** Invariant I-J1: at most one entry per user per night date. */
  readonly date: NightDate;
  readonly factors: JournalFactors;
  readonly recordedAt: number;
  readonly amendedAt?: number;
}

export const FACTOR_RANGES = {
  alcoholUnits: { min: 0, max: 30 },
  lastDrinkMinutesBeforeBed: { min: 0, max: 1440 },
  lastMealMinutesBeforeBed: { min: 0, max: 1440 },
  nasalCongestion: { min: 0, max: 3 },
  bedtimeMinutes: { min: -360, max: 720 },
  weightKg: { min: 25, max: 400 },
} as const;

export type NumericFactorName = keyof typeof FACTOR_RANGES;

export type ValidationError = {
  readonly factor: string;
  readonly reason: 'out_of_range' | 'not_a_number';
};

/** Invariant I-J2: values validate against declared ranges. */
export function validateFactors(factors: JournalFactors): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const name of Object.keys(FACTOR_RANGES) as NumericFactorName[]) {
    const value = factors[name];
    if (!isKnown(value)) continue;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push({ factor: name, reason: 'not_a_number' });
      continue;
    }
    const range = FACTOR_RANGES[name];
    if (value < range.min || value > range.max) {
      errors.push({ factor: name, reason: 'out_of_range' });
    }
  }
  return errors;
}

/** FR-J4: entries are amendable for 48 hours. */
export const AMENDMENT_WINDOW_MS = 48 * 3_600_000;

export function canAmend(entry: JournalEntry, nowMs: number): boolean {
  return nowMs - entry.recordedAt <= AMENDMENT_WINDOW_MS;
}

export function emptyFactors(): JournalFactors {
  return {
    alcoholUnits: UNKNOWN,
    lastDrinkMinutesBeforeBed: UNKNOWN,
    caffeineAfter2pm: UNKNOWN,
    lastMealMinutesBeforeBed: UNKNOWN,
    nasalCongestion: UNKNOWN,
    intendedPosition: UNKNOWN,
    bedtimeMinutes: UNKNOWN,
    weightKg: UNKNOWN,
  };
}

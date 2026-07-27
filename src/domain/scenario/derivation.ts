/**
 * Scenario Planning — projected figures and the derivations that justify them.
 *
 * PRD §5.5 invariant 3 and FR-4.6: every projected figure carries a
 * plain-language `Derivation`. "A projection a user cannot interrogate is a
 * projection they should not trust." So the explanation is a sentence an
 * officer can read aloud in a control room, not a formula dump — and every
 * number that fed it is listed with where it came from, so the officer can
 * disagree with the assumption rather than with the arithmetic.
 *
 * FR-4.7: projected figures are tagged `provenance: 'projected'` so no
 * rendering path can mistake one for a figure ASDMA actually reported.
 */

import type { Quantity } from '../shared/quantity';

// ---------------------------------------------------------------------------
// Projection-specific units
//
// These are derived ratios that exist nowhere in the bulletin, so they are not
// part of the shared kernel. They still use the kernel's Quantity so that
// "unknown" survives every hop: an unknown input yields an unknown output, and
// never a zero (PRD §3.3).
// ---------------------------------------------------------------------------

/** Days of cover — how long a stock lasts at a projected consumption rate. */
export type Days = Quantity<'days'>;
/** Camp load: inmates per relief camp (PRD §4.5). */
export type PersonsPerCamp = Quantity<'per-camp'>;
/** A dimensionless proportion, e.g. camp uptake 0.064 = 6.4%. */
export type Rate = Quantity<'rate'>;
/** Daily relief demand. */
export type KilogramsPerDay = Quantity<'kg/day'>;

export const days = (value: number): Days => ({ kind: 'known', unit: 'days', value });
export const unknownDays = (): Days => ({ kind: 'unknown', unit: 'days' });

export const personsPerCamp = (value: number): PersonsPerCamp => ({
  kind: 'known',
  unit: 'per-camp',
  value,
});
export const unknownPersonsPerCamp = (): PersonsPerCamp => ({ kind: 'unknown', unit: 'per-camp' });

export const rate = (value: number): Rate => ({ kind: 'known', unit: 'rate', value });
export const unknownRate = (): Rate => ({ kind: 'unknown', unit: 'rate' });

export const kilogramsPerDay = (value: number): KilogramsPerDay => ({
  kind: 'known',
  unit: 'kg/day',
  value,
});
export const unknownKilogramsPerDay = (): KilogramsPerDay => ({ kind: 'unknown', unit: 'kg/day' });

// ---------------------------------------------------------------------------
// Formatting
//
// Hand-rolled rather than `toLocaleString`, because ICU availability varies by
// runtime and `en-IN` grouping would render 579,143 as 5,79,143 — a number an
// officer reading the console next to the PDF would have to re-parse.
// ---------------------------------------------------------------------------

/** What we print where a figure is genuinely not known. Never "0". */
export const NOT_REPORTED = 'not reported';

const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const finite = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

export const formatInteger = (n: number | undefined): string => {
  if (!finite(n)) return NOT_REPORTED;
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return sign + group(String(Math.abs(rounded)));
};

export const formatDecimal = (n: number | undefined, dp: number): string => {
  if (!finite(n)) return NOT_REPORTED;
  // `Number(...)` strips a trailing ".0" so "5 days" never reads as "5.0 days".
  const fixed = Number(n.toFixed(dp));
  const sign = fixed < 0 ? '-' : '';
  const [whole, fraction] = String(Math.abs(fixed)).split('.');
  return sign + group(whole ?? '0') + (fraction === undefined ? '' : `.${fraction}`);
};

/** 0.06441 → "6.4%", 0.25 → "25%". */
export const formatPercent = (proportion: number | undefined, dp = 1): string =>
  finite(proportion) ? `${formatDecimal(proportion * 100, dp)}%` : NOT_REPORTED;

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/**
 * Where an input came from. The distinction matters: a reader can argue with an
 * `assumption` or a `lever`, but arguing with a `reported` figure means arguing
 * with ASDMA.
 */
export type DerivationSource = 'reported' | 'lever' | 'assumption' | 'derived';

export type DerivationInput = {
  readonly label: string;
  readonly value: string;
  readonly source: DerivationSource;
};

export type Derivation = {
  readonly metric: string;
  /** One or two sentences of plain English. No symbols a reader must decode. */
  readonly explanation: string;
  readonly inputs: readonly DerivationInput[];
};

export const statedDerivation = (
  metric: string,
  explanation: string,
  inputs: readonly DerivationInput[],
): Derivation => ({ metric, explanation, inputs });

// ---------------------------------------------------------------------------
// Projected figure
// ---------------------------------------------------------------------------

/**
 * A figure this product computed under a scenario, never one ASDMA reported.
 *
 * The `provenance` tag is structural rather than a naming convention, so a UI
 * cannot render a projection in the same typographic treatment as a reported
 * figure by accident (FR-4.7).
 */
export type ProjectedFigure<T> = {
  readonly provenance: 'projected';
  readonly value: T;
  readonly derivation: Derivation;
};

export const projected = <T>(value: T, derivation: Derivation): ProjectedFigure<T> => ({
  provenance: 'projected',
  value,
  derivation,
});

export const isProjected = (candidate: unknown): candidate is ProjectedFigure<unknown> =>
  typeof candidate === 'object' &&
  candidate !== null &&
  (candidate as { provenance?: unknown }).provenance === 'projected';

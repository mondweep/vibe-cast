/**
 * RESPONSE CAPACITY (Core) — Ration Coverage Days.
 *
 * PRD §4.5: (Rice Q × 100 kg) ÷ (Inmates × kg/person/day). Answers acceptance
 * question §2.1.4, "How many days of rice remain at current inmate counts?",
 * which the bulletin cannot answer because it reports stock and caseload in
 * different sections and never divides one by the other.
 *
 * **The norm has no default, by design** (PRD §5.3 invariant 3). 0.6 kg per
 * person per day follows SDRF relief-norm convention, but it is an assumption,
 * not a fact, and a caller must state it at the call site so that it is visible
 * and therefore arguable. A user who disagrees changes it and watches the
 * coverage days move — that arguability is the product's credibility.
 *
 * Pure. No I/O, no clock.
 */

import type { Count, Quintals } from '../shared/quantity';
import { quintalsToKilograms, valueOf } from '../shared/quantity';
import type { Derivation, MetricCompleteness } from './derivation';
import { derivation, showOperand } from './derivation';

export type RationNorm = {
  readonly kilogramsPerPersonPerDay: number;
  /** Where the assumption comes from, shown next to any figure derived from it. */
  readonly label: string;
};

export const rationNorm = (kilogramsPerPersonPerDay: number, label: string): RationNorm => {
  if (!Number.isFinite(kilogramsPerPersonPerDay) || kilogramsPerPersonPerDay <= 0) {
    throw new RangeError(
      `A ration norm must be a positive number of kilograms per person per day; got ${kilogramsPerPersonPerDay}.`,
    );
  }
  return { kilogramsPerPersonPerDay, label };
};

/**
 * The conventional norm, published as a named constant.
 *
 * Exporting it is not the same as defaulting to it: a caller still has to name
 * it, so the assumption appears in the code an officer's engineer reads.
 */
export const SDRF_RICE_NORM: RationNorm = rationNorm(0.6, 'SDRF relief-norm convention');

export type RationCoverageKind =
  /** A finite number of days of rice at the current caseload. */
  | 'days'
  /** No Inmates to feed: stock lasts indefinitely. Not a divide-by-zero. */
  | 'unbounded-no-inmates'
  /** Inmates present and no rice at all. */
  | 'exhausted'
  /** Rice or Inmates not reported. Unknown is not zero. */
  | 'unknown';

export type RationCoverage = {
  readonly days: number | undefined;
  readonly kind: RationCoverageKind;
  /** The assumption this figure rests on, carried with the figure. */
  readonly norm: RationNorm;
  readonly derivation: Derivation;
  readonly completeness: MetricCompleteness;
};

const FORMULA = '(Rice Q × 100 kg) ÷ (Inmates × kg/person/day)';

/**
 * Days of rice remaining at the current Inmate caseload.
 *
 * @param rice    Rice distributed/held, in Quintals. 1 Q = 100 kg.
 * @param inmates Inmates in Relief Camps — ASDMA's term, retained.
 * @param norm    Required. There is no default (PRD §5.3 invariant 3).
 */
export const rationCoverageDays = (
  rice: Quintals,
  inmates: Count,
  norm: RationNorm,
): RationCoverage => {
  const kilograms = valueOf(quintalsToKilograms(rice));
  const people = valueOf(inmates);

  const substitution =
    `${showOperand(kilograms)} ÷ (${showOperand(people)} × ${norm.kilogramsPerPersonPerDay})`;
  const d = derivation(
    'Ration Coverage Days',
    FORMULA,
    substitution,
    `derived — assumes ${norm.kilogramsPerPersonPerDay} kg/person/day (${norm.label}); change the norm and this figure moves`,
  );

  if (kilograms === undefined || people === undefined) {
    return { days: undefined, kind: 'unknown', norm, derivation: d, completeness: 'unavailable' };
  }

  const demandPerDay = people * norm.kilogramsPerPersonPerDay;

  if (demandPerDay === 0) {
    // Nobody to feed. Coverage is unbounded — a real state, and not the same
    // thing as "we could not work it out".
    return {
      days: Number.POSITIVE_INFINITY,
      kind: 'unbounded-no-inmates',
      norm,
      derivation: d,
      completeness: 'complete',
    };
  }

  const days = kilograms / demandPerDay;
  return {
    days,
    kind: days === 0 ? 'exhausted' : 'days',
    norm,
    derivation: d,
    completeness: 'complete',
  };
};

/**
 * RESPONSE CAPACITY (Core) — Camp Load and Vulnerable Load.
 *
 * PRD §4.5. Camp Load = Inmates ÷ Relief Camps, the figure that drives "open
 * more camps" (acceptance question §2.1.3). Vulnerable Load = Vulnerable
 * Inmates ÷ Inmates, which drives medical and nutrition planning.
 *
 * "Vulnerable Inmates" is *our* term, not ASDMA's (PRD §4.3), so what counts as
 * vulnerable is a policy object rather than a hard-coded sum — a planner who
 * needs a different definition substitutes it rather than forking the module.
 *
 * Pure. No I/O, no clock.
 */

import type { CampInmates } from '../shared/flood-situation-report';
import type { Count } from '../shared/quantity';
import { sumQuantities, unknownCount, valueOf } from '../shared/quantity';
import type { Derivation, MetricCompleteness } from './derivation';
import { derivedQuotient } from './derivation';

const DERIVED = 'derived — our arithmetic, not an ASDMA figure';

export type CampLoadKind =
  /** A finite number of Inmates per Relief Camp. */
  | 'load'
  /**
   * Inmates sheltering with no Relief Camps open at all. A real and alarming
   * state, not an error: it is precisely what a control room needs surfaced.
   */
  | 'no-camps-but-inmates'
  /** No camps and nobody in them — the ordinary quiet case. */
  | 'no-camps-no-inmates'
  /** Not reported. Unknown is not zero. */
  | 'unknown';

export type CampLoad = {
  readonly inmatesPerCamp: number | undefined;
  readonly kind: CampLoadKind;
  readonly derivation: Derivation;
  readonly completeness: MetricCompleteness;
};

export const campLoad = (inmates: Count, reliefCamps: Count): CampLoad => {
  const quotient = derivedQuotient({
    metric: 'Camp Load',
    formula: 'Inmates ÷ Relief Camps',
    unit: 'inmates per Relief Camp',
    numerator: valueOf(inmates),
    denominator: valueOf(reliefCamps),
    note: `${DERIVED}; Relief Distribution Centres are excluded — they shelter nobody`,
  });

  const kind: CampLoadKind =
    quotient.outcome === 'unknown'
      ? 'unknown'
      : quotient.outcome === 'unbounded'
        ? 'no-camps-but-inmates'
        : quotient.outcome === 'zero-over-zero'
          ? 'no-camps-no-inmates'
          : 'load';

  return {
    inmatesPerCamp: quotient.value,
    kind,
    derivation: quotient.derivation,
    completeness: quotient.completeness,
  };
};

// ---------------------------------------------------------------------------
// Vulnerable Inmates — a derived term, explicitly marked as such
// ---------------------------------------------------------------------------

export type VulnerableComponent = 'children' | 'pregnantOrLactating' | 'personsWithDisability';

export type VulnerabilityPolicy = {
  readonly components: readonly VulnerableComponent[];
  /** Shown wherever a figure derived from this policy appears. */
  readonly label: string;
};

export const vulnerabilityPolicy = (
  components: readonly VulnerableComponent[],
  label: string,
): VulnerabilityPolicy => {
  if (components.length === 0) {
    throw new RangeError('A vulnerability policy must name at least one component.');
  }
  return { components, label };
};

/** PRD §4.3: Children + Pregnant/Lactating Mothers + Persons with Disability. */
export const DEFAULT_VULNERABILITY_POLICY: VulnerabilityPolicy = vulnerabilityPolicy(
  ['children', 'pregnantOrLactating', 'personsWithDisability'],
  'Children + Pregnant/Lactating Mothers + Persons with Disability',
);

/**
 * The vulnerable subset of Inmates.
 *
 * These are overlapping subsets of the Inmate population, not additional
 * people (PRD §5.3 invariant 2) — the figure is a headcount for planning, not
 * an addition to the caseload.
 */
export const vulnerableInmates = (
  inmates: CampInmates,
  policy: VulnerabilityPolicy,
): Count => {
  const parts = policy.components.map((component) => inmates[component]);
  const { total, hadUnknowns } = sumQuantities('count', parts);
  return hadUnknowns ? unknownCount() : total;
};

export type VulnerableLoad = {
  /** 0–1. `undefined` when Inmates or a vulnerable component was not reported. */
  readonly fraction: number | undefined;
  readonly vulnerableInmates: Count;
  readonly policy: VulnerabilityPolicy;
  readonly derivation: Derivation;
  readonly completeness: MetricCompleteness;
};

export const vulnerableLoad = (
  inmates: CampInmates,
  policy: VulnerabilityPolicy,
): VulnerableLoad => {
  const vulnerable = vulnerableInmates(inmates, policy);

  const quotient = derivedQuotient({
    metric: 'Vulnerable Load',
    formula: 'Vulnerable Inmates ÷ Inmates',
    unit: 'fraction',
    numerator: valueOf(vulnerable),
    denominator: valueOf(inmates.total),
    note: `${DERIVED}; Vulnerable Inmates = ${policy.label}`,
  });

  return {
    fraction: quotient.value,
    vulnerableInmates: vulnerable,
    policy,
    derivation: quotient.derivation,
    completeness: quotient.completeness,
  };
};

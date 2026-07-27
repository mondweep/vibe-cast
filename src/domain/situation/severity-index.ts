/**
 * SITUATION ASSESSMENT (Core) — the Severity Index domain service.
 *
 * PRD §6.3 / FR-3.1–3.4. A weighted, min–max normalised composite over five
 * components, computed **within the loaded bulletin** so the score is
 * explicitly relative and can never be read as an absolute severity.
 *
 * Two things are deliberately substitutable rather than baked in:
 *
 *  - the **weights** (FR-3.2 — a District Commissioner weighting crop loss
 *    differently from the State Control Room is legitimate, not a bug), and
 *  - the **readers** that pull each component off a district, so the definition
 *    of "camp load" or "casualties" can be argued with rather than discovered
 *    by reading source.
 *
 * PRD §5.2 invariant 3: this is always computed, never persisted from an
 * external source, and always from the currently loaded report.
 *
 * Pure. No I/O, no clock.
 */

import type { DistrictName } from '../shared/administrative-unit';
import { valueOf } from '../shared/quantity';
import type { Derivation, MetricCompleteness } from './derivation';
import { derivation } from './derivation';
import type { DistrictSituation } from './district-situation';

export type SeverityComponent =
  | 'affectedPopulation'
  | 'villagesAffected'
  | 'cropArea'
  | 'campLoad'
  | 'casualties';

/** The order components are reported in, so the breakdown is stable for the UI. */
export const SEVERITY_COMPONENTS: readonly SeverityComponent[] = [
  'affectedPopulation',
  'villagesAffected',
  'cropArea',
  'campLoad',
  'casualties',
];

export type SeverityWeights = Readonly<Record<SeverityComponent, number>>;

/**
 * PRD §6.3. "A stated starting point, not a claim of objectivity" — and the UI
 * says so. Exported as a named constant precisely so that a caller overriding
 * it is doing something visible.
 */
export const DEFAULT_SEVERITY_WEIGHTS: SeverityWeights = {
  affectedPopulation: 0.35,
  villagesAffected: 0.15,
  cropArea: 0.15,
  campLoad: 0.2,
  casualties: 0.15,
};

/**
 * Pulls one component off a district.
 *
 * Returns `undefined` when the figure was not reported — never 0, which would
 * quietly flatter the district — and `+Infinity` for a genuinely unbounded
 * value such as Inmates sheltering with zero Relief Camps open.
 */
export type SeverityComponentReader = (district: DistrictSituation) => number | undefined;

export type SeverityComponentReaders = Readonly<
  Record<SeverityComponent, SeverityComponentReader>
>;

export const DEFAULT_SEVERITY_READERS: SeverityComponentReaders = {
  affectedPopulation: (d) => valueOf(d.population.total),
  villagesAffected: (d) => valueOf(d.villagesAffected),
  cropArea: (d) => valueOf(d.cropAreaSubmerged),

  /**
   * Inmates ÷ Relief Camps. Zero camps with Inmates present is unbounded
   * overcrowding, which is exactly the state "open more camps" is meant to
   * catch, so it is scored at the top of the range rather than skipped.
   */
  campLoad: (d) => {
    const inmates = valueOf(d.campInmates);
    const camps = valueOf(d.reliefCamps);
    if (inmates === undefined || camps === undefined) return undefined;
    if (camps === 0) return inmates === 0 ? 0 : Number.POSITIVE_INFINITY;
    return inmates / camps;
  },

  /**
   * Flood deaths only.
   *
   * PRD §4.2: general drownings are reported separately by ASDMA and summing
   * them overstates flood mortality; missing persons are likewise never merged
   * into a single casualties figure. A user who wants a different definition
   * substitutes this reader — they do not get it by accident.
   */
  casualties: (d) => valueOf(d.casualties.floodDeaths),
};

/** How a component's normalised value was arrived at, for the breakdown UI. */
export type NormalisationBasis =
  /** Ordinary min–max within the loaded bulletin. */
  | 'min-max'
  /** Every district reported the same value — the component cannot discriminate. */
  | 'degenerate-uniform'
  /** An unbounded value, scored at the top of the range. */
  | 'unbounded'
  /** Not reported; excluded from the score rather than counted as zero. */
  | 'unknown-excluded';

export type ComponentContribution = {
  readonly component: SeverityComponent;
  /** The figure as read, before normalisation. `undefined` when unreported. */
  readonly raw: number | undefined;
  /** 0–1 within this bulletin. */
  readonly normalised: number;
  /** The weight as supplied by the caller, before renormalisation. */
  readonly weight: number;
  /** normalised × (weight ÷ sum of usable weights). Sums to the score. */
  readonly contribution: number;
  readonly basis: NormalisationBasis;
};

export type DistrictSeverity = {
  readonly district: DistrictName;
  /** 0–1, relative to the other districts in this bulletin only. */
  readonly score: number;
  /** FR-3.3 — the per-component breakdown, not just the number. */
  readonly contributions: readonly ComponentContribution[];
  readonly derivation: Derivation;
  readonly completeness: MetricCompleteness;
};

const NOTE =
  'derived — relative to the districts in this bulletin only, never an absolute score';

const FORMULA =
  'Σ (weight ÷ Σweights) × min–max(component, within this bulletin)';

const assertUsableWeights = (weights: SeverityWeights): number => {
  const values = SEVERITY_COMPONENTS.map((c) => weights[c]);
  if (values.some((w) => !Number.isFinite(w) || w < 0)) {
    throw new RangeError('Severity weights must be finite and non-negative.');
  }
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    throw new RangeError('Severity weights must sum to a positive number.');
  }
  return total;
};

type Range = { readonly min: number; readonly max: number } | undefined;

const finiteRangeOf = (values: readonly (number | undefined)[]): Range => {
  const finite = values.filter((v): v is number => v !== undefined && Number.isFinite(v));
  if (finite.length === 0) return undefined;
  return { min: Math.min(...finite), max: Math.max(...finite) };
};

const normalise = (
  raw: number | undefined,
  range: Range,
): { normalised: number; basis: NormalisationBasis } => {
  if (raw === undefined) return { normalised: 0, basis: 'unknown-excluded' };
  if (!Number.isFinite(raw)) return { normalised: 1, basis: 'unbounded' };
  if (range === undefined) return { normalised: 1, basis: 'degenerate-uniform' };

  if (range.min === range.max) {
    // Every district reported the same figure, so this component cannot rank
    // anyone. A shared zero means nothing is happening; a shared non-zero means
    // everyone is equally at the extreme. Either way, no division by zero.
    return { normalised: range.max === 0 ? 0 : 1, basis: 'degenerate-uniform' };
  }

  return { normalised: (raw - range.min) / (range.max - range.min), basis: 'min-max' };
};

/**
 * Rank the loaded bulletin's districts by composite severity.
 *
 * Returns one `DistrictSeverity` per district, in input order — sorting is
 * `ranking.ts`'s job, not this service's.
 */
export const computeSeverityIndex = (
  districts: readonly DistrictSituation[],
  weights: SeverityWeights = DEFAULT_SEVERITY_WEIGHTS,
  readers: SeverityComponentReaders = DEFAULT_SEVERITY_READERS,
): readonly DistrictSeverity[] => {
  assertUsableWeights(weights);
  if (districts.length === 0) return [];

  // Read every component for every district first: min–max normalisation is
  // defined across the bulletin (FR-3.4), so nothing can be scored in isolation.
  const rawByComponent = new Map<SeverityComponent, readonly (number | undefined)[]>(
    SEVERITY_COMPONENTS.map((component) => [
      component,
      districts.map((d) => readers[component](d)),
    ]),
  );

  const rangeByComponent = new Map<SeverityComponent, Range>(
    SEVERITY_COMPONENTS.map((component) => [
      component,
      finiteRangeOf(rawByComponent.get(component) ?? []),
    ]),
  );

  return districts.map((district, index) => {
    const reads = SEVERITY_COMPONENTS.map((component) => {
      const raw = (rawByComponent.get(component) ?? [])[index];
      const { normalised, basis } = normalise(raw, rangeByComponent.get(component));
      return { component, raw, normalised, basis, weight: weights[component] };
    });

    const usableWeight = reads
      .filter((r) => r.basis !== 'unknown-excluded')
      .reduce((acc, r) => acc + r.weight, 0);

    const contributions: ComponentContribution[] = reads.map((r) => ({
      component: r.component,
      raw: r.raw,
      normalised: r.normalised,
      weight: r.weight,
      contribution:
        r.basis === 'unknown-excluded' || usableWeight <= 0
          ? 0
          : r.normalised * (r.weight / usableWeight),
      basis: r.basis,
    }));

    const known = reads.filter((r) => r.basis !== 'unknown-excluded').length;
    const completeness: MetricCompleteness =
      known === 0 ? 'unavailable' : known === reads.length ? 'complete' : 'partial';

    const score = contributions.reduce((acc, c) => acc + c.contribution, 0);

    const substitution = contributions
      .map(
        (c) =>
          `${c.component}: ${c.raw === undefined ? 'unknown' : c.raw}` +
          ` → ${c.normalised.toFixed(3)} × ${c.weight}`,
      )
      .join(' + ');

    return {
      district: district.district,
      score,
      contributions,
      derivation: derivation('Severity Index', FORMULA, substitution, NOTE),
      completeness,
    };
  });
};

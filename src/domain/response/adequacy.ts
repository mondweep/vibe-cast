/**
 * RESPONSE CAPACITY (Core) — the `ReliefAdequacy` value object.
 *
 * PRD §5.3: "derived: coverage days, camp load, vulnerable load". This is the
 * judgement those three metrics add up to — the answer to "can we cope, and for
 * how long?".
 *
 * **Thresholds are injected, never hard-coded.** Where the line falls between
 * adequate, strained and critical is a policy call belonging to whoever is
 * accountable for the response, not to this module. The constant below is
 * published as *indicative*, and a caller has to name it, so the judgement is
 * as arguable as the ration norm it partly rests on.
 *
 * Pure. No I/O, no clock.
 */

import type { Derivation, MetricCompleteness } from './derivation';
import type { CampLoad, VulnerableLoad } from './camp-load';
import type { RationCoverage } from './ration-coverage';

export type AdequacyGrade = 'adequate' | 'strained' | 'critical' | 'indeterminate';

/** Below `critical` is critical; below `strained` is strained. */
export type LowerIsWorse = { readonly critical: number; readonly strained: number };
/** Above `critical` is critical; above `strained` is strained. */
export type HigherIsWorse = { readonly critical: number; readonly strained: number };

export type AdequacyThresholds = {
  readonly rationCoverageDays: LowerIsWorse;
  readonly inmatesPerCamp: HigherIsWorse;
  readonly vulnerableLoad: HigherIsWorse;
};

/**
 * A starting point, not a standard.
 *
 * Three days of rice is inside any resupply cycle worth worrying about; a week
 * is a planning horizon. 250 Inmates per Relief Camp is roughly where ASDMA
 * bulletins start carrying overcrowding remarks and 500 is well past it. The
 * vulnerable-load bands are set so the statewide 11% reads as ordinary.
 */
export const INDICATIVE_ADEQUACY_THRESHOLDS: AdequacyThresholds = {
  rationCoverageDays: { critical: 3, strained: 7 },
  inmatesPerCamp: { critical: 500, strained: 250 },
  vulnerableLoad: { critical: 0.3, strained: 0.2 },
};

export type AdequacyAspect = 'rationCoverage' | 'campLoad' | 'vulnerableLoad';

export type AdequacyFinding = {
  readonly aspect: AdequacyAspect;
  readonly grade: AdequacyGrade;
  /** Plain language, with the number in it, for the UI to show verbatim. */
  readonly detail: string;
  /** The derivation of the figure this finding grades. */
  readonly derivation: Derivation;
};

export type ReliefAdequacyInput = {
  readonly rationCoverage: RationCoverage;
  readonly campLoad: CampLoad;
  readonly vulnerableLoad: VulnerableLoad;
};

export type ReliefAdequacy = {
  /** The worst grade among the aspects that could be graded at all. */
  readonly grade: AdequacyGrade;
  readonly rationCoverage: RationCoverage;
  readonly campLoad: CampLoad;
  readonly vulnerableLoad: VulnerableLoad;
  readonly findings: readonly AdequacyFinding[];
  readonly completeness: MetricCompleteness;
};

const SEVERITY_ORDER: readonly AdequacyGrade[] = [
  'adequate',
  'strained',
  'critical',
];

const worse = (a: AdequacyGrade, b: AdequacyGrade): AdequacyGrade =>
  SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;

const gradeLowerIsWorse = (value: number, t: LowerIsWorse): AdequacyGrade =>
  value < t.critical ? 'critical' : value < t.strained ? 'strained' : 'adequate';

const gradeHigherIsWorse = (value: number, t: HigherIsWorse): AdequacyGrade =>
  value > t.critical ? 'critical' : value > t.strained ? 'strained' : 'adequate';

const rationFinding = (
  coverage: RationCoverage,
  thresholds: LowerIsWorse,
): AdequacyFinding => {
  if (coverage.kind === 'unknown') {
    return {
      aspect: 'rationCoverage',
      grade: 'indeterminate',
      detail: 'Rice stock or Inmate count was not reported, so coverage cannot be worked out.',
      derivation: coverage.derivation,
    };
  }

  if (coverage.kind === 'unbounded-no-inmates') {
    return {
      aspect: 'rationCoverage',
      grade: 'adequate',
      detail: 'No Inmates to feed, so rice stock is not a constraint.',
      derivation: coverage.derivation,
    };
  }

  const days = coverage.days as number;
  const grade = gradeLowerIsWorse(days, thresholds);
  return {
    aspect: 'rationCoverage',
    grade,
    detail:
      `${days.toFixed(1)} days of rice at ${coverage.norm.kilogramsPerPersonPerDay} kg/person/day ` +
      `(${coverage.norm.label}); critical below ${thresholds.critical} days, strained below ${thresholds.strained}.`,
    derivation: coverage.derivation,
  };
};

const campLoadFinding = (load: CampLoad, thresholds: HigherIsWorse): AdequacyFinding => {
  if (load.kind === 'unknown') {
    return {
      aspect: 'campLoad',
      grade: 'indeterminate',
      detail: 'Inmate or Relief Camp count was not reported, so camp load cannot be worked out.',
      derivation: load.derivation,
    };
  }

  if (load.kind === 'no-camps-but-inmates') {
    return {
      aspect: 'campLoad',
      grade: 'critical',
      detail: 'Inmates are sheltering with no Relief Camps open at all.',
      derivation: load.derivation,
    };
  }

  if (load.kind === 'no-camps-no-inmates') {
    return {
      aspect: 'campLoad',
      grade: 'adequate',
      detail: 'No Relief Camps open and no Inmates to shelter.',
      derivation: load.derivation,
    };
  }

  const perCamp = load.inmatesPerCamp as number;
  return {
    aspect: 'campLoad',
    grade: gradeHigherIsWorse(perCamp, thresholds),
    detail:
      `${Math.round(perCamp)} Inmates per Relief Camp; strained above ${thresholds.strained}, ` +
      `critical above ${thresholds.critical}.`,
    derivation: load.derivation,
  };
};

const vulnerableFinding = (
  load: VulnerableLoad,
  thresholds: HigherIsWorse,
): AdequacyFinding => {
  if (load.fraction === undefined) {
    return {
      aspect: 'vulnerableLoad',
      grade: 'indeterminate',
      detail: 'Inmate figures were not reported in full, so vulnerable load cannot be worked out.',
      derivation: load.derivation,
    };
  }

  return {
    aspect: 'vulnerableLoad',
    grade: gradeHigherIsWorse(load.fraction, thresholds),
    detail:
      `${(load.fraction * 100).toFixed(1)}% of Inmates are ${load.policy.label}; ` +
      `strained above ${(thresholds.strained * 100).toFixed(0)}%, critical above ${(thresholds.critical * 100).toFixed(0)}%.`,
    derivation: load.derivation,
  };
};

/**
 * Combine ration coverage, camp load and vulnerable load into one judgement.
 *
 * The overall grade is the worst of the aspects that could be graded. Aspects
 * that could not be graded are reported as `indeterminate` and drag the
 * completeness down rather than being silently treated as fine — a relief
 * picture assembled from half the data must say that it is.
 */
export const assessReliefAdequacy = (
  input: ReliefAdequacyInput,
  thresholds: AdequacyThresholds,
): ReliefAdequacy => {
  const findings: readonly AdequacyFinding[] = [
    rationFinding(input.rationCoverage, thresholds.rationCoverageDays),
    campLoadFinding(input.campLoad, thresholds.inmatesPerCamp),
    vulnerableFinding(input.vulnerableLoad, thresholds.vulnerableLoad),
  ];

  const graded = findings.filter((f) => f.grade !== 'indeterminate');

  const completeness: MetricCompleteness =
    graded.length === 0
      ? 'unavailable'
      : graded.length === findings.length
        ? 'complete'
        : 'partial';

  const grade =
    graded.length === 0
      ? 'indeterminate'
      : graded.reduce<AdequacyGrade>((acc, f) => worse(acc, f.grade), 'adequate');

  return {
    grade,
    rationCoverage: input.rationCoverage,
    campLoad: input.campLoad,
    vulnerableLoad: input.vulnerableLoad,
    findings,
    completeness,
  };
};

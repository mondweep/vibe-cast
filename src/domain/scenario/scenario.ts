/**
 * Scenario Planning — the `Scenario` aggregate (PRD §5.5).
 *
 * A Scenario is a named set of assumptions hung off a real bulletin. The
 * aggregate exists to protect one thing above all: **invariant 1, that a
 * Scenario always references a real baseline bulletin.** There is no
 * free-floating projection, because a projection with no anchor is a number
 * with no argument behind it.
 *
 * That invariant is enforced by construction rather than by validation: the
 * factory takes the `FloodSituationReport` itself, so a caller cannot mint a
 * `BulletinId` that does not correspond to a bulletin they actually hold.
 */

import type { DistrictName } from '../shared/administrative-unit';
import type {
  BulletinId,
  FloodSituationReport,
  ReportDate,
} from '../shared/flood-situation-report';
import { project } from './projection-engine';
import type { ProjectedOutcome, ProjectionDependencies } from './projection-engine';

/** Raised when an invariant of PRD §5.5 would be broken. */
export class ScenarioInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioInvariantError';
  }
}

export type ScenarioName = string & { readonly __brand: 'ScenarioName' };

// ---------------------------------------------------------------------------
// Levers (value objects)
// ---------------------------------------------------------------------------

/**
 * How camp uptake behaves under the scenario.
 *
 * `to-rate` is the flagship case — "uptake rises from 6.4% to 25%" — stated as
 * an absolute target rather than a delta, because that is how an officer thinks
 * about it: "what if a quarter of affected people come into camps?"
 */
export type CampUptakeShift =
  | { readonly kind: 'hold-baseline' }
  | { readonly kind: 'to-rate'; readonly rate: number };

/**
 * Kilograms of rice per person per day.
 *
 * PRD §5.3 invariant 3: there is no default. A caller must state the
 * assumption, which makes it visible and therefore arguable. 0.6 kg/day is the
 * SDRF relief-norm convention, but it is the *user's* number to set.
 */
export type RationNorm = { readonly kgPerPersonPerDay: number };

export type ScenarioLevers = {
  /** 1.3 = "affected population grows 30%". 1.0 = held at the reported level. */
  readonly populationGrowthFactor: number;
  readonly campUptakeShift: CampUptakeShift;
  /** How long the situation is assumed to be sustained, in whole days. */
  readonly durationDays: number;
  readonly rationNorm: RationNorm;
  /** Extra relief camps opened, per District. Absent means none. */
  readonly additionalCampCapacity: ReadonlyMap<DistrictName, number>;
};

export type ScenarioLeverSpec = {
  readonly populationGrowthFactor: number;
  readonly campUptakeShift: CampUptakeShift;
  readonly durationDays: number;
  readonly rationNormKgPerPersonPerDay: number;
  readonly additionalCampCapacity?: ReadonlyMap<DistrictName, number>;
};

const isFinitePositive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

export const scenarioLevers = (spec: ScenarioLeverSpec): ScenarioLevers => {
  const { populationGrowthFactor, campUptakeShift, durationDays } = spec;

  if (typeof populationGrowthFactor !== 'number' || !Number.isFinite(populationGrowthFactor)) {
    throw new ScenarioInvariantError('Population growth factor must be a finite number.');
  }
  if (populationGrowthFactor < 0) {
    throw new ScenarioInvariantError(
      'Population growth factor cannot be negative — a flood cannot un-affect people.',
    );
  }
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new ScenarioInvariantError('Scenario duration must be a whole number of days, at least 1.');
  }
  if (!isFinitePositive(spec.rationNormKgPerPersonPerDay)) {
    throw new ScenarioInvariantError(
      'Ration norm must be stated explicitly as a positive number of kilograms per person per day.',
    );
  }
  if (campUptakeShift.kind === 'to-rate') {
    const { rate } = campUptakeShift;
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new ScenarioInvariantError(
        'Camp uptake must be a proportion between 0 and 1 — more people cannot shelter than are affected.',
      );
    }
  }

  const additionalCampCapacity = new Map(spec.additionalCampCapacity ?? []);
  for (const [district, extra] of additionalCampCapacity) {
    if (!Number.isInteger(extra) || extra < 0) {
      throw new ScenarioInvariantError(
        `Additional relief camps for ${district} must be a whole number, not fewer than none.`,
      );
    }
  }

  return {
    populationGrowthFactor,
    campUptakeShift,
    durationDays,
    rationNorm: { kgPerPersonPerDay: spec.rationNormKgPerPersonPerDay },
    additionalCampCapacity,
  };
};

const specOf = (levers: ScenarioLevers): ScenarioLeverSpec => ({
  populationGrowthFactor: levers.populationGrowthFactor,
  campUptakeShift: levers.campUptakeShift,
  durationDays: levers.durationDays,
  rationNormKgPerPersonPerDay: levers.rationNorm.kgPerPersonPerDay,
  additionalCampCapacity: levers.additionalCampCapacity,
});

// ---------------------------------------------------------------------------
// Aggregate root
// ---------------------------------------------------------------------------

export type Scenario = {
  readonly name: ScenarioName;
  readonly baselineReportId: BulletinId;
  readonly baselineReportDate: ReportDate;
  readonly levers: ScenarioLevers;
  /** A new Scenario on the same baseline. Scenarios are compared, not edited. */
  readonly withLevers: (changes: Partial<ScenarioLeverSpec>) => Scenario;
  readonly renamedTo: (name: string) => Scenario;
  /**
   * Recompute the projection.
   *
   * The baseline report is passed in rather than held, because the outcome is
   * never stored (invariant 2) and the bulletin may have been re-parsed and
   * corrected since. The bulletin id is checked, so a Scenario cannot be
   * quietly projected against a bulletin it was not written for.
   */
  readonly project: (
    baseline: FloodSituationReport,
    deps: ProjectionDependencies,
  ) => ProjectedOutcome;
};

export type ScenarioSpec = {
  readonly name: string;
  /** The bulletin itself — not merely its id, so the anchor cannot be faked. */
  readonly baseline: FloodSituationReport;
  readonly levers: ScenarioLevers;
};

const build = (
  name: ScenarioName,
  baselineReportId: BulletinId,
  baselineReportDate: ReportDate,
  levers: ScenarioLevers,
): Scenario => {
  const scenario: Scenario = {
    name,
    baselineReportId,
    baselineReportDate,
    levers,
    withLevers: (changes) =>
      build(
        name,
        baselineReportId,
        baselineReportDate,
        scenarioLevers({ ...specOf(levers), ...changes }),
      ),
    renamedTo: (newName) => {
      const trimmed = newName.trim();
      if (trimmed.length === 0) {
        throw new ScenarioInvariantError('A scenario must have a name.');
      }
      return build(trimmed as ScenarioName, baselineReportId, baselineReportDate, levers);
    },
    project: (baseline, deps) => {
      if (baseline?.bulletinId !== baselineReportId) {
        throw new ScenarioInvariantError(
          `Scenario "${name}" is anchored to baseline bulletin ${baselineReportId} and cannot be ` +
            `projected against ${String(baseline?.bulletinId)}.`,
        );
      }
      return project(baseline, levers, deps);
    },
  };
  return Object.freeze(scenario);
};

export const createScenario = (spec: ScenarioSpec): Scenario => {
  const name = spec.name?.trim() ?? '';
  if (name.length === 0) {
    throw new ScenarioInvariantError('A scenario must have a name.');
  }
  const baseline = spec.baseline;
  if (baseline === undefined || baseline === null) {
    throw new ScenarioInvariantError(
      'A scenario must be anchored to a real baseline bulletin. There is no free-floating projection.',
    );
  }
  if (typeof baseline.bulletinId !== 'string' || baseline.bulletinId.trim().length === 0) {
    throw new ScenarioInvariantError(
      'A scenario must be anchored to a real baseline bulletin — this report has no bulletin id.',
    );
  }
  if (typeof baseline.reportDate !== 'string' || baseline.reportDate.trim().length === 0) {
    throw new ScenarioInvariantError(
      'The baseline bulletin has no report date. There is no undated bulletin (PRD §5.1).',
    );
  }

  return build(name as ScenarioName, baseline.bulletinId, baseline.reportDate, spec.levers);
};

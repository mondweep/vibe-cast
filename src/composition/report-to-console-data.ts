/**
 * `FloodSituationReport` + the user's assumptions → `ConsoleData`.
 *
 * This is the seam the whole product hangs off: the one place where the five
 * bounded contexts are asked their questions and their answers are shaped for
 * the console. It is a pure function — no clock, no storage, no pdf.js — so the
 * numbers on the screen can be reproduced in a test with nothing but a report
 * and a set of assumptions.
 *
 * Three rules govern every line of it:
 *
 *  1. **Nothing is computed here.** Every derived figure comes from a domain
 *     service. This module renames and formats; if arithmetic appears in it,
 *     it is in the wrong place (ADR-0001).
 *  2. **Every derived figure keeps its derivation.** The formula and the
 *     workings travel into the view model, because a figure an officer cannot
 *     interrogate is one they should not trust (PRD §4.5).
 *  3. **Unknown is never zero.** An unreported figure arrives as `undefined`
 *     and leaves as `undefined` (ADR-0005).
 *
 * Collaborators are injected so a test can assert *which* domain service was
 * asked — in particular that the Scenario context's projection engine is driven
 * by the real Response Capacity calculations rather than by arithmetic
 * reinvented at the boundary.
 */

import type {
  DistrictReport,
  FloodSituationReport,
} from '../domain/shared/flood-situation-report';

import { districtSituationsFrom, type DistrictSituation } from '../domain/situation/district-situation';
import {
  DEFAULT_SEVERITY_READERS,
  computeSeverityIndex,
  type DistrictSeverity,
} from '../domain/situation/severity-index';
import { rankDistrictSeverities } from '../domain/situation/ranking';
import { summariseSituation, type SituationSummary } from '../domain/situation/situation-summary';

import { DEFAULT_VULNERABILITY_POLICY, vulnerableLoad } from '../domain/response/camp-load';
import type { RationNorm } from '../domain/response/ration-coverage';

import { createScenario } from '../domain/scenario/scenario';
import { identifyFailurePoints } from '../domain/scenario/failure-point';
import type { ProjectionDependencies } from '../domain/scenario/projection-engine';

import type { BulletinTimeline } from '../domain/timeline/bulletin-timeline';

import type { ConsoleData } from '../adapters/ui/console-app';
import type {
  DamagePointViewModel,
  DistrictRowViewModel,
  ResponseCapacityViewModel,
  ResponseRowViewModel,
  RevenueCircleRowViewModel,
  SeverityContribution,
} from '../adapters/ui/view-models';

import type { ConsoleAssumptions } from './assumptions';
import {
  RESPONSE_CALCULATIONS,
  createScenarioDependencies,
  leversFrom,
  type ResponseCalculations,
} from './scenario-dependencies';
import { provenanceOf } from './section-labels';
import {
  normOf,
  statewideDerivedFigures,
  summaryOptions,
  summaryViewModel,
  type StatewideDerived,
} from './situation-view';
import { firstFailureFrom, scenarioComparisonsFrom } from './scenario-view';
import { trendFrom } from './trend-view-model';

// ---------------------------------------------------------------------------
// Injected collaborators
// ---------------------------------------------------------------------------

export type MappingDependencies = {
  readonly summarise: typeof summariseSituation;
  readonly districtSituations: typeof districtSituationsFrom;
  readonly severityIndex: typeof computeSeverityIndex;
  readonly rankSeverities: typeof rankDistrictSeverities;
  readonly response: ResponseCalculations;
  readonly vulnerableLoad: typeof vulnerableLoad;
  /**
   * The Scenario context's injection points, wired to Response Capacity.
   * Substitutable so a test can prove the projection engine is driven by the
   * real calculations and not by a copy of them.
   */
  readonly scenarioDependencies: ProjectionDependencies;
  readonly identifyFailures: typeof identifyFailurePoints;
};

export const DEFAULT_MAPPING_DEPENDENCIES: MappingDependencies = {
  summarise: summariseSituation,
  districtSituations: districtSituationsFrom,
  severityIndex: computeSeverityIndex,
  rankSeverities: rankDistrictSeverities,
  response: RESPONSE_CALCULATIONS,
  vulnerableLoad,
  scenarioDependencies: createScenarioDependencies(),
  identifyFailures: identifyFailurePoints,
};

export type MappingInput = {
  readonly report: FloodSituationReport;
  /** Every bulletin loaded so far, latest included (FR-1.7). */
  readonly timeline: BulletinTimeline;
  readonly assumptions: ConsoleAssumptions;
};


// ---------------------------------------------------------------------------
// District ranking
// ---------------------------------------------------------------------------

const contributionsOf = (severity: DistrictSeverity | undefined): SeverityContribution[] =>
  (severity?.contributions ?? []).map((contribution) => ({
    component: contribution.component,
    weight: contribution.weight,
    normalised: contribution.normalised,
    contribution: contribution.contribution,
  }));

const circleRowsOf = (
  situation: DistrictSituation,
  deps: MappingDependencies,
): RevenueCircleRowViewModel[] =>
  situation.circles.map((circle) => ({
    circle: String(circle.circle),
    villagesAffected: circle.villagesAffected,
    populationAffected: circle.populationAffected,
    cropAreaSubmerged: circle.cropAreaSubmerged,
    reliefCamps: circle.reliefCamps,
    reliefDistributionCentres: circle.reliefDistributionCentres,
    campInmates: circle.campInmates,
    nonCampInmates: circle.nonCampInmates,
    campLoad: deps.response.campLoad(circle.campInmates, circle.reliefCamps).inmatesPerCamp,
  }));

const districtRows = (
  report: FloodSituationReport,
  assumptions: ConsoleAssumptions,
  deps: MappingDependencies,
): readonly DistrictRowViewModel[] => {
  const situations = deps.districtSituations(report.districts);
  const severities = deps.severityIndex(
    situations,
    assumptions.severityWeights,
    DEFAULT_SEVERITY_READERS,
  );
  const ranked = deps.rankSeverities(severities);

  const severityByDistrict = new Map(severities.map((s) => [String(s.district), s]));
  const situationByDistrict = new Map(situations.map((s) => [String(s.district), s]));
  const casualtyProvenance = provenanceOf(report, 'lives-lost-confirmed');
  const populationProvenance = provenanceOf(report, 'population-and-crop-area-submerged');

  const rows: DistrictRowViewModel[] = [];
  for (const entry of ranked) {
    const name = String(entry.district);
    const situation = situationByDistrict.get(name);
    if (situation === undefined) continue;
    const severity = severityByDistrict.get(name);

    rows.push({
      district: name,
      rank: entry.rank,
      severityIndex: severity?.score ?? 0,
      contributions: contributionsOf(severity),
      populationAffected: situation.population.total,
      villagesAffected: situation.villagesAffected,
      cropAreaSubmerged: situation.cropAreaSubmerged,
      campInmates: situation.campInmates,
      reliefCamps: situation.reliefCamps,
      campLoad: deps.response.campLoad(situation.campInmates, situation.reliefCamps).inmatesPerCamp,
      casualties: {
        floodDeaths: situation.casualties.floodDeaths,
        generalDrownings: situation.casualties.generalDrownings,
        missing: situation.casualties.missing,
        confirmedProvenance: casualtyProvenance,
      },
      revenueCircles: circleRowsOf(situation, deps),
      // PRD §4.1: an all-zero District row was reported and is quiet, which is
      // not the same as absent. The figures themselves keep the distinction —
      // an unreported District renders as "—" throughout, never as 0.
      status: situation.activity === 'affected' ? 'affected' : 'reported-quiet',
      provenance: populationProvenance,
    });
  }
  return rows;
};

// ---------------------------------------------------------------------------
// Response capacity
// ---------------------------------------------------------------------------

const responseRow = (
  district: DistrictReport,
  norm: RationNorm,
  deps: MappingDependencies,
): ResponseRowViewModel => {
  const load = deps.vulnerableLoad(district.campInmates, DEFAULT_VULNERABILITY_POLICY);
  return {
    district: String(district.district),
    reliefCamps: district.reliefCamps,
    reliefDistributionCentres: district.reliefDistributionCentres,
    campInmates: district.campInmates.total,
    nonCampInmates: district.nonCampInmates.total,
    campLoad: deps.response.campLoad(district.campInmates.total, district.reliefCamps).inmatesPerCamp,
    rationCoverageDays: deps.response.rationCoverageDays(
      district.relief.rice,
      district.campInmates.total,
      norm,
    ).days,
    vulnerableLoad: load.fraction === undefined ? undefined : load.fraction * 100,
  };
};

const capacityViewModel = (
  report: FloodSituationReport,
  summary: SituationSummary,
  figures: StatewideDerived,
  norm: RationNorm,
  deps: MappingDependencies,
): ResponseCapacityViewModel => ({
  riceStock: summary.reported.riceDistributed,
  campInmates: summary.reported.campInmates,
  reliefCamps: summary.reported.reliefCamps,
  reliefDistributionCentres: summary.reported.reliefDistributionCentres,
  nonCampInmates: summary.reported.nonCampInmates,
  campLoad: figures.campLoad,
  rationCoverageDays: figures.rationCoverage,
  vulnerableLoad: figures.vulnerableLoad,
  rescueAssetRatio: figures.rescueAssetRatio,
  districts: report.districts.map((district) => responseRow(district, norm, deps)),
});

// ---------------------------------------------------------------------------
// Damage map
// ---------------------------------------------------------------------------

/**
 * Only damage with a coordinate is plotted. A `SNR` location is not a point at
 * (0, 0) and is not guessed at from the District name — it is simply absent
 * from the map, and the table still carries it.
 */
const damagePoints = (report: FloodSituationReport): readonly DamagePointViewModel[] =>
  report.infrastructureDamage.flatMap((damage, index) =>
    damage.coordinate === undefined
      ? []
      : [
          {
            id: `${damage.damageClass}-${index}`,
            damageClass: damage.damageClass,
            district: String(damage.district),
            circle: String(damage.circle),
            name: damage.name,
            coordinate: damage.coordinate,
          },
        ],
  );

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export const reportToConsoleData = (
  input: MappingInput,
  deps: MappingDependencies = DEFAULT_MAPPING_DEPENDENCIES,
): ConsoleData => {
  const { report, timeline, assumptions } = input;

  const summary = deps.summarise(report, summaryOptions);
  const norm = normOf(assumptions.rationNormKgPerPersonPerDay);
  const figures = statewideDerivedFigures(summary, deps, norm);

  const scenario = createScenario({
    name: 'Working scenario',
    baseline: report,
    levers: leversFrom(assumptions.levers, report),
  });
  const outcome = scenario.project(report, deps.scenarioDependencies);
  const failures = deps.identifyFailures(outcome, {
    campCapacityPerCamp: assumptions.campCapacityPerCamp,
  });

  return {
    summary: summaryViewModel(report, summary, figures),
    districts: districtRows(report, assumptions, deps),
    capacity: capacityViewModel(report, summary, figures, norm, deps),
    damagePoints: damagePoints(report),
    scenarioComparisons: scenarioComparisonsFrom(outcome),
    firstFailure: firstFailureFrom(failures),
    trend: trendFrom(
      timeline,
      (held) => deps.summarise(held, summaryOptions).derived.unshelteredAffected.value,
    ),
  };
};

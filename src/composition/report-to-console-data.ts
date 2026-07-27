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

import { valueOf } from '../domain/shared/quantity';
import type { Count } from '../domain/shared/quantity';
import type {
  DistrictReport,
  FloodSituationReport,
  SectionKind,
} from '../domain/shared/flood-situation-report';

import { districtSituationsFrom, type DistrictSituation } from '../domain/situation/district-situation';
import {
  DEFAULT_SEVERITY_READERS,
  computeSeverityIndex,
  type DistrictSeverity,
} from '../domain/situation/severity-index';
import { rankDistrictSeverities } from '../domain/situation/ranking';
import { summariseSituation, type SituationSummary } from '../domain/situation/situation-summary';

import {
  DEFAULT_VULNERABILITY_POLICY,
  vulnerableInmates,
  vulnerableLoad,
} from '../domain/response/camp-load';
import { rationNorm, type RationNorm } from '../domain/response/ration-coverage';

import { createScenario } from '../domain/scenario/scenario';
import { identifyFailurePoints } from '../domain/scenario/failure-point';
import type { ProjectionDependencies } from '../domain/scenario/projection-engine';

import type { BulletinTimeline } from '../domain/timeline/bulletin-timeline';

import type { ConsoleData } from '../adapters/ui/console-app';
import type {
  CasualtiesViewModel,
  DamagePointViewModel,
  DerivedFigure,
  DistrictRowViewModel,
  ReportedFigure,
  ResponseCapacityViewModel,
  ResponseRowViewModel,
  RevenueCircleRowViewModel,
  SeverityContribution,
  ShelterSegment,
  SituationSummaryViewModel,
} from '../adapters/ui/view-models';

import type { ConsoleAssumptions } from './assumptions';
import { derivedFigureFrom, percentFigureFrom } from './derived-figures';
import {
  RESPONSE_CALCULATIONS,
  createScenarioDependencies,
  leversFrom,
  type ResponseCalculations,
} from './scenario-dependencies';
import { SECTION_LABELS, provenanceOf, unreadableSections } from './section-labels';
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
// Small shared pieces
// ---------------------------------------------------------------------------

const CWC_ATTRIBUTION = 'CWC bulletin issued 08:00';

/**
 * The Situation Assessment context asks the Response Capacity context what
 * "vulnerable" means, rather than keeping a second definition of its own.
 */
const summaryOptions = {
  vulnerableInmatesOf: (inmates: Parameters<typeof vulnerableInmates>[0]): Count =>
    vulnerableInmates(inmates, DEFAULT_VULNERABILITY_POLICY),
};

const normOf = (kilogramsPerPersonPerDay: number): RationNorm =>
  rationNorm(
    kilogramsPerPersonPerDay,
    kilogramsPerPersonPerDay === 0.6
      ? 'SDRF relief-norm convention'
      : 'set by the user in this console',
  );

const reported = (
  key: string,
  label: string,
  quantity: ReportedFigure['quantity'],
  report: FloodSituationReport,
  section?: SectionKind,
  precision = 0,
): ReportedFigure => ({
  key,
  label,
  quantity,
  precision,
  provenance: section === undefined ? undefined : provenanceOf(report, section),
});

const shareOf = (value: number | undefined, total: number | undefined): number =>
  value === undefined || total === undefined || total === 0 ? 0 : value / total;

const populationNote = (districts: readonly DistrictReport[]): string | undefined => {
  const parts = (['male', 'female', 'children'] as const).map((key) =>
    districts.reduce<number | undefined>((acc, district) => {
      const value = valueOf(district.population[key]);
      return acc === undefined || value === undefined ? undefined : acc + value;
    }, 0),
  );
  if (parts.some((part) => part === undefined)) return undefined;
  const [male, female, children] = parts as [number, number, number];
  return `M ${male} / F ${female} / C ${children}, summed from the District rows`;
};

// ---------------------------------------------------------------------------
// Situation Summary
// ---------------------------------------------------------------------------

type StatewideDerived = {
  readonly unsheltered: DerivedFigure;
  readonly campUptake: DerivedFigure;
  readonly campLoad: DerivedFigure;
  readonly rationCoverage: DerivedFigure;
  readonly vulnerableLoad: DerivedFigure;
  readonly rescueAssetRatio: DerivedFigure;
};

/**
 * Each context names its own figure — `inmatesPerCamp`, `days` — because that
 * is the ubiquitous language. The view model wants a value and a derivation, so
 * the rename happens here rather than by widening a domain type to suit a UI.
 */
const asMetric = (
  value: number | undefined,
  derivation: { formula: string; substitution: string; note?: string },
): { value: number | undefined; derivation: typeof derivation } => ({ value, derivation });

const statewideDerivedFigures = (
  summary: SituationSummary,
  deps: MappingDependencies,
  norm: RationNorm,
): StatewideDerived => {
  const { reported: totals, derived } = summary;

  const load = deps.response.campLoad(totals.campInmates, totals.reliefCamps);
  const coverage = deps.response.rationCoverageDays(totals.riceDistributed, totals.campInmates, norm);
  const campLoad = asMetric(load.inmatesPerCamp, load.derivation);
  const rationCoverage = asMetric(coverage.days, coverage.derivation);

  return {
    unsheltered: derivedFigureFrom(
      'unsheltered-affected',
      'Unsheltered Affected',
      derived.unshelteredAffected,
      { context: 'The population with no recorded relief touchpoint. The headline gap.' },
    ),
    campUptake: percentFigureFrom('camp-uptake-rate', 'Camp Uptake Rate', derived.campUptakeRate),
    campLoad: derivedFigureFrom('camp-load', 'Camp Load', campLoad, {
      unit: 'per Relief Camp',
    }),
    rationCoverage: derivedFigureFrom(
      'ration-coverage-days',
      'Ration Coverage Days',
      rationCoverage,
      { precision: 1, unit: 'days' },
    ),
    vulnerableLoad: percentFigureFrom('vulnerable-load', 'Vulnerable Load', derived.vulnerableLoad),
    rescueAssetRatio: derivedFigureFrom(
      'rescue-asset-ratio',
      'Rescue Asset Ratio',
      derived.rescueAssetRatio,
      { precision: 2, unit: 'boats per 1,000 affected' },
    ),
  };
};

const shelterSplitOf = (summary: SituationSummary, unsheltered: DerivedFigure): ShelterSegment[] => {
  const affected = valueOf(summary.reported.populationAffected);
  const inmates = valueOf(summary.reported.campInmates);
  const nonCamp = valueOf(summary.reported.nonCampInmates);

  return [
    {
      key: 'camp-inmates',
      label: 'Inmates in Relief Camps',
      value: inmates,
      share: shareOf(inmates, affected),
      derived: false,
    },
    {
      key: 'non-camp-inmates',
      label: 'Non-Camp Inmates',
      value: nonCamp,
      share: shareOf(nonCamp, affected),
      derived: false,
    },
    {
      key: 'unsheltered',
      label: 'Unsheltered Affected',
      value: unsheltered.value,
      share: shareOf(unsheltered.value, affected),
      derived: true,
    },
  ];
};

const casualtiesOf = (
  summary: SituationSummary,
  report: FloodSituationReport,
): CasualtiesViewModel => ({
  floodDeaths: summary.casualties.floodDeaths,
  generalDrownings: summary.casualties.generalDrownings,
  missing: summary.casualties.missing,
  confirmedProvenance: provenanceOf(report, 'lives-lost-confirmed'),
  missingProvenance: provenanceOf(report, 'lives-lost-missing'),
});

const summaryViewModel = (
  report: FloodSituationReport,
  summary: SituationSummary,
  figures: StatewideDerived,
): SituationSummaryViewModel => {
  const totals = summary.reported;

  return {
    reportDate: String(summary.reportDate),
    generatedAt: report.generatedAt,
    affectedPopulation: {
      ...reported(
        'population-affected',
        'Population Affected',
        totals.populationAffected,
        report,
        'population-and-crop-area-submerged',
      ),
      note: populationNote(report.districts),
    },
    unshelteredAffected: figures.unsheltered,
    unshelteredShare: shareOf(figures.unsheltered.value, valueOf(totals.populationAffected)),
    shelterSplit: shelterSplitOf(summary, figures.unsheltered),
    reportedFigures: [
      reported('districts', 'Districts Affected', totals.districtsAffected, report, 'districts-affected'),
      reported(
        'circles',
        'Revenue Circles Affected',
        totals.revenueCirclesAffected,
        report,
        'revenue-circles-affected',
      ),
      reported('villages', 'Villages Affected', totals.villagesAffected, report, 'villages-affected'),
      reported(
        'crop',
        'Crop Area Submerged',
        totals.cropAreaSubmerged,
        report,
        'population-and-crop-area-submerged',
        2,
      ),
      reported('camps', 'Relief Camps', totals.reliefCamps, report, 'relief-camps-opened'),
      reported(
        'centres',
        'Relief Distribution Centres',
        totals.reliefDistributionCentres,
        report,
        'relief-camps-opened',
      ),
      reported('inmates', 'Inmates', totals.campInmates, report, 'inmates-in-relief-camps'),
      reported('non-camp', 'Non-Camp Inmates', totals.nonCampInmates, report, 'non-camp-inmates'),
      reported('rice', 'Rice Distributed', totals.riceDistributed, report, 'relief-distributed', 2),
      reported('boats', 'Boats Deployed', totals.boatsDeployed, report, 'rescue-operation'),
      reported('medical-teams', 'Medical Teams', totals.medicalTeams, report, 'rescue-operation'),
    ],
    derivedMetrics: [
      figures.campUptake,
      figures.campLoad,
      figures.rationCoverage,
      figures.vulnerableLoad,
      figures.rescueAssetRatio,
    ],
    rivers: {
      aboveDangerLevel: summary.rivers.aboveDangerLevel,
      aboveHighestFloodLevel: summary.rivers.aboveHighestFloodLevel,
      attribution: CWC_ATTRIBUTION,
    },
    casualties: casualtiesOf(summary, report),
    reconciliationWarnings: report.reconciliationFailures.map((failure) => ({
      sectionLabel: SECTION_LABELS[failure.section],
      column: failure.column,
      statedTotal: failure.statedTotal,
      computedTotal: failure.computedTotal,
    })),
    unreadableSections: unreadableSections(report),
  };
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

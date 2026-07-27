/**
 * The Situation Summary, mapped.
 *
 * FR-2.1's single screen: what ASDMA reported, what we derived from it, and —
 * given equal weight to both — the headline gap the bulletin never states, that
 * 365,023 affected people have no recorded relief touchpoint at all.
 *
 * Nothing is computed here. The figures come from `domain/situation` and
 * `domain/response`; this module renames them and carries their derivations
 * across the boundary intact (PRD §4.5).
 */

import { valueOf } from '../domain/shared/quantity';
import type { Count } from '../domain/shared/quantity';
import type {
  DistrictReport,
  FloodSituationReport,
  SectionKind,
} from '../domain/shared/flood-situation-report';
import type { SituationSummary } from '../domain/situation/situation-summary';
import {
  DEFAULT_VULNERABILITY_POLICY,
  vulnerableInmates,
} from '../domain/response/camp-load';
import { rationNorm, type RationNorm } from '../domain/response/ration-coverage';
import {
  formatNumber,
  type CasualtiesViewModel,
  type DerivedFigure,
  type ReportedFigure,
  type ShelterSegment,
  type SituationSummaryViewModel,
} from '../adapters/ui/view-models';
import { derivedFigureFrom, percentFigureFrom } from './derived-figures';
import { SECTION_LABELS, provenanceOf, unreadableSections } from './section-labels';
import type { ResponseCalculations } from './scenario-dependencies';

/** Just the collaborators this module asks for. */
export type SummaryDependencies = { readonly response: ResponseCalculations };

const CWC_ATTRIBUTION = 'CWC bulletin issued 08:00';

/**
 * The Situation Assessment context asks the Response Capacity context what
 * "vulnerable" means, rather than keeping a second definition of its own.
 */
export const summaryOptions = {
  vulnerableInmatesOf: (inmates: Parameters<typeof vulnerableInmates>[0]): Count =>
    vulnerableInmates(inmates, DEFAULT_VULNERABILITY_POLICY),
};

export const normOf = (kilogramsPerPersonPerDay: number): RationNorm =>
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
  return (
    `M ${formatNumber(male)} / F ${formatNumber(female)} / C ${formatNumber(children)}, ` +
    'summed from the District rows'
  );
};

export type StatewideDerived = {
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

export const statewideDerivedFigures = (
  summary: SituationSummary,
  deps: SummaryDependencies,
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

export const summaryViewModel = (
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

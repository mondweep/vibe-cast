/**
 * The seam between the domain and the UI adapter.
 *
 * Deliberately dumb and total. It renames, flattens and formats; it computes no
 * derived metric, ranks nothing, and never fails. Every decision figure — camp
 * uptake, unsheltered population, ration coverage, severity — belongs to a
 * domain service in `src/domain/`, where it can be tested without a React tree
 * and where the PRD's "clearly marked as derived" rule can be enforced. If a
 * calculation ever appears in this file, it is in the wrong place.
 *
 * What it does own is the presentation convention for the unknown/zero
 * distinction: a reported zero renders as `0`, an unreported figure as `—`
 * (PRD §5.1 invariant 4). The `value` field stays `null` for unknown so a chart
 * can leave a gap rather than plot a false zero.
 */

import { forDisplay, valueOf } from '../../domain/shared/quantity';
import type { Quantity } from '../../domain/shared/quantity';
import type {
  DistrictReport,
  ExtractionConfidence,
  FloodSituationReport,
  InfrastructureDamage,
  RevenueCircleImpact,
  SectionKind,
} from '../../domain/shared/flood-situation-report';

export type QuantityView = {
  readonly known: boolean;
  /** `null` when the bulletin reported nothing. Never coerced to 0. */
  readonly value: number | null;
  readonly unit: string;
  /** `—` when unknown; `0` when a zero was actually reported. */
  readonly display: string;
};

export type CasualtiesView = {
  readonly floodDeaths: QuantityView;
  readonly generalDrownings: QuantityView;
  readonly missing: QuantityView;
};

export type RevenueCircleRowView = {
  readonly circle: string;
  readonly villagesAffected: QuantityView;
  readonly populationAffected: QuantityView;
  readonly cropAreaSubmerged: QuantityView;
  readonly reliefCamps: QuantityView;
  readonly reliefDistributionCentres: QuantityView;
  readonly campInmates: QuantityView;
  readonly nonCampInmates: QuantityView;
};

export type DistrictRowView = {
  readonly district: string;
  readonly villagesAffected: QuantityView;
  readonly populationMale: QuantityView;
  readonly populationFemale: QuantityView;
  readonly populationChildren: QuantityView;
  readonly populationTotal: QuantityView;
  readonly cropAreaSubmerged: QuantityView;
  readonly reliefCamps: QuantityView;
  readonly reliefDistributionCentres: QuantityView;
  readonly campInmates: QuantityView;
  readonly campInmatesChildren: QuantityView;
  readonly campInmatesPregnantOrLactating: QuantityView;
  readonly campInmatesPersonsWithDisability: QuantityView;
  readonly nonCampInmates: QuantityView;
  readonly casualties: CasualtiesView;
  readonly housesFullySeverelyKuccha: QuantityView;
  readonly housesFullySeverelyPukka: QuantityView;
  readonly housesPartiallyKuccha: QuantityView;
  readonly housesPartiallyPukka: QuantityView;
  readonly animalsAffectedBig: QuantityView;
  readonly animalsAffectedSmall: QuantityView;
  readonly animalsAffectedPoultry: QuantityView;
  readonly animalsWashedAwayBig: QuantityView;
  readonly animalsWashedAwaySmall: QuantityView;
  readonly animalsWashedAwayPoultry: QuantityView;
  readonly riceDistributed: QuantityView;
  readonly mustardOilDistributed: QuantityView;
  readonly boats: QuantityView;
  readonly medicalTeams: QuantityView;
  readonly agencies: readonly string[];
  readonly remarks: string;
  readonly hasRemarks: boolean;
  readonly revenueCircles: readonly RevenueCircleRowView[];
  readonly revenueCircleCount: number;
};

export type DamagePointView = {
  readonly damageClass: string;
  readonly district: string;
  readonly circle: string;
  readonly name: string;
  readonly department: string;
  readonly village: string;
  readonly location: string;
  readonly longitude: number | null;
  readonly latitude: number | null;
  readonly coordinatePrecision: 'precise' | 'approximate' | null;
  /** False when the bulletin gave no coordinate — do not invent one. */
  readonly plottable: boolean;
  readonly remarks: string;
};

export type SectionStatusView = {
  readonly section: SectionKind;
  readonly sourcePages: readonly number[];
  /** `p. 1`, `pp. 3–4`, or `—` when the section could not be located. */
  readonly sourcePagesLabel: string;
  readonly confidence: ExtractionConfidence;
  /** False for a `failed` section, which must render as "could not read". */
  readonly readable: boolean;
};

export type ReconciliationFailureView = {
  readonly section: SectionKind;
  readonly column: string;
  readonly statedTotal: number;
  readonly computedTotal: number;
  /** Stated minus computed — a display convenience, not a judgement. */
  readonly difference: number;
};

export type StatewideTotalsView = {
  readonly districtsAffected: QuantityView;
  readonly revenueCirclesAffected: QuantityView;
  readonly villagesAffected: QuantityView;
  readonly populationAffected: QuantityView;
  readonly cropAreaSubmerged: QuantityView;
  readonly reliefCamps: QuantityView;
  readonly reliefDistributionCentres: QuantityView;
  readonly campInmates: QuantityView;
  readonly nonCampInmates: QuantityView;
};

export type ReportView = {
  readonly bulletinId: string;
  readonly reportDate: string;
  readonly generatedAt: string;
  readonly rivers: {
    readonly aboveDangerLevel: readonly string[];
    readonly aboveHighestFloodLevel: readonly string[];
    readonly anyAboveDangerLevel: boolean;
    readonly anyAboveHighestFloodLevel: boolean;
  };
  readonly statewideTotals: StatewideTotalsView;
  readonly districts: readonly DistrictRowView[];
  readonly districtCount: number;
  readonly damagePoints: readonly DamagePointView[];
  readonly sections: readonly SectionStatusView[];
  readonly reconciliationFailures: readonly ReconciliationFailureView[];
  readonly hasReconciliationFailures: boolean;
};

export type BulletinSummaryView = {
  readonly bulletinId: string;
  readonly reportDate: string;
  readonly generatedAt: string;
  readonly districtCount: number;
  readonly hasReconciliationFailures: boolean;
};

export const toQuantityView = <U extends string>(quantity: Quantity<U>): QuantityView => ({
  known: quantity.kind === 'known',
  value: valueOf(quantity) ?? null,
  unit: quantity.unit,
  display: forDisplay(quantity),
});

const toRevenueCircleRowView = (circle: RevenueCircleImpact): RevenueCircleRowView => ({
  circle: String(circle.circle),
  villagesAffected: toQuantityView(circle.villagesAffected),
  populationAffected: toQuantityView(circle.populationAffected),
  cropAreaSubmerged: toQuantityView(circle.cropAreaSubmerged),
  reliefCamps: toQuantityView(circle.reliefCamps),
  reliefDistributionCentres: toQuantityView(circle.reliefDistributionCentres),
  campInmates: toQuantityView(circle.campInmates),
  nonCampInmates: toQuantityView(circle.nonCampInmates),
});

const toDistrictRowView = (district: DistrictReport): DistrictRowView => ({
  district: String(district.district),
  villagesAffected: toQuantityView(district.villagesAffected),
  populationMale: toQuantityView(district.population.male),
  populationFemale: toQuantityView(district.population.female),
  populationChildren: toQuantityView(district.population.children),
  populationTotal: toQuantityView(district.population.total),
  cropAreaSubmerged: toQuantityView(district.cropAreaSubmerged),
  reliefCamps: toQuantityView(district.reliefCamps),
  reliefDistributionCentres: toQuantityView(district.reliefDistributionCentres),
  campInmates: toQuantityView(district.campInmates.total),
  campInmatesChildren: toQuantityView(district.campInmates.children),
  campInmatesPregnantOrLactating: toQuantityView(district.campInmates.pregnantOrLactating),
  campInmatesPersonsWithDisability: toQuantityView(district.campInmates.personsWithDisability),
  nonCampInmates: toQuantityView(district.nonCampInmates.total),
  // Three fields, no fourth. There is nothing here for a UI to sum.
  casualties: {
    floodDeaths: toQuantityView(district.casualties.floodDeaths),
    generalDrownings: toQuantityView(district.casualties.generalDrownings),
    missing: toQuantityView(district.casualties.missing),
  },
  housesFullySeverelyKuccha: toQuantityView(district.houses.fullySeverelyKuccha),
  housesFullySeverelyPukka: toQuantityView(district.houses.fullySeverelyPukka),
  housesPartiallyKuccha: toQuantityView(district.houses.partiallyKuccha),
  housesPartiallyPukka: toQuantityView(district.houses.partiallyPukka),
  animalsAffectedBig: toQuantityView(district.animals.affected.big),
  animalsAffectedSmall: toQuantityView(district.animals.affected.small),
  animalsAffectedPoultry: toQuantityView(district.animals.affected.poultry),
  animalsWashedAwayBig: toQuantityView(district.animals.washedAway.big),
  animalsWashedAwaySmall: toQuantityView(district.animals.washedAway.small),
  animalsWashedAwayPoultry: toQuantityView(district.animals.washedAway.poultry),
  riceDistributed: toQuantityView(district.relief.rice),
  mustardOilDistributed: toQuantityView(district.relief.mustardOil),
  boats: toQuantityView(district.rescue.boats),
  medicalTeams: toQuantityView(district.rescue.medicalTeams),
  agencies: [...district.rescue.agencies],
  remarks: district.remarks,
  hasRemarks: district.remarks.trim().length > 0,
  revenueCircles: district.revenueCircles.map(toRevenueCircleRowView),
  revenueCircleCount: district.revenueCircles.length,
});

const toDamagePointView = (damage: InfrastructureDamage): DamagePointView => ({
  damageClass: damage.damageClass,
  district: String(damage.district),
  circle: String(damage.circle),
  name: damage.name,
  department: damage.department,
  village: damage.village,
  location: damage.location,
  longitude: damage.coordinate?.longitude ?? null,
  latitude: damage.coordinate?.latitude ?? null,
  coordinatePrecision: damage.coordinate?.kind ?? null,
  plottable: damage.coordinate !== undefined,
  remarks: damage.remarks,
});

/** `p. 1` / `pp. 3–4` / `pp. 5, 7–9`, using an en dash for ranges. */
const pageLabel = (pages: readonly number[]): string => {
  if (pages.length === 0) return '—';
  const sorted = [...pages].sort((a, b) => a - b);
  const runs: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const page of sorted.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    runs.push(start === previous ? String(start) : `${start}–${previous}`);
    start = page;
    previous = page;
  }
  runs.push(start === previous ? String(start) : `${start}–${previous}`);
  const singlePage = sorted.length === 1;
  return `${singlePage ? 'p.' : 'pp.'} ${runs.join(', ')}`;
};

export const toReportView = (report: FloodSituationReport): ReportView => ({
  bulletinId: String(report.bulletinId),
  reportDate: String(report.reportDate),
  generatedAt: report.generatedAt,
  rivers: {
    aboveDangerLevel: [...report.rivers.aboveDangerLevel],
    aboveHighestFloodLevel: [...report.rivers.aboveHighestFloodLevel],
    anyAboveDangerLevel: report.rivers.aboveDangerLevel.length > 0,
    anyAboveHighestFloodLevel: report.rivers.aboveHighestFloodLevel.length > 0,
  },
  statewideTotals: {
    districtsAffected: toQuantityView(report.statewideTotals.districtsAffected),
    revenueCirclesAffected: toQuantityView(report.statewideTotals.revenueCirclesAffected),
    villagesAffected: toQuantityView(report.statewideTotals.villagesAffected),
    populationAffected: toQuantityView(report.statewideTotals.populationAffected),
    cropAreaSubmerged: toQuantityView(report.statewideTotals.cropAreaSubmerged),
    reliefCamps: toQuantityView(report.statewideTotals.reliefCamps),
    reliefDistributionCentres: toQuantityView(report.statewideTotals.reliefDistributionCentres),
    campInmates: toQuantityView(report.statewideTotals.campInmates),
    nonCampInmates: toQuantityView(report.statewideTotals.nonCampInmates),
  },
  districts: report.districts.map(toDistrictRowView),
  districtCount: report.districts.length,
  damagePoints: report.infrastructureDamage.map(toDamagePointView),
  sections: report.provenance.map((section) => ({
    section: section.kind,
    sourcePages: [...section.sourcePages],
    sourcePagesLabel: pageLabel(section.sourcePages),
    confidence: section.confidence,
    readable: section.confidence !== 'failed',
  })),
  reconciliationFailures: report.reconciliationFailures.map((failure) => ({
    section: failure.section,
    column: failure.column,
    statedTotal: failure.statedTotal,
    computedTotal: failure.computedTotal,
    difference: failure.statedTotal - failure.computedTotal,
  })),
  hasReconciliationFailures: report.reconciliationFailures.length > 0,
});

/** Row shapes for the timeline picker. Order is the caller's concern. */
export const toBulletinSummaries = (
  reports: readonly FloodSituationReport[],
): readonly BulletinSummaryView[] =>
  reports.map((report) => ({
    bulletinId: String(report.bulletinId),
    reportDate: String(report.reportDate),
    generatedAt: report.generatedAt,
    districtCount: report.districts.length,
    hasReconciliationFailures: report.reconciliationFailures.length > 0,
  }));

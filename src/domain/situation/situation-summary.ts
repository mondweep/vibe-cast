/**
 * SITUATION ASSESSMENT (Core) — the statewide Situation Summary.
 *
 * FR-2.1. The bulletin puts relief camp inmates on page 2 and affected
 * population on page 1, and never puts them in the same sentence. The single
 * most useful number in the document — that 365,023 affected people have no
 * recorded touchpoint at all — appears nowhere in it. This module computes it,
 * and gives it equal weight to the figures ASDMA actually printed.
 *
 * Two rules govern everything here:
 *
 *  1. **ASDMA's numbers stay ASDMA's numbers.** Reported figures are read from
 *     `statewideTotals` — the Total rows as printed — not re-summed and quietly
 *     substituted. Where ASDMA prints no state total (boats, rice, the derived
 *     Vulnerable Inmates figure) we sum the district rows and say so.
 *  2. **Every derived figure carries its formula** (PRD §4.5), so the UI can
 *     show it on hover and no officer mistakes our arithmetic for reporting.
 *
 * Ration Coverage Days is deliberately *absent*: it requires a `RationNorm`,
 * and PRD §5.3 invariant 3 says that assumption must be stated at the call
 * site. See `response/ration-coverage.ts`.
 *
 * Pure. No I/O, no clock.
 */

import type {
  CampInmates,
  Casualties,
  DistrictReport,
  FloodSituationReport,
  ReportDate,
  RiverStatus,
} from '../shared/flood-situation-report';
import type { Count, Hectares, Quintals } from '../shared/quantity';
import { count, quintals, sumQuantities, unknownCount, unknownQuintals, valueOf } from '../shared/quantity';
import type { DerivedMetric } from './derivation';
import { derivedDifference, derivedQuotient } from './derivation';

const DERIVED = 'derived — our arithmetic, not an ASDMA figure';

/**
 * Sum counts across districts, propagating unknown-ness.
 *
 * An unreported district makes the state total unknown, not smaller. An empty
 * bulletin, by contrast, really does have nothing in it.
 */
const sumCounts = (parts: readonly Count[]): Count => {
  if (parts.length === 0) return count(0);
  const { total, hadUnknowns } = sumQuantities('count', parts);
  return hadUnknowns ? unknownCount() : total;
};

const sumQuintals = (parts: readonly Quintals[]): Quintals => {
  if (parts.length === 0) return quintals(0);
  const { total, hadUnknowns } = sumQuantities('Q', parts);
  return hadUnknowns ? unknownQuintals() : total;
};

/**
 * Vulnerable Inmates — *our* derived term (PRD §4.3), not ASDMA's:
 * Children + Pregnant/Lactating Mothers + Persons with Disability.
 *
 * Injected so the Response Capacity context's `VulnerabilityPolicy` can be
 * wired in at the composition root and the two contexts cannot drift apart on
 * what "vulnerable" means.
 */
export type VulnerableInmatesReader = (inmates: CampInmates) => Count;

export const defaultVulnerableInmatesReader: VulnerableInmatesReader = (inmates) =>
  sumCounts([inmates.children, inmates.pregnantOrLactating, inmates.personsWithDisability]);

export type StatewideReported = {
  readonly districtsAffected: Count;
  readonly revenueCirclesAffected: Count;
  readonly villagesAffected: Count;
  readonly populationAffected: Count;
  readonly cropAreaSubmerged: Hectares;
  /** Relief Camps and Relief Distribution Centres serve different populations. */
  readonly reliefCamps: Count;
  readonly reliefDistributionCentres: Count;
  readonly campInmates: Count;
  readonly nonCampInmates: Count;
  /** Summed from the district rows — ASDMA prints no state total for these. */
  readonly boatsDeployed: Count;
  readonly medicalTeams: Count;
  readonly riceDistributed: Quintals;
  /** Derived, per the injected vulnerability policy. */
  readonly vulnerableInmates: Count;
};

export type SituationSummaryDerived = {
  /** The headline gap: affected people with no recorded touchpoint at all. */
  readonly unshelteredAffected: DerivedMetric<number>;
  readonly campUptakeRate: DerivedMetric<number>;
  readonly campLoad: DerivedMetric<number>;
  readonly vulnerableLoad: DerivedMetric<number>;
  readonly rescueAssetRatio: DerivedMetric<number>;
};

export type SituationSummary = {
  readonly reportDate: ReportDate;
  readonly reported: StatewideReported;
  readonly derived: SituationSummaryDerived;
  /**
   * Flood deaths, general drownings and missing persons, summed *within* each
   * category and never across them (FR-2.9).
   */
  readonly casualties: Casualties;
  /** Attributed to CWC's 08:00 bulletin; we restate nothing. */
  readonly rivers: RiverStatus;
};

const statewideCasualties = (districts: readonly DistrictReport[]): Casualties => ({
  floodDeaths: sumCounts(districts.map((d) => d.casualties.floodDeaths)),
  generalDrownings: sumCounts(districts.map((d) => d.casualties.generalDrownings)),
  missing: sumCounts(districts.map((d) => d.casualties.missing)),
});

export type SummaryOptions = {
  readonly vulnerableInmatesOf?: VulnerableInmatesReader;
};

export const summariseSituation = (
  report: FloodSituationReport,
  options: SummaryOptions = {},
): SituationSummary => {
  const vulnerableInmatesOf = options.vulnerableInmatesOf ?? defaultVulnerableInmatesReader;
  const totals = report.statewideTotals;

  const reported: StatewideReported = {
    districtsAffected: totals.districtsAffected,
    revenueCirclesAffected: totals.revenueCirclesAffected,
    villagesAffected: totals.villagesAffected,
    populationAffected: totals.populationAffected,
    cropAreaSubmerged: totals.cropAreaSubmerged,
    reliefCamps: totals.reliefCamps,
    reliefDistributionCentres: totals.reliefDistributionCentres,
    campInmates: totals.campInmates,
    nonCampInmates: totals.nonCampInmates,
    boatsDeployed: sumCounts(report.districts.map((d) => d.rescue.boats)),
    medicalTeams: sumCounts(report.districts.map((d) => d.rescue.medicalTeams)),
    riceDistributed: sumQuintals(report.districts.map((d) => d.relief.rice)),
    vulnerableInmates: sumCounts(report.districts.map((d) => vulnerableInmatesOf(d.campInmates))),
  };

  const affected = valueOf(reported.populationAffected);
  const inmates = valueOf(reported.campInmates);
  const nonCampInmates = valueOf(reported.nonCampInmates);
  const camps = valueOf(reported.reliefCamps);
  const vulnerable = valueOf(reported.vulnerableInmates);
  const boats = valueOf(reported.boatsDeployed);

  const derived: SituationSummaryDerived = {
    unshelteredAffected: derivedDifference({
      metric: 'Unsheltered Affected',
      formula: 'Affected Population − Inmates − Non-Camp Inmates',
      unit: 'people',
      minuend: affected,
      subtrahends: [inmates, nonCampInmates],
      note: `${DERIVED}; the population with no recorded touchpoint`,
    }),

    campUptakeRate: derivedQuotient({
      metric: 'Camp Uptake Rate',
      formula: 'Inmates ÷ Affected Population',
      unit: 'fraction',
      numerator: inmates,
      denominator: affected,
      note: `${DERIVED}; affected is not the same as displaced`,
    }),

    campLoad: derivedQuotient({
      metric: 'Camp Load',
      formula: 'Inmates ÷ Relief Camps',
      unit: 'inmates per Relief Camp',
      numerator: inmates,
      denominator: camps,
      note: `${DERIVED}; Relief Distribution Centres are excluded — they shelter nobody`,
    }),

    vulnerableLoad: derivedQuotient({
      metric: 'Vulnerable Load',
      formula: 'Vulnerable Inmates ÷ Inmates',
      unit: 'fraction',
      numerator: vulnerable,
      denominator: inmates,
      note: `${DERIVED}; Vulnerable Inmates is itself a derived term`,
    }),

    rescueAssetRatio: derivedQuotient({
      metric: 'Rescue Asset Ratio',
      formula: 'Boats Deployed ÷ (Affected Population ÷ 1,000)',
      unit: 'boats per 1,000 affected',
      numerator: boats,
      denominator: affected === undefined ? undefined : affected / 1000,
      note: `${DERIVED}; shows where rescue capacity is thinnest per capita`,
    }),
  };

  return {
    reportDate: report.reportDate,
    reported,
    derived,
    casualties: statewideCasualties(report.districts),
    rivers: report.rivers,
  };
};

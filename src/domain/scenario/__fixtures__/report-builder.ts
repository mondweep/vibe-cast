/**
 * Test-data builder for `FloodSituationReport` (test support only).
 *
 * Local to the Scenario Planning / Temporal Comparison contexts on purpose: a
 * builder in the shared kernel would quietly become a second definition of the
 * published language, and every context would start bending it.
 *
 * `assamBaseline20260727()` reproduces Appendix B of the PRD. The district split
 * is illustrative — ASDMA does not publish a per-district rice figure in the
 * summary — but every statewide total is the real bulletin's.
 */

import {
  count,
  hectares,
  litres,
  quintals,
  unknownCount,
  unknownHectares,
  unknownQuintals,
} from '../../shared/quantity';
import type { Count, Hectares, Quintals } from '../../shared/quantity';
import { districtName, revenueCircleName } from '../../shared/administrative-unit';
import type { DistrictName } from '../../shared/administrative-unit';
import type {
  BulletinId,
  DistrictReport,
  FloodSituationReport,
  ReportDate,
  RevenueCircleImpact,
} from '../../shared/flood-situation-report';

export const bulletinId = (raw: string): BulletinId => raw as BulletinId;
export const reportDate = (raw: string): ReportDate => raw as ReportDate;

const noAnimals = { big: count(0), small: count(0), poultry: count(0) } as const;

export type DistrictSpec = {
  readonly name: string;
  readonly affected?: Count;
  readonly inmates?: Count;
  readonly nonCampInmates?: Count;
  readonly reliefCamps?: Count;
  readonly reliefDistributionCentres?: Count;
  readonly rice?: Quintals;
  readonly villagesAffected?: Count;
  readonly cropAreaSubmerged?: Hectares;
  readonly circles?: readonly string[];
};

/**
 * A district row. Sub-figures the scenario and timeline contexts never read
 * (houses, animals, casualties) default to reported zero rather than unknown so
 * that a fixture is never accidentally testing the unknown path.
 */
export const aDistrict = (spec: DistrictSpec): DistrictReport => {
  const affected = spec.affected ?? count(0);
  const inmates = spec.inmates ?? count(0);
  const circles: readonly RevenueCircleImpact[] = (spec.circles ?? []).map((c) => ({
    circle: revenueCircleName(c),
    villagesAffected: count(0),
    populationAffected: count(0),
    cropAreaSubmerged: hectares(0),
    reliefCamps: count(0),
    reliefDistributionCentres: count(0),
    campInmates: count(0),
    nonCampInmates: count(0),
  }));

  return {
    district: districtName(spec.name),
    revenueCircles: circles,
    villagesAffected: spec.villagesAffected ?? count(0),
    population: {
      male: count(0),
      female: count(0),
      children: count(0),
      total: affected,
    },
    cropAreaSubmerged: spec.cropAreaSubmerged ?? hectares(0),
    reliefCamps: spec.reliefCamps ?? count(0),
    reliefDistributionCentres: spec.reliefDistributionCentres ?? count(0),
    campInmates: {
      total: inmates,
      male: count(0),
      female: count(0),
      children: count(0),
      pregnantOrLactating: count(0),
      personsWithDisability: count(0),
    },
    nonCampInmates: {
      total: spec.nonCampInmates ?? count(0),
      male: count(0),
      female: count(0),
      children: count(0),
      animals: noAnimals,
    },
    casualties: { floodDeaths: count(0), generalDrownings: count(0), missing: count(0) },
    animals: { affected: noAnimals, washedAway: noAnimals },
    houses: {
      fullySeverelyKuccha: count(0),
      fullySeverelyPukka: count(0),
      partiallyKuccha: count(0),
      partiallyPukka: count(0),
      otherHuts: count(0),
      otherCattleSheds: count(0),
    },
    relief: {
      rice: spec.rice ?? quintals(0),
      dal: quintals(0),
      salt: quintals(0),
      mustardOil: litres(0),
      greenFodder: quintals(0),
      wheatBran: quintals(0),
      riceBran: quintals(0),
    },
    rescue: {
      agencies: [],
      medicalTeams: count(0),
      boats: count(0),
      helicopters: count(0),
      personsEvacuatedByBoat: count(0),
      personsEvacuatedByHelicopter: count(0),
      animalsEvacuated: count(0),
    },
    remarks: '',
  };
};

export type ReportSpec = {
  readonly id?: string;
  readonly date?: string;
  readonly districts?: readonly DistrictReport[];
  readonly statewide?: Partial<FloodSituationReport['statewideTotals']>;
};

export const aReport = (spec: ReportSpec = {}): FloodSituationReport => {
  const districts = spec.districts ?? [];
  return {
    bulletinId: bulletinId(spec.id ?? 'sha256:test-bulletin'),
    reportDate: reportDate(spec.date ?? '2026-07-27'),
    generatedAt: '2026-07-27T21:49:00',
    rivers: { aboveDangerLevel: [], aboveHighestFloodLevel: [] },
    districts,
    infrastructureDamage: [],
    statewideTotals: {
      districtsAffected: count(districts.length),
      revenueCirclesAffected: count(0),
      villagesAffected: count(0),
      populationAffected: count(0),
      cropAreaSubmerged: hectares(0),
      reliefCamps: count(0),
      reliefDistributionCentres: count(0),
      campInmates: count(0),
      nonCampInmates: count(0),
      ...spec.statewide,
    },
    provenance: [],
    reconciliationFailures: [],
  };
};

/** Unknown-quantity helpers, re-exported so tests read declaratively. */
export const unknown = {
  count: unknownCount,
  hectares: unknownHectares,
  quintals: unknownQuintals,
};

export const SIVASAGAR: DistrictName = districtName('Sivasagar');
export const CHARAIDEO: DistrictName = districtName('Charaideo');
export const GOLAGHAT: DistrictName = districtName('Golaghat');
export const JORHAT: DistrictName = districtName('Jorhat');
export const MAJULI: DistrictName = districtName('Majuli');
export const DHEMAJI: DistrictName = districtName('Dhemaji');
export const DIBRUGARH: DistrictName = districtName('Dibrugarh');
export const KAMRUP_METRO: DistrictName = districtName('Kamrup Metro');

/**
 * PRD Appendix B — the 2026-07-27 statewide baseline.
 *
 * Statewide: 445,495 affected · 90 relief camps · 28,695 inmates ·
 * 1,191.092 Q rice. Derived: uptake 6.4% · camp load 319/camp ·
 * ration coverage 6.9 days.
 */
export const assamBaseline20260727 = (): FloodSituationReport =>
  aReport({
    id: 'sha256:asdma-2026-07-27',
    date: '2026-07-27',
    districts: [
      aDistrict({
        name: 'Sivasagar',
        affected: count(144_461),
        inmates: count(9_500),
        reliefCamps: count(30),
        rice: quintals(400),
        circles: ['Nazira', 'Demow', 'Sivsagar', 'Amguri'],
      }),
      aDistrict({
        name: 'Charaideo',
        affected: count(88_000),
        inmates: count(5_600),
        reliefCamps: count(18),
        rice: quintals(220),
        circles: ['Sonari', 'Mahmora'],
      }),
      aDistrict({
        name: 'Golaghat',
        affected: count(76_000),
        inmates: count(4_800),
        reliefCamps: count(15),
        rice: quintals(200),
      }),
      aDistrict({
        name: 'Jorhat',
        affected: count(60_000),
        inmates: count(3_800),
        reliefCamps: count(12),
        rice: quintals(150),
      }),
      aDistrict({
        name: 'Majuli',
        affected: count(45_034),
        inmates: count(3_200),
        reliefCamps: count(10),
        rice: quintals(130),
      }),
      aDistrict({
        name: 'Dhemaji',
        affected: count(32_000),
        inmates: count(1_795),
        reliefCamps: count(5),
        rice: quintals(91.092),
      }),
      // Reported and quiet, not absent (PRD §4.1).
      aDistrict({ name: 'Dibrugarh' }),
      aDistrict({ name: 'Kamrup Metro' }),
    ],
    statewide: {
      districtsAffected: count(6),
      revenueCirclesAffected: count(21),
      villagesAffected: count(631),
      populationAffected: count(445_495),
      cropAreaSubmerged: hectares(37_139.52),
      reliefCamps: count(90),
      reliefDistributionCentres: count(94),
      campInmates: count(28_695),
      nonCampInmates: count(51_777),
    },
  });

/**
 * Test-support builders for `FloodSituationReport`.
 *
 * Not production code paths — but deliberately typed against the published
 * language so that a breaking change to the contract breaks these builders (and
 * therefore every test that leans on them) at compile time rather than at
 * runtime. Kept out of `*.test.ts` so both persistence and application suites
 * can share it.
 */

import { districtName, revenueCircleName } from '../../domain/shared/administrative-unit';
import { count, hectares, litres, quintals } from '../../domain/shared/quantity';
import type {
  BulletinId,
  DistrictReport,
  FloodSituationReport,
  InfrastructureDamage,
  ReportDate,
  RevenueCircleImpact,
  SectionProvenance,
} from '../../domain/shared/flood-situation-report';

export const bulletinId = (raw: string): BulletinId => raw as BulletinId;
export const reportDate = (raw: string): ReportDate => raw as ReportDate;

export const aRevenueCircleImpact = (
  overrides: Partial<RevenueCircleImpact> = {},
): RevenueCircleImpact => ({
  circle: revenueCircleName('Nazira'),
  villagesAffected: count(41),
  populationAffected: count(67128),
  cropAreaSubmerged: hectares(7340),
  reliefCamps: count(12),
  reliefDistributionCentres: count(9),
  campInmates: count(3100),
  nonCampInmates: count(5200),
  ...overrides,
});

export const aDistrictReport = (overrides: Partial<DistrictReport> = {}): DistrictReport => ({
  district: districtName('Sivasagar'),
  revenueCircles: [aRevenueCircleImpact()],
  villagesAffected: count(240),
  population: {
    male: count(60000),
    female: count(58000),
    children: count(26461),
    total: count(144461),
  },
  cropAreaSubmerged: hectares(2025.9200000000003),
  reliefCamps: count(30),
  reliefDistributionCentres: count(28),
  campInmates: {
    total: count(9000),
    male: count(3000),
    female: count(3500),
    children: count(2500),
    pregnantOrLactating: count(97),
    personsWithDisability: count(42),
  },
  nonCampInmates: {
    total: count(15000),
    male: count(5000),
    female: count(6000),
    children: count(4000),
    animals: { big: count(120), small: count(80), poultry: count(400) },
  },
  casualties: {
    floodDeaths: count(0),
    generalDrownings: count(1),
    missing: count(0),
  },
  animals: {
    affected: { big: count(1200), small: count(900), poultry: count(5000) },
    washedAway: { big: count(12), small: count(9), poultry: count(50) },
  },
  houses: {
    fullySeverelyKuccha: count(20),
    fullySeverelyPukka: count(3),
    partiallyKuccha: count(400),
    partiallyPukka: count(60),
    otherHuts: count(11),
    otherCattleSheds: count(7),
  },
  relief: {
    rice: quintals(1191.092),
    dal: quintals(120.5),
    salt: quintals(30),
    mustardOil: litres(3513.53),
    greenFodder: quintals(220),
    wheatBran: quintals(40),
    riceBran: quintals(60),
  },
  rescue: {
    agencies: ['NDRF', 'SDRF', 'Local People'],
    medicalTeams: count(179),
    boats: count(67),
    helicopters: count(0),
    personsEvacuatedByBoat: count(1200),
    personsEvacuatedByHelicopter: count(0),
    animalsEvacuated: count(340),
  },
  remarks: '',
  ...overrides,
});

export const anInfrastructureDamage = (
  overrides: Partial<InfrastructureDamage> = {},
): InfrastructureDamage => ({
  damageClass: 'road',
  district: districtName('Sivasagar'),
  circle: revenueCircleName('Nazira'),
  name: 'Nazira–Simaluguri Road',
  department: 'PWD',
  village: 'Borbil',
  location: 'Ch. 3.20 km',
  coordinate: { kind: 'precise', longitude: 94.5321, latitude: 26.9812 },
  remarks: 'Partially washed away',
  ...overrides,
});

export const aSectionProvenance = (
  overrides: Partial<SectionProvenance> = {},
): SectionProvenance => ({
  kind: 'districts-affected',
  sourcePages: [1],
  confidence: 'high',
  ...overrides,
});

export const aReport = (overrides: Partial<FloodSituationReport> = {}): FloodSituationReport => ({
  bulletinId: bulletinId('hash-27'),
  reportDate: reportDate('2026-07-27'),
  generatedAt: '2026-07-27T21:49:00+05:30',
  rivers: {
    aboveDangerLevel: ['Dhansiri (S) at Numaligarh'],
    aboveHighestFloodLevel: [],
  },
  districts: [aDistrictReport()],
  infrastructureDamage: [anInfrastructureDamage()],
  statewideTotals: {
    districtsAffected: count(6),
    revenueCirclesAffected: count(21),
    villagesAffected: count(631),
    populationAffected: count(445495),
    cropAreaSubmerged: hectares(37139.52),
    reliefCamps: count(90),
    reliefDistributionCentres: count(94),
    campInmates: count(28695),
    nonCampInmates: count(51777),
  },
  provenance: [aSectionProvenance()],
  reconciliationFailures: [],
  ...overrides,
});

/**
 * Real ASDMA remark text from the 2026-07-27 bulletin (Charaideo / Golaghat).
 * Contains commas, embedded double quotes and hard newlines — every CSV
 * escaping hazard in one string, taken from the source rather than invented.
 */
export const ASDMA_REMARK_WITH_COMMAS_QUOTES_AND_NEWLINES =
  '(Mahmora - House Damages and the type of damages (partially/severe/fully) is yet to be ' +
  'ascertained and will be determined after detailed field assessments.), ' +
  '(Sonari - "Fair Price Shops Damaged (Silakuti GPSS- 2, Pub Abhoipur GPSS- 10, Pachim ' +
  'Abhoipur GPSS- 4"),\nFish Net Damaged- 8 Nos,\nCM relief packets distribution ongoing.)';

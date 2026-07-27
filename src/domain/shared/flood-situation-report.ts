/**
 * PUBLISHED LANGUAGE (PRD §3.3).
 *
 * The immutable contract between the Bulletin Ingestion context and every
 * downstream context. Nothing upstream of this type — no pdf.js text item, no
 * raw cell string, no `"Nil"` — is visible past this boundary.
 *
 * Treat changes here as breaking changes to five bounded contexts.
 */

import type { Count, Hectares, Litres, Quintals } from './quantity';
import type { DistrictName, GeoCoordinate, RevenueCircleName } from './administrative-unit';

/** Content hash of the source PDF: the same file always yields the same id. */
export type BulletinId = string & { readonly __brand: 'BulletinId' };

/** ISO date (`YYYY-MM-DD`) from "Assam Flood Report as on 27-07-2026". */
export type ReportDate = string & { readonly __brand: 'ReportDate' };

/** The 22 report sections of Appendix A, plus the trailing Remarks block. */
export type SectionKind =
  | 'rivers-above-danger-level'
  | 'districts-affected'
  | 'revenue-circles-affected'
  | 'villages-affected'
  | 'population-and-crop-area-submerged'
  | 'relief-camps-opened'
  | 'inmates-in-relief-camps'
  | 'non-camp-inmates'
  | 'lives-lost-confirmed'
  | 'lives-lost-missing'
  | 'animals-affected'
  | 'animals-washed-away'
  | 'houses-damaged'
  | 'houses-damaged-others'
  | 'rescue-operation'
  | 'relief-distributed'
  | 'relief-distributed-others'
  | 'infrastructure-road'
  | 'infrastructure-bridge'
  | 'infrastructure-embankment-breached'
  | 'infrastructure-embankment-affected'
  | 'infrastructure-others'
  | 'remarks';

/**
 * How much to trust a section.
 *
 * `degraded` means the data is present but a reconciliation check failed —
 * shown to the user with a warning, never silently. `failed` means the section
 * could not be read at all and is rendered as "could not read", never as zero
 * (PRD §5.1, invariant 4).
 */
export type ExtractionConfidence = 'high' | 'degraded' | 'failed';

export type ReconciliationFailure = {
  readonly section: SectionKind;
  readonly column: string;
  /** The Total row as printed by ASDMA. */
  readonly statedTotal: number;
  /** Our independent sum of the district rows. */
  readonly computedTotal: number;
};

export type SectionProvenance = {
  readonly kind: SectionKind;
  readonly sourcePages: readonly number[];
  readonly confidence: ExtractionConfidence;
};

// ---------------------------------------------------------------------------
// Impact
// ---------------------------------------------------------------------------

export type AffectedPopulation = {
  readonly male: Count;
  readonly female: Count;
  readonly children: Count;
  readonly total: Count;
};

/**
 * Casualties.
 *
 * There is deliberately NO `total` field. ASDMA reports flood deaths and
 * general (non-flood) drownings as separate figures, and summing them
 * overstates flood mortality (PRD §4.2). The type enforces the ubiquitous
 * language: you cannot accidentally add them because there is nothing to add.
 */
export type Casualties = {
  readonly floodDeaths: Count;
  readonly generalDrownings: Count;
  readonly missing: Count;
};

/** Kuccha = non-permanent, Pukka = permanent. The split drives compensation. */
export type HouseDamage = {
  readonly fullySeverelyKuccha: Count;
  readonly fullySeverelyPukka: Count;
  readonly partiallyKuccha: Count;
  readonly partiallyPukka: Count;
  readonly otherHuts: Count;
  readonly otherCattleSheds: Count;
};

export type AnimalCounts = {
  readonly big: Count;
  readonly small: Count;
  readonly poultry: Count;
};

/** "Affected" is exposure; "washed away" is loss. Two different events. */
export type AnimalImpact = {
  readonly affected: AnimalCounts;
  readonly washedAway: AnimalCounts;
};

export type RevenueCircleImpact = {
  readonly circle: RevenueCircleName;
  readonly villagesAffected: Count;
  readonly populationAffected: Count;
  readonly cropAreaSubmerged: Hectares;
  readonly reliefCamps: Count;
  readonly reliefDistributionCentres: Count;
  readonly campInmates: Count;
  readonly nonCampInmates: Count;
};

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export type CampInmates = {
  readonly total: Count;
  readonly male: Count;
  readonly female: Count;
  readonly children: Count;
  /** Overlapping subsets of `total`, not additional people. */
  readonly pregnantOrLactating: Count;
  readonly personsWithDisability: Count;
};

export type NonCampInmates = {
  readonly total: Count;
  readonly male: Count;
  readonly female: Count;
  readonly children: Count;
  readonly animals: AnimalCounts;
};

export type ReliefDistributed = {
  readonly rice: Quintals;
  readonly dal: Quintals;
  readonly salt: Quintals;
  readonly mustardOil: Litres;
  readonly greenFodder: Quintals;
  readonly wheatBran: Quintals;
  readonly riceBran: Quintals;
};

export type RescueDeployment = {
  /** A Set: the source repeats "Local People" four times for Sivasagar. */
  readonly agencies: readonly string[];
  readonly medicalTeams: Count;
  readonly boats: Count;
  readonly helicopters: Count;
  readonly personsEvacuatedByBoat: Count;
  readonly personsEvacuatedByHelicopter: Count;
  readonly animalsEvacuated: Count;
};

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

export type DamageClass =
  | 'road'
  | 'bridge'
  | 'embankment-breached'
  | 'embankment-affected'
  | 'school-elementary'
  | 'school-secondary'
  | 'anganwadi'
  | 'other';

export type InfrastructureDamage = {
  readonly damageClass: DamageClass;
  readonly district: DistrictName;
  readonly circle: RevenueCircleName;
  readonly name: string;
  readonly department: string;
  readonly village: string;
  readonly location: string;
  readonly coordinate?: GeoCoordinate;
  readonly remarks: string;
};

// ---------------------------------------------------------------------------
// Aggregated per-district record
// ---------------------------------------------------------------------------

export type DistrictReport = {
  readonly district: DistrictName;
  readonly revenueCircles: readonly RevenueCircleImpact[];
  readonly villagesAffected: Count;
  readonly population: AffectedPopulation;
  readonly cropAreaSubmerged: Hectares;
  readonly reliefCamps: Count;
  readonly reliefDistributionCentres: Count;
  readonly campInmates: CampInmates;
  readonly nonCampInmates: NonCampInmates;
  readonly casualties: Casualties;
  readonly animals: AnimalImpact;
  readonly houses: HouseDamage;
  readonly relief: ReliefDistributed;
  readonly rescue: RescueDeployment;
  readonly remarks: string;
};

export type RiverStatus = {
  /** Rivers above Danger Level, per the CWC bulletin issued at 08:00. */
  readonly aboveDangerLevel: readonly string[];
  /** Rivers above Highest Flood Level — the severe case. */
  readonly aboveHighestFloodLevel: readonly string[];
};

/**
 * The complete, validated bulletin. Immutable.
 *
 * `statewideTotals` holds the figures ASDMA printed in its Total rows. They are
 * kept as *stated* values and checked against our own sums; disagreement
 * appears in `reconciliationFailures` rather than being silently corrected.
 * ASDMA's number stays ASDMA's number.
 */
export type FloodSituationReport = {
  readonly bulletinId: BulletinId;
  readonly reportDate: ReportDate;
  readonly generatedAt: string;
  readonly rivers: RiverStatus;
  readonly districts: readonly DistrictReport[];
  readonly infrastructureDamage: readonly InfrastructureDamage[];
  readonly statewideTotals: {
    readonly districtsAffected: Count;
    readonly revenueCirclesAffected: Count;
    readonly villagesAffected: Count;
    readonly populationAffected: Count;
    readonly cropAreaSubmerged: Hectares;
    readonly reliefCamps: Count;
    readonly reliefDistributionCentres: Count;
    readonly campInmates: Count;
    readonly nonCampInmates: Count;
  };
  readonly provenance: readonly SectionProvenance[];
  readonly reconciliationFailures: readonly ReconciliationFailure[];
};

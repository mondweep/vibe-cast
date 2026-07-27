/**
 * FR-1.10 — export a parsed bulletin as JSON or CSV.
 *
 * ## The unknown/zero convention (the whole point of this file)
 *
 * DRIMS reports blank cells and the sentinel `SNR` ("Status Not Reported"), and
 * the domain keeps those distinct from a reported `0` (PRD §3.3, §5.1). An
 * export that flattened both to `0` would launder a district that never reported
 * its casualties into a district that reported none — the exact corruption the
 * anti-corruption layer exists to prevent, re-introduced at the last step.
 *
 * So, explicitly:
 *
 * | Domain value            | JSON   | CSV        |
 * |-------------------------|--------|------------|
 * | `{kind:'known', value:0}` | `0`    | `0`        |
 * | `{kind:'known', value:n}` | `n`    | `n`        |
 * | `{kind:'unknown'}`        | `null` | empty cell |
 *
 * `null` and the empty cell are never produced for any other reason, and both
 * output formats state the convention in the document itself so a spreadsheet
 * three forwards downstream still carries its own explanation.
 *
 * Units are carried in field/column names (`Q` quintals, `L` litres, `Hect`
 * hectares) rather than dropped, because a unitless rice figure is a
 * two-orders-of-magnitude error waiting to happen (PRD §4.3).
 *
 * Values are exported at full stored precision, including DRIMS float noise like
 * `2025.9200000000003`. Rounding is a presentation concern; this is data.
 */

import { valueOf } from '../../domain/shared/quantity';
import type { Quantity } from '../../domain/shared/quantity';
import type {
  AnimalCounts,
  DistrictReport,
  FloodSituationReport,
  InfrastructureDamage,
} from '../../domain/shared/flood-situation-report';

export type ExportFormat = 'json' | 'csv';

export type ExportedFile = {
  readonly filename: string;
  readonly mimeType: string;
  readonly content: string;
};

export const EXPORT_SCHEMA = 'assam-flood-console/report-export@1';

/** The single conversion this module is built around. Unknown is `null`, never `0`. */
const asNumberOrNull = <U extends string>(quantity: Quantity<U>): number | null =>
  valueOf(quantity) ?? null;

/** Unknown is an empty cell, never `0`. */
const asCell = <U extends string>(quantity: Quantity<U>): string => {
  const value = valueOf(quantity);
  return value === undefined ? '' : String(value);
};

const animals = (counts: AnimalCounts) => ({
  big: asNumberOrNull(counts.big),
  small: asNumberOrNull(counts.small),
  poultry: asNumberOrNull(counts.poultry),
});

const districtAsJson = (district: DistrictReport) => ({
  district: String(district.district),
  villagesAffected: asNumberOrNull(district.villagesAffected),
  population: {
    male: asNumberOrNull(district.population.male),
    female: asNumberOrNull(district.population.female),
    children: asNumberOrNull(district.population.children),
    total: asNumberOrNull(district.population.total),
  },
  cropAreaSubmergedHect: asNumberOrNull(district.cropAreaSubmerged),
  reliefCamps: asNumberOrNull(district.reliefCamps),
  reliefDistributionCentres: asNumberOrNull(district.reliefDistributionCentres),
  campInmates: {
    total: asNumberOrNull(district.campInmates.total),
    male: asNumberOrNull(district.campInmates.male),
    female: asNumberOrNull(district.campInmates.female),
    children: asNumberOrNull(district.campInmates.children),
    pregnantOrLactating: asNumberOrNull(district.campInmates.pregnantOrLactating),
    personsWithDisability: asNumberOrNull(district.campInmates.personsWithDisability),
  },
  nonCampInmates: {
    total: asNumberOrNull(district.nonCampInmates.total),
    male: asNumberOrNull(district.nonCampInmates.male),
    female: asNumberOrNull(district.nonCampInmates.female),
    children: asNumberOrNull(district.nonCampInmates.children),
    animals: animals(district.nonCampInmates.animals),
  },
  // No `total` key, here or anywhere: flood deaths and general drownings are
  // separate ASDMA figures and summing them overstates flood mortality (§4.2).
  casualties: {
    floodDeaths: asNumberOrNull(district.casualties.floodDeaths),
    generalDrownings: asNumberOrNull(district.casualties.generalDrownings),
    missing: asNumberOrNull(district.casualties.missing),
  },
  animals: {
    affected: animals(district.animals.affected),
    washedAway: animals(district.animals.washedAway),
  },
  houses: {
    fullySeverelyKuccha: asNumberOrNull(district.houses.fullySeverelyKuccha),
    fullySeverelyPukka: asNumberOrNull(district.houses.fullySeverelyPukka),
    partiallyKuccha: asNumberOrNull(district.houses.partiallyKuccha),
    partiallyPukka: asNumberOrNull(district.houses.partiallyPukka),
    otherHuts: asNumberOrNull(district.houses.otherHuts),
    otherCattleSheds: asNumberOrNull(district.houses.otherCattleSheds),
  },
  relief: {
    riceQ: asNumberOrNull(district.relief.rice),
    dalQ: asNumberOrNull(district.relief.dal),
    saltQ: asNumberOrNull(district.relief.salt),
    mustardOilL: asNumberOrNull(district.relief.mustardOil),
    greenFodderQ: asNumberOrNull(district.relief.greenFodder),
    wheatBranQ: asNumberOrNull(district.relief.wheatBran),
    riceBranQ: asNumberOrNull(district.relief.riceBran),
  },
  rescue: {
    agencies: [...district.rescue.agencies],
    medicalTeams: asNumberOrNull(district.rescue.medicalTeams),
    boats: asNumberOrNull(district.rescue.boats),
    helicopters: asNumberOrNull(district.rescue.helicopters),
    personsEvacuatedByBoat: asNumberOrNull(district.rescue.personsEvacuatedByBoat),
    personsEvacuatedByHelicopter: asNumberOrNull(district.rescue.personsEvacuatedByHelicopter),
    animalsEvacuated: asNumberOrNull(district.rescue.animalsEvacuated),
  },
  remarks: district.remarks,
  revenueCircles: district.revenueCircles.map((circle) => ({
    circle: String(circle.circle),
    villagesAffected: asNumberOrNull(circle.villagesAffected),
    populationAffected: asNumberOrNull(circle.populationAffected),
    cropAreaSubmergedHect: asNumberOrNull(circle.cropAreaSubmerged),
    reliefCamps: asNumberOrNull(circle.reliefCamps),
    reliefDistributionCentres: asNumberOrNull(circle.reliefDistributionCentres),
    campInmates: asNumberOrNull(circle.campInmates),
    nonCampInmates: asNumberOrNull(circle.nonCampInmates),
  })),
});

const damageAsJson = (damage: InfrastructureDamage) => ({
  damageClass: damage.damageClass,
  district: String(damage.district),
  circle: String(damage.circle),
  name: damage.name,
  department: damage.department,
  village: damage.village,
  location: damage.location,
  // A missing coordinate is null, not 0,0 — and an imprecise one is labelled so
  // a consumer cannot plot it as though it were a fix (PRD §5.4 invariant 2).
  longitude: damage.coordinate?.longitude ?? null,
  latitude: damage.coordinate?.latitude ?? null,
  coordinatePrecision: damage.coordinate?.kind ?? null,
  remarks: damage.remarks,
});

const reportAsJson = (report: FloodSituationReport): string =>
  JSON.stringify(
    {
      schema: EXPORT_SCHEMA,
      conventions: {
        unknownQuantity: 'null',
        note:
          'null means the bulletin reported no value — a blank cell, or the DRIMS sentinel "SNR" ' +
          '(Status Not Reported). It is never a zero; a reported zero appears as 0. Units are ' +
          'named in the field: Q = quintals (100 kg), L = litres, Hect = hectares.',
        source: 'ASDMA / DRIMS Assam Daily Flood Report. ASDMA remains the system of record.',
      },
      bulletinId: String(report.bulletinId),
      reportDate: String(report.reportDate),
      generatedAt: report.generatedAt,
      rivers: {
        aboveDangerLevel: [...report.rivers.aboveDangerLevel],
        aboveHighestFloodLevel: [...report.rivers.aboveHighestFloodLevel],
      },
      statewideTotals: {
        districtsAffected: asNumberOrNull(report.statewideTotals.districtsAffected),
        revenueCirclesAffected: asNumberOrNull(report.statewideTotals.revenueCirclesAffected),
        villagesAffected: asNumberOrNull(report.statewideTotals.villagesAffected),
        populationAffected: asNumberOrNull(report.statewideTotals.populationAffected),
        cropAreaSubmergedHect: asNumberOrNull(report.statewideTotals.cropAreaSubmerged),
        reliefCamps: asNumberOrNull(report.statewideTotals.reliefCamps),
        reliefDistributionCentres: asNumberOrNull(
          report.statewideTotals.reliefDistributionCentres,
        ),
        campInmates: asNumberOrNull(report.statewideTotals.campInmates),
        nonCampInmates: asNumberOrNull(report.statewideTotals.nonCampInmates),
      },
      districts: report.districts.map(districtAsJson),
      infrastructureDamage: report.infrastructureDamage.map(damageAsJson),
      provenance: report.provenance.map((section) => ({
        section: section.kind,
        sourcePages: [...section.sourcePages],
        confidence: section.confidence,
      })),
      reconciliationFailures: report.reconciliationFailures.map((failure) => ({
        section: failure.section,
        column: failure.column,
        statedTotal: failure.statedTotal,
        computedTotal: failure.computedTotal,
      })),
    },
    null,
    2,
  );

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  'district',
  'villagesAffected',
  'populationMale',
  'populationFemale',
  'populationChildren',
  'populationTotal',
  'cropAreaSubmergedHect',
  'reliefCamps',
  'reliefDistributionCentres',
  'campInmates',
  'nonCampInmates',
  'floodDeaths',
  'generalDrownings',
  'missing',
  'housesFullySeverelyKuccha',
  'housesFullySeverelyPukka',
  'housesPartiallyKuccha',
  'housesPartiallyPukka',
  'riceDistributedQ',
  'boatsDeployed',
  'remarks',
] as const;

/**
 * RFC 4180 quoting. ASDMA remarks routinely contain all three hazards at once —
 * `(Sonari - "Fair Price Shops Damaged (Silakuti GPSS- 2, ...")` spans commas,
 * an unbalanced double quote and hard newlines — so this is exercised in anger,
 * not defensively.
 */
const escapeCsv = (field: string): string =>
  /[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;

const districtAsCsvRow = (district: DistrictReport): string[] => [
  String(district.district),
  asCell(district.villagesAffected),
  asCell(district.population.male),
  asCell(district.population.female),
  asCell(district.population.children),
  asCell(district.population.total),
  asCell(district.cropAreaSubmerged),
  asCell(district.reliefCamps),
  asCell(district.reliefDistributionCentres),
  asCell(district.campInmates.total),
  asCell(district.nonCampInmates.total),
  asCell(district.casualties.floodDeaths),
  asCell(district.casualties.generalDrownings),
  asCell(district.casualties.missing),
  asCell(district.houses.fullySeverelyKuccha),
  asCell(district.houses.fullySeverelyPukka),
  asCell(district.houses.partiallyKuccha),
  asCell(district.houses.partiallyPukka),
  asCell(district.relief.rice),
  asCell(district.rescue.boats),
  district.remarks,
];

const reportAsCsv = (report: FloodSituationReport): string => {
  const preamble = [
    `# Assam Flood Situation Console — district export from the ASDMA / DRIMS Daily Flood Report of ${report.reportDate} (bulletin ${report.bulletinId}).`,
    '# An empty cell means the bulletin reported no value (a blank cell, or "SNR" — Status Not Reported). A 0 means a reported zero. These are different facts and must not be conflated.',
    '# Flood deaths and general drownings are separate ASDMA figures and must never be summed. Units are named in the column: Q = quintals (100 kg), Hect = hectares.',
  ];
  const lines = [
    ...preamble,
    CSV_COLUMNS.join(','),
    ...report.districts.map((district) => districtAsCsvRow(district).map(escapeCsv).join(',')),
  ];
  return `${lines.join('\r\n')}\r\n`;
};

// ---------------------------------------------------------------------------

export class ExportReport {
  execute(report: FloodSituationReport, format: ExportFormat): ExportedFile {
    const stem = `assam-flood-report-${report.reportDate}`;
    if (format === 'json') {
      return {
        filename: `${stem}.json`,
        mimeType: 'application/json',
        content: reportAsJson(report),
      };
    }
    if (format === 'csv') {
      return { filename: `${stem}.csv`, mimeType: 'text/csv', content: reportAsCsv(report) };
    }
    throw new Error(`Unsupported export format: ${String(format)}. Use "json" or "csv".`);
  }
}

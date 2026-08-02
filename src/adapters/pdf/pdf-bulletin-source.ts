/**
 * The `BulletinSource` adapter: a DRIMS PDF in, a `FloodSituationReport` out.
 *
 * pdf.js appears nowhere in this file. It sits behind `PdfDocumentLoader`, an
 * interface owned here and implemented once, thinly, in `pdfjs-loader.ts`.
 * Everything that can be got wrong is therefore reachable from a test with a
 * `vi.fn()` and a handful of synthetic coordinates.
 *
 * Three rules govern the translation (PRD §3.3, §5.1):
 *
 * - Zero and unknown stay distinguishable end to end. A section we could not
 *   read contributes unknowns, never zeros, and is reported as `failed`.
 * - One bad section never fails the document (FR-1.5). Each interpreter runs
 *   inside its own boundary; a throw marks that section and the parse
 *   continues.
 * - Totals are verified, not trusted (FR-1.4). Every stated Total is compared
 *   against our own sum of the district rows, and disagreement is published
 *   rather than reconciled away.
 */

import { NoTextLayerError, NotADrimsBulletinError, type BulletinSource } from '../../application/ports';
import {
  districtName,
  normaliseName,
  revenueCircleName,
  geoCoordinate,
  type DistrictName,
  type GeoCoordinate,
} from '../../domain/shared/administrative-unit';
import type {
  AnimalCounts,
  BulletinId,
  DamageClass,
  ExtractionConfidence,
  FloodSituationReport,
  InfrastructureDamage,
  ReconciliationFailure,
  ReportDate,
  RevenueCircleImpact,
  SectionKind,
  SectionProvenance,
} from '../../domain/shared/flood-situation-report';
import {
  hectares,
  litres,
  quintals,
  unknownCount,
  unknownHectares,
  unknownLitres,
  unknownQuintals,
  type Count,
  type Hectares,
  type Litres,
  type Quintals,
} from '../../domain/shared/quantity';
import {
  numericValue,
  parseDrimsNumber,
  parseWrappedDrimsNumber,
  toCount,
  type DrimsNumber,
} from './drims-number';
import {
  applyIntegrityToProvenance,
  checkDocumentIntegrity,
  type TableGeometry,
} from './document-integrity';
import { compoundField, simpleBreakdown } from './inline-breakdown';
import { reconcileDrims } from './reconciliation';
import {
  bodyRowsOf,
  cellAt,
  createSectionAssembler,
  itemColumn,
  totalRowOf,
  ITEM_DEPARTMENT,
  ITEM_LATITUDE,
  ITEM_LOCATION,
  ITEM_LONGITUDE,
  ITEM_NAME,
  ITEM_REMARKS,
  ITEM_VILLAGE,
  type BodyStartDerivation,
  type LogicalRow,
  type SectionAssembler,
  type SectionTable,
} from './section-assembler';
import { createRowClusterer, joinRuns, type TextRun } from './text-run';

// ---------------------------------------------------------------------------
// The seam pdf.js lives behind
// ---------------------------------------------------------------------------

export type PageTextContent = {
  readonly page: number;
  readonly runs: readonly TextRun[];
};

/**
 * Everything this adapter needs from a PDF library, and nothing more.
 *
 * Owned by the adapter rather than the library, so swapping pdf.js — or
 * running the whole pipeline against fabricated geometry in a test — costs one
 * object literal.
 */
export interface PdfDocumentLoader {
  load(file: Blob): Promise<readonly PageTextContent[]>;
}

/** The bulletin id is a content hash: the same file always yields the same id. */
export interface ContentHasher {
  hash(file: Blob): Promise<string>;
}

export const sha256Hasher: ContentHasher = {
  async hash(file) {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },
};

export type PdfBulletinSourceDependencies = {
  readonly loader: PdfDocumentLoader;
  readonly assembler?: SectionAssembler;
  readonly hasher?: ContentHasher;
};

// ---------------------------------------------------------------------------
// Page furniture and document-level markers
// ---------------------------------------------------------------------------

/** Printed on every page; carries no data, and would corrupt column bands. */
const PAGE_FURNITURE: ReadonlySet<string> = new Set([
  'DRIMS Assam',
  'Disaster Reporting and Information Management System',
]);

const DRIMS_MARKER = 'DRIMS Assam';
const REPORT_DATE = /Assam Flood Report as on\s*(\d{1,2})-(\d{1,2})-(\d{4})/i;
const GENERATED_ON = /Report Generated On:\s*(.+?)\s*$/i;

const isFurniture = (run: TextRun): boolean => PAGE_FURNITURE.has(run.str.trim());

/** Row text with wrapped tokens rejoined — `27` `-` `07` `-` `2026` is one date. */
const documentLines = (runs: readonly TextRun[]): readonly string[] =>
  createRowClusterer()
    .cluster(runs)
    .map((row) => joinRuns(row.runs));

const isoDateFrom = (lines: readonly string[]): ReportDate | undefined => {
  for (const line of lines) {
    const match = REPORT_DATE.exec(line);
    if (match === null) continue;
    const [, day, month, year] = match;
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}` as ReportDate;
  }
  return undefined;
};

const generatedAtFrom = (lines: readonly string[]): string => {
  for (const line of lines) {
    const match = GENERATED_ON.exec(line.trim());
    if (match !== null) return match[1]!.trim();
  }
  return '';
};

// ---------------------------------------------------------------------------
// Cell readers
// ---------------------------------------------------------------------------

const numberAt = (row: LogicalRow | undefined, column: number): DrimsNumber =>
  parseWrappedDrimsNumber(cellAt(row, column));

const countAt = (row: LogicalRow | undefined, column: number): Count => toCount(numberAt(row, column));

const quintalsAt = (row: LogicalRow | undefined, column: number): Quintals => {
  const v = numericValue(numberAt(row, column));
  return v === undefined ? unknownQuintals() : quintals(v);
};

const litresAt = (row: LogicalRow | undefined, column: number): Litres => {
  const v = numericValue(numberAt(row, column));
  return v === undefined ? unknownLitres() : litres(v);
};

const hectaresAt = (row: LogicalRow | undefined, column: number): Hectares => {
  const v = numericValue(numberAt(row, column));
  return v === undefined ? unknownHectares() : hectares(v);
};

/**
 * The leading figure of a cell that mixes a total with its breakdown:
 * `11 (Mahmora | 9), (Sonari | 2)` is eleven camps.
 */
const leadingNumber = (raw: string): DrimsNumber => {
  const head = raw.split('(')[0] ?? '';
  return parseDrimsNumber(head);
};

const leadingCount = (row: LogicalRow | undefined, column: number): Count =>
  toCount(leadingNumber(cellAt(row, column)));

/** Header lines that survive into the data rows of a couple of sections. */
const NON_DISTRICT_LABELS: ReadonlySet<string> = new Set(['district', 'total', 'particulars', '']);

const isDistrictRow = (row: LogicalRow): boolean =>
  !NON_DISTRICT_LABELS.has(normaliseName(cellAt(row, 0)));

/**
 * Split a comma-separated name list, dropping ASDMA's `Nil`.
 *
 * PRD §5.4 invariant 3: `Nil` in a name column means "no such item", so it
 * produces no entity rather than an entity called Nil.
 */
const nameList = (raw: string): readonly string[] =>
  raw
    .split(',')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s !== '' && s.toLowerCase() !== 'nil');

// ---------------------------------------------------------------------------
// Drafts: mutable while we read, frozen into the published language at the end
// ---------------------------------------------------------------------------

type CircleDraft = {
  name: string;
  villagesAffected: Count;
  populationAffected: Count;
  cropAreaSubmerged: Hectares;
  reliefCamps: Count;
  reliefDistributionCentres: Count;
  campInmates: Count;
  nonCampInmates: Count;
};

type DistrictDraft = {
  name: string;
  circles: Map<string, CircleDraft>;
  villagesAffected: Count;
  male: Count;
  female: Count;
  children: Count;
  populationTotal: Count;
  cropAreaSubmerged: Hectares;
  reliefCamps: Count;
  reliefDistributionCentres: Count;
  campInmatesTotal: Count;
  campMale: Count;
  campFemale: Count;
  campChildren: Count;
  campPregnantOrLactating: Count;
  campPersonsWithDisability: Count;
  nonCampTotal: Count;
  nonCampMale: Count;
  nonCampFemale: Count;
  nonCampChildren: Count;
  nonCampAnimals: AnimalCounts;
  floodDeaths: Count;
  generalDrownings: Count;
  missing: Count;
  animalsAffected: AnimalCounts;
  animalsWashedAway: AnimalCounts;
  fullySeverelyKuccha: Count;
  fullySeverelyPukka: Count;
  partiallyKuccha: Count;
  partiallyPukka: Count;
  otherHuts: Count;
  otherCattleSheds: Count;
  rice: Quintals;
  dal: Quintals;
  salt: Quintals;
  mustardOil: Litres;
  greenFodder: Quintals;
  wheatBran: Quintals;
  riceBran: Quintals;
  agencies: string[];
  medicalTeams: Count;
  boats: Count;
  helicopters: Count;
  personsEvacuatedByBoat: Count;
  personsEvacuatedByHelicopter: Count;
  animalsEvacuated: Count;
  remarks: string;
};

const unknownAnimals = (): AnimalCounts => ({
  big: unknownCount(),
  small: unknownCount(),
  poultry: unknownCount(),
});

const newDistrict = (name: string): DistrictDraft => ({
  name,
  circles: new Map(),
  villagesAffected: unknownCount(),
  male: unknownCount(),
  female: unknownCount(),
  children: unknownCount(),
  populationTotal: unknownCount(),
  cropAreaSubmerged: unknownHectares(),
  reliefCamps: unknownCount(),
  reliefDistributionCentres: unknownCount(),
  campInmatesTotal: unknownCount(),
  campMale: unknownCount(),
  campFemale: unknownCount(),
  campChildren: unknownCount(),
  campPregnantOrLactating: unknownCount(),
  campPersonsWithDisability: unknownCount(),
  nonCampTotal: unknownCount(),
  nonCampMale: unknownCount(),
  nonCampFemale: unknownCount(),
  nonCampChildren: unknownCount(),
  nonCampAnimals: unknownAnimals(),
  floodDeaths: unknownCount(),
  generalDrownings: unknownCount(),
  missing: unknownCount(),
  animalsAffected: unknownAnimals(),
  animalsWashedAway: unknownAnimals(),
  fullySeverelyKuccha: unknownCount(),
  fullySeverelyPukka: unknownCount(),
  partiallyKuccha: unknownCount(),
  partiallyPukka: unknownCount(),
  otherHuts: unknownCount(),
  otherCattleSheds: unknownCount(),
  rice: unknownQuintals(),
  dal: unknownQuintals(),
  salt: unknownQuintals(),
  mustardOil: unknownLitres(),
  greenFodder: unknownQuintals(),
  wheatBran: unknownQuintals(),
  riceBran: unknownQuintals(),
  agencies: [],
  medicalTeams: unknownCount(),
  boats: unknownCount(),
  helicopters: unknownCount(),
  personsEvacuatedByBoat: unknownCount(),
  personsEvacuatedByHelicopter: unknownCount(),
  animalsEvacuated: unknownCount(),
  remarks: '',
});

const newCircle = (name: string): CircleDraft => ({
  name,
  villagesAffected: unknownCount(),
  populationAffected: unknownCount(),
  cropAreaSubmerged: unknownHectares(),
  reliefCamps: unknownCount(),
  reliefDistributionCentres: unknownCount(),
  campInmates: unknownCount(),
  nonCampInmates: unknownCount(),
});

type Draft = {
  districts: Map<string, DistrictDraft>;
  aboveDangerLevel: string[];
  aboveHighestFloodLevel: string[];
  infrastructure: InfrastructureDamage[];
  statewide: {
    districtsAffected: Count;
    revenueCirclesAffected: Count;
    villagesAffected: Count;
    populationAffected: Count;
    cropAreaSubmerged: Hectares;
    reliefCamps: Count;
    reliefDistributionCentres: Count;
    campInmates: Count;
    nonCampInmates: Count;
  };
  failures: ReconciliationFailure[];
};

const districtOf = (draft: Draft, name: string): DistrictDraft => {
  const key = normaliseName(name);
  const existing = draft.districts.get(key);
  if (existing !== undefined) return existing;
  const created = newDistrict(name);
  draft.districts.set(key, created);
  return created;
};

const circleOf = (district: DistrictDraft, name: string): CircleDraft => {
  const key = normaliseName(name);
  const existing = district.circles.get(key);
  if (existing !== undefined) return existing;
  const created = newCircle(name);
  district.circles.set(key, created);
  return created;
};

/** Fold a `(circle | n)` breakdown into the district's circles. */
const applyBreakdown = (
  district: DistrictDraft,
  cell: string,
  assign: (circle: CircleDraft, value: DrimsNumber) => void,
): void => {
  for (const [name, value] of simpleBreakdown(cell)) assign(circleOf(district, name), value);
};

// ---------------------------------------------------------------------------
// Section interpreters
// ---------------------------------------------------------------------------

type Interpreter = (table: SectionTable, draft: Draft) => void;

/** Verify a stated Total against our own sum and record any disagreement. */
const checkTotal = (
  table: SectionTable,
  draft: Draft,
  column: number,
  columnName: string,
  read: (row: LogicalRow | undefined, column: number) => DrimsNumber = numberAt,
): void => {
  const total = totalRowOf(table);
  if (total === undefined) return;
  const failure = reconcileDrims(
    table.kind,
    columnName,
    read(total, column),
    bodyRowsOf(table)
      .filter(isDistrictRow)
      .map((row) => read(row, column)),
  );
  if (failure !== undefined) draft.failures.push(failure);
};

const INTERPRETERS: Partial<Record<SectionKind, Interpreter>> = {
  'rivers-above-danger-level': (table, draft) => {
    for (const row of table.rows) {
      const label = normaliseName(cellAt(row, 0));
      const names = nameList(cellAt(row, 1));
      if (label.includes('highest flood level')) draft.aboveHighestFloodLevel.push(...names);
      else if (label.includes('danger level')) draft.aboveDangerLevel.push(...names);
    }
  },

  'districts-affected': (table, draft) => {
    for (const row of table.rows) {
      const value = parseDrimsNumber(cellAt(row, 0));
      if (value.kind === 'unknown') continue;
      draft.statewide.districtsAffected = toCount(value);
      for (const name of nameList(cellAt(row, 1))) districtOf(draft, name);
      return;
    }
  },

  'revenue-circles-affected': (table, draft) => {
    const total = totalRowOf(table);
    if (total !== undefined) draft.statewide.revenueCirclesAffected = countAt(total, 1);
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      for (const name of nameList(cellAt(row, 2))) circleOf(district, name);
    }
    checkTotal(table, draft, 1, 'No. Of Revenue Circles Affected');
  },

  'villages-affected': (table, draft) => {
    const total = totalRowOf(table);
    if (total !== undefined) draft.statewide.villagesAffected = countAt(total, 1);
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.villagesAffected = countAt(row, 1);
      applyBreakdown(district, cellAt(row, 2), (circle, value) => {
        circle.villagesAffected = toCount(value);
      });
    }
    checkTotal(table, draft, 1, 'Villages Affected');
  },

  'population-and-crop-area-submerged': (table, draft) => {
    const total = totalRowOf(table);
    if (total !== undefined) {
      draft.statewide.populationAffected = countAt(total, 4);
      draft.statewide.cropAreaSubmerged = hectaresAt(total, 5);
    }
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.male = countAt(row, 1);
      district.female = countAt(row, 2);
      district.children = countAt(row, 3);
      district.populationTotal = countAt(row, 4);
      district.cropAreaSubmerged = hectaresAt(row, 5);

      const cell = cellAt(row, 6);
      for (const [name, value] of compoundField(cell, 'Population Affected')) {
        circleOf(district, name).populationAffected = toCount(value);
      }
      for (const [name, value] of compoundField(cell, 'Crop Area Submerged')) {
        const v = numericValue(value);
        circleOf(district, name).cropAreaSubmerged = v === undefined ? unknownHectares() : hectares(v);
      }
    }
    checkTotal(table, draft, 4, 'Total Population');
    checkTotal(table, draft, 5, 'Total Crop Area (in Hect.)');
  },

  'relief-camps-opened': (table, draft) => {
    const total = totalRowOf(table);
    if (total !== undefined) {
      draft.statewide.reliefCamps = leadingCount(total, 2);
      draft.statewide.reliefDistributionCentres = leadingCount(total, 3);
    }
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.reliefCamps = leadingCount(row, 2);
      district.reliefDistributionCentres = leadingCount(row, 3);
      applyBreakdown(district, cellAt(row, 2), (circle, value) => {
        circle.reliefCamps = toCount(value);
      });
      applyBreakdown(district, cellAt(row, 3), (circle, value) => {
        circle.reliefDistributionCentres = toCount(value);
      });
    }
    const leading = (row: LogicalRow | undefined, column: number) =>
      leadingNumber(cellAt(row, column));
    checkTotal(table, draft, 2, 'Relief Camp', leading);
    checkTotal(table, draft, 3, 'Relief Distribution Centres', leading);
  },

  'inmates-in-relief-camps': (table, draft) => {
    const total = totalRowOf(table);
    if (total !== undefined) draft.statewide.campInmates = countAt(total, 1);
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.campInmatesTotal = countAt(row, 1);
      district.campMale = countAt(row, 3);
      district.campFemale = countAt(row, 4);
      district.campChildren = countAt(row, 5);
      district.campPregnantOrLactating = countAt(row, 6);
      district.campPersonsWithDisability = countAt(row, 7);
      applyBreakdown(district, cellAt(row, 2), (circle, value) => {
        circle.campInmates = toCount(value);
      });
    }
    checkTotal(table, draft, 1, 'Total');
  },

  'non-camp-inmates': (table, draft) => {
    const total = totalRowOf(table);
    if (total !== undefined) draft.statewide.nonCampInmates = countAt(total, 1);
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.nonCampTotal = countAt(row, 1);
      district.nonCampMale = countAt(row, 3);
      district.nonCampFemale = countAt(row, 4);
      district.nonCampChildren = countAt(row, 5);
      district.nonCampAnimals = {
        big: countAt(row, 6),
        small: countAt(row, 7),
        poultry: countAt(row, 8),
      };
      applyBreakdown(district, cellAt(row, 2), (circle, value) => {
        circle.nonCampInmates = toCount(value);
      });
    }
    checkTotal(table, draft, 1, 'Total');
  },

  'lives-lost-confirmed': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      // Flood deaths and general drownings are read into separate fields and
      // are never added: PRD §4.2.
      district.floodDeaths = countAt(row, 2);
      district.generalDrownings = countAt(row, 3);
    }
    checkTotal(table, draft, 2, 'Flood Death');
    checkTotal(table, draft, 3, 'General Drowning (Non Flood)');
  },

  'lives-lost-missing': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      districtOf(draft, cellAt(row, 0)).missing = countAt(row, 1);
    }
    checkTotal(table, draft, 1, 'Total');
  },

  'animals-affected': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      districtOf(draft, cellAt(row, 0)).animalsAffected = {
        big: countAt(row, 2),
        small: countAt(row, 3),
        poultry: countAt(row, 4),
      };
    }
    checkTotal(table, draft, 1, 'Total');
  },

  'animals-washed-away': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      districtOf(draft, cellAt(row, 0)).animalsWashedAway = {
        big: countAt(row, 2),
        small: countAt(row, 3),
        poultry: countAt(row, 4),
      };
    }
    checkTotal(table, draft, 1, 'Total');
  },

  'houses-damaged': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.fullySeverelyKuccha = countAt(row, 1);
      district.fullySeverelyPukka = countAt(row, 2);
      district.partiallyKuccha = countAt(row, 4);
      district.partiallyPukka = countAt(row, 5);
    }
    checkTotal(table, draft, 3, 'Fully/Severely Total');
    checkTotal(table, draft, 6, 'Partially Total');
  },

  'houses-damaged-others': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.otherHuts = countAt(row, 1);
      district.otherCattleSheds = countAt(row, 2);
    }
    checkTotal(table, draft, 3, 'Others Total');
  },

  'rescue-operation': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      // A Set, not a list: Sivasagar names "Local People" four times.
      const named = [...nameList(cellAt(row, 1)), ...nameList(cellAt(row, 2))].map((s) =>
        s.replace(/\s*\n\s*/g, ' '),
      );
      district.agencies = [...new Set(named)];
      district.medicalTeams = countAt(row, 3);
      district.boats = countAt(row, 4);
      district.personsEvacuatedByBoat = countAt(row, 5);
      district.animalsEvacuated = countAt(row, 6);
      district.helicopters = countAt(row, 7);
      district.personsEvacuatedByHelicopter = countAt(row, 8);
    }
    checkTotal(table, draft, 3, 'Medical Team Deployed');
    checkTotal(table, draft, 4, 'Boats Deployed');
  },

  'relief-distributed': (table, draft) => {
    for (const row of bodyRowsOf(table)) {
      if (!isDistrictRow(row)) continue;
      const district = districtOf(draft, cellAt(row, 0));
      district.rice = quintalsAt(row, 1);
      district.dal = quintalsAt(row, 2);
      district.salt = quintalsAt(row, 3);
      district.mustardOil = litresAt(row, 4);
      district.greenFodder = quintalsAt(row, 5);
      district.wheatBran = quintalsAt(row, 6);
      district.riceBran = quintalsAt(row, 7);
    }
    checkTotal(table, draft, 1, 'Rice (in Q)');
    checkTotal(table, draft, 4, 'M. Oil (in L)');
  },

  remarks: (table, draft) => {
    for (const row of table.rows) {
      if (!isDistrictRow(row)) continue;
      districtOf(draft, cellAt(row, 0)).remarks = cellAt(row, 1).replace(/\s*\n\s*/g, ' ').trim();
    }
  },
};

const DAMAGE_CLASSES: Partial<Record<SectionKind, DamageClass>> = {
  'infrastructure-road': 'road',
  'infrastructure-bridge': 'bridge',
  'infrastructure-embankment-breached': 'embankment-breached',
  'infrastructure-embankment-affected': 'embankment-affected',
  'infrastructure-others': 'other',
};

/**
 * Translate the assembler's account of the geometry into the one question the
 * document-level check asks: did we measure it, or invent it?
 *
 * A `supplied` body start is a caller taking responsibility for the geometry —
 * a test, or a diagnostic reproducing a known-bad layout — and is not a guess
 * the parser made. An `unmeasurable` one is, and it fails the document.
 */
const geometryOf = (derivation: BodyStartDerivation): TableGeometry =>
  derivation.kind === 'unmeasurable'
    ? { kind: 'guessed', detail: derivation.detail }
    : { kind: 'measured' };

const flatten = (raw: string): string => raw.replace(/\s*\n\s*/g, ' ').trim();

const tighten = (raw: string): string => raw.replace(/\s+/g, '').toLowerCase();

/**
 * Recover a Revenue Circle name the narrow infrastructure column split
 * mid-word (`Sissiborgao` / `n | 2)`).
 *
 * Prose columns cannot be repaired — nothing distinguishes a word break from a
 * line break once the glyphs are joined — but a circle name can, because by
 * the time the infrastructure tables are read we already have this district's
 * circles from the Villages and Population sections. The wrapped fragment is
 * matched against that vocabulary with whitespace removed, exactly as section
 * labels are matched.
 */
const resolveCircleName = (district: DistrictDraft, raw: string): string => {
  const wanted = tighten(raw);
  if (wanted === '') return '';
  for (const circle of district.circles.values()) {
    if (tighten(circle.name) === wanted) return circle.name;
  }
  return flatten(raw);
};

const coordinateFrom = (longitude: string, latitude: string): GeoCoordinate | undefined => {
  const lon = numericValue(parseWrappedDrimsNumber(longitude));
  const lat = numericValue(parseWrappedDrimsNumber(latitude));
  if (lon === undefined || lat === undefined) return undefined;
  return geoCoordinate(lon, lat);
};

/**
 * The infrastructure tables, which are itemised rather than one row per
 * district. A row whose name column reads `Nil` produces no entity at all
 * (PRD §5.4 invariant 3).
 */
const interpretInfrastructure = (table: SectionTable, draft: Draft): void => {
  const damageClass = DAMAGE_CLASSES[table.kind];
  if (damageClass === undefined) return;

  // Counted from the right-hand edge of the table, because that is the end the
  // five infrastructure tables agree about — see `itemColumn`. The width comes
  // from the rows rather than from `columns`, so it is the shape of the data
  // and not a second reading of the geometry.
  const width = Math.max(0, ...table.rows.map((row) => row.cells.length));
  const at = (row: LogicalRow, offset: number): string => {
    const column = itemColumn(width, offset);
    return column === undefined ? '' : cellAt(row, column);
  };

  let current: DistrictDraft | undefined;
  for (const row of table.rows) {
    const district = cellAt(row, 0);
    if (district !== '' && isDistrictRow(row)) current = districtOf(draft, district);
    if (current === undefined) continue;

    const name = flatten(at(row, ITEM_NAME));
    // `Nil` in a name column means "no such item" (PRD §5.4 invariant 3), and a
    // column of nothing but `Nil`s is still nothing but Nil: when two printed
    // lines of `Nil` end up in one cell, `Nil Nil` must not become a damaged
    // asset with a name.
    if (name === '' || /^(nil\b[\s,]*)+$/i.test(name)) continue;

    const circles = [...simpleBreakdown(cellAt(row, 2)).keys()];
    draft.infrastructure.push({
      damageClass,
      district: districtName(current.name),
      circle: revenueCircleName(resolveCircleName(current, circles[0] ?? '')),
      name,
      department: flatten(at(row, ITEM_DEPARTMENT)),
      village: flatten(at(row, ITEM_VILLAGE)),
      location: flatten(at(row, ITEM_LOCATION)),
      coordinate: coordinateFrom(at(row, ITEM_LATITUDE), at(row, ITEM_LONGITUDE)),
      remarks: flatten(at(row, ITEM_REMARKS)),
    });
  }
};

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export const createPdfBulletinSource = (
  dependencies: PdfBulletinSourceDependencies,
): BulletinSource => {
  const { loader } = dependencies;
  const assembler = dependencies.assembler ?? createSectionAssembler();
  const hasher = dependencies.hasher ?? sha256Hasher;

  return {
    async parse(file) {
      const pages = await loader.load(file);

      const allRuns = pages.flatMap((page) =>
        page.runs.filter((run) => run.str.trim() !== '').map((run) => ({ ...run, page: page.page })),
      );

      // A scan has pages but no text layer. Say so plainly (§9 risk register).
      if (allRuns.length === 0) throw new NoTextLayerError();

      if (!allRuns.some((run) => run.str.includes(DRIMS_MARKER))) {
        throw new NotADrimsBulletinError('the "DRIMS Assam" masthead is absent from every page');
      }

      const lines = documentLines(allRuns);
      const reportDate = isoDateFrom(lines);
      if (reportDate === undefined) {
        // PRD §5.1 invariant 1: there is no undated-bulletin state.
        throw new NotADrimsBulletinError(
          'no "Assam Flood Report as on DD-MM-YYYY" line was found',
        );
      }

      const bodyRuns = allRuns.filter((run) => !isFurniture(run));
      const { bodyStart, tables } = assembler.assemble(bodyRuns);

      const draft: Draft = {
        districts: new Map(),
        aboveDangerLevel: [],
        aboveHighestFloodLevel: [],
        infrastructure: [],
        statewide: {
          districtsAffected: unknownCount(),
          revenueCirclesAffected: unknownCount(),
          villagesAffected: unknownCount(),
          populationAffected: unknownCount(),
          cropAreaSubmerged: unknownHectares(),
          reliefCamps: unknownCount(),
          reliefDistributionCentres: unknownCount(),
          campInmates: unknownCount(),
          nonCampInmates: unknownCount(),
        },
        failures: [],
      };

      const sectionProvenance: SectionProvenance[] = [];

      for (const table of tables) {
        const before = draft.failures.length;
        let confidence: ExtractionConfidence = 'high';
        try {
          const interpret = INTERPRETERS[table.kind];
          if (interpret !== undefined) interpret(table, draft);
          else if (table.kind in DAMAGE_CLASSES) interpretInfrastructure(table, draft);
          if (table.rows.length === 0) confidence = 'failed';
        } catch {
          // FR-1.5: one unreadable section must not cost us the other 21.
          confidence = 'failed';
        }
        if (confidence === 'high' && draft.failures.length > before) confidence = 'degraded';
        sectionProvenance.push({ kind: table.kind, sourcePages: table.sourcePages, confidence });
      }

      const districts = [...draft.districts.values()].map((d) => ({
        district: districtName(d.name) as DistrictName,
        revenueCircles: [...d.circles.values()].map(
          (c): RevenueCircleImpact => ({
            circle: revenueCircleName(c.name),
            villagesAffected: c.villagesAffected,
            populationAffected: c.populationAffected,
            cropAreaSubmerged: c.cropAreaSubmerged,
            reliefCamps: c.reliefCamps,
            reliefDistributionCentres: c.reliefDistributionCentres,
            campInmates: c.campInmates,
            nonCampInmates: c.nonCampInmates,
          }),
        ),
        villagesAffected: d.villagesAffected,
        population: {
          male: d.male,
          female: d.female,
          children: d.children,
          total: d.populationTotal,
        },
        cropAreaSubmerged: d.cropAreaSubmerged,
        reliefCamps: d.reliefCamps,
        reliefDistributionCentres: d.reliefDistributionCentres,
        campInmates: {
          total: d.campInmatesTotal,
          male: d.campMale,
          female: d.campFemale,
          children: d.campChildren,
          pregnantOrLactating: d.campPregnantOrLactating,
          personsWithDisability: d.campPersonsWithDisability,
        },
        nonCampInmates: {
          total: d.nonCampTotal,
          male: d.nonCampMale,
          female: d.nonCampFemale,
          children: d.nonCampChildren,
          animals: d.nonCampAnimals,
        },
        casualties: {
          floodDeaths: d.floodDeaths,
          generalDrownings: d.generalDrownings,
          missing: d.missing,
        },
        animals: { affected: d.animalsAffected, washedAway: d.animalsWashedAway },
        houses: {
          fullySeverelyKuccha: d.fullySeverelyKuccha,
          fullySeverelyPukka: d.fullySeverelyPukka,
          partiallyKuccha: d.partiallyKuccha,
          partiallyPukka: d.partiallyPukka,
          otherHuts: d.otherHuts,
          otherCattleSheds: d.otherCattleSheds,
        },
        relief: {
          rice: d.rice,
          dal: d.dal,
          salt: d.salt,
          mustardOil: d.mustardOil,
          greenFodder: d.greenFodder,
          wheatBran: d.wheatBran,
          riceBran: d.riceBran,
        },
        rescue: {
          agencies: d.agencies,
          medicalTeams: d.medicalTeams,
          boats: d.boats,
          helicopters: d.helicopters,
          personsEvacuatedByBoat: d.personsEvacuatedByBoat,
          personsEvacuatedByHelicopter: d.personsEvacuatedByHelicopter,
          animalsEvacuated: d.animalsEvacuated,
        },
        remarks: d.remarks,
      }));

      /**
       * The completeness invariant (see `document-integrity.ts`).
       *
       * It runs on what the parse produced rather than on the PDF, and it runs
       * last, because most of the questions it asks — are these districts
       * possible, are these names names, is the headline figure there — can
       * only be asked of a finished report. Reconciliation cannot ask them: it
       * validates within the sections it found, so it is silent about the
       * twenty-one it did not.
       *
       * The one question that is not about the output is `tableGeometry`: it
       * asks whether the Particulars gutter was measured or guessed, and it is
       * the cause the other four detect the symptoms of. It is passed here
       * rather than acted on at the assembler, because a guessed gutter must
       * not throw away the parse — the husk is published, marked untrustworthy,
       * so an operator can see exactly what went wrong (ADR-0005).
       */
      const integrity = checkDocumentIntegrity({
        tableGeometry: geometryOf(bodyStart),
        recognisedSections: tables.map((table) => table.kind),
        districtNames: districts.map((d) => d.district as string),
        statewidePopulationAffected: draft.statewide.populationAffected,
      });

      const provenance = applyIntegrityToProvenance(sectionProvenance, integrity, (kind) => ({
        kind,
        // A section we never found has no pages, and unknown is not zero: the
        // entry exists precisely so its absence cannot pass for absence of harm.
        sourcePages: [],
        confidence: 'failed',
      }));

      const report: FloodSituationReport = {
        bulletinId: (await hasher.hash(file)) as BulletinId,
        reportDate,
        generatedAt: generatedAtFrom(lines),
        rivers: {
          aboveDangerLevel: draft.aboveDangerLevel,
          aboveHighestFloodLevel: draft.aboveHighestFloodLevel,
        },
        districts,
        infrastructureDamage: draft.infrastructure,
        statewideTotals: draft.statewide,
        provenance,
        reconciliationFailures: draft.failures,
      };

      return report;
    },
  };
};

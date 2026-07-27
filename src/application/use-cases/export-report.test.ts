import { describe, expect, it } from 'vitest';

import { districtName } from '../../domain/shared/administrative-unit';
import { count, hectares, quintals, unknownCount, unknownHectares } from '../../domain/shared/quantity';
import {
  ASDMA_REMARK_WITH_COMMAS_QUOTES_AND_NEWLINES,
  aDistrictReport,
  aReport,
  bulletinId,
  reportDate,
} from '../services/report.fixture';
import { ExportReport } from './export-report';

const exportReport = new ExportReport();

/** Minimal RFC 4180 reader, so the round-trip assertions parse rather than eyeball. */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') field += char;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const dataRows = (csv: string): { header: string[]; rows: string[][]; comments: string[] } => {
  const comments = csv.split('\n').filter((line) => line.startsWith('#'));
  const body = csv
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n');
  const [header, ...rows] = parseCsv(body);
  return { header: header ?? [], rows, comments };
};

const cellFor = (csv: string, column: string, rowIndex = 0): string => {
  const { header, rows } = dataRows(csv);
  return rows[rowIndex]?.[header.indexOf(column)] ?? '<missing>';
};

describe('ExportReport — JSON (FR-1.10)', () => {
  it('names the file after the report date and declares the JSON media type', () => {
    const file = exportReport.execute(aReport({ reportDate: reportDate('2026-07-27') }), 'json');

    expect(file.filename).toBe('assam-flood-report-2026-07-27.json');
    expect(file.mimeType).toBe('application/json');
  });

  it('carries the bulletin identity so an export is traceable back to its source PDF', () => {
    const file = exportReport.execute(
      aReport({ bulletinId: bulletinId('hash-27'), reportDate: reportDate('2026-07-27') }),
      'json',
    );
    const parsed = JSON.parse(file.content);

    expect(parsed.bulletinId).toBe('hash-27');
    expect(parsed.reportDate).toBe('2026-07-27');
    expect(parsed.generatedAt).toBe('2026-07-27T21:49:00+05:30');
    expect(parsed.schema).toBe('assam-flood-console/report-export@1');
  });

  it('states the unknown convention in the document itself, not only in our docs', () => {
    const parsed = JSON.parse(exportReport.execute(aReport(), 'json').content);

    expect(parsed.conventions.unknownQuantity).toBe('null');
    expect(String(parsed.conventions.note)).toMatch(/never .*zero|not .*zero/i);
  });

  it('represents an unreported figure as null and a reported zero as 0 — never the same', () => {
    const report = aReport({
      districts: [
        aDistrictReport({
          district: districtName('Dhemaji'),
          casualties: {
            floodDeaths: count(0),
            generalDrownings: unknownCount(),
            missing: count(0),
          },
          cropAreaSubmerged: unknownHectares(),
          villagesAffected: count(0),
        }),
      ],
    });

    const parsed = JSON.parse(exportReport.execute(report, 'json').content);
    const district = parsed.districts[0];

    expect(district.casualties.floodDeaths).toBe(0);
    expect(district.casualties.generalDrownings).toBeNull();
    expect(district.cropAreaSubmergedHect).toBeNull();
    expect(district.villagesAffected).toBe(0);
    // The distinction must survive serialisation as JSON text, not just in memory.
    expect(exportReport.execute(report, 'json').content).toContain('"generalDrownings": null');
  });

  it('never exposes a casualty total — the two figures must not be summable (PRD §4.2)', () => {
    const parsed = JSON.parse(exportReport.execute(aReport(), 'json').content);

    expect(Object.keys(parsed.districts[0].casualties)).toEqual([
      'floodDeaths',
      'generalDrownings',
      'missing',
    ]);
  });

  it('keeps units in the field names so quintals cannot be read as litres (PRD §4.3)', () => {
    const parsed = JSON.parse(exportReport.execute(aReport(), 'json').content);

    expect(parsed.districts[0].relief.riceQ).toBe(1191.092);
    expect(parsed.districts[0].relief.mustardOilL).toBe(3513.53);
    expect(parsed.statewideTotals.cropAreaSubmergedHect).toBe(37139.52);
  });

  it('stores DRIMS float noise faithfully rather than rounding at export', () => {
    const report = aReport({
      districts: [aDistrictReport({ cropAreaSubmerged: hectares(2025.9200000000003) })],
    });

    const parsed = JSON.parse(exportReport.execute(report, 'json').content);

    expect(parsed.districts[0].cropAreaSubmergedHect).toBe(2025.9200000000003);
  });

  it('carries rivers, revenue circles, infrastructure, provenance and reconciliation failures', () => {
    const parsed = JSON.parse(exportReport.execute(aReport(), 'json').content);

    expect(parsed.rivers.aboveDangerLevel).toEqual(['Dhansiri (S) at Numaligarh']);
    expect(parsed.rivers.aboveHighestFloodLevel).toEqual([]);
    expect(parsed.districts[0].revenueCircles[0].circle).toBe('Nazira');
    expect(parsed.infrastructureDamage[0].damageClass).toBe('road');
    expect(parsed.infrastructureDamage[0].longitude).toBe(94.5321);
    expect(parsed.provenance[0]).toEqual({
      section: 'districts-affected',
      sourcePages: [1],
      confidence: 'high',
    });
    expect(parsed.reconciliationFailures).toEqual([]);
  });

  it('marks an approximate coordinate rather than passing it off as a fix', () => {
    const report = aReport({
      infrastructureDamage: [
        {
          damageClass: 'other',
          district: districtName('Charaideo'),
          circle: 'Mahmora' as never,
          name: 'Fishery pond',
          department: 'Fisheries',
          village: 'Mahmora',
          location: '',
          coordinate: { kind: 'approximate', longitude: 94, latitude: 27, reason: 'insufficient-precision' },
          remarks: '',
        },
      ],
    });

    const parsed = JSON.parse(exportReport.execute(report, 'json').content);

    expect(parsed.infrastructureDamage[0].coordinatePrecision).toBe('approximate');
  });

  it('omits a coordinate entirely when the bulletin gave none, instead of 0,0', () => {
    const report = aReport({
      infrastructureDamage: [
        {
          damageClass: 'bridge',
          district: districtName('Jorhat'),
          circle: 'Teok' as never,
          name: 'Culvert',
          department: 'PWD',
          village: '',
          location: '',
          coordinate: undefined,
          remarks: '',
        },
      ],
    });

    const parsed = JSON.parse(exportReport.execute(report, 'json').content);

    expect(parsed.infrastructureDamage[0].longitude).toBeNull();
    expect(parsed.infrastructureDamage[0].latitude).toBeNull();
    expect(parsed.infrastructureDamage[0].coordinatePrecision).toBeNull();
  });
});

describe('ExportReport — CSV (FR-1.10)', () => {
  it('names the file after the report date and declares the CSV media type', () => {
    const file = exportReport.execute(aReport({ reportDate: reportDate('2026-07-27') }), 'csv');

    expect(file.filename).toBe('assam-flood-report-2026-07-27.csv');
    expect(file.mimeType).toBe('text/csv');
  });

  it('documents the empty-cell convention in a header comment', () => {
    const { comments } = dataRows(exportReport.execute(aReport(), 'csv').content);

    expect(comments.join('\n')).toMatch(/empty cell/i);
    expect(comments.join('\n')).toMatch(/0 means a reported zero/i);
    expect(comments.join('\n')).toMatch(/2026-07-27/);
  });

  it('emits one row per district', () => {
    const report = aReport({
      districts: [
        aDistrictReport({ district: districtName('Sivasagar') }),
        aDistrictReport({ district: districtName('Golaghat') }),
        aDistrictReport({ district: districtName('Jorhat') }),
      ],
    });

    const { rows } = dataRows(exportReport.execute(report, 'csv').content);

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row[0])).toEqual(['Sivasagar', 'Golaghat', 'Jorhat']);
  });

  it('writes an empty cell for unknown and 0 for a reported zero', () => {
    const report = aReport({
      districts: [
        aDistrictReport({
          casualties: {
            floodDeaths: count(0),
            generalDrownings: unknownCount(),
            missing: count(0),
          },
          cropAreaSubmerged: unknownHectares(),
          reliefCamps: count(0),
        }),
      ],
    });

    const csv = exportReport.execute(report, 'csv').content;

    expect(cellFor(csv, 'floodDeaths')).toBe('0');
    expect(cellFor(csv, 'generalDrownings')).toBe('');
    expect(cellFor(csv, 'cropAreaSubmergedHect')).toBe('');
    expect(cellFor(csv, 'reliefCamps')).toBe('0');
  });

  it('escapes commas, double quotes and newlines in real ASDMA remark text', () => {
    const report = aReport({
      districts: [
        aDistrictReport({
          district: districtName('Charaideo'),
          remarks: ASDMA_REMARK_WITH_COMMAS_QUOTES_AND_NEWLINES,
        }),
      ],
    });

    const csv = exportReport.execute(report, 'csv').content;

    // Round-trips byte-for-byte, commas/quotes/newlines and all.
    expect(cellFor(csv, 'remarks')).toBe(ASDMA_REMARK_WITH_COMMAS_QUOTES_AND_NEWLINES);
    // And the row structure survives the embedded newlines.
    expect(dataRows(csv).rows).toHaveLength(1);
    expect(cellFor(csv, 'district')).toBe('Charaideo');
    // Embedded quotes are doubled per RFC 4180, not backslash-escaped.
    expect(csv).toContain('""Fair Price Shops Damaged');
  });

  it('escapes a district name that itself contains a comma', () => {
    const report = aReport({
      districts: [aDistrictReport({ district: districtName('Kamrup, Metro') })],
    });

    const csv = exportReport.execute(report, 'csv').content;

    expect(cellFor(csv, 'district')).toBe('Kamrup, Metro');
  });

  it('leaves a plain field unquoted so the file stays readable', () => {
    const csv = exportReport.execute(aReport(), 'csv').content;

    expect(dataRows(csv).header).toContain('district');
    expect(csv).toContain('Sivasagar,');
  });

  it('keeps flood deaths and general drownings in separate columns', () => {
    const { header } = dataRows(exportReport.execute(aReport(), 'csv').content);

    expect(header).toContain('floodDeaths');
    expect(header).toContain('generalDrownings');
    expect(header.some((column) => /casualt(y|ies)Total/i.test(column))).toBe(false);
  });

  it('handles a bulletin with no affected districts without producing a broken file', () => {
    const csv = exportReport.execute(aReport({ districts: [] }), 'csv').content;
    const { header, rows } = dataRows(csv);

    expect(header).toContain('district');
    expect(rows).toEqual([]);
  });

  it('ends every line with CRLF, as spreadsheets expect', () => {
    const csv = exportReport.execute(aReport(), 'csv').content;

    expect(csv).toContain('\r\n');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('carries headline relief and rescue figures with their units named', () => {
    const csv = exportReport.execute(aReport(), 'csv').content;

    expect(cellFor(csv, 'riceDistributedQ')).toBe('1191.092');
    expect(cellFor(csv, 'boatsDeployed')).toBe('67');
  });
});

describe('ExportReport — unknown survives a full round trip', () => {
  it('JSON: unknown → null → still distinguishable from zero after re-parsing', () => {
    const report = aReport({
      statewideTotals: {
        ...aReport().statewideTotals,
        campInmates: unknownCount(),
        nonCampInmates: count(0),
        cropAreaSubmerged: unknownHectares(),
      },
      districts: [
        aDistrictReport({
          relief: { ...aDistrictReport().relief, rice: quintals(0), dal: { kind: 'unknown', unit: 'Q' } },
        }),
      ],
    });

    const parsed = JSON.parse(exportReport.execute(report, 'json').content);

    expect(parsed.statewideTotals.campInmates).toBeNull();
    expect(parsed.statewideTotals.nonCampInmates).toBe(0);
    expect(parsed.statewideTotals.cropAreaSubmergedHect).toBeNull();
    expect(parsed.districts[0].relief.riceQ).toBe(0);
    expect(parsed.districts[0].relief.dalQ).toBeNull();
    // The killer case: `null == 0` is false, and neither is `undefined`.
    expect(parsed.statewideTotals.campInmates === 0).toBe(false);
    expect('campInmates' in parsed.statewideTotals).toBe(true);
  });

  it('CSV: unknown → empty cell → still distinguishable from zero after re-parsing', () => {
    const report = aReport({
      districts: [
        aDistrictReport({
          campInmates: { ...aDistrictReport().campInmates, total: unknownCount() },
          nonCampInmates: { ...aDistrictReport().nonCampInmates, total: count(0) },
        }),
      ],
    });

    const csv = exportReport.execute(report, 'csv').content;

    expect(cellFor(csv, 'campInmates')).toBe('');
    expect(cellFor(csv, 'nonCampInmates')).toBe('0');
    expect(cellFor(csv, 'campInmates')).not.toBe(cellFor(csv, 'nonCampInmates'));
  });
});

describe('ExportReport — refusals', () => {
  it('rejects an unsupported format loudly instead of guessing', () => {
    expect(() => exportReport.execute(aReport(), 'xlsx' as never)).toThrow(/xlsx/);
  });
});

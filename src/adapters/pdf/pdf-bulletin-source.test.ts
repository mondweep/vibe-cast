import { describe, expect, it, vi } from 'vitest';

import { NoTextLayerError, NotADrimsBulletinError } from '../../application/ports';
import type { SectionKind } from '../../domain/shared/flood-situation-report';
import {
  createPdfBulletinSource,
  type ContentHasher,
  type PageTextContent,
  type PdfDocumentLoader,
} from './pdf-bulletin-source';
import type { LogicalRow, SectionAssembler, SectionTable } from './section-assembler';
import type { TextRun } from './text-run';

// ---------------------------------------------------------------------------
// Doubles. pdf.js is never loaded in this file.
// ---------------------------------------------------------------------------

const run = (str: string, x: number, y: number, page = 1): TextRun => ({
  str,
  x,
  y,
  width: str.length * 4,
  height: 8,
  page,
});

/** The masthead and date line every DRIMS bulletin carries. */
const mastheadRuns = (): TextRun[] => [
  run('DRIMS Assam', 214, 812),
  // The date arrives as five runs; rejoining them is the adapter's problem.
  { ...run('Assam Flood Report as on 27', 235, 766), width: 95.94 },
  { ...run('-', 331.03, 766), width: 2.46 },
  { ...run('07', 333.55, 766), width: 8.16 },
  { ...run('-', 341.59, 766), width: 2.46 },
  { ...run('2026', 344.11, 766), width: 16.19 },
  run('Report Generated On: 27-07-2026 09:49 PM', 36, 40),
];

const loaderReturning = (pages: readonly PageTextContent[]): PdfDocumentLoader => ({
  load: vi.fn(async () => pages),
});

const assemblerReturning = (tables: readonly SectionTable[]): SectionAssembler => ({
  assemble: vi.fn(() => tables),
});

const table = (
  kind: SectionKind,
  rows: readonly (readonly string[])[],
  sourcePages: readonly number[] = [1],
): SectionTable => ({
  kind,
  label: kind,
  sourcePages,
  columns: [],
  rows: rows.map((cells): LogicalRow => ({ cells, pages: sourcePages })),
});

const bulletin = () => new Blob(['%PDF-1.7'], { type: 'application/pdf' });

const sourceWith = (
  tables: readonly SectionTable[],
  overrides: { pages?: readonly PageTextContent[]; hasher?: ContentHasher } = {},
) =>
  createPdfBulletinSource({
    loader: loaderReturning(overrides.pages ?? [{ page: 1, runs: mastheadRuns() }]),
    assembler: assemblerReturning(tables),
    hasher: overrides.hasher ?? { hash: vi.fn(async () => 'a'.repeat(64)) },
  });

// ---------------------------------------------------------------------------

describe('PdfBulletinSource — collaboration', () => {
  it('asks its loader for the file it was given', async () => {
    const loader = loaderReturning([{ page: 1, runs: mastheadRuns() }]);
    const file = bulletin();
    await createPdfBulletinSource({
      loader,
      assembler: assemblerReturning([]),
      hasher: { hash: vi.fn(async () => 'x') },
    }).parse(file);

    expect(loader.load).toHaveBeenCalledTimes(1);
    expect(loader.load).toHaveBeenCalledWith(file);
  });

  it('hands the assembler the runs with page furniture removed', async () => {
    const pages: PageTextContent[] = [
      {
        page: 1,
        runs: [
          ...mastheadRuns(),
          run('Disaster Reporting and Information Management System', 108, 791),
          run('Charaideo', 76, 300),
        ],
      },
    ];
    const assembler = assemblerReturning([]);
    await createPdfBulletinSource({
      loader: loaderReturning(pages),
      assembler,
      hasher: { hash: vi.fn(async () => 'x') },
    }).parse(bulletin());

    const handed = (assembler.assemble as ReturnType<typeof vi.fn>).mock.calls[0]![0] as TextRun[];
    const strings = handed.map((r) => r.str);
    expect(strings).toContain('Charaideo');
    expect(strings).not.toContain('DRIMS Assam');
    expect(strings).not.toContain('Disaster Reporting and Information Management System');
  });

  it('takes the bulletin id from its hasher — same file, same id', async () => {
    const hasher: ContentHasher = { hash: vi.fn(async () => 'deadbeef') };
    const file = bulletin();
    const report = await sourceWith([], { hasher }).parse(file);

    expect(hasher.hash).toHaveBeenCalledWith(file);
    expect(report.bulletinId).toBe('deadbeef');
  });

  it('numbers runs by the page they came from, so provenance is never guessed', async () => {
    const assembler = assemblerReturning([]);
    await createPdfBulletinSource({
      loader: loaderReturning([
        { page: 1, runs: mastheadRuns() },
        { page: 7, runs: [run('Sivasagar', 76, 300, 999)] },
      ]),
      assembler,
      hasher: { hash: vi.fn(async () => 'x') },
    }).parse(bulletin());

    const handed = (assembler.assemble as ReturnType<typeof vi.fn>).mock.calls[0]![0] as TextRun[];
    expect(handed.find((r) => r.str === 'Sivasagar')!.page).toBe(7);
  });
});

describe('PdfBulletinSource — rejecting what it cannot read', () => {
  it('raises NoTextLayerError for a scanned PDF', async () => {
    const source = sourceWith([], { pages: [{ page: 1, runs: [] }, { page: 2, runs: [] }] });
    await expect(source.parse(bulletin())).rejects.toBeInstanceOf(NoTextLayerError);
  });

  it('raises NoTextLayerError when the only runs are whitespace', async () => {
    const source = sourceWith([], { pages: [{ page: 1, runs: [run('   ', 10, 10)] }] });
    await expect(source.parse(bulletin())).rejects.toBeInstanceOf(NoTextLayerError);
  });

  it('raises NotADrimsBulletinError when the DRIMS masthead is absent', async () => {
    const source = sourceWith([], {
      pages: [{ page: 1, runs: [run('Quarterly Sales Report', 100, 700)] }],
    });
    await expect(source.parse(bulletin())).rejects.toBeInstanceOf(NotADrimsBulletinError);
    await expect(source.parse(bulletin())).rejects.toThrow(/masthead/);
  });

  it('raises NotADrimsBulletinError when the report-date line is absent', async () => {
    // There is no undated-bulletin state (PRD §5.1 invariant 1).
    const source = sourceWith([], {
      pages: [{ page: 1, runs: [run('DRIMS Assam', 214, 812), run('Charaideo', 76, 300)] }],
    });
    await expect(source.parse(bulletin())).rejects.toBeInstanceOf(NotADrimsBulletinError);
    await expect(source.parse(bulletin())).rejects.toThrow(/Assam Flood Report as on/);
  });

  it('does not consult the assembler at all when the document is rejected', async () => {
    const assembler = assemblerReturning([]);
    const source = createPdfBulletinSource({
      loader: loaderReturning([{ page: 1, runs: [] }]),
      assembler,
      hasher: { hash: vi.fn() },
    });
    await expect(source.parse(bulletin())).rejects.toBeInstanceOf(NoTextLayerError);
    expect(assembler.assemble).not.toHaveBeenCalled();
  });
});

describe('PdfBulletinSource — the report header', () => {
  it('reads the date as ISO from ASDMA’s DD-MM-YYYY, rejoining the split runs', async () => {
    const report = await sourceWith([]).parse(bulletin());
    expect(report.reportDate).toBe('2026-07-27');
  });

  it('keeps ASDMA’s generation timestamp verbatim', async () => {
    const report = await sourceWith([]).parse(bulletin());
    expect(report.generatedAt).toBe('27-07-2026 09:49 PM');
  });

  it('leaves the timestamp empty rather than inventing one', async () => {
    const source = sourceWith([], {
      pages: [{ page: 1, runs: mastheadRuns().filter((r) => !r.str.startsWith('Report Generated')) }],
    });
    expect((await source.parse(bulletin())).generatedAt).toBe('');
  });
});

describe('PdfBulletinSource — zero and unknown stay different facts', () => {
  it('reads Nil in a count column as zero', async () => {
    const report = await sourceWith([
      table('animals-affected', [
        ['Charaideo', 'Nil', 'Nil', 'Nil', 'Nil'],
        ['Total', '0', '0', '0', '0'],
      ]),
    ]).parse(bulletin());

    expect(report.districts[0]!.animals.affected.big).toEqual({
      kind: 'known',
      unit: 'count',
      value: 0,
    });
  });

  it('reads SNR and blank as unknown, never as zero', async () => {
    const report = await sourceWith([
      table('animals-affected', [['Charaideo', 'SNR', 'SNR', '', '5']]),
    ]).parse(bulletin());

    const affected = report.districts[0]!.animals.affected;
    expect(affected.big).toEqual({ kind: 'unknown', unit: 'count' });
    expect(affected.small).toEqual({ kind: 'unknown', unit: 'count' });
    expect(affected.poultry).toEqual({ kind: 'known', unit: 'count', value: 5 });
  });

  it('leaves a figure no section reported as unknown', async () => {
    const report = await sourceWith([
      table('animals-affected', [['Charaideo', '1', '1', '0', '0']]),
    ]).parse(bulletin());
    // Nothing supplied houses; they must not appear as zeros.
    expect(report.districts[0]!.houses.fullySeverelyKuccha).toEqual({
      kind: 'unknown',
      unit: 'count',
    });
    expect(report.statewideTotals.campInmates).toEqual({ kind: 'unknown', unit: 'count' });
  });

  it('reads Nil in a NAME column as "no such item", producing no entity', async () => {
    const report = await sourceWith([
      table('rivers-above-danger-level', [
        ['Rivers flowing above danger level', 'Dhansiri (S) (Numaligarh)'],
        ['Rivers flowing above highest flood level', 'Nil'],
      ]),
    ]).parse(bulletin());

    expect(report.rivers.aboveDangerLevel).toEqual(['Dhansiri (S) (Numaligarh)']);
    expect(report.rivers.aboveHighestFloodLevel).toEqual([]);
  });

  it('produces no infrastructure entity for a Nil row', async () => {
    const report = await sourceWith([
      table(
        'infrastructure-road',
        [
          ['Charaideo', '1', '(Mahmora | 0)', 'Nil', 'Nil', 'Nil', 'Nil', 'Nil', 'Nil', 'Nil'],
          [
            '',
            '',
            '(Sonari | 1)',
            'Thukubill Satra Road',
            'PWD (Roads)',
            'Dakhin Saonari',
            'habi gaon',
            '95.0325\n43',
            '27.01578\n7',
            'flood water overtop',
          ],
        ],
        [5],
      ),
    ]).parse(bulletin());

    expect(report.infrastructureDamage).toHaveLength(1);
    expect(report.infrastructureDamage[0]).toMatchObject({
      damageClass: 'road',
      district: 'Charaideo',
      name: 'Thukubill Satra Road',
      // The coordinate was split across a line break and rejoined.
      coordinate: { kind: 'precise', longitude: 95.032543, latitude: 27.015787 },
    });
  });

  it('drops a coordinate that falls outside Assam rather than plotting it', async () => {
    const report = await sourceWith([
      table('infrastructure-bridge', [
        ['Jorhat', '1', '(Teok | 1)', 'A Bridge', 'PWD', 'V', 'L', '0.0', '0.0', 'r'],
      ]),
    ]).parse(bulletin());
    expect(report.infrastructureDamage[0]!.coordinate).toBeUndefined();
  });
});

describe('PdfBulletinSource — casualties are structurally unsummable', () => {
  it('keeps flood deaths and general drownings in separate fields', async () => {
    const report = await sourceWith([
      table('lives-lost-confirmed', [['Sivasagar', '3', '1', '2', '0', '0', '0', '0', '0', '']]),
    ]).parse(bulletin());

    const casualties = report.districts[0]!.casualties;
    expect(casualties.floodDeaths).toEqual({ kind: 'known', unit: 'count', value: 1 });
    expect(casualties.generalDrownings).toEqual({ kind: 'known', unit: 'count', value: 2 });
    expect(casualties).not.toHaveProperty('total');
  });
});

describe('PdfBulletinSource — totals are verified, not trusted', () => {
  it('is silent when ASDMA’s Total agrees with our sum', async () => {
    const report = await sourceWith([
      table('animals-affected', [
        ['Charaideo', '3', '1', '1', '1'],
        ['Jorhat', '3', '1', '1', '1'],
        ['Total', '6', '2', '2', '2'],
      ]),
    ]).parse(bulletin());

    expect(report.reconciliationFailures).toEqual([]);
    expect(report.provenance[0]!.confidence).toBe('high');
  });

  it('publishes a mismatch and degrades the section, keeping both numbers', async () => {
    const report = await sourceWith([
      table('animals-affected', [
        ['Charaideo', '3', '1', '1', '1'],
        ['Jorhat', '3', '1', '1', '1'],
        ['Total', '99', '2', '2', '2'],
      ]),
    ]).parse(bulletin());

    expect(report.reconciliationFailures).toEqual([
      { section: 'animals-affected', column: 'Total', statedTotal: 99, computedTotal: 6 },
    ]);
    expect(report.provenance[0]!.confidence).toBe('degraded');
  });

  it('does not throw the data away when it degrades a section', async () => {
    const report = await sourceWith([
      table('villages-affected', [
        ['Sivasagar', '232', '(Nazira | 41)'],
        ['Total', '999', ''],
      ]),
    ]).parse(bulletin());

    expect(report.reconciliationFailures).toHaveLength(1);
    expect(report.districts[0]!.villagesAffected).toEqual({
      kind: 'known',
      unit: 'count',
      value: 232,
    });
    // ASDMA's number stays ASDMA's number.
    expect(report.statewideTotals.villagesAffected).toEqual({
      kind: 'known',
      unit: 'count',
      value: 999,
    });
  });
});

describe('PdfBulletinSource — one bad section never fails the document (FR-1.5)', () => {
  it('marks a section that blows up as failed and carries on', async () => {
    const exploding: SectionTable = {
      kind: 'houses-damaged',
      label: 'Houses Damaged',
      sourcePages: [3],
      columns: [],
      rows: [
        {
          get cells(): readonly string[] {
            throw new Error('column resolution collapsed');
          },
          pages: [3],
        },
      ],
    };

    const report = await sourceWith([
      exploding,
      table('animals-affected', [['Charaideo', '3', '1', '1', '1']], [3]),
    ]).parse(bulletin());

    expect(report.provenance.map((p) => [p.kind, p.confidence])).toEqual([
      ['houses-damaged', 'failed'],
      ['animals-affected', 'high'],
    ]);
    // The section that failed contributes no figures — and no zeros.
    expect(report.districts[0]!.houses.fullySeverelyKuccha).toEqual({
      kind: 'unknown',
      unit: 'count',
    });
    expect(report.districts[0]!.animals.affected.big).toEqual({
      kind: 'known',
      unit: 'count',
      value: 1,
    });
  });

  it('marks an empty section as failed rather than as a table of zeros', async () => {
    const report = await sourceWith([table('rescue-operation', [], [4])]).parse(bulletin());
    expect(report.provenance).toEqual([
      { kind: 'rescue-operation', sourcePages: [4], confidence: 'failed' },
    ]);
  });
});

describe('PdfBulletinSource — provenance', () => {
  it('records the source pages of every section it recognised', async () => {
    const report = await sourceWith([
      table('animals-affected', [['Charaideo', '1', '1', '0', '0']], [3]),
      table('infrastructure-road', [['Charaideo', '0', '(Mahmora | 0)', 'Nil']], [5, 6, 7]),
    ]).parse(bulletin());

    expect(report.provenance).toEqual([
      { kind: 'animals-affected', sourcePages: [3], confidence: 'high' },
      { kind: 'infrastructure-road', sourcePages: [5, 6, 7], confidence: 'high' },
    ]);
  });
});

describe('PdfBulletinSource — the ubiquitous language', () => {
  it('collapses repeated rescue agencies to a set', async () => {
    const report = await sourceWith([
      table('rescue-operation', [
        [
          'Sivasagar',
          'NDRF, Local People, SDRF, Local People, NDRF',
          'Local People',
          '114',
          '61',
          '59',
          '0',
          '0',
          '0',
        ],
      ]),
    ]).parse(bulletin());

    expect(report.districts[0]!.rescue.agencies).toEqual(['NDRF', 'Local People', 'SDRF']);
    expect(report.districts[0]!.rescue.boats).toEqual({ kind: 'known', unit: 'count', value: 61 });
  });

  it('types relief quantities by unit, so quintals and litres cannot be mixed', async () => {
    const report = await sourceWith([
      table('relief-distributed', [
        ['Golaghat', '102.936', '18.237', '5.4726', '547.11', '0', '31', '53.03'],
      ]),
    ]).parse(bulletin());

    const relief = report.districts[0]!.relief;
    expect(relief.rice).toEqual({ kind: 'known', unit: 'Q', value: 102.936 });
    expect(relief.mustardOil).toEqual({ kind: 'known', unit: 'L', value: 547.11 });
  });

  it('reads the camp count out of a cell that leads with it', async () => {
    const report = await sourceWith([
      table('relief-camps-opened', [
        ['Charaideo', '17', '11 (Mahmora | 9), (Sonari | 2)', '6 (Mahmora | 6), (Sonari | 0)'],
        ['Total', '184', '90', '94'],
      ]),
    ]).parse(bulletin());

    expect(report.statewideTotals.reliefCamps).toEqual({ kind: 'known', unit: 'count', value: 90 });
    expect(report.statewideTotals.reliefDistributionCentres).toEqual({
      kind: 'known',
      unit: 'count',
      value: 94,
    });
    expect(report.districts[0]!.reliefCamps).toEqual({ kind: 'known', unit: 'count', value: 11 });

    const circles = report.districts[0]!.revenueCircles;
    expect(circles.map((c) => [c.circle, c.reliefCamps])).toEqual([
      ['Mahmora', { kind: 'known', unit: 'count', value: 9 }],
      ['Sonari', { kind: 'known', unit: 'count', value: 2 }],
    ]);
  });

  it('preserves ASDMA’s spelling of a district that wrapped, and its circles', async () => {
    const report = await sourceWith([
      table('villages-affected', [['Kamrup (M)', '1', '(Dispur | 1)']]),
    ]).parse(bulletin());

    expect(report.districts[0]!.district).toBe('Kamrup (M)');
    expect(report.districts[0]!.revenueCircles.map((c) => c.circle)).toEqual(['Dispur']);
  });

  it('ignores a header line that survived into the data rows', async () => {
    const report = await sourceWith([
      table('revenue-circles-affected', [
        ['District', 'Total', 'Revenue Circle'],
        ['Charaideo', '3', 'Mahmora, Sonari, Sapekhati'],
        ['Total', '21', ''],
      ]),
    ]).parse(bulletin());

    expect(report.districts.map((d) => d.district)).toEqual(['Charaideo']);
    expect(report.statewideTotals.revenueCirclesAffected).toEqual({
      kind: 'known',
      unit: 'count',
      value: 21,
    });
  });
});

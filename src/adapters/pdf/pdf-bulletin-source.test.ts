import { describe, expect, it, vi } from 'vitest';

import { NoTextLayerError, NotADrimsBulletinError } from '../../application/ports';
import type { SectionKind } from '../../domain/shared/flood-situation-report';
import { DRIMS_SECTION_CATALOGUE } from './document-integrity';
import {
  createPdfBulletinSource,
  type ContentHasher,
  type PageTextContent,
  type PdfDocumentLoader,
} from './pdf-bulletin-source';
import type {
  BodyStartDerivation,
  LogicalRow,
  SectionAssembler,
  SectionTable,
} from './section-assembler';
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

/**
 * An assembler that hands back fixed tables and, with them, its account of the
 * geometry it cut them with. The default is `supplied`: these tables did not
 * come from a measurement at all, and a test about section confidence must not
 * accidentally be a test about a guessed gutter.
 */
const assemblerReturning = (
  tables: readonly SectionTable[],
  bodyStart: BodyStartDerivation = { kind: 'supplied', bodyStart: 74 },
): SectionAssembler => ({
  assemble: vi.fn(() => ({ bodyStart, tables })),
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

/**
 * Pad a table or two out to a whole bulletin.
 *
 * The adapter now judges the document as well as its sections (see
 * `document-integrity.ts`): a parse that yields two of twenty-three sections is
 * a husk, and every section of a husk is marked `failed` regardless of how
 * cleanly it read. That is the point of the check — on 2026-07-25 the two
 * sections that *were* found were the corrupt ones — but it means a test about
 * one section's confidence has to hand the adapter a document that is not
 * itself a husk, or it measures the document verdict instead.
 *
 * The padding is inert. `District` is a header label, so `isDistrictRow`
 * rejects it: no district is created, no total is stated, no reconciliation
 * runs. The one exception is the population section, which is padded with an
 * explicit statewide zero, because "every DRIMS bulletin states a population
 * affected" is itself one of the document-level invariants — and a stated zero
 * is a figure ASDMA reported, not a figure we invented (ADR-0005).
 */
const INERT_ROW = ['District'];

const confidenceOf = (
  report: { readonly provenance: readonly { kind: SectionKind; confidence: string }[] },
  kind: SectionKind,
): string | undefined => report.provenance.find((p) => p.kind === kind)?.confidence;

const wholeBulletin = (tables: readonly SectionTable[]): readonly SectionTable[] => {
  const present = new Set(tables.map((t) => t.kind));
  const padding = DRIMS_SECTION_CATALOGUE.filter((kind) => !present.has(kind)).map((kind) =>
    kind === 'population-and-crop-area-submerged'
      ? table(kind, [['Total', '0', '0', '0', '0', '0']])
      : table(kind, [INERT_ROW]),
  );
  return [...tables, ...padding];
};

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
    const report = await sourceWith(
      wholeBulletin([
        table('animals-affected', [
          ['Charaideo', '3', '1', '1', '1'],
          ['Jorhat', '3', '1', '1', '1'],
          ['Total', '6', '2', '2', '2'],
        ]),
      ]),
    ).parse(bulletin());

    expect(report.reconciliationFailures).toEqual([]);
    expect(confidenceOf(report, 'animals-affected')).toBe('high');
  });

  it('publishes a mismatch and degrades the section, keeping both numbers', async () => {
    const report = await sourceWith(
      wholeBulletin([
        table('animals-affected', [
          ['Charaideo', '3', '1', '1', '1'],
          ['Jorhat', '3', '1', '1', '1'],
          ['Total', '99', '2', '2', '2'],
        ]),
      ]),
    ).parse(bulletin());

    expect(report.reconciliationFailures).toEqual([
      { section: 'animals-affected', column: 'Total', statedTotal: 99, computedTotal: 6 },
    ]);
    expect(confidenceOf(report, 'animals-affected')).toBe('degraded');
    // One degraded section is not a degraded document: the other 22 read fine.
    expect(confidenceOf(report, 'houses-damaged')).toBe('high');
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

    const report = await sourceWith(
      wholeBulletin([
        exploding,
        table('animals-affected', [['Charaideo', '3', '1', '1', '1']], [3]),
      ]),
    ).parse(bulletin());

    expect(confidenceOf(report, 'houses-damaged')).toBe('failed');
    expect(confidenceOf(report, 'animals-affected')).toBe('high');
    // FR-1.5 exactly: one section is lost, the other twenty-two are not.
    expect(report.provenance.filter((p) => p.confidence === 'failed')).toHaveLength(1);
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
    const report = await sourceWith(wholeBulletin([table('rescue-operation', [], [4])])).parse(
      bulletin(),
    );
    expect(report.provenance).toContainEqual({
      kind: 'rescue-operation',
      sourcePages: [4],
      confidence: 'failed',
    });
  });
});

describe('PdfBulletinSource — the document is judged as well as its sections', () => {
  it('refuses a husk: two sections of twenty-three cannot present as a report', async () => {
    // The 2026-07-25 and 2026-07-26 failure in miniature. Reconciliation is
    // silent — it validates within the sections it found, so it has no opinion
    // about the twenty-one it did not — and the document is still refused.
    const report = await sourceWith([
      table('districts-affected', [['2', 'Sivasagar, Jorhat']]),
      table('remarks', [['Sivasagar', 'water receding']]),
    ]).parse(bulletin());

    expect(report.reconciliationFailures).toEqual([]);
    expect(report.provenance.some((p) => p.confidence === 'high')).toBe(false);
    expect(report.provenance).toHaveLength(DRIMS_SECTION_CATALOGUE.length);
  });

  it('gives every unfound section an entry, so its absence cannot go unnoticed', async () => {
    const report = await sourceWith([table('remarks', [['Sivasagar', 'water receding']])]).parse(
      bulletin(),
    );

    expect(report.provenance).toContainEqual({
      kind: 'villages-affected',
      sourcePages: [],
      confidence: 'failed',
    });
  });

  it('publishes the garbage rather than deleting it (ADR-0005)', async () => {
    // A Remarks sentence read as a district name. It is kept, and the document
    // is marked untrustworthy, because silently dropping it would leave an
    // operator with a shorter district list and no reason to doubt it.
    const prose = `(Sonari - ${'Additional reports are being prepared. '.repeat(4)})`;
    const report = await sourceWith(
      wholeBulletin([table('remarks', [[prose, 'x']])]),
    ).parse(bulletin());

    expect(report.districts.map((d) => d.district as string)).toContain(prose.trim());
    expect(report.provenance.some((p) => p.confidence === 'high')).toBe(false);
  });

  it('does not judge a complete, plausible document at all', async () => {
    const report = await sourceWith(
      wholeBulletin([table('animals-affected', [['Charaideo', '3', '1', '1', '1']], [3])]),
    ).parse(bulletin());

    expect(report.provenance.every((p) => p.confidence === 'high')).toBe(true);
  });

  it('refuses a document whose gutter the assembler could not measure', async () => {
    // The safety property, isolated from the geometry. This document is
    // FLAWLESS by every other test in this file — all 23 sections, one real
    // district, a stated statewide population — and it is refused anyway,
    // because the assembler said it guessed where the table body begins.
    // Nothing about the parse has to go visibly wrong for this to fire, which
    // is the whole point: on 2026-07-25 nothing did.
    const report = await createPdfBulletinSource({
      loader: loaderReturning([{ page: 1, runs: mastheadRuns() }]),
      assembler: assemblerReturning(
        wholeBulletin([
          table('population-and-crop-area-submerged', [
            ['Sivasagar', '1', '1', '1', '332639', '0'],
            ['Total', '1', '1', '1', '332639', '0'],
          ]),
        ]),
        { kind: 'unmeasurable', bodyStart: 74, detail: 'no page shows a Particulars gutter' },
      ),
      hasher: { hash: vi.fn(async () => 'a'.repeat(64)) },
    }).parse(bulletin());

    expect(report.provenance.every((p) => p.confidence === 'failed')).toBe(true);
    expect(report.provenance.some((p) => p.confidence === 'high')).toBe(false);
  });

  it('does not treat a caller-supplied gutter as a guess', async () => {
    // A test or a diagnostic that supplies the geometry has taken
    // responsibility for it. Only the parser's own failure to measure is a
    // breach, or every fixture-driven test would report one.
    const report = await createPdfBulletinSource({
      loader: loaderReturning([{ page: 1, runs: mastheadRuns() }]),
      assembler: assemblerReturning(
        wholeBulletin([table('animals-affected', [['Charaideo', '3', '1', '1', '1']], [3])]),
        { kind: 'supplied', bodyStart: 76 },
      ),
      hasher: { hash: vi.fn(async () => 'a'.repeat(64)) },
    }).parse(bulletin());

    expect(report.provenance.every((p) => p.confidence === 'high')).toBe(true);
  });
});

describe('PdfBulletinSource — provenance', () => {
  it('records the source pages of every section it recognised', async () => {
    const report = await sourceWith(
      wholeBulletin([
        table('animals-affected', [['Charaideo', '1', '1', '0', '0']], [3]),
        table('infrastructure-road', [['Charaideo', '0', '(Mahmora | 0)', 'Nil']], [5, 6, 7]),
      ]),
    ).parse(bulletin());

    expect(report.provenance).toContainEqual({
      kind: 'animals-affected',
      sourcePages: [3],
      confidence: 'high',
    });
    expect(report.provenance).toContainEqual({
      kind: 'infrastructure-road',
      sourcePages: [5, 6, 7],
      confidence: 'high',
    });
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

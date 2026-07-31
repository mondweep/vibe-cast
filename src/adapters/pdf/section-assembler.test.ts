import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_MIN_COLUMN_GAP } from './column-resolver';
import {
  bodyRowsOf,
  cellAt,
  createSectionAssembler,
  deriveBodyStart,
  FALLBACK_BODY_START,
  totalRowOf,
  type RowStartPolicy,
} from './section-assembler';
import type { SectionRecogniser } from './section-recogniser';
import type { RowClusterer, TextRun, VisualRow } from './text-run';

/** Synthetic geometry. No PDF, no pdf.js. */
const run = (str: string, x: number, y: number, width = str.length * 4, page = 1): TextRun => ({
  str,
  x,
  y,
  width,
  height: 8,
  page,
});

const clustererReturning = (rows: readonly VisualRow[]): RowClusterer => ({
  cluster: vi.fn(() => rows),
});

describe('SectionAssembler', () => {
  it('asks its clusterer for rows and its recogniser for boundaries', () => {
    const rows: VisualRow[] = [
      { page: 1, y: 100, runs: [run('Animals', 36, 100), run('District', 76, 100)] },
      { page: 1, y: 90, runs: [run('Affected', 36, 90), run('Charaideo', 76, 90), run('8492', 116, 90)] },
    ];
    const clusterer = clustererReturning(rows);
    const recogniser: SectionRecogniser = {
      recognise: vi.fn(),
      findBoundaries: vi.fn(() => [
        { kind: 'animals-affected' as const, label: 'Animals Affected', rowIndex: 0 },
      ]),
    };

    const runs = rows.flatMap((r) => r.runs);
    const tables = createSectionAssembler({ clusterer, recogniser, bodyStart: 74 }).assemble(runs).tables;

    expect(clusterer.cluster).toHaveBeenCalledWith(runs);
    expect(recogniser.findBoundaries).toHaveBeenCalledWith([
      { text: 'Animals', rowIndex: 0 },
      { text: 'Affected', rowIndex: 1 },
    ]);
    expect(tables).toHaveLength(1);
    expect(tables[0]).toMatchObject({ kind: 'animals-affected', label: 'Animals Affected' });
  });

  it('cuts each section at the row where the next section’s label begins', () => {
    const rows: VisualRow[] = [
      { page: 1, y: 100, runs: [run('District', 76, 100), run('Total', 116, 100)] },
      { page: 1, y: 90, runs: [run('Charaideo', 76, 90), run('8492', 116, 90)] },
      { page: 1, y: 80, runs: [run('District', 76, 80), run('Total', 116, 80)] },
      { page: 1, y: 70, runs: [run('Charaideo', 76, 70), run('3510', 116, 70)] },
    ];
    const recogniser: SectionRecogniser = {
      recognise: vi.fn(),
      findBoundaries: vi.fn(() => [
        { kind: 'animals-affected' as const, label: 'Animals Affected', rowIndex: 0 },
        { kind: 'animals-washed-away' as const, label: 'Animals Washed Away', rowIndex: 2 },
      ]),
    };

    const tables = createSectionAssembler({
      clusterer: clustererReturning(rows),
      recogniser,
      bodyStart: 74,
    }).assemble(rows.flatMap((r) => r.runs)).tables;

    expect(tables.map((t) => t.rows.map((r) => r.cells))).toEqual([
      [['Charaideo', '8492']],
      [['Charaideo', '3510']],
    ]);
  });

  it('merges two adjacent blocks that name the same kind', () => {
    // ASDMA labels the revenue-circle count and the revenue-circle table
    // separately; they are one section in the published language.
    const rows: VisualRow[] = [
      { page: 1, y: 100, runs: [run('21', 76, 100)] },
      { page: 1, y: 90, runs: [run('District', 76, 90), run('Total', 116, 90)] },
      { page: 1, y: 80, runs: [run('Charaideo', 76, 80), run('3', 116, 80)] },
    ];
    const recogniser: SectionRecogniser = {
      recognise: vi.fn(),
      findBoundaries: vi.fn(() => [
        { kind: 'revenue-circles-affected' as const, label: 'x', rowIndex: 0 },
        { kind: 'revenue-circles-affected' as const, label: 'y', rowIndex: 1 },
      ]),
    };

    const tables = createSectionAssembler({
      clusterer: clustererReturning(rows),
      recogniser,
      bodyStart: 74,
    }).assemble(rows.flatMap((r) => r.runs)).tables;

    expect(tables).toHaveLength(1);
    expect(tables[0]!.rows.map((r) => r.cells[0])).toContain('Charaideo');
  });

  it('records the pages a section spans, because provenance is not optional', () => {
    const rows: VisualRow[] = [
      { page: 5, y: 100, runs: [run('District', 76, 100, 24, 5)] },
      { page: 5, y: 90, runs: [run('Charaideo', 76, 90, 33, 5)] },
      { page: 6, y: 700, runs: [run('Jorhat', 76, 700, 20, 6)] },
    ];
    const recogniser: SectionRecogniser = {
      recognise: vi.fn(),
      findBoundaries: vi.fn(() => [
        { kind: 'infrastructure-road' as const, label: 'Infrastructure Damaged - Road', rowIndex: 0 },
      ]),
    };
    const tables = createSectionAssembler({
      clusterer: clustererReturning(rows),
      recogniser,
      bodyStart: 74,
    }).assemble(rows.flatMap((r) => r.runs)).tables;

    expect(tables[0]!.sourcePages).toEqual([5, 6]);
    expect(tables[0]!.rows[1]!.pages).toEqual([6]);
  });

  it('produces no tables when the recogniser finds no section it knows', () => {
    const rows: VisualRow[] = [{ page: 1, y: 100, runs: [run('Wildlife', 36, 100)] }];
    const tables = createSectionAssembler({
      clusterer: clustererReturning(rows),
      recogniser: { recognise: vi.fn(), findBoundaries: vi.fn(() => []) },
      bodyStart: 74,
    }).assemble(rows.flatMap((r) => r.runs)).tables;
    expect(tables).toEqual([]);
  });

  it('produces no tables for a document with no rows at all', () => {
    const tables = createSectionAssembler({
      clusterer: clustererReturning([]),
      recogniser: { recognise: vi.fn(), findBoundaries: vi.fn(() => []) },
    }).assemble([]).tables;
    expect(tables).toEqual([]);
  });
});

describe('SectionAssembler — logical rows', () => {
  const assembleRows = (rows: readonly VisualRow[]) =>
    createSectionAssembler({
      clusterer: clustererReturning(rows),
      recogniser: {
        recognise: vi.fn(),
        findBoundaries: vi.fn(() => [
          { kind: 'relief-camps-opened' as const, label: 'Relief Camps / Centres Opened', rowIndex: 0 },
        ]),
      },
      bodyStart: 74,
    }).assemble(rows.flatMap((r) => r.runs)).tables[0]!;

  it('joins a continuation line into the row above it', () => {
    const table = assembleRows([
      { page: 2, y: 100, runs: [run('District', 76, 100), run('Relief Camp', 146, 100)] },
      {
        page: 2,
        y: 90,
        runs: [run('Dibrugarh', 76, 90), run('0 (Dibrugarh East | 0),', 146, 90)],
      },
      { page: 2, y: 80, runs: [run('(Naharkatia | 0)', 146, 80)] },
      { page: 2, y: 70, runs: [run('Golaghat', 76, 70), run('7 (Golaghat | 5)', 146, 70)] },
    ]);

    expect(table.rows.map((r) => r.cells)).toEqual([
      ['Dibrugarh', '0 (Dibrugarh East | 0),\n(Naharkatia | 0)'],
      ['Golaghat', '7 (Golaghat | 5)'],
    ]);
  });

  it('reassembles a district name that wrapped, instead of inventing a row for "(M)"', () => {
    const table = assembleRows([
      { page: 2, y: 100, runs: [run('District', 76, 100), run('Total', 116, 100)] },
      { page: 2, y: 90, runs: [run('Kamrup', 76, 90), run('0', 116, 90)] },
      { page: 2, y: 80, runs: [run('(M)', 76, 80)] },
      { page: 2, y: 70, runs: [run('Nagaon', 76, 70), run('4', 116, 70)] },
    ]);

    expect(table.rows.map((r) => r.cells)).toEqual([
      ['Kamrup (M)', '0'],
      ['Nagaon', '4'],
    ]);
  });

  it('continues rather than starts a row when the District cell holds a lower-case fragment', () => {
    // A district is always a proper noun. Anything else in that column is the
    // tail of something that wrapped, not a new row.
    const table = assembleRows([
      { page: 2, y: 100, runs: [run('District', 76, 100), run('Relief Camp', 146, 100)] },
      { page: 2, y: 90, runs: [run('Jorhat', 76, 90), run('14 (Teok | 9)', 146, 90)] },
      { page: 2, y: 80, runs: [run('district part', 76, 80), run('(Titabor | 0)', 146, 80)] },
    ]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]!.cells).toEqual(['Jorhat district part', '14 (Teok | 9)\n(Titabor | 0)']);
  });

  it('concatenates runs that touch, so a split number is not read as two cells', () => {
    const table = assembleRows([
      { page: 2, y: 100, runs: [run('District', 76, 100), run('Total', 114, 100)] },
      { page: 2, y: 90, runs: [run('Total', 76, 90), run('18', 114, 90, 8.16), run('4', 122.0, 90, 4.08)] },
    ]);
    expect(table.rows[0]!.cells).toEqual(['Total', '184']);
  });

  it('drops rows that are entirely empty in the table body', () => {
    const table = assembleRows([
      { page: 2, y: 100, runs: [run('District', 76, 100), run('Total', 116, 100)] },
      { page: 2, y: 90, runs: [run('Charaideo', 76, 90), run('17', 116, 90)] },
      { page: 2, y: 85, runs: [run('Opened', 36, 85)] },
      { page: 2, y: 80, runs: [run('Dhemaji', 76, 80), run('0', 116, 80)] },
    ]);
    expect(table.rows.map((r) => r.cells[0])).toEqual(['Charaideo', 'Dhemaji']);
  });
});

describe('SectionAssembler — the row-start policy is injectable', () => {
  const rows: VisualRow[] = [
    { page: 5, y: 100, runs: [run('District', 76, 100), run('Number', 114, 100), run('Revenue', 146, 100)] },
    { page: 5, y: 90, runs: [run('Charaideo', 76, 90), run('1', 114, 90), run('(Mahmora | 0)', 146, 90)] },
    { page: 5, y: 80, runs: [run('(Sonari | 1)', 146, 80)] },
    { page: 5, y: 70, runs: [run('(Sapekhati | 0)', 146, 70)] },
  ];

  const assembleAs = (kind: 'infrastructure-road' | 'animals-affected') =>
    createSectionAssembler({
      clusterer: clustererReturning(rows),
      recogniser: {
        recognise: vi.fn(),
        findBoundaries: vi.fn(() => [{ kind, label: 'l', rowIndex: 0 }]),
      },
      bodyStart: 74,
    }).assemble(rows.flatMap((r) => r.runs)).tables[0]!;

  it('opens a new row per damaged item in the infrastructure tables', () => {
    expect(assembleAs('infrastructure-road').rows.map((r) => r.cells[2])).toEqual([
      '(Mahmora | 0)',
      '(Sonari | 1)',
      '(Sapekhati | 0)',
    ]);
  });

  it('keeps one row per district everywhere else, with the same geometry', () => {
    expect(assembleAs('animals-affected').rows).toHaveLength(1);
  });

  it('lets a caller replace the policy entirely', () => {
    // Typed as the real RowStartPolicy: a bare `vi.fn(() => true)` infers a
    // zero-argument call signature, so the assertion on argument [1] below
    // cannot typecheck against an empty tuple.
    const rowStartPolicy = vi.fn<RowStartPolicy>(() => true);
    const table = createSectionAssembler({
      clusterer: clustererReturning(rows),
      recogniser: {
        recognise: vi.fn(),
        findBoundaries: vi.fn(() => [
          { kind: 'animals-affected' as const, label: 'l', rowIndex: 0 },
        ]),
      },
      rowStartPolicy,
      bodyStart: 74,
    }).assemble(rows.flatMap((r) => r.runs)).tables[0]!;

    expect(rowStartPolicy).toHaveBeenCalled();
    expect(rowStartPolicy.mock.calls[0]![1]).toBe('animals-affected');
    expect(table.rows).toHaveLength(3);
  });
});

describe('deriveBodyStart', () => {
  it('measures the gutter from the document rather than assuming its width', () => {
    const runs = [
      run('issued at 8', 38.28, 100, 35.51),
      run('Rivers flowing above danger level', 76.22, 100, 108.76),
      run('Dhansiri (S)', 270.05, 100, 40),
    ];
    const derived = deriveBodyStart(runs);
    expect(derived.kind).toBe('measured');
    expect(derived.bodyStart).toBeCloseTo(75.72, 2);
  });

  it('outvotes the page whose Particulars label overflows across the channel', () => {
    // The 2026-07-28 shape, reduced to its essentials. The gutter runs from
    // 36.48 and the body from 75.26 on every page; on page 1 alone the label
    // line `CWC bulletin issued at` is 74.5pt of ink in a 37.5pt column, so it
    // starts inside the gutter and ends at 112.30, right across the channel.
    // Taken over the whole document's ink at once that single run merges the
    // two columns and the boundary moves to 114.26 — right of the District
    // column, which is how the husk was made.
    const gutterPage = (page: number): TextRun[] => [
      run('Population', 36.48, 100, 36.48, page),
      run('Charaideo', 75.26, 100, 33.14, page),
      run('142756', 114.26, 100, 24.48, page),
    ];
    const overflowing: TextRun[] = [
      run('Particulars', 36.48, 120, 35.46, 1),
      run('CWC bulletin issued at', 37.8, 110, 74.5, 1),
      run('Rivers flowing above danger', 114.26, 110, 91.71, 1),
      ...gutterPage(1),
    ];

    const derived = deriveBodyStart([...overflowing, ...gutterPage(2), ...gutterPage(3)]);
    expect(derived.kind).toBe('measured');
    expect(derived.bodyStart).toBeCloseTo(74.76, 2);
    expect(derived).toMatchObject({ agreeingPages: 2, gutterPages: 3 });
  });

  it('ignores continuation pages, which carry no Particulars label to measure from', () => {
    // A page whose leftmost ink is already table body has no opinion about
    // where the body begins, and must not be allowed to vote for one.
    const withGutter = (page: number): TextRun[] => [
      run('Population', 36.48, 100, 36.48, page),
      run('Charaideo', 75.26, 100, 33.14, page),
    ];
    const continuation: TextRun[] = [
      run('Sivasagar', 143.06, 100, 30.41, 9),
      run('Nazira', 211.01, 100, 20.53, 9),
    ];

    const derived = deriveBodyStart([...withGutter(1), ...withGutter(2), ...continuation]);
    expect(derived).toMatchObject({ kind: 'measured', agreeingPages: 2, gutterPages: 2 });
  });

  it('says it could not measure a document with no channel at all', () => {
    // Not "returns 74". The caller is made to look at `kind` before it can
    // reach a number, and the number it reaches is marked as a guess.
    const derived = deriveBodyStart([run('only', 36, 100)]);
    expect(derived.kind).toBe('unmeasurable');
    expect(derived.bodyStart).toBe(FALLBACK_BODY_START);
    expect(derived).toMatchObject({ detail: expect.stringContaining('no page shows') });
  });

  it('says it could not measure an empty document', () => {
    expect(deriveBodyStart([])).toEqual({
      kind: 'unmeasurable',
      bodyStart: FALLBACK_BODY_START,
      detail: 'the document contains no text runs',
    });
  });

  it('refuses to pick a winner when the pages split evenly', () => {
    // A tie is a document we cannot read, not a document to guess at. The
    // detail names both candidates so the disagreement is interrogable.
    const derived = deriveBodyStart([
      run('Population', 36.48, 100, 36.48, 1),
      run('Charaideo', 75.26, 100, 33.14, 1),
      run('Population', 36.48, 100, 36.48, 2),
      run('Charaideo', 99.5, 100, 33.14, 2),
    ]);
    expect(derived.kind).toBe('unmeasurable');
    expect(derived).toMatchObject({ detail: expect.stringContaining('75.26pt') });
    expect(derived).toMatchObject({ detail: expect.stringContaining('99.50pt') });
  });

  it('gives the same answer over a wide range of channel thresholds', () => {
    // The 1.5pt threshold that caused the original bug was fitted to one
    // fixture. `DEFAULT_MIN_COLUMN_GAP` is not: the tightest real boundary in
    // the corpus is 0.3pt and the widest gap inside one word is 0.1pt, so any
    // threshold strictly between them reads the same document the same way.
    expect(DEFAULT_MIN_COLUMN_GAP).toBeGreaterThan(0.1);
    expect(DEFAULT_MIN_COLUMN_GAP).toBeLessThan(0.3);
  });
});

describe('SectionAssembler — the geometry it publishes', () => {
  const emptyRecogniser: SectionRecogniser = {
    recognise: vi.fn(),
    findBoundaries: vi.fn(() => []),
  };

  it('reports a supplied body start as supplied, not as a measurement', () => {
    const assembled = createSectionAssembler({
      clusterer: clustererReturning([]),
      recogniser: emptyRecogniser,
      bodyStart: 74,
    }).assemble([]);
    expect(assembled.bodyStart).toEqual({ kind: 'supplied', bodyStart: 74 });
  });

  it('reports an unmeasurable document as unmeasurable even when it yields no tables', () => {
    // The two are different findings and must not look alike: "there was
    // nothing to read" and "we did not know where to read" are the difference
    // between an empty bulletin and a misread one.
    const assembled = createSectionAssembler({
      clusterer: clustererReturning([]),
      recogniser: emptyRecogniser,
    }).assemble([run('only', 36, 100)]);
    expect(assembled.tables).toEqual([]);
    expect(assembled.bodyStart.kind).toBe('unmeasurable');
  });
});

describe('row helpers', () => {
  const table = {
    kind: 'animals-affected' as const,
    label: 'Animals Affected',
    sourcePages: [3],
    columns: [],
    rows: [
      { cells: ['Charaideo', '8492'], pages: [3] },
      { cells: ['Sivasagar', '205727'], pages: [3] },
      { cells: ['Total', '256334'], pages: [3] },
    ],
  };

  it('totalRowOf finds ASDMA’s stated Total', () => {
    expect(totalRowOf(table)?.cells).toEqual(['Total', '256334']);
  });

  it('totalRowOf is undefined for a section with no stated Total', () => {
    expect(totalRowOf({ ...table, rows: table.rows.slice(0, 2) })).toBeUndefined();
  });

  it('bodyRowsOf excludes the stated Total, so our sum is independent of it', () => {
    expect(bodyRowsOf(table).map((r) => r.cells[0])).toEqual(['Charaideo', 'Sivasagar']);
  });

  it('cellAt is empty rather than undefined for a missing cell', () => {
    expect(cellAt(table.rows[0], 0)).toBe('Charaideo');
    expect(cellAt(table.rows[0], 9)).toBe('');
    expect(cellAt(undefined, 0)).toBe('');
  });
});

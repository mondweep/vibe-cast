import { describe, expect, it, vi } from 'vitest';

import {
  createRowClusterer,
  joinRuns,
  medianGlyphHeight,
  type GlyphHeightStatistic,
  type TextRun,
} from './text-run';

/** Synthetic geometry: no PDF is involved anywhere in this file. */
const run = (over: Partial<TextRun> & { str: string }): TextRun => ({
  x: 0,
  y: 0,
  width: over.str.length * 4,
  height: 8,
  page: 1,
  ...over,
});

describe('medianGlyphHeight', () => {
  it('is the middle height for an odd number of runs', () => {
    const runs = [run({ str: 'a', height: 6 }), run({ str: 'b', height: 8 }), run({ str: 'c', height: 20 })];
    expect(medianGlyphHeight(runs)).toBe(8);
  });

  it('averages the two middle heights for an even number of runs', () => {
    const runs = [
      run({ str: 'a', height: 6 }),
      run({ str: 'b', height: 8 }),
      run({ str: 'c', height: 10 }),
      run({ str: 'd', height: 20 }),
    ];
    expect(medianGlyphHeight(runs)).toBe(9);
  });

  it('ignores zero-height runs, which pdf.js emits for whitespace spacers', () => {
    const runs = [run({ str: 'a', height: 0 }), run({ str: 'b', height: 0 }), run({ str: 'c', height: 12 })];
    expect(medianGlyphHeight(runs)).toBe(12);
  });

  it('is 0 when nothing is measurable', () => {
    expect(medianGlyphHeight([])).toBe(0);
  });
});

describe('RowClusterer', () => {
  it('derives its tolerance from the injected glyph-height statistic, not a constant', () => {
    const glyphHeight: GlyphHeightStatistic = vi.fn(() => 10);
    const clusterer = createRowClusterer(glyphHeight, 0.4);

    const runs = [
      run({ str: 'District', x: 10, y: 100 }),
      // 3.9 below the baseline: inside a tolerance of 10 * 0.4 = 4.
      run({ str: 'Total', x: 60, y: 96.1 }),
      // 4.1 further down: outside it.
      run({ str: 'Charaideo', x: 10, y: 92 }),
    ];

    const rows = clusterer.cluster(runs);

    expect(glyphHeight).toHaveBeenCalledTimes(1);
    expect(glyphHeight).toHaveBeenCalledWith(runs);
    expect(rows.map((r) => r.runs.map((x) => x.str))).toEqual([
      ['District', 'Total'],
      ['Charaideo'],
    ]);
  });

  it('scales its tolerance with the document, so a larger font still clusters', () => {
    const runs = [
      run({ str: 'District', x: 10, y: 100, height: 20 }),
      run({ str: 'Total', x: 60, y: 93, height: 20 }),
    ];
    // Median 20 -> tolerance 8 -> a 7pt baseline difference is the same row.
    expect(createRowClusterer().cluster(runs)).toHaveLength(1);
    // The same geometry at an 8pt font -> tolerance 3.2 -> two rows.
    const small = runs.map((r) => ({ ...r, height: 8 }));
    expect(createRowClusterer().cluster(small)).toHaveLength(2);
  });

  it('orders rows down the page, because PDF y grows upwards but reading order does not', () => {
    const rows = createRowClusterer().cluster([
      run({ str: 'bottom', y: 10 }),
      run({ str: 'top', y: 500 }),
      run({ str: 'middle', y: 250 }),
    ]);
    expect(rows.map((r) => r.runs[0]!.str)).toEqual(['top', 'middle', 'bottom']);
  });

  it('orders runs within a row left to right', () => {
    const rows = createRowClusterer().cluster([
      run({ str: 'third', x: 300, y: 100 }),
      run({ str: 'first', x: 10, y: 100 }),
      run({ str: 'second', x: 100, y: 100 }),
    ]);
    expect(rows[0]!.runs.map((r) => r.str)).toEqual(['first', 'second', 'third']);
  });

  it('never clusters across a page boundary, however close the baselines', () => {
    const rows = createRowClusterer().cluster([
      run({ str: 'end of page 1', y: 100, page: 1 }),
      run({ str: 'start of page 2', y: 100, page: 2 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.page)).toEqual([1, 2]);
  });

  it('drops whitespace-only runs, which pdf.js emits as column spacers', () => {
    const rows = createRowClusterer().cluster([
      run({ str: '   ', x: 40, y: 100 }),
      run({ str: 'Total', x: 10, y: 100 }),
    ]);
    expect(rows[0]!.runs.map((r) => r.str)).toEqual(['Total']);
  });

  it('produces no rows for an empty page', () => {
    expect(createRowClusterer().cluster([])).toEqual([]);
    expect(createRowClusterer().cluster([run({ str: ' ' })])).toEqual([]);
  });

  it('falls back to a sub-point tolerance when no glyph height is measurable', () => {
    const glyphHeight: GlyphHeightStatistic = vi.fn(() => 0);
    const rows = createRowClusterer(glyphHeight).cluster([
      run({ str: 'a', y: 100, height: 0 }),
      run({ str: 'b', y: 99, height: 0 }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it('records the page of each row, so provenance survives clustering', () => {
    const rows = createRowClusterer().cluster([run({ str: 'Sivasagar', y: 300, page: 7 })]);
    expect(rows[0]).toMatchObject({ page: 7, y: 300 });
  });
});

describe('joinRuns', () => {
  it('concatenates runs that touch — DRIMS splits 184 into 18 and 4', () => {
    expect(
      joinRuns([
        run({ str: '18', x: 114, width: 8.16 }),
        run({ str: '4', x: 122.0, width: 4.08 }),
      ]),
    ).toBe('184');
  });

  it('concatenates a word the renderer split mid-token', () => {
    expect(
      joinRuns([
        run({ str: '(Sonari | Populati', x: 360, width: 118.5 }),
        run({ str: 'on Affected: 121276 |', x: 478.51, width: 70 }),
      ]),
    ).toBe('(Sonari | Population Affected: 121276 |');
  });

  it('inserts a space at a real inter-word gap', () => {
    expect(
      joinRuns([
        run({ str: '(Dispur |', x: 360, width: 30 }),
        run({ str: 'Population', x: 391.8, width: 35 }),
      ]),
    ).toBe('(Dispur | Population');
  });

  it('joins in x order regardless of the order given', () => {
    expect(
      joinRuns([run({ str: 'orhat', x: 79, width: 20 }), run({ str: 'J', x: 76, width: 3 })]),
    ).toBe('Jorhat');
  });

  it('is empty for no runs', () => {
    expect(joinRuns([])).toBe('');
  });
});

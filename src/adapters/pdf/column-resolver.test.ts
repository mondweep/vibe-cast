import { describe, expect, it } from 'vitest';

import { bandIndexFor, resolveColumns, selectDataRows } from './column-resolver';
import type { TextRun, VisualRow } from './text-run';

/** Synthetic geometry throughout: `[x, width]` pairs standing in for glyphs. */
const run = (x: number, width: number, str = 'x', y = 100, page = 1): TextRun => ({
  str,
  x,
  y,
  width,
  height: 8,
  page,
});

const row = (y: number, runs: readonly TextRun[]): VisualRow => ({ page: 1, y, runs: [...runs] });

const starts = (bands: readonly { start: number }[]) => bands.map((b) => b.start);

describe('resolveColumns', () => {
  it('finds one band per run cluster and one boundary per gap', () => {
    const bands = resolveColumns([run(76, 30), run(120, 20), run(200, 40)]);
    expect(starts(bands)).toEqual([76, 120, 200]);
    expect(bands.map((b) => b.index)).toEqual([0, 1, 2]);
  });

  it('gives every band the next band’s start as its end, and the last one the page edge', () => {
    const bands = resolveColumns([run(76, 30), run(120, 20)]);
    expect(bands[0]).toEqual({ index: 0, start: 76, end: 120 });
    expect(bands[1]).toEqual({ index: 1, start: 120, end: Number.POSITIVE_INFINITY });
  });

  it('keeps two columns apart across a gap as narrow as 0.3pt', () => {
    // Verbatim geometry of Small (right-aligned) and Poultry (left-aligned)
    // in the Non Camp Inmates table.
    const bands = resolveColumns([run(462.3, 16.4), run(479.0, 4.1)]);
    expect(starts(bands)).toEqual([462.3, 479.0]);
  });

  it('does NOT split a word the renderer emitted as two touching runs', () => {
    // `184` arrives as `18` at 114.3 (width 8.16) and `4` at 122.0.
    const bands = resolveColumns([run(114.3, 8.16, '18'), run(122.0, 4.08, '4')]);
    expect(bands).toHaveLength(1);
  });

  it('closes an intra-cell gap on one line using a longer line elsewhere', () => {
    // Row 1 wraps, leaving a 2pt hole at x=188 inside the same cell.
    // Row 2 paints straight through it. The cell must stay one column.
    const bands = resolveColumns([
      run(145.9, 40.1, '(Mahmora |'),
      run(187.8, 49.1, '0), (Sonari | 0),'),
      run(145.9, 121.7, '(Dibrugarh East | 0), (Naharkatia | 0),'),
    ]);
    expect(starts(bands)).toEqual([145.9]);
  });

  it('reconstructs all nine columns of the Non Camp Inmates table', () => {
    // Two real data rows, verbatim from page 2 of the 2026-07-27 bulletin.
    // Charaideo's circle cell wraps and leaves a hole at 186; Dibrugarh's
    // paints through it, which is why the union of rows is what gets measured.
    const runs = [
      run(76.2, 33.2, 'Charaideo'),
      run(116.2, 4.1, '0'),
      run(145.9, 40.1, '(Mahmora |'),
      run(187.8, 49.1, '0), (Sonari | 0),'),
      run(270.1, 4.0, '0'),
      run(307.9, 4.0, '0'),
      run(359.8, 4.1, '0'),
      run(402.9, 12.2, '648'),
      run(462.3, 16.4, '1262'),
      run(479.0, 4.1, '0'),
      run(76.2, 32.6, 'Dibrugarh', 90),
      run(116.2, 4.1, '0', 90),
      run(145.9, 121.7, '(Dibrugarh East | 0), (Naharkatia | 0),', 90),
      run(270.1, 4.0, '0', 90),
      run(307.9, 4.0, '0', 90),
      run(359.8, 4.1, '0', 90),
      run(402.9, 4.1, '0', 90),
      run(474.5, 4.0, '0', 90),
      run(479.0, 4.1, '0', 90),
    ];
    expect(starts(resolveColumns(runs))).toEqual([
      76.2, 116.2, 145.9, 270.1, 307.9, 359.8, 402.9, 462.3, 479.0,
    ]);
  });

  it('ignores the section-label gutter left of bodyStart', () => {
    const bands = resolveColumns([run(36.5, 24, 'Houses'), run(76.2, 30), run(120, 20)], {
      bodyStart: 74,
    });
    expect(starts(bands)).toEqual([76.2, 120]);
  });

  it('ignores whitespace-only runs', () => {
    const bands = resolveColumns([run(76, 30), run(150, 60, '   '), run(300, 20)]);
    expect(starts(bands)).toEqual([76, 300]);
  });

  it('honours a caller-supplied minimum gap', () => {
    const tight = [run(100, 10), run(110.5, 10)];
    expect(resolveColumns(tight, { minGap: 0.2 })).toHaveLength(2);
    expect(resolveColumns(tight, { minGap: 1 })).toHaveLength(1);
  });

  it('resolves no bands at all for an empty section, rather than one catch-all band', () => {
    expect(resolveColumns([])).toEqual([]);
    expect(resolveColumns([run(36, 20)], { bodyStart: 74 })).toEqual([]);
  });
});

describe('bandIndexFor', () => {
  const bands = resolveColumns([run(76, 30), run(120, 20), run(200, 40)]);

  it('places a run at a band start in that band', () => {
    expect(bandIndexFor(bands, 76)).toBe(0);
    expect(bandIndexFor(bands, 120)).toBe(1);
    expect(bandIndexFor(bands, 200)).toBe(2);
  });

  it('places a run that drifts right of its cluster in the same band', () => {
    expect(bandIndexFor(bands, 150)).toBe(1);
  });

  it('tolerates sub-point jitter at a band start', () => {
    expect(bandIndexFor(bands, 75.8)).toBe(0);
  });

  it('places everything past the last start in the last band', () => {
    expect(bandIndexFor(bands, 900)).toBe(2);
  });

  it('refuses to place a run left of the first band', () => {
    expect(bandIndexFor(bands, 36)).toBeUndefined();
  });

  it('has nowhere to put anything when there are no bands', () => {
    expect(bandIndexFor([], 100)).toBeUndefined();
  });
});

describe('selectDataRows', () => {
  it('drops the header block, which is row 0 plus every row without a leftmost-column run', () => {
    const rows = [
      // Header line 1: District / Fully-Severel / ...
      row(140, [run(76.2, 24, 'District'), run(116.2, 43, 'Fully/Severel')]),
      // Header line 2: wraps, so nothing at x=76.
      row(130, [run(116.2, 29, 'y Kuccha')]),
      row(118, [run(76.2, 30, 'Sivasagar'), run(116.2, 8, '82')]),
      row(107, [run(76.2, 29, 'Golaghat'), run(116.2, 4, '0')]),
    ];
    expect(selectDataRows(rows, 74).map((r) => r.y)).toEqual([118, 107]);
  });

  it('drops a single-line header', () => {
    const rows = [
      row(378, [run(76.2, 24, 'District'), run(116.2, 17, 'Total')]),
      row(367, [run(76.2, 33, 'Charaideo'), run(116.2, 16, '8492')]),
    ];
    expect(selectDataRows(rows, 74).map((r) => r.y)).toEqual([367]);
  });

  it('ignores rows that live entirely in the section-label gutter', () => {
    const rows = [
      row(378, [run(76.2, 24, 'District')]),
      row(370, [run(36.5, 24, 'Damaged')]),
      row(367, [run(76.2, 33, 'Charaideo')]),
    ];
    expect(selectDataRows(rows, 74).map((r) => r.y)).toEqual([367]);
  });

  it('returns what it has when a section is too short to have both a header and data', () => {
    const rows = [row(378, [run(76.2, 24, 'District')])];
    expect(selectDataRows(rows, 74)).toHaveLength(1);
    expect(selectDataRows([], 74)).toEqual([]);
  });
});

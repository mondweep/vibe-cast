/**
 * Stage 3 of ADR-0002: column bands inferred per section.
 *
 * The DRIMS tables have no delimiters. Column identity is purely geometric,
 * and the column count varies from 3 to 11 across sections, so bands are
 * resolved per section rather than once per document.
 *
 * Two facts about the source shape the algorithm:
 *
 * 1. Columns are not all left-aligned. `Small` under Animals is right-aligned;
 *    `Big` beside it is left-aligned. A histogram of run *starts* therefore
 *    finds three different x positions for one column. What is stable is that
 *    no glyph is ever painted between two columns, so the columns are the
 *    connected components of the horizontal ink and the boundaries are the
 *    gaps between them.
 *
 * 2. Those gaps are narrow — 0.3pt between Small and Poultry — while gaps
 *    *inside* a wrapped text cell can be far wider on any single line. The
 *    gaps are therefore taken over the union of every row in the section, so
 *    an intra-cell gap on one line is closed by a longer line elsewhere.
 *
 * Header rows are excluded before this runs (see `selectDataRows`): a spanning
 * header such as `Animals` bridges three columns into one, and a header set
 * left of its right-aligned data splits one column into two.
 */

import type { TextRun, VisualRow } from './text-run';

export type ColumnBand = {
  readonly index: number;
  readonly start: number;
  /** Exclusive; `Infinity` for the last band, which runs to the page edge. */
  readonly end: number;
};

/**
 * Narrowest gap treated as a column boundary. The tightest real boundary in
 * the 2026-07-27 bulletin is 0.3pt (Small | Poultry); the widest gap between
 * two runs of the same word is 0.1pt.
 */
export const DEFAULT_MIN_COLUMN_GAP = 0.2;

export type ResolveColumnsOptions = {
  /** Runs starting left of this belong to the section-label gutter, not the table. */
  readonly bodyStart?: number;
  readonly minGap?: number;
};

/**
 * Column bands, left to right.
 *
 * Given no runs, the answer is no bands — not one band covering everything.
 * A section with no body is a section we failed to read, and it must be
 * possible to say so.
 */
export const resolveColumns = (
  runs: readonly TextRun[],
  options: ResolveColumnsOptions = {},
): readonly ColumnBand[] => {
  const bodyStart = options.bodyStart ?? Number.NEGATIVE_INFINITY;
  const minGap = options.minGap ?? DEFAULT_MIN_COLUMN_GAP;

  const spans = runs
    .filter((r) => r.str.trim() !== '' && r.x >= bodyStart)
    // A zero-width run still occupies its start position.
    .map((r) => [r.x, r.x + Math.max(r.width, 0.01)] as const)
    .sort((a, b) => a[0] - b[0]);

  if (spans.length === 0) return [];

  const merged: { start: number; end: number }[] = [];
  let current = { start: spans[0]![0], end: spans[0]![1] };
  for (const [start, end] of spans.slice(1)) {
    if (start - current.end < minGap) {
      current.end = Math.max(current.end, end);
    } else {
      merged.push(current);
      current = { start, end };
    }
  }
  merged.push(current);

  return merged.map((band, index) => ({
    index,
    start: band.start,
    // A band owns everything up to the next band's start, so a run that drifts
    // right of its cluster still lands in the right column.
    end: index + 1 < merged.length ? merged[index + 1]!.start : Number.POSITIVE_INFINITY,
  }));
};

/**
 * Index of the band a run belongs to, or `undefined` if it starts left of the
 * first band. Assignment is by the run's start: a cell's leftmost glyph is
 * inside its own column even when the text overflows to the right.
 */
export const bandIndexFor = (bands: readonly ColumnBand[], x: number): number | undefined => {
  if (bands.length === 0) return undefined;
  // A small allowance for the sub-point jitter between runs nominally at the
  // same x (76.22 vs 76.2 across pages).
  if (x < bands[0]!.start - 0.5) return undefined;
  let found = 0;
  for (const band of bands) {
    if (x >= band.start - 0.5) found = band.index;
  }
  return found;
};

/**
 * Split a section's rows into the leading header block and the data rows.
 *
 * The header block is row 0 plus every following row that has no run in the
 * leftmost column — which is exactly how a wrapped multi-line header looks
 * (`Fully/Severel` / `y Kuccha`) and is never how a data row looks, because a
 * data row always names its District.
 */
export const selectDataRows = (
  rows: readonly VisualRow[],
  bodyStart: number,
): readonly VisualRow[] => {
  const bodyRows = rows.filter((row) => row.runs.some((r) => r.x >= bodyStart && r.str.trim() !== ''));
  if (bodyRows.length < 2) return bodyRows;

  const leftmost = Math.min(
    ...bodyRows.flatMap((row) =>
      row.runs.filter((r) => r.x >= bodyStart && r.str.trim() !== '').map((r) => r.x),
    ),
  );

  let i = 1;
  while (i < bodyRows.length && !bodyRows[i]!.runs.some((r) => Math.abs(r.x - leftmost) < 0.6)) i++;
  return bodyRows.slice(i);
};

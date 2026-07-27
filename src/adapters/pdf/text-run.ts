/**
 * Stage 1 and 2 of ADR-0002's pipeline: positioned text runs, and their
 * clustering into visual rows.
 *
 * `TextRun` is adapter-local by design. It never crosses the ingestion
 * boundary — downstream contexts see `FloodSituationReport`, never a glyph
 * position (PRD §3.2).
 *
 * Coordinates are PDF user space: x increases rightwards, y increases UPWARDS
 * from the bottom of the page, and `y` is the text baseline.
 */

/** One positioned run of text as the PDF renderer emitted it. */
export type TextRun = {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly page: number;
};

/** Runs that share a baseline: one line as a human sees it. */
export type VisualRow = {
  readonly page: number;
  /** Baseline of the row's first run, used only for ordering and provenance. */
  readonly y: number;
  /** Ordered left to right. */
  readonly runs: readonly TextRun[];
};

/**
 * A collaborator, so the tolerance rule can be replaced (and asserted on)
 * without constructing a plausible page of glyphs.
 */
export type GlyphHeightStatistic = (runs: readonly TextRun[]) => number;

export interface RowClusterer {
  cluster(runs: readonly TextRun[]): readonly VisualRow[];
}

/**
 * Median rendered glyph height across the document.
 *
 * ADR-0002: the row tolerance is derived from the document rather than
 * hard-coded, so a DRIMS font-size change does not silently merge two rows of
 * a casualty table into one.
 */
export const medianGlyphHeight = (runs: readonly TextRun[]): number => {
  const heights = runs
    .map((r) => r.height)
    .filter((h) => Number.isFinite(h) && h > 0)
    .sort((a, b) => a - b);
  if (heights.length === 0) return 0;
  const mid = Math.floor(heights.length / 2);
  return heights.length % 2 === 1 ? heights[mid]! : (heights[mid - 1]! + heights[mid]!) / 2;
};

/** ADR-0002: "runs whose baselines fall within a tolerance of ~40% of median glyph height". */
export const DEFAULT_ROW_TOLERANCE_RATIO = 0.4;

/**
 * Fallback when a page yields no measurable glyph heights. Chosen so the
 * clusterer degrades to "one row per distinct baseline" rather than throwing.
 */
const DEGENERATE_TOLERANCE = 0.5;

export const createRowClusterer = (
  glyphHeight: GlyphHeightStatistic = medianGlyphHeight,
  toleranceRatio: number = DEFAULT_ROW_TOLERANCE_RATIO,
): RowClusterer => ({
  cluster(runs) {
    const meaningful = runs.filter((r) => r.str.trim() !== '');
    if (meaningful.length === 0) return [];

    const median = glyphHeight(meaningful);
    const tolerance = median > 0 ? median * toleranceRatio : DEGENERATE_TOLERANCE;

    // Page ascending, then y DESCENDING: PDF y grows upwards, reading order does not.
    const ordered = [...meaningful].sort(
      (a, b) => a.page - b.page || b.y - a.y || a.x - b.x,
    );

    const rows: { page: number; y: number; runs: TextRun[] }[] = [];
    let current: { page: number; y: number; runs: TextRun[] } | undefined;

    for (const run of ordered) {
      if (current === undefined || current.page !== run.page || Math.abs(current.y - run.y) > tolerance) {
        current = { page: run.page, y: run.y, runs: [run] };
        rows.push(current);
      } else {
        current.runs.push(run);
      }
    }

    return rows.map((row) => ({
      page: row.page,
      y: row.y,
      runs: [...row.runs].sort((a, b) => a.x - b.x),
    }));
  },
});

/**
 * Join runs into cell text.
 *
 * DRIMS splits tokens mid-word for reasons of its own: `184` arrives as
 * `18` + `4`, and `Population` as `Populati` + `on` (ADR-0002 §4). Two runs
 * that all but touch belong to the same word; a real inter-word space in this
 * document measures ~1.8pt even in justified text, so the threshold sits
 * between the two populations rather than on top of either.
 */
export const WORD_GAP_THRESHOLD = 1;

export const joinRuns = (runs: readonly TextRun[], gapThreshold = WORD_GAP_THRESHOLD): string => {
  const ordered = [...runs].sort((a, b) => a.x - b.x);
  let out = '';
  let previousEnd: number | undefined;
  for (const run of ordered) {
    if (previousEnd !== undefined && run.x - previousEnd > gapThreshold) out += ' ';
    out += run.str;
    previousEnd = run.x + run.width;
  }
  return out.trim();
};

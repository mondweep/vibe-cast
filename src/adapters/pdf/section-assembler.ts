/**
 * Stage 4 of ADR-0002: logical rows, cells joined across wraps.
 *
 * Everything above this file is geometry. Everything below it is DRIMS
 * semantics. `SectionTable` is the seam: a section reduced to a rectangle of
 * strings plus the pages it came from, which is as far as coordinates need to
 * travel.
 *
 * Two joins happen here.
 *
 * *Within a row*, runs in the same column band are joined by
 * `joinRuns`, which knows that touching runs are one word (`18` + `4` = `184`).
 *
 * *Across rows*, a continuation line is appended to the logical row above it
 * with a newline. A row continues rather than begins when its District cell is
 * empty (a Remarks column wrapping to an eleventh line) or when that cell holds
 * the tail of a wrapped district name — `Kamrup` on one line, `(M)` on the
 * next. Hence the rule: a row that starts a logical row names something, and
 * a name never starts with a bracket or a lower-case letter.
 */

import type { SectionKind } from '../../domain/shared/flood-situation-report';
import {
  bandIndexFor,
  DEFAULT_MIN_COLUMN_GAP,
  resolveColumns,
  selectDataRows,
  type ColumnBand,
} from './column-resolver';
import {
  createSectionRecogniser,
  type LabelFragment,
  type SectionRecogniser,
} from './section-recogniser';
import {
  createRowClusterer,
  joinRuns,
  type RowClusterer,
  type TextRun,
  type VisualRow,
} from './text-run';

/** One table row as a human reads it, however many printed lines it occupies. */
export type LogicalRow = {
  readonly cells: readonly string[];
  readonly pages: readonly number[];
};

export type SectionTable = {
  readonly kind: SectionKind;
  readonly label: string;
  /** Provenance is not optional (PRD §5.1 invariant 2). */
  readonly sourcePages: readonly number[];
  readonly columns: readonly ColumnBand[];
  /** Header rows excluded; the Total row, if any, is the last of these. */
  readonly rows: readonly LogicalRow[];
};

export interface SectionAssembler {
  assemble(runs: readonly TextRun[]): readonly SectionTable[];
}

/**
 * Whether a printed line begins a new logical row of this section.
 *
 * Injected because the answer is section-specific. Most tables are one row per
 * district, so the District cell decides. The infrastructure tables are one row
 * per damaged *item* — a district contributes several, and every row after the
 * first leaves the District cell empty and names its Revenue Circle instead.
 */
export type RowStartPolicy = (cells: readonly string[], kind: SectionKind) => boolean;

/**
 * Whether a section opens with a column-header block.
 *
 * Almost every section does, and its header must be dropped before columns are
 * measured. The rivers block does not: it is a two-line key/value list whose
 * first line is data, and dropping it would lose the only river above danger
 * level in the bulletin.
 */
export type HeaderPolicy = (kind: SectionKind) => boolean;

export type SectionAssemblerDependencies = {
  readonly clusterer?: RowClusterer;
  readonly recogniser?: SectionRecogniser;
  readonly rowStartPolicy?: RowStartPolicy;
  readonly headerPolicy?: HeaderPolicy;
  /** Runs starting left of this are section-label gutter, not table body. */
  readonly bodyStart?: number;
};

const HEADERLESS_SECTIONS: ReadonlySet<SectionKind> = new Set<SectionKind>([
  'rivers-above-danger-level',
]);

export const defaultHeaderPolicy: HeaderPolicy = (kind) => !HEADERLESS_SECTIONS.has(kind);

const ITEMISED_SECTIONS: ReadonlySet<SectionKind> = new Set<SectionKind>([
  'infrastructure-road',
  'infrastructure-bridge',
  'infrastructure-embankment-breached',
  'infrastructure-embankment-affected',
  'infrastructure-others',
]);

/** Columns of the infrastructure tables that signal the start of a new item. */
const ITEM_CIRCLE_COLUMN = 2;
const ITEM_DEPARTMENT_COLUMN = 4;

/** Fallback gutter width, used only when the document is too sparse to measure. */
export const FALLBACK_BODY_START = 74;

/**
 * Where the table body begins, measured from the document rather than assumed.
 *
 * The Particulars gutter is the leftmost column of every page; the body is the
 * next one. Taken over the union of every run in the document, the gutter is a
 * single connected block of ink — an intra-label gap on one line is closed by a
 * longer label elsewhere — so the body starts at the second band.
 *
 * The channel between the two is NARROW, and how narrow is not ours to choose:
 * DRIMS sizes the Particulars column to its widest label, so the channel is
 * 1.6pt on 2026-07-27, 1.3pt on the 26th, 0.7pt on the 25th, 0.5pt on the 22nd
 * and 0.3pt on the 20th and 21st. The previous 1.5pt threshold found it in one
 * bulletin of six; in the other five the gutter and the body merged into one
 * band and the fallback took over. That was survivable while the fallback
 * happened to land inside the channel and catastrophic when it did not: on the
 * 25th and 26th the fallback sat RIGHT of the District column, so every
 * district name was read as a section label, 21 of 23 sections were never
 * found, and the bulletin still presented as healthy.
 *
 * So the threshold is `DEFAULT_MIN_COLUMN_GAP` — the same 0.2pt the column
 * resolver already trusts to separate two columns without splitting a word,
 * whose justification (the widest gap between two runs of one word is 0.1pt)
 * is exactly the justification needed here. Every gap the six bulletins present
 * is at least 0.3pt, and every threshold from 0.05 to 0.5 yields the identical
 * answer on all six: the plateau is wide, not a fitted constant.
 */
export const deriveBodyStart = (runs: readonly TextRun[]): number => {
  const bands = resolveColumns(runs, { minGap: DEFAULT_MIN_COLUMN_GAP });
  return bands.length >= 2 ? bands[1]!.start - 0.5 : FALLBACK_BODY_START;
};

const namesSomething = (cell: string): boolean => {
  const trimmed = cell.trim();
  if (trimmed === '') return false;
  // A district is a proper noun. `(M)` continues `Kamrup`; `| 427), (Titabor
  // | 0)` continues a wrapped breakdown; neither starts a row.
  return !/^[([)|]/.test(trimmed) && !/^[a-z]/.test(trimmed);
};

export const defaultRowStartPolicy: RowStartPolicy = (cells, kind) => {
  if (namesSomething(cells[0] ?? '')) return true;
  if (!ITEMISED_SECTIONS.has(kind)) return false;
  // One row per damaged item, and a district contributes several. Two signals
  // open the next item even though the District column is empty:
  //   - a fresh `(Sonari | 1)` in the Revenue Circle column, and
  //   - a fresh Department, which every item states exactly once on its first
  //     printed line. `PWD` opens an item; the `(Roads)` beneath it does not,
  //     because a continuation never begins with a bracket or lower case.
  return (
    (cells[ITEM_CIRCLE_COLUMN] ?? '').trimStart().startsWith('(') ||
    namesSomething(cells[ITEM_DEPARTMENT_COLUMN] ?? '')
  );
};

const cellsOf = (row: VisualRow, columns: readonly ColumnBand[], bodyStart: number): string[] => {
  const buckets: TextRun[][] = columns.map(() => []);
  for (const run of row.runs) {
    if (run.x < bodyStart || run.str.trim() === '') continue;
    const index = bandIndexFor(columns, run.x);
    if (index === undefined) continue;
    buckets[index]!.push(run);
  }
  return buckets.map((bucket) => joinRuns(bucket));
};

const mergeCells = (into: string[], from: readonly string[]): string[] =>
  into.map((existing, i) => {
    const addition = (from[i] ?? '').trim();
    if (addition === '') return existing;
    return existing === '' ? addition : `${existing}\n${addition}`;
  });

export const createSectionAssembler = (
  dependencies: SectionAssemblerDependencies = {},
): SectionAssembler => {
  const clusterer = dependencies.clusterer ?? createRowClusterer();
  const recogniser = dependencies.recogniser ?? createSectionRecogniser();
  const startsRow = dependencies.rowStartPolicy ?? defaultRowStartPolicy;
  const hasHeader = dependencies.headerPolicy ?? defaultHeaderPolicy;

  return {
    assemble(runs) {
      const rows = clusterer.cluster(runs);
      if (rows.length === 0) return [];

      const bodyStart = dependencies.bodyStart ?? deriveBodyStart(runs);

      const fragments: LabelFragment[] = [];
      rows.forEach((row, rowIndex) => {
        for (const run of row.runs) {
          if (run.x < bodyStart && run.str.trim() !== '') {
            fragments.push({ text: run.str.trim(), rowIndex });
          }
        }
      });

      const boundaries = recogniser.findBoundaries(fragments);
      if (boundaries.length === 0) return [];

      // A kind printed as two labelled blocks (the revenue-circle count and
      // the revenue-circle table) is one section to us.
      const spans = boundaries
        .map((boundary, i) => ({
          boundary,
          from: boundary.rowIndex,
          to: i + 1 < boundaries.length ? boundaries[i + 1]!.rowIndex : rows.length,
        }))
        .reduce<{ kind: SectionKind; label: string; from: number; to: number }[]>((acc, span) => {
          const previous = acc[acc.length - 1];
          if (previous !== undefined && previous.kind === span.boundary.kind) {
            previous.to = span.to;
            return acc;
          }
          acc.push({
            kind: span.boundary.kind,
            label: span.boundary.label,
            from: span.from,
            to: span.to,
          });
          return acc;
        }, []);

      return spans.map(({ kind, label, from, to }) => {
        const sectionRows = rows.slice(from, to);
        const dataRows = hasHeader(kind)
          ? selectDataRows(sectionRows, bodyStart)
          : sectionRows.filter((r) => r.runs.some((x) => x.x >= bodyStart && x.str.trim() !== ''));
        const columns = resolveColumns(
          dataRows.flatMap((row) => row.runs),
          { bodyStart },
        );

        const logical: { cells: string[]; pages: Set<number> }[] = [];
        for (const row of dataRows) {
          const cells = cellsOf(row, columns, bodyStart);
          if (cells.every((c) => c === '')) continue;
          const current = logical[logical.length - 1];
          if (current === undefined || startsRow(cells, kind)) {
            logical.push({ cells, pages: new Set([row.page]) });
          } else {
            current.cells = mergeCells(current.cells, cells);
            current.pages.add(row.page);
          }
        }

        return {
          kind,
          label,
          sourcePages: [...new Set(sectionRows.map((r) => r.page))].sort((a, b) => a - b),
          columns,
          rows: logical.map((r) => ({
            // A wrapped district name reassembles as `Kamrup\n(M)`; the
            // District cell is a name, so its newline is a space.
            cells: r.cells.map((c, i) => (i === 0 ? c.replace(/\s*\n\s*/g, ' ').trim() : c)),
            pages: [...r.pages].sort((a, b) => a - b),
          })),
        };
      });
    },
  };
};

/** The row ASDMA labels `Total`, if the section has one. */
export const totalRowOf = (table: SectionTable): LogicalRow | undefined =>
  table.rows.find((row) => row.cells[0]?.trim().toLowerCase() === 'total');

/** Every row except the stated Total — the rows we sum ourselves. */
export const bodyRowsOf = (table: SectionTable): readonly LogicalRow[] =>
  table.rows.filter((row) => row.cells[0]?.trim().toLowerCase() !== 'total');

export const cellAt = (row: LogicalRow | undefined, column: number): string =>
  row?.cells[column]?.trim() ?? '';

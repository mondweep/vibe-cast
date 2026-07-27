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

export type SectionAssemblerDependencies = {
  readonly clusterer?: RowClusterer;
  readonly recogniser?: SectionRecogniser;
  readonly rowStartPolicy?: RowStartPolicy;
  /** Runs starting left of this are section-label gutter, not table body. */
  readonly bodyStart?: number;
};

const ITEMISED_SECTIONS: ReadonlySet<SectionKind> = new Set<SectionKind>([
  'infrastructure-road',
  'infrastructure-bridge',
  'infrastructure-embankment-breached',
  'infrastructure-embankment-affected',
  'infrastructure-others',
]);

/** Column holding the Revenue Circle in the infrastructure tables. */
const ITEM_CIRCLE_COLUMN = 2;

/** Fallback gutter width, used only when the document is too sparse to measure. */
export const FALLBACK_BODY_START = 74;

/**
 * Where the table body begins, measured from the document rather than assumed.
 *
 * The Particulars gutter is the leftmost column of every page; the body is the
 * next one. A 1.5pt minimum gap is wide enough to ignore the sub-point splits
 * inside a wrapped label and narrow enough to find the 2.4pt channel between
 * the gutter and the first data column.
 */
export const deriveBodyStart = (runs: readonly TextRun[]): number => {
  const bands = resolveColumns(runs, { minGap: 1.5 });
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
  // One row per damaged item: `(Sonari | 1)` in the Revenue Circle column
  // opens the next item even though the District column is empty.
  return ITEMISED_SECTIONS.has(kind) && (cells[ITEM_CIRCLE_COLUMN] ?? '').trimStart().startsWith('(');
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
        const dataRows = selectDataRows(sectionRows, bodyStart);
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

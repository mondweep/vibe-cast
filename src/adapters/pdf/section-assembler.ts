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
import { knownDistrictName } from './assam-districts';
import {
  repairWrappedDistrictNames,
  resolveWrappedNameList,
  type DistrictVocabulary,
} from './wrapped-district-name';

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

/**
 * Where the table body begins — and, inseparably, how we came to believe it.
 *
 * A bare `number` was the bug. `deriveBodyStart` used to return one whether it
 * had measured the document or substituted a constant, so the caller could not
 * tell a reading from a guess, and a guess that happened to land right of the
 * District column produced a bulletin of Remarks prose that every downstream
 * check called healthy. The number and its provenance are therefore one value,
 * and the only way to reach the number is to have looked at the `kind`.
 */
export type BodyStartDerivation =
  /** Measured: the pages that show the gutter agree on where the body begins. */
  | {
      readonly kind: 'measured';
      readonly bodyStart: number;
      /** Pages that voted for this value. */
      readonly agreeingPages: number;
      /** Pages that showed a gutter and therefore had a vote to cast. */
      readonly gutterPages: number;
    }
  /** A caller supplied the geometry — a test or a diagnostic, not a reading. */
  | { readonly kind: 'supplied'; readonly bodyStart: number }
  /**
   * Not measurable. `bodyStart` is `FALLBACK_BODY_START`, kept only so the
   * document can still be assembled and *published as a husk* (ADR-0005:
   * nothing is deleted or zeroed), never so it can pass for a reading.
   */
  | { readonly kind: 'unmeasurable'; readonly bodyStart: number; readonly detail: string };

/** A document reduced to its sections, and the geometry they were cut with. */
export type AssembledDocument = {
  readonly bodyStart: BodyStartDerivation;
  readonly tables: readonly SectionTable[];
};

export interface SectionAssembler {
  assemble(runs: readonly TextRun[]): AssembledDocument;
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
  /**
   * The evidence a wrapped District name is joined on (see
   * `wrapped-district-name.ts`). Injected so the rule can be asserted without
   * the roster of Assam, and so a test can prove an unknown name is untouched.
   */
  readonly districtVocabulary?: DistrictVocabulary;
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

/**
 * Sections whose second cell is a comma-separated list of District names.
 *
 * The wrapped-name repair works on cell 0, the District column, and these
 * sections do not have one — they carry every District in a single list cell
 * that wraps like any other. Left alone, its newline collapses to a space and
 * manufactures a District: see `resolveWrappedNameList`.
 */
const NAME_LIST_SECTIONS: ReadonlySet<SectionKind> = new Set<SectionKind>(['districts-affected']);

/**
 * Where an infrastructure table's item columns are, counted from the RIGHT.
 *
 * The five infrastructure tables agree about their right-hand columns and
 * disagree about their left-hand ones. All of them end
 *
 *     … | Item name | Department | Village | Location | Latitude | Longitude | Remarks
 *
 * but `Infrastructure Damaged - Others` carries an extra `Damages` column on
 * the left that the other four do not, and its right-aligned count column
 * resolves as one band or two depending on whether DRIMS printed `Nil` in it.
 * Counting from the left therefore reads a different column on different days
 * — it is how the Others table came to publish `3.37` as the name of a damaged
 * asset and `PRAMUD` as the department that reported it. Counting from the
 * right is stable across every layout in `fixtures/`.
 */
const ITEM_TRAILING_COLUMNS = 7;

/** Fewest bands a table must have before the offsets above mean anything. */
const MIN_ITEM_COLUMNS = ITEM_TRAILING_COLUMNS + 1;

/**
 * Index of an infrastructure item's Nth trailing column — 0 is the item name,
 * 6 the remarks — or `undefined` if this table is too narrow to have one.
 */
export const itemColumn = (columnCount: number, offset: number): number | undefined =>
  columnCount < MIN_ITEM_COLUMNS ? undefined : columnCount - ITEM_TRAILING_COLUMNS + offset;

export const ITEM_NAME = 0;
export const ITEM_DEPARTMENT = 1;
export const ITEM_VILLAGE = 2;
export const ITEM_LOCATION = 3;
export const ITEM_LATITUDE = 4;
export const ITEM_LONGITUDE = 5;
export const ITEM_REMARKS = 6;

/** The Revenue Circle column of the four tables that print `(Sonari | 1)`. */
const ITEM_CIRCLE_COLUMN = 2;

/**
 * The gutter width assumed when the document cannot be measured at all.
 *
 * Reachable only through `kind: 'unmeasurable'`, which forces the whole
 * document to `failed`. It exists so an unreadable bulletin can still be
 * assembled and shown to an operator — the husk is published, not deleted
 * (ADR-0005) — and for no other purpose. It is not a default.
 */
export const FALLBACK_BODY_START = 74;

/**
 * Clearance below the body's left edge, so a run sitting exactly on it counts
 * as body. Absorbs the sub-point jitter between pages (76.22 vs 76.2), the same
 * allowance `bandIndexFor` already makes.
 */
const BODY_START_CLEARANCE = 0.5;

/**
 * How close a page's leftmost ink must be to the document's leftmost ink for
 * that page to count as showing the Particulars gutter.
 */
const GUTTER_ALIGNMENT_TOLERANCE = 0.5;

/** Resolution at which two pages are taken to have voted for the same edge. */
const VOTE_PRECISION = 10;

const unmeasurable = (detail: string): BodyStartDerivation => ({
  kind: 'unmeasurable',
  bodyStart: FALLBACK_BODY_START,
  detail,
});

/**
 * Where the table body begins, measured from the document rather than assumed.
 *
 * The Particulars gutter is the leftmost column of the table; the body is the
 * next one, and the boundary is the channel of blank paper between them. The
 * channel is NARROW, and how narrow is not ours to choose: DRIMS sizes the
 * Particulars column to its widest label, so the channel is 1.6pt on
 * 2026-07-27, 1.3pt on the 26th, 1.25pt on the 28th and 0.3pt on the 20th. The
 * threshold is therefore `DEFAULT_MIN_COLUMN_GAP` — the same 0.2pt the column
 * resolver already trusts to separate two columns without splitting a word,
 * whose justification (the widest gap between two runs of one word is 0.1pt) is
 * exactly the justification needed here.
 *
 * WHY PER PAGE, AND BY VOTE. Taking the ink over the whole document at once
 * asks the channel to be clear on every page simultaneously, and DRIMS does not
 * guarantee that: a Particulars label wider than its own column overflows to
 * the right and bridges the channel. On 2026-07-28 the label `Rivers flowing
 * above Danger Level (as per CWC bulletin issued at 8 AM)` wraps to a line
 * `CWC bulletin issued at`, 74.5pt of ink in a 37.5pt column, which runs from
 * 37.80 clean across the channel at 75.26 and merges the gutter into the body.
 * ONE run out of 7,799 — and the document-wide answer moved from 75.26 to
 * 114.26, right of the District column, which is the whole failure.
 *
 * A page, by contrast, is a complete rendering of both columns, and the pages
 * are independent witnesses. So each page that shows the gutter votes, and the
 * plurality wins: on the 28th nine pages say 75.26 and one says 114.26. A page
 * whose leftmost ink is not the document's leftmost ink is a continuation page
 * carrying no Particulars label at all — its first band is already table body,
 * so it abstains rather than voting for a boundary it cannot see.
 *
 * WHEN THE PAGES DO NOT AGREE, WE SAY SO. No plurality (no gutter page at all,
 * or a tie) is `unmeasurable`, not a constant quietly substituted. Every one of
 * the eleven bulletins has a clear plurality — 9 to 12 agreeing pages against
 * at most one dissenter — so the loud path is genuinely reserved for documents
 * we cannot read.
 */
export const deriveBodyStart = (runs: readonly TextRun[]): BodyStartDerivation => {
  const meaningful = runs.filter((run) => run.str.trim() !== '');
  if (meaningful.length === 0) return unmeasurable('the document contains no text runs');

  const gutterLeft = Math.min(...meaningful.map((run) => run.x));

  const byPage = new Map<number, TextRun[]>();
  for (const run of meaningful) {
    const existing = byPage.get(run.page);
    if (existing === undefined) byPage.set(run.page, [run]);
    else existing.push(run);
  }

  // Bucketed so sub-point jitter between pages does not split one edge into
  // two candidates; the bucket reports the leftmost edge that fell into it.
  const votes = new Map<number, { edge: number; pages: number }>();
  for (const pageRuns of byPage.values()) {
    const bands = resolveColumns(pageRuns, { minGap: DEFAULT_MIN_COLUMN_GAP });
    if (bands.length < 2) continue;
    if (Math.abs(bands[0]!.start - gutterLeft) > GUTTER_ALIGNMENT_TOLERANCE) continue;
    const edge = bands[1]!.start;
    const bucket = Math.round(edge * VOTE_PRECISION);
    const existing = votes.get(bucket);
    if (existing === undefined) votes.set(bucket, { edge, pages: 1 });
    else {
      existing.edge = Math.min(existing.edge, edge);
      existing.pages += 1;
    }
  }

  if (votes.size === 0) {
    return unmeasurable(
      `no page shows a Particulars gutter left of a table body (leftmost ink at ` +
        `${gutterLeft.toFixed(2)}pt across ${byPage.size} page(s))`,
    );
  }

  const ranked = [...votes.values()].sort((a, b) => b.pages - a.pages || a.edge - b.edge);
  const winner = ranked[0]!;
  const runnerUp = ranked[1];
  if (runnerUp !== undefined && runnerUp.pages === winner.pages) {
    return unmeasurable(
      `the pages disagree about where the table body begins and none has a ` +
        `plurality: ${ranked
          .filter((candidate) => candidate.pages === winner.pages)
          .map((candidate) => `${candidate.edge.toFixed(2)}pt on ${candidate.pages} page(s)`)
          .join(', ')}`,
    );
  }

  return {
    kind: 'measured',
    bodyStart: winner.edge - BODY_START_CLEARANCE,
    agreeingPages: winner.pages,
    gutterPages: ranked.reduce((total, candidate) => total + candidate.pages, 0),
  };
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
  const department = itemColumn(cells.length, ITEM_DEPARTMENT);
  return (
    (cells[ITEM_CIRCLE_COLUMN] ?? '').trimStart().startsWith('(') ||
    (department !== undefined && namesSomething(cells[department] ?? ''))
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
  const knows = dependencies.districtVocabulary ?? knownDistrictName;

  return {
    assemble(runs) {
      // Derived before the early returns: "we could not locate the gutter" is
      // itself the finding, and a document that yields no tables must still be
      // able to say whether that was because it was empty or because we were
      // reading it in the wrong place.
      const derivation: BodyStartDerivation =
        dependencies.bodyStart === undefined
          ? deriveBodyStart(runs)
          : { kind: 'supplied', bodyStart: dependencies.bodyStart };
      const bodyStart = derivation.bodyStart;

      const rows = clusterer.cluster(runs);
      if (rows.length === 0) return { bodyStart: derivation, tables: [] };

      const fragments: LabelFragment[] = [];
      rows.forEach((row, rowIndex) => {
        for (const run of row.runs) {
          if (run.x < bodyStart && run.str.trim() !== '') {
            fragments.push({ text: run.str.trim(), rowIndex });
          }
        }
      });

      const blocks = recogniser.findBoundaries(fragments);
      if (blocks.length === 0) return { bodyStart: derivation, tables: [] };

      // Each block owns the rows between its label and the next label.
      const ranges = blocks.map((block, i) => ({
        kind: block.kind,
        label: block.label,
        from: block.rowIndex,
        to: i + 1 < blocks.length ? blocks[i + 1]!.rowIndex : rows.length,
      }));

      // A block we cannot name is dropped ROWS AND ALL, before any table is
      // cut. Its rows are a table of ours no more than they are a section of
      // ours, and letting them into the section above corrupts that section's
      // column bands (see `section-recogniser.ts`, and 2026-07-31).
      const named = ranges.filter(
        (range): range is typeof range & { kind: SectionKind } => range.kind !== undefined,
      );

      // A kind printed as two labelled blocks (the revenue-circle count and
      // the revenue-circle table) is one section to us. Note the span keeps its
      // pieces rather than spanning from the first to the last: an unknown
      // block between two blocks of one kind must not be swallowed by joining
      // them up.
      const spans = named.reduce<
        { kind: SectionKind; label: string; ranges: { from: number; to: number }[] }[]
      >((acc, range) => {
        const previous = acc[acc.length - 1];
        if (previous !== undefined && previous.kind === range.kind) {
          previous.ranges.push({ from: range.from, to: range.to });
          return acc;
        }
        acc.push({
          kind: range.kind,
          label: range.label,
          ranges: [{ from: range.from, to: range.to }],
        });
        return acc;
      }, []);

      const tables = spans.map(({ kind, label, ranges: pieces }) => {
        const sectionRows = pieces.flatMap(({ from, to }) => rows.slice(from, to));
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

        // A wrapped District name is put back together here, on evidence, and
        // only here: `wrapped-district-name.ts` explains why geometry cannot do
        // it and why a name it cannot vouch for is left exactly as printed.
        const repaired = repairWrappedDistrictNames(
          logical.map((r) => ({ cells: r.cells, pages: [...r.pages].sort((a, b) => a - b) })),
          { itemised: ITEMISED_SECTIONS.has(kind), knows },
        );

        return {
          kind,
          label,
          sourcePages: [...new Set(sectionRows.map((r) => r.page))].sort((a, b) => a - b),
          columns,
          rows: repaired.map((r) => ({
            // Whatever the repair declined to vouch for keeps the shape DRIMS
            // printed: the District cell is a name, so its newline is a space.
            //
            // A name-LIST cell is the exception. Collapsing its newline the same
            // way is what produced `Karbi Udalguri` on 5 August, so it is
            // resolved on evidence and re-joined with commas — the shape the
            // interpreter expects — rather than flattened.
            cells: r.cells.map((c, i) => {
              if (i === 0) return c.replace(/\s*\n\s*/g, ' ').trim();
              if (i === 1 && NAME_LIST_SECTIONS.has(kind) && c.includes('\n')) {
                return resolveWrappedNameList(c, knows).join(', ');
              }
              return c;
            }),
            pages: r.pages,
          })),
        };
      });

      return { bodyStart: derivation, tables };
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

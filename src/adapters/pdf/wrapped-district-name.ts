/**
 * Stage 4½ of ADR-0002: putting back together a District name DRIMS broke in
 * half.
 *
 * THE DEFECT. The Particulars gutter is sized to the widest section label, so
 * the table body — and with it the District column — is whatever width is
 * left. On a day with long labels the column is ~27pt, and every District name
 * longer than about seven characters wraps. DRIMS wraps it wherever it runs
 * out of room, which is usually inside a word:
 *
 *     Charaid          Bongaigao      Karbi            Kamrup
 *     eo               n              Anglong          (M)
 *
 * The assembler's rule for "does this printed line start a new row" is that a
 * row names something, and a name never begins with a bracket or a lower-case
 * letter. That correctly folds `eo` and `(M)` back into the line above — and
 * then joins them with a space, because a wrapped *cell* is joined with one.
 * `Bongaigao n` is not a District. It also has nothing to say about `Anglong`,
 * which is capitalised and therefore opens a row of its own; on 20, 21, 23 and
 * 24 July `Karbi Anglong` is published as two Districts.
 *
 * On 2026-07-31 the column is narrow enough that nine names wrap at once and
 * the bulletin yields 47 Districts in a state that has 35, which the document
 * integrity check correctly refuses.
 *
 * WHY NOT GEOMETRY. The obvious rule — "District cell filled, every other cell
 * empty, therefore a name tail" — was tried and abandoned, because it is not
 * true. On 2026-07-27 `Dhemaji`, `Nagaon` and `Kamrup (M)` each occupy a row
 * whose every other cell is empty: they are quiet Districts reporting nothing,
 * and that is the identical shape. A rule that merged them would fold three
 * real Districts into one, and folding Kamrup into Kamrup (M) shades rural
 * Kamrup with Guwahati's flood. A missing repair is a gap; a wrong merge is a
 * lie, so the rule here refuses unless the join is *evidenced*.
 *
 * THE EVIDENCE. Exactly one thing counts: the join produces a name that
 * `assam-districts.ts` recognises, and the fragment does not already name a
 * District on its own. Two candidate joins are tried — closed (`Charaid` +
 * `eo`) and spaced (`Karbi` + `Anglong`) — because DRIMS breaks both inside
 * words and on spaces, and nothing in the glyph stream records which happened.
 *
 * WHAT IT WILL NOT DO. It will not repair a name the vocabulary has never
 * heard of, and it will not touch a District cell that did not wrap. Both are
 * deliberate: Assam has created Districts since every dataset this project
 * ships, so "unknown" must stay a perfectly good outcome. The failure mode of
 * an incomplete vocabulary is a name left as DRIMS printed it — visible, and
 * caught by `checkDocumentIntegrity` if it matters — never a name invented.
 *
 * MERGE OR RELABEL. Two shapes of table need two different repairs, and
 * conflating them loses data:
 *
 *   - A district table is one row per District, so the tail row carries at most
 *     a continuation of the row above (a wrapped agency list, a wrapped
 *     breakdown). It is *merged* upward, cell by cell.
 *   - An infrastructure table is one row per damaged item, so the tail row
 *     carries a real item of its own. Merging it would join two items — two
 *     `Nil`s become one item called `Nil Nil`, which is a damaged asset that
 *     does not exist. So the row survives and is merely *relabelled* with the
 *     repaired District name, which is exactly what the interpreter needs.
 */

import type { LogicalRow } from './section-assembler';

/** Whether this text names a District we have heard of. Injected, never assumed. */
export type DistrictVocabulary = (name: string) => boolean;

export type RepairOptions = {
  /**
   * True for the infrastructure tables, which are one row per damaged item.
   * See "merge or relabel" above: it decides whether a tail row is folded into
   * its predecessor or kept and renamed.
   */
  readonly itemised: boolean;
  readonly knows: DistrictVocabulary;
};

const collapse = (raw: string): string => raw.replace(/\s+/g, ' ').trim();

/** Header and footer labels that are never a District and never a name tail. */
const isTotalRow = (cell: string): boolean => collapse(cell).toLowerCase() === 'total';

/**
 * The repaired name for a head and a tail printed on consecutive lines, or
 * `undefined` when nothing supports joining them at all.
 *
 * The closed join is tried first because DRIMS breaks inside words far more
 * often than on spaces — except when the tail opens a bracket, where the two
 * candidates fold to the same vocabulary key (`Kamrup(M)` and `Kamrup (M)`) and
 * only ASDMA's own spelling can break the tie.
 */
export const joinWrappedDistrictName = (
  head: string,
  tail: string,
  knows: DistrictVocabulary,
): string | undefined => {
  const h = collapse(head);
  const t = collapse(tail);
  if (h === '' || t === '') return undefined;

  const closed = `${h}${t}`;
  const spaced = `${h} ${t}`;
  const candidates = /^[^\p{L}\p{N}]/u.test(t) ? [spaced, closed] : [closed, spaced];

  // Wrapped rather than passed by reference: `find` also hands its callback an
  // index and the array, and the vocabulary takes exactly one name.
  return candidates.find((candidate) => knows(candidate));
};

/**
 * Whether `tail` is the second half of `head`'s name rather than a District in
 * its own right.
 *
 * Note what is NOT required: that `head` be unknown. `Kamrup` is a perfectly
 * good District and `(M)` is still its tail. What is required is that `tail`
 * is not one, because a fragment that names a District names a District.
 */
const continuesName = (head: string, tail: string, knows: DistrictVocabulary): boolean => {
  if (head === '' || tail === '') return false;
  if (isTotalRow(head) || isTotalRow(tail)) return false;
  if (knows(tail)) return false;
  return joinWrappedDistrictName(head, tail, knows) !== undefined;
};

/**
 * Resolve a District cell the assembler already folded into one cell, whose
 * printed line breaks survive as newlines.
 *
 * Folded left to right, one break at a time, so a name broken across three
 * lines closes in two steps. A break nothing supports closing keeps the space
 * the assembler would have given it — the printed shape, unrepaired.
 */
const resolveCell = (raw: string, knows: DistrictVocabulary): string => {
  const segments = raw.split('\n').map(collapse).filter((s) => s !== '');
  if (segments.length === 0) return '';
  return segments.reduce((head, tail) => joinWrappedDistrictName(head, tail, knows) ?? `${head} ${tail}`);
};

const mergeInto = (into: LogicalRow, from: LogicalRow, name: string): LogicalRow => ({
  cells: into.cells.map((existing, i) => {
    if (i === 0) return name;
    const addition = collapse(from.cells[i] ?? '');
    if (addition === '') return existing;
    return existing === '' ? addition : `${existing}\n${from.cells[i]!.trim()}`;
  }),
  pages: [...new Set([...into.pages, ...from.pages])].sort((a, b) => a - b),
});

/**
 * Resolve a comma-separated LIST of District names whose printed lines wrapped.
 *
 * THE DEFECT THIS EXISTS FOR. The Districts Affected header is one cell holding
 * every affected District, and it wraps like any other cell. On 2026-08-05 it
 * arrived as
 *
 *     'Golaghat, ..., Darrang, Karbi\nUdalguri'
 *
 * — the printed `Anglong,` lost between the two lines. Splitting that on commas
 * alone yields one element, `Karbi\nUdalguri`, and collapsing its newline to a
 * space manufactures `Karbi Udalguri`: a District that has never existed, with
 * no data on it, which then shows as an unplaceable name on the choropleth and
 * makes every cumulative figure claim "the true figure is higher" because one
 * row reported nothing.
 *
 * IT ALSO TRUNCATES. On 2026-08-07 the same cell arrived as
 *
 *     'Sivasagar, ..., Jorhat, Ch'
 *
 * — no newline this time, the tail simply lost, leaving `Ch` as a complete
 * comma-separated element. Two shapes of the same corruption, so one rule has
 * to cover both.
 *
 * THE RULE. Close a newline inside an element only where the join is evidenced,
 * exactly as `joinWrappedDistrictName` requires. Then keep only the names the
 * vocabulary recognises, whether they were wrapped or not.
 *
 * WHY DROPPING IS SAFE HERE AND NOWHERE ELSE. This list is redundant. Every
 * District on it that reported anything also appears in the data tables below
 * and is created from them, with its circles and its figures. So an
 * unrecognised element is one of two things, and dropping is right for both:
 * a fragment of a corrupted name, or a District newer than our boundary set —
 * and if the latter reported anything at all, the data tables have already
 * created it. What a kept fragment does instead is invent a District that
 * carries no circles and no figures, which then shows as an unplaceable name
 * on the choropleth and makes every cumulative figure claim "the true figure is
 * higher" because one row reported nothing.
 *
 * That redundancy is exactly what `resolveCell` cannot rely on — its cell is
 * the only place its name appears, so it must preserve the printed shape — and
 * it is why these are two rules rather than one.
 */
export const resolveWrappedNameList = (
  raw: string,
  knows: DistrictVocabulary,
): readonly string[] =>
  raw
    .split(',')
    .flatMap((element) => {
      const segments = element.split('\n').map(collapse).filter((s) => s !== '');
      if (segments.length <= 1) return segments;

      // Folded left to right; once a break cannot be closed the whole element
      // is unevidenced. A `reduce` would silently restart from the next
      // segment, which is how a three-line wrap would produce half a name.
      let joined: string | undefined = segments[0];
      for (const tail of segments.slice(1)) {
        joined = joined === undefined ? undefined : joinWrappedDistrictName(joined, tail, knows);
      }
      // Evidenced: one name. Unevidenced: the halves, judged individually below.
      return joined === undefined ? segments : [joined];
    })
    .filter((name) => name !== '' && name.toLowerCase() !== 'nil')
    // The single gate, applied to wrapped and unwrapped elements alike, because
    // the cell corrupts in both shapes. See "why dropping is safe here".
    .filter((name) => knows(name));

/**
 * Put every District name in a section's rows back together, and say nothing
 * about the ones that did not need it.
 */
export const repairWrappedDistrictNames = (
  rows: readonly LogicalRow[],
  { itemised, knows }: RepairOptions,
): readonly LogicalRow[] => {
  const out: LogicalRow[] = [];

  for (const row of rows) {
    const name = resolveCell(row.cells[0] ?? '', knows);
    const current: LogicalRow =
      name === (row.cells[0] ?? '') ? row : { ...row, cells: [name, ...row.cells.slice(1)] };

    const previous = out[out.length - 1];
    const head = previous === undefined ? '' : collapse(previous.cells[0] ?? '');
    if (previous === undefined || !continuesName(head, name, knows)) {
      out.push(current);
      continue;
    }

    const repaired = joinWrappedDistrictName(head, name, knows)!;
    if (itemised) {
      // Both rows are real items of one District. Relabel, never merge.
      out[out.length - 1] = { ...previous, cells: [repaired, ...previous.cells.slice(1)] };
      out.push({ ...current, cells: [repaired, ...current.cells.slice(1)] });
    } else {
      out[out.length - 1] = mergeInto(previous, current, repaired);
    }
  }

  return out;
};

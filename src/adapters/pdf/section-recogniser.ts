/**
 * Section recognition (ADR-0002: "label-driven, not position-driven").
 *
 * Every DRIMS section is announced by a label in the left-hand Particulars
 * gutter. The gutter is ~38pt wide, so the label is word-wrapped to death:
 * `Infrastructure Damaged - Road` arrives as four runs, and
 * `Non Camp Inmates in Relief Distribution Centers` is split mid-word into
 * `Distributio` + `n Centers`.
 *
 * Two consequences:
 *
 * 1. Matching ignores whitespace entirely. Nothing else survives a label that
 *    is broken inside a word.
 * 2. Section boundaries are found by *longest match* over the fragment stream,
 *    not by vertical gaps. On page 1 the gap between the end of one label and
 *    the start of the next is 11.04pt — indistinguishable from the 10.56pt
 *    gap between two lines of the same label. Only the catalogue can tell
 *    `Houses Damaged` from `Houses Damaged Others`.
 *
 * An unrecognised label is `undefined`, never a throw: DRIMS prints
 * `Wildlife affected under protected areas description`, which is not one of
 * the 22 kinds, and one unknown block must not fail the document (FR-1.5).
 *
 * It must, however, be *reported*. A block we cannot name is still a block, and
 * `findBoundaries` therefore returns it — with `kind: undefined` — rather than
 * passing over it in silence. Silence was expensive. A section's rows run until
 * the next label, so an unnamed block used to be appended to the section above
 * it, and its table's geometry was resolved together with that section's. On
 * 2026-07-31 the Wildlife block prints its District column 7pt wider than the
 * Infrastructure Damaged - Others table above it; unioned, `Charaideo` reached
 * across the channel into the Revenue Circle column, the two columns resolved
 * as one band, and every Circle in the bulletin was published as a District
 * (`Cachar Sonai`, `GolaghaKhumtai`, `Kamrup Dispur`). An unknown block now
 * ends the section before it and contributes nothing of its own.
 */

import type { SectionKind } from '../../domain/shared/flood-situation-report';

/** The canonical spelling of each kind's label, as ASDMA prints it. */
export const SECTION_LABELS: Readonly<Record<SectionKind, string>> = {
  'rivers-above-danger-level': 'Rivers flowing above Danger Level (as per CWC bulletin issued at 8 AM)',
  'districts-affected': 'District Affected',
  'revenue-circles-affected': 'Name Of Revenue Circle Affected',
  'villages-affected': 'Villages Affected',
  'population-and-crop-area-submerged': 'Population And Crop Area Submerged',
  'relief-camps-opened': 'Relief Camps / Centres Opened',
  'inmates-in-relief-camps': 'Inmates In Relief Camps',
  'non-camp-inmates': 'Non Camp Inmates in Relief Distribution Centers',
  'lives-lost-confirmed': 'Human Lives Lost - Confirmed',
  'lives-lost-missing': 'Human Lives Lost - Missing',
  'animals-affected': 'Animals Affected',
  'animals-washed-away': 'Animals Washed Away',
  'houses-damaged': 'Houses Damaged',
  'houses-damaged-others': 'Houses Damaged Others',
  'rescue-operation': 'Rescue Operation',
  'relief-distributed': 'Relief Distributed',
  'relief-distributed-others': 'Relief Distributed - Others',
  'infrastructure-road': 'Infrastructure Damaged - Road',
  'infrastructure-bridge': 'Infrastructure Damaged - Bridge',
  'infrastructure-embankment-breached': 'Infrastructure Damaged - Embankment Breached',
  'infrastructure-embankment-affected': 'Infrastructure Damaged - Embankment Affected',
  'infrastructure-others': 'Infrastructure Damaged - Others',
  remarks: 'Remarks',
};

/**
 * Labels ASDMA also uses for a kind we already know.
 *
 * `No. Of Revenue Circles Affected` (the statewide count) and
 * `Name Of Revenue Circle Affected` (the per-district table) are printed as
 * two labelled blocks but are one section in our language.
 */
export const SECTION_LABEL_ALIASES: Readonly<Record<string, SectionKind>> = {
  'No. Of Revenue Circles Affected': 'revenue-circles-affected',
  'No. of Revenue Circles Affected': 'revenue-circles-affected',
  'Rivers flowing above Danger Level': 'rivers-above-danger-level',
  'Districts Affected': 'districts-affected',
  'Non Camp Inmates in Relief Distribution Centres': 'non-camp-inmates',
  'Houses Damaged - Others': 'houses-damaged-others',
};

/** Longest label in the catalogue, in fragments — bounds the match window. */
const MAX_FRAGMENTS_PER_LABEL = 14;

/**
 * Whitespace-collapsed, case-folded, and then whitespace-*removed*.
 *
 * Removing rather than collapsing is what lets `Infrastruct` + `ure` match
 * `Infrastructure`. It costs nothing: no two of the 22 labels collide once
 * their spaces are gone.
 */
export const normaliseLabel = (raw: string): string =>
  raw
    .replace(/[‐-―]/g, '-') // DRIMS mixes en-dashes into "Lives Lost - Missing"
    .replace(/\s+/g, '')
    .toLowerCase();

const BY_NORMALISED: ReadonlyMap<string, SectionKind> = new Map([
  ...Object.entries(SECTION_LABELS).map(
    ([kind, label]) => [normaliseLabel(label), kind as SectionKind] as const,
  ),
  ...Object.entries(SECTION_LABEL_ALIASES).map(
    ([label, kind]) => [normaliseLabel(label), kind] as const,
  ),
]);

/** The kind a reassembled label denotes, or `undefined` if we do not know it. */
export const matchSectionKind = (label: string): SectionKind | undefined =>
  BY_NORMALISED.get(normaliseLabel(label));

/**
 * Reassemble a wrapped label into a readable one.
 *
 * When the fragments name a known section, the catalogue's spelling is
 * returned — it is the only source that knows `Infrastruct` + `ure` is one
 * word and `Damaged` + `Road` is two. Otherwise the fragments are simply
 * joined, so an unknown block still reads sensibly in a diagnostic.
 */
export const reassembleLabel = (fragments: readonly string[]): string => {
  const joined = fragments.join(' ').replace(/\s+/g, ' ').trim();
  const kind = matchSectionKind(joined);
  return kind === undefined ? joined : SECTION_LABELS[kind];
};

/** One label fragment, tagged with the row it came from. */
export type LabelFragment = {
  readonly text: string;
  /** Index into the section-agnostic row list; where this section begins. */
  readonly rowIndex: number;
};

export type SectionBoundary = {
  readonly kind: SectionKind;
  readonly label: string;
  readonly rowIndex: number;
};

/**
 * A labelled block whose label is not in the catalogue.
 *
 * It yields no table. It exists so the block's rows stop belonging to the
 * section printed above it — theirs is a different table, with a different
 * column layout, and measuring the two together is how 31 July lost its
 * District column.
 */
export type UnknownBlock = {
  readonly kind: undefined;
  readonly label: string;
  readonly rowIndex: number;
};

/** Anything DRIMS announced with a gutter label, named or not. */
export type LabelledBlock = SectionBoundary | UnknownBlock;

export interface SectionRecogniser {
  /** The kind a run of fragments denotes, if any. */
  recognise(fragments: readonly string[]): SectionBoundary | undefined;
  /**
   * Every labelled block in the document's gutter-fragment stream, in printed
   * order — the sections we know, and the blocks we do not.
   */
  findBoundaries(fragments: readonly LabelFragment[]): readonly LabelledBlock[];
}

export const createSectionRecogniser = (): SectionRecogniser => {
  const recognise = (fragments: readonly string[], rowIndex = 0): SectionBoundary | undefined => {
    const kind = matchSectionKind(fragments.join(' '));
    return kind === undefined ? undefined : { kind, label: SECTION_LABELS[kind], rowIndex };
  };

  return {
    recognise: (fragments) => recognise(fragments),

    findBoundaries(fragments) {
      const blocks: LabelledBlock[] = [];
      /** Fragments of the unknown block currently being accumulated. */
      let unknown: LabelFragment[] = [];

      const closeUnknown = (): void => {
        if (unknown.length === 0) return;
        blocks.push({
          kind: undefined,
          label: unknown.map((f) => f.text).join(' ').replace(/\s+/g, ' ').trim(),
          rowIndex: unknown[0]!.rowIndex,
        });
        unknown = [];
      };

      let i = 0;
      while (i < fragments.length) {
        let matched = false;
        // Longest match first: `Houses Damaged Others` must win over the
        // `Houses Damaged` that is a prefix of it.
        const window = Math.min(MAX_FRAGMENTS_PER_LABEL, fragments.length - i);
        for (let k = window; k >= 1; k--) {
          const slice = fragments.slice(i, i + k);
          const found = recognise(
            slice.map((f) => f.text),
            slice[0]!.rowIndex,
          );
          if (found !== undefined) {
            closeUnknown();
            blocks.push(found);
            i += k;
            matched = true;
            break;
          }
        }
        // An unrecognised fragment is not fatal, and no longer silent: it joins
        // the unknown block being accumulated, which is reported whole. A run
        // of them is ONE block — `Wildlife` `affected` `under` `p` `rotected`
        // is a single label DRIMS broke across six runs, not six blocks.
        if (!matched) {
          unknown.push(fragments[i]!);
          i++;
        }
      }
      closeUnknown();
      return blocks;
    },
  };
};

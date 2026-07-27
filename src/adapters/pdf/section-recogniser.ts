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

export interface SectionRecogniser {
  /** The kind a run of fragments denotes, if any. */
  recognise(fragments: readonly string[]): SectionBoundary | undefined;
  /** Every section boundary in the document's gutter-fragment stream. */
  findBoundaries(fragments: readonly LabelFragment[]): readonly SectionBoundary[];
}

export const createSectionRecogniser = (): SectionRecogniser => {
  const recognise = (fragments: readonly string[], rowIndex = 0): SectionBoundary | undefined => {
    const kind = matchSectionKind(fragments.join(' '));
    return kind === undefined ? undefined : { kind, label: SECTION_LABELS[kind], rowIndex };
  };

  return {
    recognise: (fragments) => recognise(fragments),

    findBoundaries(fragments) {
      const boundaries: SectionBoundary[] = [];
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
            boundaries.push(found);
            i += k;
            matched = true;
            break;
          }
        }
        // An unrecognised fragment is skipped, not fatal. `Particulars` and
        // the Wildlife block both land here.
        if (!matched) i++;
      }
      return boundaries;
    },
  };
};

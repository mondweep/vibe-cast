/**
 * The DRIMS inline mini-language (PRD §5.1, ADR-0002 §5).
 *
 * Revenue-circle detail is not given its own columns. It is crammed into a
 * single cell as a comma-separated list of parenthesised expressions, in two
 * dialects that coexist in the same document:
 *
 *   simple   `(Nazira | 41), (Demow | 24), (Sivsagar | 114)`
 *   compound `(Mahmora | Population Affected: 67128 | Crop Area Submerged: 7340)`
 *
 * Because the cell is laid out by the PDF renderer, an expression can wrap
 * anywhere — including mid-word inside a field label, which is why labels are
 * matched with whitespace removed rather than compared literally.
 *
 * Values stay `DrimsNumber`, not `number`: `(Sapekhati | Nil)` and
 * `(Sapekhati | SNR)` are different facts and both occur.
 */

import { parseDrimsNumber, type DrimsNumber } from './drims-number';

export type InlineBreakdownEntry =
  | { readonly kind: 'simple'; readonly circle: string; readonly value: DrimsNumber }
  | {
      readonly kind: 'compound';
      readonly circle: string;
      readonly fields: Readonly<Record<string, DrimsNumber>>;
    };

/** Field labels DRIMS uses in the compound dialect, keyed by their tight form. */
const CANONICAL_FIELD_LABELS: ReadonlyMap<string, string> = new Map([
  ['populationaffected', 'Population Affected'],
  ['cropareasubmerged', 'Crop Area Submerged'],
]);

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
const tighten = (s: string): string => s.replace(/\s+/g, '').toLowerCase();

/**
 * A label may arrive as `Populati on Affected` because the renderer split the
 * word across a line. Whitespace is therefore not significant in a label.
 */
const canonicalFieldLabel = (raw: string): string =>
  CANONICAL_FIELD_LABELS.get(tighten(raw)) ?? collapse(raw);

/**
 * Split the cell into balanced parenthesised groups.
 *
 * A scanner rather than a regex: circle names contain spaces
 * (`Sonari RC part`) and remarks text between groups must be skipped without
 * being mistaken for an expression.
 */
const parenGroups = (raw: string): readonly string[] => {
  const groups: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ')') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start >= 0) {
          groups.push(raw.slice(start, i));
          start = -1;
        }
      }
    }
  }
  return groups;
};

/**
 * Parse one cell. Groups that carry no `|` (plain prose in parentheses, which
 * the Remarks section is full of) are skipped rather than invented into
 * entries with unknown values.
 */
export const parseInlineBreakdown = (raw: string): readonly InlineBreakdownEntry[] => {
  if (typeof raw !== 'string') return [];

  const entries: InlineBreakdownEntry[] = [];

  for (const group of parenGroups(raw)) {
    const parts = group.split('|');
    if (parts.length < 2) continue;

    const circle = collapse(parts[0] ?? '');
    if (circle === '') continue;

    const rest = parts.slice(1);
    const isCompound = rest.some((p) => p.includes(':'));

    if (!isCompound) {
      entries.push({ kind: 'simple', circle, value: parseDrimsNumber(rest.join('|')) });
      continue;
    }

    const fields: Record<string, DrimsNumber> = {};
    for (const part of rest) {
      const colon = part.indexOf(':');
      if (colon === -1) continue;
      const label = canonicalFieldLabel(part.slice(0, colon));
      if (label === '') continue;
      fields[label] = parseDrimsNumber(part.slice(colon + 1));
    }
    entries.push({ kind: 'compound', circle, fields });
  }

  return entries;
};

/**
 * The simple dialect flattened to `circle -> DrimsNumber`.
 * Later repeats win, matching how a reader would read the cell left to right.
 */
export const simpleBreakdown = (raw: string): ReadonlyMap<string, DrimsNumber> => {
  const out = new Map<string, DrimsNumber>();
  for (const entry of parseInlineBreakdown(raw)) {
    if (entry.kind === 'simple') out.set(entry.circle, entry.value);
  }
  return out;
};

/** One named field of the compound dialect, as `circle -> DrimsNumber`. */
export const compoundField = (raw: string, field: string): ReadonlyMap<string, DrimsNumber> => {
  const wanted = tighten(field);
  const out = new Map<string, DrimsNumber>();
  for (const entry of parseInlineBreakdown(raw)) {
    if (entry.kind !== 'compound') continue;
    for (const [label, value] of Object.entries(entry.fields)) {
      if (tighten(label) === wanted) out.set(entry.circle, value);
    }
  }
  return out;
};

/**
 * Circle names in document order, deduplicated.
 *
 * A cell reading `Nil` produces none: PRD §5.4 invariant 3 — a district
 * reporting "Nil" has an empty collection, not an entity called "Nil".
 */
export const breakdownCircles = (raw: string): readonly string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of parseInlineBreakdown(raw)) {
    if (seen.has(entry.circle)) continue;
    seen.add(entry.circle);
    out.push(entry.circle);
  }
  return out;
};

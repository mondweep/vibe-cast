/**
 * The anti-corruption core (PRD §3.3, ADR-0002).
 *
 * DRIMS writes numbers in at least six dialects in the same table: plain
 * integers, comma-grouped integers, decimals carrying IEEE noise
 * (`2025.9200000000003`), the sentinel `Nil`, the sentinel `SNR`
 * ("Status Not Reported"), and blank.
 *
 * `parseDrimsNumber` NEVER returns a bare number. A caller who wants an
 * arithmetic value has to open the union and decide, at the call site and in
 * plain sight, what an unknown means in their context. That is the whole point:
 * a blank casualty cell must not become a reported zero.
 */

import { count, unknownCount, type Count } from '../../domain/shared/quantity';

export type DrimsNumber =
  /** A number was printed and we read it. `0` printed as `0` lands here. */
  | { readonly kind: 'value'; readonly value: number }
  /** ASDMA's `Nil` in a count column: an affirmative report of nothing. */
  | { readonly kind: 'zero' }
  /** `SNR`, blank, or anything we could not read. Not zero. */
  | { readonly kind: 'unknown' };

const VALUE_PATTERN = /^[+-]?\d+(?:\.\d+)?$/;

/**
 * Total over every string the bulletin can contain. There is no throw and no
 * `NaN` escape hatch — an unreadable cell is `unknown`, which is a fact we can
 * render honestly, unlike `NaN`.
 */
export const parseDrimsNumber = (raw: string): DrimsNumber => {
  if (typeof raw !== 'string') return { kind: 'unknown' };

  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (trimmed === '') return { kind: 'unknown' };

  const folded = trimmed.toLowerCase();
  if (folded === 'nil') return { kind: 'zero' };
  if (folded === 'snr') return { kind: 'unknown' };

  // Thousands separators are cosmetic; the decimal point is not.
  const bare = trimmed.replace(/,/g, '');
  if (!VALUE_PATTERN.test(bare)) return { kind: 'unknown' };

  const value = Number(bare);
  if (!Number.isFinite(value)) return { kind: 'unknown' };

  // Deliberately no rounding: reconciliation must compare like with like, and
  // `2025.9200000000003` is what ASDMA published (PRD §4.2).
  return { kind: 'value', value };
};

/**
 * Numbers the renderer split across a line break.
 *
 * Longitude `94.107469` is emitted as `94.1074` then `69`, and `95.032543` as
 * `95.0325` then `43` on the next line (ADR-0002 §4). Rejoining is attempted
 * ONLY after a plain parse has failed, and ONLY when the break falls inside
 * the fractional part — so a cell reading `0 0`, which means our columns went
 * wrong, stays `unknown` instead of quietly becoming `00`.
 */
const SPLIT_FRACTION = /^(\d+\.\d*)\s+(\d+)$/;
const SPLIT_BEFORE_POINT = /^(\d+)\s+(\.\d+)$/;

export const parseWrappedDrimsNumber = (raw: string): DrimsNumber => {
  const direct = parseDrimsNumber(raw);
  if (direct.kind !== 'unknown') return direct;
  if (typeof raw !== 'string') return direct;

  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const match = SPLIT_FRACTION.exec(collapsed) ?? SPLIT_BEFORE_POINT.exec(collapsed);
  return match === null ? direct : parseDrimsNumber(`${match[1]}${match[2]}`);
};

/** `zero` and a printed `0` are both 0; `unknown` has no numeric answer. */
export const numericValue = (n: DrimsNumber): number | undefined => {
  switch (n.kind) {
    case 'value':
      return n.value;
    case 'zero':
      return 0;
    case 'unknown':
      return undefined;
  }
};

/** Bridge into the published language's quantity types. */
export const toCount = (n: DrimsNumber): Count => {
  const v = numericValue(n);
  return v === undefined ? unknownCount() : count(v);
};

/** Convenience for the common "parse this cell as a count" step. */
export const cellToCount = (raw: string): Count => toCount(parseDrimsNumber(raw));

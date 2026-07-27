/**
 * Temporal Comparison — how old is the bulletin on the screen?
 *
 * This exists because of a specific failure mode. A console that opens showing
 * the 27 July 2026 bulletin will, in November, still open showing the 27 July
 * 2026 bulletin — same layout, same confident figures, same authority. Nothing
 * on the screen degrades with time on its own. A flood tool that looks equally
 * authoritative four months later is worse than one that refuses to open.
 *
 * So age is a first-class assessment, computed here and rendered prominently,
 * rather than a date in a header that the reader is trusted to check.
 *
 * Pure, per ADR-0001: `now` is supplied by the caller (the `Clock` port exists
 * for exactly this), so "what does this say on 4 September" is a test rather
 * than something we discover on 4 September.
 */

import type { ReportDate } from '../shared/flood-situation-report';
import { daysBetween, isValidReportDate } from './report-date';

export type StalenessLevel = 'current' | 'ageing' | 'stale' | 'obsolete' | 'unknown';

export type StalenessBand = {
  readonly level: Exclude<StalenessLevel, 'unknown'>;
  /** Inclusive upper bound in whole days; `undefined` on the open-ended band. */
  readonly maxAgeDays: number | undefined;
};

/**
 * The bands, and why they fall where they do.
 *
 * ASDMA issues one bulletin per calendar day, generated late in the evening —
 * the 27 July one at 21:49. For most of a working day, therefore, the newest
 * bulletin that exists is *yesterday's*. That single fact sets the first
 * boundary: 0–1 days is not "slightly old", it is the current operating
 * picture, and warning about it would train officers to ignore the warning.
 *
 * - `current` (0–1 days) — today's bulletin, or yesterday's before this
 *   evening's is published. The normal state.
 * - `ageing` (2–3 days) — the affected geography rarely changes wholesale
 *   inside 72 hours, so the shape of the situation still holds, but camp
 *   counts, rice stock and river levels have all moved. Usable with the age
 *   stated. The boundary is 3 because day-over-day comparison (FR-5.2) is what
 *   this console is for, and past a long weekend there is no "yesterday" left
 *   to compare against.
 * - `stale` (4–14 days) — within a single flood wave a fortnight is enough for
 *   camps to open and close and for water to recede completely. The figures
 *   describe a situation that has been superseded, and must not drive a
 *   current decision.
 * - `obsolete` (>14 days) — beyond the span of one wave. Almost certainly a
 *   different event, possibly a different season. Of historical interest only.
 *
 * Exported so the UI copy is written against the same numbers the assessment
 * uses, rather than a second set that can quietly drift from them.
 */
export const STALENESS_BANDS: readonly StalenessBand[] = [
  { level: 'current', maxAgeDays: 1 },
  { level: 'ageing', maxAgeDays: 3 },
  { level: 'stale', maxAgeDays: 14 },
  { level: 'obsolete', maxAgeDays: undefined },
];

export type StalenessAssessment = {
  readonly level: StalenessLevel;
  /**
   * Whole calendar days between the bulletin's date and `now`, in Assam's
   * calendar. Never negative. `undefined` — never 0 — when it is not knowable
   * (ADR-0005): zero would read as "this bulletin is current", which is the one
   * answer that must never come out of not knowing.
   */
  readonly ageDays: number | undefined;
  /** The bulletin's own date, if it had a usable one. */
  readonly reportDate: ReportDate | undefined;
  /** The day this judgement was made against, in Assam's calendar. */
  readonly asOf: ReportDate | undefined;
  /**
   * The bulletin is dated later than `now` — clock skew on a control-room
   * machine, or a bulletin loaded before the browser's date catches up. Not an
   * error and not stale, but worth saying out loud rather than silently
   * clamping to zero.
   */
  readonly datedInFuture: boolean;
};

/**
 * Assam runs on IST, UTC+05:30, year-round with no daylight saving.
 *
 * The bulletin is dated in Dispur's calendar, so "how old is it" must be asked
 * in Dispur's calendar too. Using the browser's UTC day instead would make a
 * bulletin read as a day younger than it is for the first five and a half
 * hours of every Assam day — precisely the early-morning hours in which a
 * control room is most likely to be looking.
 */
const IST_OFFSET_MINUTES = 330;

const assamCalendarDate = (now: Date): ReportDate | undefined => {
  const instant = now.getTime();
  if (!Number.isFinite(instant)) return undefined;
  const shifted = new Date(instant + IST_OFFSET_MINUTES * 60_000);
  const iso = shifted.toISOString().slice(0, 10);
  return isValidReportDate(iso) ? (iso as ReportDate) : undefined;
};

const bandFor = (ageDays: number): StalenessLevel => {
  for (const band of STALENESS_BANDS) {
    if (band.maxAgeDays === undefined || ageDays <= band.maxAgeDays) return band.level;
  }
  /* c8 ignore next -- the final band is open-ended, so the loop always returns. */
  return 'obsolete';
};

const unknownAt = (
  reportDate: ReportDate | undefined,
  asOf: ReportDate | undefined,
): StalenessAssessment => ({
  level: 'unknown',
  ageDays: undefined,
  reportDate,
  asOf,
  datedInFuture: false,
});

/**
 * How old is this bulletin, judged against a clock the caller supplies?
 *
 * @param reportDate the bulletin's `reportDate`, or `undefined` if it has none
 * @param now the current instant, from the `Clock` port
 */
export const assessStaleness = (
  reportDate: ReportDate | undefined,
  now: Date,
): StalenessAssessment => {
  const dated =
    typeof reportDate === 'string' && isValidReportDate(reportDate) ? reportDate : undefined;
  const asOf = assamCalendarDate(now);

  // No date, or no usable clock: say so. Do not guess, and above all do not
  // fall back to an age of zero, which reads as reassurance.
  if (dated === undefined || asOf === undefined) return unknownAt(dated, asOf);

  const elapsed = daysBetween(dated, asOf);
  const datedInFuture = elapsed < 0;
  const ageDays = datedInFuture ? 0 : elapsed;

  return { level: bandFor(ageDays), ageDays, reportDate: dated, asOf, datedInFuture };
};

/**
 * Whether the figures must not be used for a current decision.
 *
 * `unknown` counts as too old. A bulletin whose age we could not establish is
 * not a bulletin we can vouch for, and "we could not tell" is not a reason to
 * default to reassurance.
 */
export const isTooOldForDecisions = (level: StalenessLevel): boolean =>
  level === 'stale' || level === 'obsolete' || level === 'unknown';

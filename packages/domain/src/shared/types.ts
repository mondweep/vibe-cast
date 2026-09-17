/**
 * Shared primitives for the Somnus domain.
 *
 * This package is pure by contract (ADR-004): no I/O, no framework, no
 * platform globals. Time and identity enter through ports so that every
 * test is deterministic.
 */

/** Milliseconds since the start of a Session. Never a wall-clock time. */
export type SessionMs = number;

/** Milliseconds since the Unix epoch. */
export type EpochMs = number;

/**
 * Loudness in decibels *relative to the Ambient Baseline*.
 *
 * Invariant I-A5: phone microphones are uncalibrated, so an absolute sound
 * pressure level is meaningless. Every loudness in this domain is relative
 * and must never be rendered with an absolute SPL unit.
 */
export type RelativeDb = number;

export type UserId = string;
export type NightId = string;
export type TrialId = string;

/** An ISO calendar date, `YYYY-MM-DD`, in the *device's* local timezone. */
export type NightDate = string;

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Median of a numeric array. Returns NaN for an empty input. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: readonly number[]): number {
  if (values.length < 2) return NaN;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

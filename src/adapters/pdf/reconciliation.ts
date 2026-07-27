/**
 * Reconciliation (PRD §5.1 invariant 3, FR-1.4, ADR-0002).
 *
 * ASDMA prints a Total row. We never trust it: we sum the district rows
 * ourselves and compare. A disagreement does not throw away the data and does
 * not silently overwrite ASDMA's figure — it produces a `ReconciliationFailure`
 * that marks the section `degraded` and shows up in the UI.
 *
 * This is the mechanism that converts the realistic failure mode of a
 * coordinate-based parser — silent corruption, a plausible wrong number —
 * into a visible warning. It is why the technique is acceptable at all.
 */

import type { ReconciliationFailure, SectionKind } from '../../domain/shared/flood-situation-report';
import { isKnown, type Quantity } from '../../domain/shared/quantity';
import { numericValue, type DrimsNumber } from './drims-number';

/**
 * Tolerance for the float noise DRIMS carries (`2025.9200000000003`).
 *
 * Absolute, plus a relative term so it stays meaningful at the scale of a
 * statewide population. It is deliberately far below any figure that could
 * change a decision: 37,139.52 hectares reconciles, 37,139.6 does not.
 */
export const DEFAULT_ABSOLUTE_EPSILON = 1e-6;
export const DEFAULT_RELATIVE_EPSILON = 1e-9;

export type ReconcileOptions = {
  readonly absoluteEpsilon?: number;
  readonly relativeEpsilon?: number;
};

const toleranceFor = (statedTotal: number, options: ReconcileOptions): number =>
  Math.max(
    options.absoluteEpsilon ?? DEFAULT_ABSOLUTE_EPSILON,
    Math.abs(statedTotal) * (options.relativeEpsilon ?? DEFAULT_RELATIVE_EPSILON),
  );

/**
 * Compare ASDMA's Total against our own sum.
 *
 * `undefined` means "they agree". A failure carries both numbers so the UI can
 * show the officer exactly what disagreed and by how much — the point is to be
 * interrogable, not merely to raise a flag.
 *
 * Rows we could not read are excluded from the sum but recorded by the caller
 * as a separate concern: a sum over a partially-unread column is not evidence
 * that ASDMA is wrong, so it does not become a failure here. See
 * `reconcileQuantities`, which drops unknowns before summing.
 */
export const reconcile = (
  section: SectionKind,
  column: string,
  statedTotal: number,
  rowValues: readonly number[],
  options: ReconcileOptions = {},
): ReconciliationFailure | undefined => {
  if (!Number.isFinite(statedTotal)) return undefined;

  const usable = rowValues.filter((v) => Number.isFinite(v));
  const computedTotal = usable.reduce((acc, v) => acc + v, 0);

  if (Math.abs(statedTotal - computedTotal) <= toleranceFor(statedTotal, options)) return undefined;

  return { section, column, statedTotal, computedTotal };
};

/**
 * Reconcile from `DrimsNumber`s.
 *
 * An unknown row is not a zero row, so it cannot be summed. If any row is
 * unknown the check is abandoned rather than run against an incomplete sum —
 * reporting "ASDMA says 90, we say 58" when the difference is a cell we failed
 * to read would be an accusation we cannot support.
 */
export const reconcileDrims = (
  section: SectionKind,
  column: string,
  statedTotal: DrimsNumber,
  rowValues: readonly DrimsNumber[],
  options: ReconcileOptions = {},
): ReconciliationFailure | undefined => {
  const stated = numericValue(statedTotal);
  if (stated === undefined) return undefined;

  const values = rowValues.map(numericValue);
  if (values.some((v) => v === undefined)) return undefined;

  return reconcile(section, column, stated, values as number[], options);
};

/** The same check over published-language quantities. */
export const reconcileQuantities = <U extends string>(
  section: SectionKind,
  column: string,
  statedTotal: Quantity<U>,
  rowValues: readonly Quantity<U>[],
  options: ReconcileOptions = {},
): ReconciliationFailure | undefined => {
  if (!isKnown(statedTotal)) return undefined;
  if (rowValues.some((q) => !isKnown(q))) return undefined;
  return reconcile(
    section,
    column,
    statedTotal.value,
    rowValues.map((q) => (isKnown(q) ? q.value : 0)),
    options,
  );
};

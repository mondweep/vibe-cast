/**
 * Domain `Derivation` → UI `DerivedFigure`.
 *
 * PRD §4.5 requires that every figure this product computed is labelled derived
 * and shows its formula. The domain already refuses to hand out a bare number —
 * a derived metric arrives with the sum that produced it — and this module's
 * only job is to make sure that sum survives the hop into the view model
 * instead of being dropped on the floor at the boundary.
 *
 * Two conventions are applied here and nowhere else:
 *
 *  - **Grouping is presentation.** The domain renders operands ungrouped
 *    (`445495`) so that reconciliation compares like with like. The console
 *    groups them (`445,495`) to match the bulletin's own printing, so a figure
 *    can be found by eye in the PDF.
 *  - **Unknown stays unknown.** A metric with no value keeps `value:
 *    undefined`, and its workings end in `—`, never in `0`.
 */

import {
  NOT_REPORTED,
  formatNumber,
  formatPercent,
  type DerivedFigure,
} from '../adapters/ui/view-models';

/** The shape both context's derived-metric types share. */
export type DerivationLike = {
  readonly formula: string;
  readonly substitution: string;
  readonly note?: string;
};

export type MetricLike = {
  readonly value: number | undefined;
  readonly derivation: DerivationLike;
};

/**
 * Group the digit runs inside a formula substitution.
 *
 * `119109.2 ÷ (28695 × 0.6)` → `119,109.2 ÷ (28,695 × 0.6)`. Fractional digits
 * are left exactly as the domain produced them: rounding a substitution would
 * make the workings stop adding up, which is the one thing they exist to do.
 */
export const groupNumbers = (text: string): string =>
  text.replace(/\d+(?:\.\d+)?/g, (raw) => {
    const [whole, fraction] = raw.split('.');
    const grouped = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction === undefined ? grouped : `${grouped}.${fraction}`;
  });

const rendered = (value: number | undefined, precision: number, unit?: string): string => {
  if (value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  const body = formatNumber(value, precision);
  return unit === undefined ? body : `${body} ${unit}`;
};

export type FigureDisplay = {
  readonly precision?: number;
  readonly unit?: string;
  /** Overrides the metric's own note as the one-line reading. */
  readonly context?: string;
};

/**
 * A derived figure carrying its formula and its workings.
 *
 * `workings` is the substitution *with the answer on the end* — the form an
 * officer can check against the PDF in one glance.
 */
export const derivedFigureFrom = (
  key: string,
  label: string,
  metric: MetricLike,
  display: FigureDisplay = {},
): DerivedFigure => {
  const precision = display.precision ?? 0;
  const context = display.context ?? metric.derivation.note;
  return {
    key,
    label,
    value: metric.value,
    precision,
    unit: display.unit,
    formula: metric.derivation.formula,
    workings: `${groupNumbers(metric.derivation.substitution)} = ${rendered(
      metric.value,
      precision,
      display.unit,
    )}`,
    context,
  };
};

/**
 * The same, for a metric the domain expresses as a fraction and the console
 * shows as a percentage. The conversion happens once, here, so no view model
 * ever has to guess whether `0.064` means 6.4% or 0.064%.
 */
export const percentFigureFrom = (
  key: string,
  label: string,
  metric: MetricLike,
  display: { readonly precision?: number; readonly context?: string } = {},
): DerivedFigure => {
  const precision = display.precision ?? 1;
  const context = display.context ?? metric.derivation.note;
  return {
    key,
    label,
    value: metric.value === undefined ? undefined : metric.value * 100,
    precision,
    unit: '%',
    formula: metric.derivation.formula,
    workings: `${groupNumbers(metric.derivation.substitution)} = ${
      metric.value === undefined ? NOT_REPORTED : formatPercent(metric.value, precision)
    }`,
    context,
  };
};

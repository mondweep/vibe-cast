/**
 * The derived-figure marker (PRD §4.5).
 *
 * ASDMA's reported figures and our arithmetic must never be confusable. Every
 * number this console computed carries this badge, and the badge carries the
 * formula — hover it, focus it, or click it and you get the working out.
 *
 * The detail panel stays in the DOM and in the accessibility tree at all times
 * (it is faded with opacity, not `display: none`), so an officer using a
 * screen reader hears the derivation without having to discover a hover.
 */

import { useId, useState } from 'react';
import type { DerivedFigure } from './view-models';

export type DerivedBadgeProps = {
  /** Symbolic form, e.g. "Inmates ÷ Affected Population". */
  readonly formula: string;
  /** The same arithmetic with this bulletin's numbers substituted in. */
  readonly workings: string;
  readonly context?: string;
  readonly label?: string;
};

export const DerivedBadge = ({
  formula,
  workings,
  context,
  label = 'Derived',
}: DerivedBadgeProps) => {
  const detailId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="derived-badge">
      <button
        type="button"
        className="derived-badge__marker"
        aria-describedby={detailId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">ƒ</span>
        {label}
      </button>
      <span
        className="derived-badge__detail"
        id={detailId}
        role="note"
        data-open={open ? 'true' : 'false'}
      >
        <strong>Derived by this console — not an ASDMA reported figure.</strong>
        <span className="derived-badge__formula">{formula}</span>
        <span className="derived-badge__formula">{workings}</span>
        {context ? <span className="text-small text-muted">{context}</span> : null}
      </span>
    </span>
  );
};

/** Convenience wrapper for the common case of badging a whole figure. */
export const DerivedBadgeFor = ({
  figure,
  label,
}: {
  readonly figure: DerivedFigure;
  readonly label?: string;
}) => (
  <DerivedBadge
    formula={figure.formula}
    workings={figure.workings}
    context={figure.context}
    label={label}
  />
);

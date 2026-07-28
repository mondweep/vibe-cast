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

import { useEffect, useId, useRef, useState } from 'react';
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
  const rootRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLButtonElement>(null);

  /*
   * Three ways out, because the panel overlays its own trigger: clicking the
   * badge again — the only exit this had — is not reachable once the panel is
   * covering it. On a touch screen there is no hover-off either, so an opened
   * panel was simply stuck. Reported from a phone against the deployed build.
   */
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      markerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <span className="derived-badge" ref={rootRef}>
      <button
        type="button"
        ref={markerRef}
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
        {/*
         * Rendered only while open. The panel is in the accessibility tree at
         * all times so a screen reader hears the derivation without hunting for
         * a hover; a permanent Close button would be read out alongside every
         * derived figure on the page, which is noise.
         */}
        {open ? (
          <button
            type="button"
            className="derived-badge__close"
            onClick={() => {
              setOpen(false);
              markerRef.current?.focus();
            }}
          >
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Close the derivation for {formula}</span>
          </button>
        ) : null}
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

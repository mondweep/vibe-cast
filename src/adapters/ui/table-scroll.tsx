/**
 * A box for a table that is wider than the viewport.
 *
 * The District ranking table has ten `white-space: nowrap` column headers and
 * an 8rem severity bar that cannot shrink — roughly 1185px of min-content,
 * which already exceeds the 1150px content well on the 1366x768 projector
 * (NFR-11) and is three times a phone's width. Something has to scroll.
 *
 * The choice is *what* scrolls. Left alone, the whole content well scrolls
 * sideways, dragging the staleness banner and the two headline figures out of
 * view with the table — on a phone that costs an officer their bearings. So
 * below the drawer breakpoint the overflow is confined to this element and the
 * page around it stays still. Above it, `.table-scroll` is inert: the well
 * already scrolls and `thead th`'s `position: sticky` is measured against it,
 * so introducing a second scroll container up there would silently kill the
 * sticky header the control room reads off the wall.
 *
 * `role="region"` plus `tabIndex` plus a name is the WCAG 2.1 AA pattern for a
 * scrollable region (2.1.1 Keyboard): without them, columns pushed off the
 * right edge are unreachable to anyone not using a pointer.
 */

import type { ReactNode } from 'react';

export type TableScrollProps = {
  /** Names the region. Say what the table is, in ASDMA's vocabulary. */
  readonly label: string;
  readonly children: ReactNode;
};

export const TableScroll = ({ label, children }: TableScrollProps) => (
  <div className="table-scroll" data-testid="table-scroll" role="region" aria-label={label} tabIndex={0}>
    {children}
  </div>
);

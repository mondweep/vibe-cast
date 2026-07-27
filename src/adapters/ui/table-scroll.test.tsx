import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { TableScroll } from './table-scroll';

afterEach(cleanup);

describe('TableScroll', () => {
  const table = (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">District</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Sivasagar</td>
        </tr>
      </tbody>
    </table>
  );

  it('names the scrollable region, so it is not an unlabelled box', () => {
    render(<TableScroll label="District ranking">{table}</TableScroll>);

    expect(screen.getByRole('region', { name: 'District ranking' })).toBeTruthy();
  });

  it('is reachable by keyboard, so columns that scrolled out of view are not lost', () => {
    // WCAG 2.1 AA, 2.1.1: a region that scrolls must be operable without a
    // pointer. A District Commissioner on a tablet keyboard has to be able to
    // reach the Camp Load column that a phone-width viewport pushed off-screen.
    render(<TableScroll label="District ranking">{table}</TableScroll>);

    expect(screen.getByRole('region', { name: 'District ranking' }).tabIndex).toBe(0);
  });

  it('wraps the table without getting between it and its semantics', () => {
    render(<TableScroll label="District ranking">{table}</TableScroll>);

    const region = screen.getByRole('region', { name: 'District ranking' });
    expect(within(region).getByRole('table')).toBeTruthy();
    expect(within(region).getByRole('columnheader', { name: 'District' })).toBeTruthy();
    expect(region.classList.contains('table-scroll')).toBe(true);
  });
});

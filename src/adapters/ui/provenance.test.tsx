import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provenance, formatPages } from './provenance';
import { degradedProvenance, failedProvenance, populationProvenance } from './test-fixtures';

afterEach(cleanup);

describe('formatPages', () => {
  it('renders a single page, a contiguous span, and a scattered list distinctly', () => {
    expect(formatPages([2])).toBe('p. 2');
    expect(formatPages([1, 2])).toBe('pp. 1–2');
    expect(formatPages([12, 30])).toBe('pp. 12, 30');
  });
});

describe('Provenance', () => {
  it('names the ASDMA section and page so a figure can be found in the PDF', () => {
    render(<Provenance source={populationProvenance} />);

    expect(
      screen.getByText(/Population and Crop Area Submerged, pp\. 1–2 of the bulletin/),
    ).toBeTruthy();
  });

  it('opens the source page through the injected callback', async () => {
    const onOpenPage = vi.fn();
    const user = userEvent.setup();
    render(<Provenance source={populationProvenance} onOpenPage={onOpenPage} />);

    await user.click(screen.getByRole('button'));

    expect(onOpenPage).toHaveBeenCalledWith(1, populationProvenance);
  });

  it('spells out degraded and unreadable confidence in words, not colour alone', () => {
    const { unmount } = render(<Provenance source={degradedProvenance} />);
    expect(screen.getByText('· Degraded')).toBeTruthy();
    expect(screen.getByText(/Degraded — reconciliation failed/)).toBeTruthy();
    unmount();

    render(<Provenance source={failedProvenance} />);
    expect(screen.getByText('· Unread')).toBeTruthy();
    expect(screen.getByText(/Could not read/)).toBeTruthy();
  });
});

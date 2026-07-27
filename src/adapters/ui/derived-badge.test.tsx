import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DerivedBadge, DerivedBadgeFor } from './derived-badge';
import { unshelteredFigure } from './test-fixtures';

afterEach(cleanup);

describe('DerivedBadge', () => {
  it('marks the figure as derived rather than reported by ASDMA', () => {
    render(
      <DerivedBadge
        formula="Affected Population − Inmates − Non-Camp Inmates"
        workings="445,495 − 28,695 − 51,777 = 365,023"
      />,
    );

    expect(screen.getByRole('button', { name: /derived/i })).toBeTruthy();
    expect(
      screen.getByText(/Derived by this console — not an ASDMA reported figure\./),
    ).toBeTruthy();
  });

  it('exposes the formula and the workings as the marker description', () => {
    render(<DerivedBadgeFor figure={unshelteredFigure} />);

    const marker = screen.getByRole('button', { name: /derived/i });
    const detail = document.getElementById(marker.getAttribute('aria-describedby') ?? '');

    expect(detail?.textContent).toContain('Affected Population − Inmates − Non-Camp Inmates');
    expect(detail?.textContent).toContain('445,495 − 28,695 − 51,777 = 365,023');
  });

  it('pins the formula open on click, for keyboard and touch users', async () => {
    const user = userEvent.setup();
    render(<DerivedBadgeFor figure={unshelteredFigure} />);

    const marker = screen.getByRole('button', { name: /derived/i });
    expect(marker.getAttribute('aria-expanded')).toBe('false');

    await user.click(marker);

    expect(marker.getAttribute('aria-expanded')).toBe('true');
    const detail = document.getElementById(marker.getAttribute('aria-describedby') ?? '');
    expect(detail?.getAttribute('data-open')).toBe('true');
  });
});

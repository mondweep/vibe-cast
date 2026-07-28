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

describe('DerivedBadge — dismissing the derivation', () => {
  // Reported from a phone against the deployed build: the panel opened and then
  // could not be closed. It overlays its own trigger, so clicking the badge
  // again — the only exit there was — is unreachable, and touch has no
  // hover-off. Each route below is tested because each covers a different user:
  // pointer, keyboard, and someone who taps away.
  const open = async () => {
    const user = userEvent.setup();
    render(<DerivedBadge formula="Inmates ÷ Affected Population" workings="28,695 ÷ 445,495 = 6.4%" />);
    await user.click(screen.getByRole('button', { name: /derived/i }));
    expect(screen.getByRole('button', { name: /derived/i }).getAttribute('aria-expanded')).toBe('true');
    return user;
  };

  it('closes on the close button, and returns focus to the badge', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: /close the derivation/i }));

    const marker = screen.getByRole('button', { name: /derived/i });
    expect(marker.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(marker);
  });

  it('closes on Escape, and returns focus to the badge', async () => {
    const user = await open();
    await user.keyboard('{Escape}');

    const marker = screen.getByRole('button', { name: /derived/i });
    expect(marker.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(marker);
  });

  it('closes when the user taps away from it', async () => {
    const user = await open();
    await user.click(document.body);

    expect(screen.getByRole('button', { name: /derived/i }).getAttribute('aria-expanded')).toBe('false');
  });

  it('offers no close button until it is open, so screen readers do not hear one per figure', () => {
    render(<DerivedBadge formula="a ÷ b" workings="1 ÷ 2 = 0.5" />);
    expect(screen.queryByRole('button', { name: /close the derivation/i })).toBeNull();
  });
});

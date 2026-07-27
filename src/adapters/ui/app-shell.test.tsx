import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './app-shell';

afterEach(cleanup);

describe('AppShell', () => {
  it('offers every console view in the left rail', () => {
    render(
      <AppShell activeView="situation" onSelectView={vi.fn()}>
        <p>content</p>
      </AppShell>,
    );

    const rail = screen.getByRole('navigation', { name: /console views/i });
    for (const label of [
      'Situation Summary',
      'District Ranking',
      'Response Capacity',
      'Damage Map',
      'Scenario Planner',
      'Trend',
    ]) {
      expect(within(rail).getByRole('button', { name: new RegExp(label) })).toBeTruthy();
    }
  });

  it('marks the active view for assistive technology, not colour alone', () => {
    render(
      <AppShell activeView="ranking" onSelectView={vi.fn()}>
        <p>content</p>
      </AppShell>,
    );

    const active = screen.getByRole('button', { name: /District Ranking/ });
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(
      screen.getByRole('button', { name: /Situation Summary/ }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('delegates navigation to the injected handler', async () => {
    const onSelectView = vi.fn();
    const user = userEvent.setup();
    render(
      <AppShell activeView="situation" onSelectView={onSelectView}>
        <p>content</p>
      </AppShell>,
    );

    await user.click(screen.getByRole('button', { name: /Damage Map/ }));

    expect(onSelectView).toHaveBeenCalledWith('map');
  });

  it('keeps the bulletin date and generation time pinned in the header', () => {
    render(
      <AppShell
        activeView="situation"
        onSelectView={vi.fn()}
        reportDate="2026-07-27"
        generatedAt="27-07-2026 09:49 PM"
      >
        <p>content</p>
      </AppShell>,
    );

    expect(
      screen.getByRole('heading', { name: /Assam Flood Report as on 2026-07-27/ }),
    ).toBeTruthy();
    expect(screen.getByText(/Report Generated On: 27-07-2026 09:49 PM/)).toBeTruthy();
  });

  it('says so plainly when no bulletin has been loaded', () => {
    render(
      <AppShell activeView="situation" onSelectView={vi.fn()}>
        <p>content</p>
      </AppShell>,
    );

    expect(screen.getByRole('heading', { name: 'No bulletin loaded' })).toBeTruthy();
  });
});

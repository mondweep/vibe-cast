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

/**
 * The rail as an off-canvas drawer.
 *
 * Below 900px (see `layout.test.ts` for how that number was measured) the rail
 * costs more horizontal space than the content it displaces, so it collapses
 * behind a toggle. Whether it is *showing* is a question for the stylesheet;
 * everything below is the behaviour, which is the same markup at every width.
 */
describe('AppShell — the rail drawer', () => {
  const shell = (onSelectView = vi.fn()) =>
    render(
      <AppShell activeView="situation" onSelectView={onSelectView}>
        <p>content</p>
      </AppShell>,
    );

  const toggle = () => screen.getByRole('button', { name: 'Console views' });
  const rail = () => screen.getByRole('navigation', { name: /console views/i });

  it('offers a real button that says which region it controls and whether it is open', () => {
    shell();

    // Not a checkbox hack, not a div with an onClick: a button, so it is
    // reachable by keyboard and announced as a control.
    expect(toggle().tagName).toBe('BUTTON');
    expect(toggle().getAttribute('type')).toBe('button');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe(rail().id);
    expect(rail().id).toBeTruthy();
  });

  it('opens the drawer and says so', async () => {
    const user = userEvent.setup();
    shell();

    await user.click(toggle());

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('.console')?.getAttribute('data-rail-open')).toBe('true');
  });

  it('moves focus into the drawer when it opens', async () => {
    const user = userEvent.setup();
    shell();

    await user.click(toggle());

    // An officer who opened the views list should already be standing in it.
    expect(document.activeElement).toBe(
      within(rail()).getByRole('button', { name: /Situation Summary/ }),
    );
  });

  it('does not trap focus — Tab still walks out of the drawer', async () => {
    const user = userEvent.setup();
    shell();

    await user.click(toggle());
    const first = within(rail()).getByRole('button', { name: /Situation Summary/ });
    expect(document.activeElement).toBe(first);

    await user.tab();

    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement).toBeTruthy();
  });

  it('closes on Escape and hands focus back to the toggle', async () => {
    const user = userEvent.setup();
    shell();

    await user.click(toggle());
    await user.keyboard('{Escape}');

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle());
  });

  it('ignores Escape when the drawer is already closed', async () => {
    const user = userEvent.setup();
    shell();

    document.body.focus();
    await user.keyboard('{Escape}');

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    // Focus was not stolen by a listener that had no business running.
    expect(document.activeElement).not.toBe(toggle());
  });

  it('gets out of the way once a view is chosen', async () => {
    const onSelectView = vi.fn();
    const user = userEvent.setup();
    shell(onSelectView);

    await user.click(toggle());
    await user.click(within(rail()).getByRole('button', { name: /Damage Map/ }));

    expect(onSelectView).toHaveBeenCalledWith('map');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle());
  });

  it('closes when the scrim behind it is dismissed', async () => {
    const user = userEvent.setup();
    shell();

    expect(screen.queryByRole('button', { name: /Close console views/i })).toBeNull();

    await user.click(toggle());
    await user.click(screen.getByRole('button', { name: /Close console views/i }));

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle());
  });

  it('leaves the rail closed unless the officer asks for it', () => {
    shell();

    // Above the breakpoint the toggle is `display: none`, so this state is the
    // one the projector renders: closed, and therefore never covering the
    // console with a drawer nobody opened.
    expect(document.querySelector('.console')?.getAttribute('data-rail-open')).toBe('false');
  });
});

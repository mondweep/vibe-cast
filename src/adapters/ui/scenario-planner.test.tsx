import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioPlanner } from './scenario-planner';
import { comparisonsFixture, leversFixture } from './test-fixtures';

afterEach(cleanup);

const renderPlanner = (overrides = {}) =>
  render(
    <ScenarioPlanner
      levers={leversFixture}
      onLeverChange={vi.fn()}
      comparisons={comparisonsFixture}
      baselineLabel="Assam Flood Report as on 2026-07-27"
      {...overrides}
    />,
  );

describe('ScenarioPlanner — levers (FR-4.1)', () => {
  it('offers every lever the scenario model defines', () => {
    renderPlanner();

    expect(screen.getByLabelText('Affected Population growth')).toBeTruthy();
    expect(screen.getByLabelText('Camp Uptake Rate')).toBeTruthy();
    expect(screen.getByLabelText('Sustained for')).toBeTruthy();
    expect(screen.getByLabelText('Ration norm (rice per person per day)')).toBeTruthy();
    expect(screen.getByLabelText('Additional Relief Camps opened')).toBeTruthy();
  });

  it('reads back the flagship scenario in plain units', () => {
    renderPlanner();

    expect(screen.getByText('+30%')).toBeTruthy();
    expect(screen.getByText('25.0%')).toBeTruthy();
    expect(screen.getByText('5 days')).toBeTruthy();
    expect(screen.getByText('0.60 kg')).toBeTruthy();
  });

  it('reports a lever change as a patch for the host to recompute', () => {
    const onLeverChange = vi.fn();
    renderPlanner({ onLeverChange });

    fireEvent.change(screen.getByLabelText('Camp Uptake Rate'), { target: { value: '40' } });

    expect(onLeverChange).toHaveBeenCalledWith({ campUptakePercent: 40 });
  });

  it('says out loud that a projection is not a forecast', () => {
    renderPlanner();

    expect(screen.getByText(/This is not a forecast/)).toBeTruthy();
    expect(screen.getByText(/Nothing here predicts rainfall or river levels/)).toBeTruthy();
  });
});

describe('ScenarioPlanner — baseline beside projected (FR-4.3)', () => {
  it('shows a baseline for every projected figure', () => {
    const { container } = renderPlanner();

    const rows = Array.from(container.querySelectorAll('tbody tr[data-metric]'));
    expect(rows).toHaveLength(comparisonsFixture.length);

    for (const row of rows) {
      const baseline = row.querySelector('[data-cell="baseline"]');
      const projected = row.querySelector('[data-cell="projected"]');
      expect(baseline?.textContent?.trim()).not.toBe('');
      expect(projected?.textContent?.trim()).not.toBe('');
    }
  });

  it('puts the flagship projection next to what it is projected from', () => {
    const { container } = renderPlanner();

    const rationRow = container.querySelector('[data-metric="ration-days"]') as HTMLElement;
    expect(
      within(rationRow).getByText('6.9 days', { selector: '.figure' }),
    ).toBeTruthy();
    expect(
      within(rationRow).getByText('1.4 days', { exact: false, selector: '.projected-figure' }),
    ).toBeTruthy();
  });
});

describe('ScenarioPlanner — projected figures are unmistakable (FR-4.7)', () => {
  it('labels every projected figure with the word "projected"', () => {
    const { container } = renderPlanner();

    const tags = container.querySelectorAll('.figure-tag');
    expect(tags).toHaveLength(comparisonsFixture.length);
    for (const tag of Array.from(tags)) {
      expect(tag.textContent).toBe('projected');
    }
  });

  it('gives projected figures their own typographic treatment', () => {
    const { container } = renderPlanner();

    const projected = container.querySelectorAll('.projected-figure');
    const baselines = container.querySelectorAll('[data-cell="baseline"] .figure');
    expect(projected).toHaveLength(comparisonsFixture.length);
    expect(baselines).toHaveLength(comparisonsFixture.length);
    // Distinct classes, so distinct type — not merely a different colour.
    expect(projected[0].className).not.toBe(baselines[0].className);
  });

  it('never renders a projected figure without a baseline column present', () => {
    renderPlanner();

    expect(
      screen.getByRole('columnheader', { name: 'Baseline (reported)' }),
    ).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Projected' })).toBeTruthy();
  });
});

describe('ScenarioPlanner — derivation (FR-4.6)', () => {
  it('expands the plain-language derivation in place', async () => {
    const user = userEvent.setup();
    const { container } = renderPlanner();

    const rationRow = container.querySelector('[data-metric="ration-days"]') as HTMLElement;
    const toggle = within(rationRow).getByRole('button', { name: 'Show derivation' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    await user.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      within(rationRow).getByText(
        /Rice runs out in 1\.4 days: 144,785 Inmates × 0\.6 kg = 86,871 kg\/day demand vs 119,109 kg stock\./,
      ),
    ).toBeTruthy();
  });

  it('keeps the derivation reachable on hover as well', () => {
    const { container } = renderPlanner();

    const rationRow = container.querySelector('[data-metric="ration-days"]') as HTMLElement;
    expect(
      within(rationRow).getByRole('button', { name: 'Show derivation' }).getAttribute('title'),
    ).toContain('Rice runs out in 1.4 days');
  });
});

describe('ScenarioPlanner — first failure point (FR-4.4)', () => {
  it('names the District whose capacity breaks first', () => {
    renderPlanner({
      firstFailure: {
        district: 'Sivasagar',
        description:
          'Camp Load reaches 1,609 per Relief Camp — five times the current 319 — before any other District.',
        dayIndex: 2,
      },
    });

    expect(screen.getByText('First failure point: Sivasagar')).toBeTruthy();
    expect(screen.getByText(/Reached on day 2 of the scenario/)).toBeTruthy();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsoleApp, type ConsoleData } from './console-app';
import {
  capacityFixture,
  comparisonsFixture,
  damagePointsFixture,
  districtRowsFixture,
  summaryFixture,
  trendDeltas,
  trendGaps,
  trendObservations,
} from './test-fixtures';

afterEach(cleanup);

const data: ConsoleData = {
  summary: summaryFixture,
  districts: districtRowsFixture,
  capacity: capacityFixture,
  damagePoints: damagePointsFixture,
  scenarioComparisons: comparisonsFixture,
  firstFailure: null,
  trend: {
    observations: trendObservations,
    gaps: trendGaps,
    deltas: trendDeltas,
    bulletinCount: 3,
  },
};

describe('ConsoleApp', () => {
  it('leads with the loader until a bulletin is loaded', () => {
    render(<ConsoleApp loaderState={{ status: 'idle' }} onLoadBulletin={vi.fn()} />);

    expect(screen.getByText('Load an ASDMA Daily Flood Report')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No bulletin loaded' })).toBeTruthy();
  });

  it('opens on the Situation Summary, gap and all', () => {
    const { container } = render(
      <ConsoleApp loaderState={{ status: 'idle' }} onLoadBulletin={vi.fn()} data={data} />,
    );

    expect(
      container.querySelector('[data-headline="derived-gap"]')?.textContent,
    ).toBe('365,023');
  });

  it('navigates between views from the left rail', async () => {
    const user = userEvent.setup();
    render(
      <ConsoleApp loaderState={{ status: 'idle' }} onLoadBulletin={vi.fn()} data={data} />,
    );

    await user.click(screen.getByRole('button', { name: /District Ranking/ }));
    expect(screen.getByText('District ranking')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Response Capacity/ }));
    expect(screen.getByText('Statewide response capacity')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Damage Map/ }));
    expect(screen.getByText('Infrastructure damage map')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Scenario Planner/ }));
    expect(screen.getByText('Baseline vs projected')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Trend/ }));
    expect(screen.getByText('Trend across loaded bulletins')).toBeTruthy();
  });

  it('echoes the ration norm upward so the host can recompute coverage days', async () => {
    const onRationNormChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ConsoleApp
        loaderState={{ status: 'idle' }}
        onLoadBulletin={vi.fn()}
        data={data}
        onRationNormChange={onRationNormChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Response Capacity/ }));
    const input = screen.getByLabelText('Rice per person per day');
    await user.clear(input);
    await user.type(input, '0.8');

    expect(onRationNormChange).toHaveBeenLastCalledWith(0.8);
  });

  it('toggles the sort direction when the same column is chosen twice', async () => {
    const user = userEvent.setup();
    render(
      <ConsoleApp loaderState={{ status: 'idle' }} onLoadBulletin={vi.fn()} data={data} />,
    );
    await user.click(screen.getByRole('button', { name: /District Ranking/ }));

    const header = () => screen.getByRole('columnheader', { name: /Population Affected/ });
    await user.click(screen.getByRole('button', { name: /Population Affected/ }));
    expect(header().getAttribute('aria-sort')).toBe('descending');

    await user.click(screen.getByRole('button', { name: /Population Affected/ }));
    expect(header().getAttribute('aria-sort')).toBe('ascending');
  });

  it('expands and collapses a District drill-down', async () => {
    const user = userEvent.setup();
    render(
      <ConsoleApp loaderState={{ status: 'idle' }} onLoadBulletin={vi.fn()} data={data} />,
    );
    await user.click(screen.getByRole('button', { name: /District Ranking/ }));

    await user.click(screen.getByRole('button', { name: /Sivasagar/ }));
    expect(screen.getByText('Revenue Circles in Sivasagar')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Sivasagar/ }));
    expect(screen.queryByText('Revenue Circles in Sivasagar')).toBeNull();
  });

  it('keeps the loader reachable once a bulletin is open, for the next bulletin', () => {
    render(
      <ConsoleApp loaderState={{ status: 'idle' }} onLoadBulletin={vi.fn()} data={data} />,
    );

    expect(screen.getByRole('button', { name: 'Choose bulletin PDF' })).toBeTruthy();
  });
});

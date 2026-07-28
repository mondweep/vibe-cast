import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsoleApp, type ConsoleData } from './console-app';
import {
  capacityFixture,
  comparisonsFixture,
  damagePointsFixture,
  districtRowsFixture,
  periodSummaryFixture,
  summaryFixture,
  trendDeltas,
  trendGaps,
  trendObservations,
} from './test-fixtures';

afterEach(cleanup);

/**
 * The Trend view sizes its chart with a ResponsiveContainer, which jsdom does
 * not implement. A no-op observer is enough — layout is not what these tests
 * are about.
 */
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const data: ConsoleData = {
  summary: summaryFixture,
  districts: districtRowsFixture,
  capacity: capacityFixture,
  damagePoints: damagePointsFixture,
  scenarioComparisons: comparisonsFixture,
  firstFailure: null,
  trend: {
    metricKey: 'affectedPopulation',
    observations: trendObservations,
    gaps: trendGaps,
    deltas: trendDeltas,
    bulletinCount: 3,
  },
  period: periodSummaryFixture,
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
    expect(screen.getByText('Trend across every bulletin held')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Cumulative & Peak/ }));
    expect(screen.getByText('Cumulative & peak across every bulletin held')).toBeTruthy();
  });

  it('echoes the trend metric upward so the host can supply that series', async () => {
    // Without this the console alone knows which metric is selected, and the
    // chart keeps drawing Population Affected whatever the dropdown says.
    const onTrendMetricChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ConsoleApp
        loaderState={{ status: 'idle' }}
        onLoadBulletin={vi.fn()}
        data={data}
        onTrendMetricChange={onTrendMetricChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Trend/ }));
    fireEvent.change(screen.getByLabelText('Metric'), { target: { value: 'floodDeaths' } });

    expect(onTrendMetricChange).toHaveBeenLastCalledWith('floodDeaths');
    expect((screen.getByLabelText('Metric') as HTMLSelectElement).value).toBe('floodDeaths');
  });

  it('passes the bundled archive’s disclosure and its clear control down to both views', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(
      <ConsoleApp
        loaderState={{ status: 'idle' }}
        onLoadBulletin={vi.fn()}
        data={data}
        archive={{
          status: 'ready',
          fromDate: '2026-07-20',
          toDate: '2026-07-27',
          bundledCount: 8,
          pendingCount: 0,
          contributingCount: 8,
          onClear,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Trend/ }));
    expect(screen.getByTestId('trend-archive-note')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear the bundled history' }));
    expect(onClear).toHaveBeenCalledTimes(1);

    // Cumulative & Peak counts the same bulletins, so it discloses them too.
    await user.click(screen.getByRole('button', { name: /Cumulative/ }));
    expect(screen.getByTestId('period-archive-note')).toBeTruthy();
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
    fireEvent.change(screen.getByLabelText('Rice per person per day'), {
      target: { value: '0.8' },
    });

    expect(onRationNormChange).toHaveBeenLastCalledWith(0.8);
    expect(
      screen.getByText(/Ration Coverage Days computed at 0.8 kg/),
    ).toBeTruthy();
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

  it('wires the staleness banner’s reload control to the same loader', async () => {
    // The bundled example is the state the console opens in, and the state in
    // which an officer asked where to upload a newer bulletin from.
    const onLoadBulletin = vi.fn();
    const user = userEvent.setup();
    render(
      <ConsoleApp
        loaderState={{ status: 'idle' }}
        onLoadBulletin={onLoadBulletin}
        data={data}
        bulletinAge={{
          level: 'current',
          ageDays: 0,
          reportDate: '2026-07-27',
          asOf: '2026-07-27',
          datedInFuture: false,
          safeForCurrentDecisions: true,
          origin: 'bundled-archive',
        }}
      />,
    );

    const file = new File(['%PDF-1.4'], 'dfr.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/newer bulletin pdf/i), file);

    expect(onLoadBulletin).toHaveBeenCalledWith(file);
  });

  it('scrolls the District ranking table inside its own named region', async () => {
    const user = userEvent.setup();
    render(
      <ConsoleApp loaderState={{ status: 'idle' }} onLoadBulletin={vi.fn()} data={data} />,
    );

    await user.click(screen.getByRole('button', { name: /District Ranking/ }));

    // ~1185px of min-content (ten nowrap headers plus an 8rem severity bar)
    // has to go somewhere; it goes in a box of its own rather than dragging
    // the staleness banner and the headline figures sideways with it.
    expect(screen.getByRole('region', { name: 'District ranking table' })).toBeTruthy();
  });
});

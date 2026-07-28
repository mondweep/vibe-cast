import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TrendView, withExplicitGaps } from './trend-view';
import { trendDeltas, trendGaps, trendObservations } from './test-fixtures';

afterEach(cleanup);

const renderTrend = (overrides = {}) =>
  render(
    <TrendView
      metricKey="affectedPopulation"
      onMetricChange={vi.fn()}
      observations={trendObservations}
      gaps={trendGaps}
      deltas={trendDeltas}
      bulletinCount={3}
      chartWidth={640}
      chartHeight={240}
      {...overrides}
    />,
  );

describe('withExplicitGaps — never interpolate (FR-5.4)', () => {
  it('inserts a null for every date with no bulletin', () => {
    const data = withExplicitGaps(trendObservations, trendGaps);

    expect(data).toEqual([
      { date: '2026-07-23', value: 402110, missing: false },
      { date: '2026-07-24', value: 421340, missing: false },
      { date: '2026-07-25', value: null, missing: true },
      { date: '2026-07-26', value: null, missing: true },
      { date: '2026-07-27', value: 445495, missing: false },
    ]);
  });

  it('puts no value between the bulletins either side of the gap', () => {
    const data = withExplicitGaps(trendObservations, trendGaps);
    const across = data.filter((point) => point.missing).map((point) => point.value);

    // No interpolated 429,725 or 437,610 — nothing at all.
    expect(across).toEqual([null, null]);
  });

  it('keeps observations in date order regardless of load order', () => {
    const data = withExplicitGaps(
      [
        { date: '2026-07-27', value: 445495 },
        { date: '2026-07-23', value: 402110 },
      ],
      [],
    );

    expect(data.map((point) => point.date)).toEqual(['2026-07-23', '2026-07-27']);
  });

  it('treats an unreported value on a loaded bulletin as null, not zero', () => {
    const data = withExplicitGaps([{ date: '2026-07-27', value: undefined }], []);

    expect(data).toEqual([{ date: '2026-07-27', value: null, missing: false }]);
  });
});

describe('TrendView', () => {
  it('draws the series without connecting across the gap', () => {
    const { container } = renderTrend();

    const line = container.querySelector('.recharts-line');
    expect(line).not.toBeNull();
    // Recharts draws one path segment per unbroken run: 23–24, then 27 alone.
    expect(container.querySelectorAll('.recharts-line-curve').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.recharts-line-dot').length).toBe(3);
  });

  it('names the missing dates in words, not just as a break in the line', () => {
    renderTrend();

    const gap = screen.getByText(/No bulletin for/).closest('li');
    expect(gap?.textContent).toContain('2026-07-25, 2026-07-26');
    expect(gap?.textContent).toContain('between 2026-07-24 and 2026-07-27');
    expect(gap?.textContent).toMatch(/Interpolating flood data would be fabrication/);
  });

  it('computes no delta across a gap', () => {
    const { container } = renderTrend();

    expect(container.querySelector('[data-delta="2026-07-23→2026-07-24"]')).not.toBeNull();
    expect(container.querySelector('[data-delta="2026-07-24→2026-07-27"]')).toBeNull();
    expect(screen.getByText('Computed only between adjacent bulletin dates.')).toBeTruthy();
  });

  it('shows day-over-day change with direction in words as well as sign', () => {
    const { container } = renderTrend();

    const row = container.querySelector('[data-delta="2026-07-23→2026-07-24"]') as HTMLElement;
    expect(row.textContent).toContain('+19,230');
    expect(row.textContent).toContain('▲ up');
  });

  it('says a timeline with no gaps has no gaps', () => {
    renderTrend({ gaps: [] });

    expect(
      screen.getByText(/No gaps: every date between the first and last loaded bulletin/),
    ).toBeTruthy();
  });

  it('treats a single loaded bulletin as valid, not as an error', () => {
    renderTrend({
      bulletinCount: 1,
      observations: [{ date: '2026-07-27', value: 445495 }],
      gaps: [],
      deltas: [],
    });

    expect(screen.getByText(/A single bulletin is a valid timeline/)).toBeTruthy();
    expect(
      screen.getByText('No adjacent pair of bulletins is loaded, so there is nothing to compare.'),
    ).toBeTruthy();
  });

  it('lets the host switch metric, and marks the derived one as derived', () => {
    const onMetricChange = vi.fn();
    renderTrend({ onMetricChange });

    expect(screen.getByRole('option', { name: 'Unsheltered Affected (derived)' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Metric'), {
      target: { value: 'unshelteredAffected' },
    });

    expect(onMetricChange).toHaveBeenCalledWith('unshelteredAffected');
  });

  it('offers a series for each headline measure an officer tracks', () => {
    renderTrend();

    for (const label of [
      'Population Affected',
      'Inmates in Relief Camps',
      'Relief Camps',
      'Crop Area Submerged',
      'Human Lives Lost — Flood',
    ]) {
      expect(screen.getByRole('option', { name: label })).toBeTruthy();
    }
  });

  it('reports the metric the host asked for back to the host, whichever it is', () => {
    const onMetricChange = vi.fn();
    renderTrend({ onMetricChange });

    fireEvent.change(screen.getByLabelText('Metric'), { target: { value: 'floodDeaths' } });
    fireEvent.change(screen.getByLabelText('Metric'), { target: { value: 'cropAreaSubmerged' } });

    expect(onMetricChange).toHaveBeenNthCalledWith(1, 'floodDeaths');
    expect(onMetricChange).toHaveBeenNthCalledWith(2, 'cropAreaSubmerged');
  });

  it('names the plotted series on the line, so the chart cannot disagree with the label', () => {
    const { container } = renderTrend({ metricKey: 'campInmates' });

    expect(container.querySelector('.recharts-line')).not.toBeNull();
    expect((screen.getByLabelText('Metric') as HTMLSelectElement).value).toBe('campInmates');
  });
});

describe('TrendView — the bundled archive on the chart', () => {
  const archive = (overrides = {}) => ({
    status: 'ready' as const,
    fromDate: '2026-07-20',
    toDate: '2026-07-27',
    bundledCount: 8,
    pendingCount: 0,
    contributingCount: 8,
    ...overrides,
  });

  it('discloses how many of the points on the chart the officer did not load', () => {
    renderTrend({ archive: archive({ contributingCount: 5 }) });

    const note = screen.getByTestId('trend-archive-note');
    expect(note.textContent).toMatch(/5 of the/);
    expect(note.textContent).toMatch(/bundled with this console/);
    // It is real ASDMA data, so the trend is genuine — that has to be said too,
    // or the officer will discount a line they should trust.
    expect(note.textContent).toMatch(/real ASDMA Daily Flood Reports/);
    expect(note.textContent).toMatch(/20 July 2026 to 27 July 2026/);
    // And the supersession rule, because it is the thing they can act on.
    expect(note.textContent).toMatch(/your own copy supersedes the bundled one/);
  });

  it('lets the officer clear the bundled history, under its own name', () => {
    const onClear = vi.fn();
    renderTrend({ archive: archive({ onClear }) });

    fireEvent.click(screen.getByRole('button', { name: 'Clear the bundled history' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('offers no way to clear it when there would be nothing left to show', () => {
    renderTrend({ archive: archive() });

    expect(screen.queryByRole('button', { name: 'Clear the bundled history' })).toBeNull();
  });

  it('says nothing at all once the bundled history has been cleared', () => {
    renderTrend({ archive: archive({ status: 'cleared', contributingCount: 0 }) });

    expect(screen.queryByTestId('trend-archive-note')).toBeNull();
    expect(screen.queryByTestId('trend-archive-loading')).toBeNull();
  });

  it('says nothing once every bundled day has been superseded by the officer’s own', () => {
    renderTrend({ archive: archive({ contributingCount: 0 }) });

    expect(screen.queryByTestId('trend-archive-note')).toBeNull();
  });

  it('says the history is loading rather than reporting a count it is about to change', () => {
    // The defect this prevents: "1 bulletin held — load an earlier DRIMS PDF to
    // compare" flashing up and being silently replaced by an eight-day chart a
    // moment later.
    renderTrend({
      bulletinCount: 1,
      archive: archive({ status: 'loading', pendingCount: 7, contributingCount: 1 }),
    });

    const note = screen.getByTestId('trend-archive-loading');
    expect(note.textContent).toMatch(/Loading the bundled history/);
    expect(note.textContent).toMatch(/7 more real ASDMA bulletins/);
    expect(note.textContent).toMatch(/20 July 2026 to 27 July 2026/);
    expect(screen.queryByText(/1 bulletin held/)).toBeNull();
  });

  it('admits it when the history could not be loaded, rather than looking deliberate', () => {
    renderTrend({
      bulletinCount: 1,
      archive: archive({ status: 'unavailable', contributingCount: 1 }),
    });

    const note = screen.getByTestId('trend-archive-unavailable');
    expect(note.textContent).toMatch(/could not be loaded/);
    expect(note.textContent).toMatch(/27 July 2026/);
    expect(note.textContent).toMatch(/nothing here is estimated to fill the gap/);
    // And the honest count is restored: it really does hold one bulletin now.
    expect(screen.getByText(/1 bulletin held/)).toBeTruthy();
  });

  it('says nothing when the console was given no bundled archive at all', () => {
    renderTrend();

    expect(screen.queryByTestId('trend-archive-note')).toBeNull();
    expect(screen.queryByTestId('trend-archive-loading')).toBeNull();
  });
});

describe('TrendView — a break in the line always explains itself', () => {
  // Reported from the field: a bulletin was loaded and read, the line broke at
  // its date, and the panel beside it said "No gaps". Both statements were
  // individually true and jointly baffling. A null has two causes and they are
  // not the same fact about the world.
  const held = (date: string, value: number | undefined) => ({ date, value });

  it('names a loaded bulletin that does not report the chosen metric', () => {
    render(
      <TrendView
        observations={[
          held('2026-07-22', 653164),
          held('2026-07-23', undefined),
          held('2026-07-25', 654838),
        ]}
        gaps={[]}
        deltas={[]}
        bulletinCount={3}
        metricKey="affectedPopulation"
        onMetricChange={vi.fn()}
        chartWidth={640}
        chartHeight={240}
      />,
    );

    // Scoped to the note: the date also appears as an axis tick label.
    const note = screen.getByText(/loaded and read, but/).closest('p') as HTMLElement;
    expect(note.textContent).toMatch(/2026-07-23/);
    expect(note.textContent).toMatch(/does not report/);
    expect(note.textContent).toMatch(/Population Affected/);
    expect(note.textContent).toMatch(/not reported is not the same as none/);
  });

  it('does not call it a timeline gap — the record is complete, the series is not', () => {
    render(
      <TrendView
        observations={[held('2026-07-22', 653164), held('2026-07-23', undefined)]}
        gaps={[]}
        deltas={[]}
        bulletinCount={2}
        metricKey="affectedPopulation"
        onMetricChange={vi.fn()}
        chartWidth={640}
        chartHeight={240}
      />,
    );

    // The "no gaps" statement stays, because it is true: we hold a bulletin for
    // every date. It simply must no longer be the only thing said.
    expect(screen.getByText(/No gaps: every date/)).toBeTruthy();
    const note = screen.getByText(/loaded and read, but/).closest('p') as HTMLElement;
    expect(note.textContent).toMatch(/2026-07-23/);
    // and it is not described as a missing bulletin
    expect(note.textContent).not.toMatch(/No bulletin for/);
  });

  it('says nothing when every loaded bulletin reports the metric', () => {
    render(
      <TrendView
        observations={[held('2026-07-22', 653164), held('2026-07-25', 654838)]}
        gaps={[]}
        deltas={[]}
        bulletinCount={2}
        metricKey="affectedPopulation"
        onMetricChange={vi.fn()}
        chartWidth={640}
        chartHeight={240}
      />,
    );

    expect(screen.queryByText(/loaded and read, but/)).toBeNull();
  });
});

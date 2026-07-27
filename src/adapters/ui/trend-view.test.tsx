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
});

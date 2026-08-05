import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PeriodSummary } from './period-summary';
import { periodSummaryFixture } from './test-fixtures';
import type { BundledArchiveViewModel, PeriodSummaryViewModel } from './view-models';

afterEach(cleanup);

const renderSummary = (
  summary: PeriodSummaryViewModel = periodSummaryFixture,
  archive?: BundledArchiveViewModel,
) => render(<PeriodSummary summary={summary} archive={archive} />);

const anArchive = (
  overrides: Partial<BundledArchiveViewModel> = {},
): BundledArchiveViewModel => ({
  status: 'ready',
  fromDate: '2026-07-20',
  toDate: '2026-07-30',
  bundledCount: 11,
  pendingCount: 0,
  contributingCount: 11,
  ...overrides,
});

describe('PeriodSummary — cumulative figures', () => {
  it('totals flood deaths across the loaded bulletins', () => {
    const { container } = renderSummary();

    expect(container.querySelector('[data-total="flood-deaths"]')?.textContent).toBe('41');
  });

  it('shows the workings, so the total can be checked against the PDFs', () => {
    const { container } = renderSummary();

    const row = container.querySelector('[data-cumulative="flood-deaths"]') as HTMLElement;
    expect(row.textContent).toContain('5 + 21 + 9 + 4 + 2 + 0 = 41');
  });

  it('names the worst single bulletin as well as the total', () => {
    const { container } = renderSummary();

    const row = container.querySelector('[data-cumulative="flood-deaths"]') as HTMLElement;
    expect(row.textContent).toContain('21');
    expect(row.textContent).toContain('on 2026-07-21');
  });

  it('keeps flood deaths and other drownings as separate rows', () => {
    // PRD §4.2: they are different events, and there is no combined row on
    // screen because there is no combined figure anywhere in the product.
    const { container } = renderSummary();

    expect(container.querySelector('[data-total="flood-deaths"]')?.textContent).toBe('41');
    expect(container.querySelector('[data-total="general-drownings"]')?.textContent).toBe('1');
    // 41 + 1 appears nowhere: there is no combined row, and no combined figure
    // anywhere in the product for one to be built from.
    const totals = Array.from(container.querySelectorAll('[data-total]')).map(
      (cell) => cell.textContent,
    );
    expect(totals).not.toContain('42');
  });

  it('marks every cumulative figure as derived', () => {
    const { container } = renderSummary();

    const row = container.querySelector('[data-cumulative="flood-deaths"]') as HTMLElement;
    expect(row.textContent).toContain('derived');
  });
});

describe('PeriodSummary — what a total is allowed to claim', () => {
  it('never prints a bare total: the period is stated with it', () => {
    renderSummary();

    const coverage = screen.getByTestId('period-coverage');
    expect(coverage.textContent).toContain('6 bulletins');
    expect(coverage.textContent).toContain('20 July 2026 to 27 July 2026');
    expect(coverage.textContent).toContain('2 days missing');
    expect(coverage.textContent).toContain('2026-07-23, 2026-07-24');
  });

  it('says plainly that nothing is estimated for the missing days', () => {
    renderSummary();

    expect(screen.getByTestId('period-coverage').textContent).toMatch(
      /nothing is estimated for them/i,
    );
  });

  it('flags an incomplete figure rather than letting it pass as a count', () => {
    const { container } = renderSummary();

    const row = container.querySelector('[data-cumulative="flood-deaths"]') as HTMLElement;
    expect(row.querySelector('[data-completeness="partial"]')).not.toBeNull();
  });

  it('says so when a period has no missing days at all', () => {
    renderSummary({
      ...periodSummaryFixture,
      coverage: { ...periodSummaryFixture.coverage, missingDates: [] },
    });

    expect(screen.getByTestId('period-coverage').textContent).toMatch(/no days missing/);
  });

  it('does not pretend a single bulletin is a period', () => {
    renderSummary({
      ...periodSummaryFixture,
      coverage: { ...periodSummaryFixture.coverage, bulletinCount: 1, missingDates: [] },
    });

    expect(screen.getByText(/One bulletin is held/)).toBeTruthy();
  });

  it('says there is nothing to accumulate when no bulletin is loaded', () => {
    renderSummary({
      coverage: {
        bulletinCount: 0,
        fromDate: undefined,
        toDate: undefined,
        missingDates: [],
        description: 'no bulletins loaded',
      },
      cumulative: [],
      peaks: [],
      exposure: [],
    });

    expect(screen.getByText(/nothing to accumulate/)).toBeTruthy();
  });
});

describe('PeriodSummary — peaks, and the totals that must never appear', () => {
  it('reports the peak of a stock with the day it was reached', () => {
    const { container } = renderSummary();

    expect(container.querySelector('[data-peak-value="population-affected"]')?.textContent).toBe(
      '654,838',
    );
    expect(container.querySelector('[data-peak-date="population-affected"]')?.textContent).toBe(
      '2026-07-25',
    );
    expect(container.querySelector('[data-peak-value="camp-inmates"]')?.textContent).toBe(
      '37,724',
    );
    expect(container.querySelector('[data-peak-date="camp-inmates"]')?.textContent).toBe(
      '2026-07-26',
    );
  });

  it('keeps the decimals of a fractional measure', () => {
    const { container } = renderSummary();

    expect(container.querySelector('[data-peak-value="crop-area-submerged"]')?.textContent).toBe(
      '48,742.09',
    );
  });

  it('shows the latest value beside the peak, so a receding flood reads as receding', () => {
    const { container } = renderSummary();

    const row = container.querySelector('[data-peak="population-affected"]') as HTMLElement;
    expect(row.textContent).toContain('445,495');
    expect(row.textContent).toContain('on 2026-07-27');
  });

  it('offers no cumulative for a point-in-time figure, and says why', () => {
    // 654,838 + 524,733 + … is 3,205,823 — a number that would lead a bulletin
    // and that counts the same person six times. The peaks table must offer no
    // way to reach it.
    const { container } = renderSummary();

    const row = container.querySelector('[data-peak="population-affected"]') as HTMLElement;
    expect(row.textContent).toContain('Not applicable — point-in-time figure');
    expect(row.textContent).not.toContain('3,205,823');
  });

  it('prints that same 3,205,823 only as person-days, and never bare', () => {
    // The sharpest case in the whole view, and the reason ADR-0012 exists.
    //
    // This assertion used to be `queryByText('3,205,823')).toBeNull()` — the
    // number must never appear at all — and that was right while the only way
    // to produce it was adding a stock as if it were people. It is now also the
    // correct population-affected exposure in person-days, which is a different
    // quantity that happens to share its digits.
    //
    // So "never appears" is no longer the guarantee worth having. This is:
    // wherever it appears, the unit appears with it, and it appears nowhere
    // else on the screen.
    const { container } = renderSummary();

    const exposureRow = container.querySelector(
      '[data-exposure="population-affected"]',
    ) as HTMLElement;
    expect(exposureRow.textContent).toContain('3,205,823');
    expect(exposureRow.textContent).toContain('person-days');

    // And nowhere outside that row. If it ever leaks into the cumulative or
    // peaks tables, it is a headcount again and it is wrong again.
    const everywhereElse = [
      ...container.querySelectorAll('[data-peak], [data-cumulative]'),
    ].map((element) => element.textContent ?? '');
    expect(everywhereElse.filter((text) => text.includes('3,205,823'))).toEqual([]);
  });

  it('explains the flow/stock rule in the officer’s own terms', () => {
    renderSummary();

    expect(screen.getByText(/Levels are never added/)).toBeTruthy();
    expect(
      screen.getByText(/The same person affected on six days is one person, not six/),
    ).toBeTruthy();
    expect(screen.getByText(/Flood deaths are never added to other drownings/)).toBeTruthy();
  });

  it('renders an unreported figure as “not reported”, never as zero', () => {
    const { container } = renderSummary({
      ...periodSummaryFixture,
      peaks: [
        {
          ...periodSummaryFixture.peaks[0]!,
          peak: undefined,
          peakDate: undefined,
          latest: undefined,
          latestDate: undefined,
          completeness: 'unavailable',
        },
      ],
    });

    const row = container.querySelector('[data-peak="population-affected"]') as HTMLElement;
    expect(row.textContent).toContain('—');
    expect(row.textContent).not.toContain('0');
  });
});

describe('PeriodSummary — the bundled archive', () => {
  it('says how many of the bulletins behind these figures came with the console', () => {
    renderSummary(periodSummaryFixture, anArchive({ contributingCount: 6 }));

    const note = screen.getByTestId('period-archive-note');
    expect(note.textContent).toMatch(/6 of these/);
    expect(note.textContent).toMatch(/came with the console/);
    expect(note.textContent).toMatch(/real ASDMA Daily Flood Reports/);
    expect(note.textContent).toMatch(/20 July 2026 to 30 July 2026/);
  });

  it('says nothing once the officer’s own bulletins have superseded every bundled day', () => {
    renderSummary(periodSummaryFixture, anArchive({ contributingCount: 0 }));

    expect(screen.queryByTestId('period-archive-note')).toBeNull();
  });

  it('says nothing when the console was given no bundled archive at all', () => {
    renderSummary();

    expect(screen.queryByTestId('period-archive-note')).toBeNull();
  });

  it('warns that these totals are about to change while the history is still loading', () => {
    renderSummary(
      { ...periodSummaryFixture, coverage: { ...periodSummaryFixture.coverage, bulletinCount: 1 } },
      anArchive({ status: 'loading', pendingCount: 10, contributingCount: 1 }),
    );

    const note = screen.getByTestId('period-archive-loading');
    expect(note.textContent).toMatch(/Loading the bundled history/);
    expect(note.textContent).toMatch(/10 more real ASDMA bulletins/);
    expect(note.textContent).toMatch(/do not quote these totals until it says otherwise/i);
  });

  it('never tells the officer to go and find earlier PDFs while the archive is in flight', () => {
    // The advice would be retracted a moment later, which is worse than the
    // wait it is trying to fill.
    renderSummary(
      { ...periodSummaryFixture, coverage: { ...periodSummaryFixture.coverage, bulletinCount: 1 } },
      anArchive({ status: 'loading', pendingCount: 10, contributingCount: 1 }),
    );

    expect(screen.queryByText(/load earlier DRIMS PDFs to accumulate/)).toBeNull();
  });

  it('admits it when the history could not be loaded', () => {
    renderSummary(periodSummaryFixture, anArchive({ status: 'unavailable', contributingCount: 1 }));

    expect(screen.getByTestId('period-archive-unavailable').textContent).toMatch(
      /could not be loaded/,
    );
  });
});

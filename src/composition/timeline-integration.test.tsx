/**
 * Six real ASDMA bulletins, through the whole composition path.
 *
 * Every other test in this layer runs on figures we typed in. This one parses
 * the actual DRIMS PDFs in `fixtures/` with the real pdf.js adapter, builds the
 * real `BulletinTimeline`, and asks the real `reportToConsoleData` for the
 * console's data — so if the parser, the timeline aggregate, the flow/stock
 * classification or the view mapping disagree with the bulletins, this fails.
 *
 * The expected figures are the verified statewide totals of the six PDFs:
 *
 *   date        popAffected  campInmates  camps  floodDeaths  cropHa      districts
 *   2026-07-20       362933         9697     50            5  19099.5944         16
 *   2026-07-21       564660        12375     72           21    24210.35         16
 *   2026-07-22       653164        24418    106            9    24897.27         11
 *   2026-07-25       654838        18902     90            4     34970.8         10
 *   2026-07-26       524733        37724    109            2    48742.09          9
 *   2026-07-27       445495        28695     90            0    37139.52          6
 *
 * **23 and 24 July are deliberately left out.** The console ships with all
 * eleven consecutive days, 20 to 30 July, so a hole has to be made on purpose
 * to test for one — and it must be tested for, because interpolating across a
 * missing bulletin is the single most damaging thing this view could do.
 * Several assertions below exist only to prove nothing is drawn, summed or
 * interpolated across those two days.
 *
 * The tests that mount the whole `App` therefore inject an **empty** archive.
 * The bundled 23 and 24 July bulletins would fill the hole in — correctly, in
 * production — and there would be nothing left here to prove the guarantee
 * with. What the bundled archive does when it *is* present is asserted in
 * `app.test.tsx`.
 *
 * Injecting an empty archive does not, however, leave the console holding only
 * the officer's six. `NEWEST_BUNDLED_BULLETIN` is eager — it is in the entry
 * chunk, which is the whole point of it — so 30 July is always present and
 * cannot be withheld by a test double. The mounted tests below therefore work
 * with **seven** bulletins and a four-day hole (23, 24, 28 and 29 July), and
 * say so. Pretending otherwise would be asserting a state the console cannot
 * actually be in.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createPdfBulletinSource } from '../adapters/pdf/pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from '../adapters/pdf/pdfjs-loader';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import { bulletinTimeline, type BulletinTimeline } from '../domain/timeline/bulletin-timeline';
import { DEFAULT_ASSUMPTIONS } from './assumptions';
import type { Container } from './container';
import { App } from './app';
import { reportToConsoleData } from './report-to-console-data';
import type { ConsoleData } from '../adapters/ui/console-app';
import type { PeriodFigureViewModel, TrendMetricKey } from '../adapters/ui/view-models';

afterEach(cleanup);

const STAMPS = ['20260720', '20260721', '20260722', '20260725', '20260726', '20260727'] as const;

/**
 * jsdom's `Blob` has no `arrayBuffer`, and the adapter reads one. The port takes
 * a `Blob`; this is the smallest thing that satisfies it from a Node buffer.
 */
const asBlob = (bytes: Uint8Array): Blob =>
  ({
    type: 'application/pdf',
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  }) as unknown as Blob;

const parseFixture = async (stamp: string): Promise<FloodSituationReport> => {
  // The legacy build is the one that runs outside a browser.
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  const bytes = await readFile(
    path.resolve(import.meta.dirname, `../../fixtures/Daily_Flood_Report_${stamp}.pdf`),
  );
  const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });
  return source.parse(asBlob(bytes));
};

let reports: readonly FloodSituationReport[] = [];
let timeline: BulletinTimeline;

beforeAll(async () => {
  reports = await Promise.all(STAMPS.map(parseFixture));
  timeline = bulletinTimeline(reports);
}, 180_000);

const consoleData = (trendMetric?: TrendMetricKey): ConsoleData =>
  reportToConsoleData({
    report: timeline.latest as FloodSituationReport,
    timeline,
    assumptions: DEFAULT_ASSUMPTIONS,
    trendMetric,
  });

const seriesFor = (metric: TrendMetricKey) =>
  consoleData(metric).trend.observations.map((observation) => observation.value);

const figure = (
  rows: readonly PeriodFigureViewModel[],
  key: string,
): PeriodFigureViewModel => {
  const found = rows.find((row) => row.key === key);
  if (found === undefined) throw new Error(`no period figure for ${key}`);
  return found;
};

const cumulativeFigure = (key: string) => figure(consoleData().period.cumulative, key);
const peakFigure = (key: string) => figure(consoleData().period.peaks, key);

// ---------------------------------------------------------------------------

describe('six real bulletins — the timeline they form', () => {
  it('parses all six and orders them by report date, not by load order', () => {
    expect(timeline.reports.map((report) => String(report.reportDate))).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
    ]);
  });

  it('reports 23 and 24 July as a gap and nothing else', () => {
    const { gaps } = consoleData().trend;

    expect(gaps).toEqual([
      {
        afterDate: '2026-07-22',
        beforeDate: '2026-07-25',
        missingDates: ['2026-07-23', '2026-07-24'],
      },
    ]);
  });

  it('computes no day-over-day delta across the gap', () => {
    const spans = consoleData().trend.deltas.map((delta) => `${delta.fromDate}→${delta.toDate}`);

    expect(spans).toContain('2026-07-20→2026-07-21');
    expect(spans).toContain('2026-07-26→2026-07-27');
    // 22 → 25 is three days apart. Calling it "day-over-day" would quietly
    // divide the apparent rate of change by three.
    expect(spans).not.toContain('2026-07-22→2026-07-25');
  });
});

describe('six real bulletins — each metric plots its own series', () => {
  it('plots Population Affected', () => {
    expect(seriesFor('affectedPopulation')).toEqual([
      362_933, 564_660, 653_164, 654_838, 524_733, 445_495,
    ]);
  });

  it('plots Inmates in Relief Camps', () => {
    expect(seriesFor('campInmates')).toEqual([9_697, 12_375, 24_418, 18_902, 37_724, 28_695]);
  });

  it('plots Relief Camps', () => {
    expect(seriesFor('reliefCamps')).toEqual([50, 72, 106, 90, 109, 90]);
  });

  it('plots Crop Area Submerged, decimals intact', () => {
    const series = seriesFor('cropAreaSubmerged');
    const expected = [19_099.5944, 24_210.35, 24_897.27, 34_970.8, 48_742.09, 37_139.52];

    expect(series).toHaveLength(6);
    series.forEach((value, index) => expect(value).toBeCloseTo(expected[index] as number, 4));
  });

  it('plots Human Lives Lost — Flood', () => {
    expect(seriesFor('floodDeaths')).toEqual([5, 21, 9, 4, 2, 0]);
  });

  it('plots the derived Unsheltered Affected without reaching past the domain', () => {
    const series = seriesFor('unshelteredAffected');

    expect(series).toHaveLength(6);
    // 445,495 − 28,695 − 51,777 on the last bulletin — the headline gap.
    expect(series[5]).toBe(365_023);
  });

  it('gives a different series for a different metric — the defect this closes', () => {
    // Before the metric was wired through, every one of these was Population
    // Affected however the dropdown read.
    expect(seriesFor('campInmates')).not.toEqual(seriesFor('affectedPopulation'));
    expect(seriesFor('floodDeaths')).not.toEqual(seriesFor('affectedPopulation'));
    expect(consoleData('floodDeaths').trend.metricKey).toBe('floodDeaths');
  });
});

describe('six real bulletins — cumulative flows', () => {
  it('totals 41 flood deaths across the period', () => {
    const deaths = cumulativeFigure('flood-deaths');

    expect(deaths.cumulative).toBe(41);
    expect(deaths.cumulativeWorkings).toBe('5 + 21 + 9 + 4 + 2 + 0 = 41');
  });

  it('never quotes 41 bare: the period and its holes travel with it', () => {
    const deaths = cumulativeFigure('flood-deaths');

    expect(deaths.completeness).toBe('partial');
    expect(deaths.caveat).toContain('cumulative over 6 bulletins');
    expect(deaths.caveat).toContain('2026-07-20 to 2026-07-27');
    expect(deaths.caveat).toContain('2 days missing (2026-07-23, 2026-07-24)');
    expect(deaths.caveat).toMatch(/not in this total/);
    expect(deaths.caveat).toMatch(/Derived here, not reported by ASDMA/);
    // The caveat used to also say "District rows carried no figure for it",
    // and 41 was a floor rather than a total. That was not DRIMS being silent:
    // every District it counted as unreported on 20 and 21 July was half of a
    // wrapped name — `Karbi`, `Anglong`, `Bongaigao`, `n`, `(M)` — a row the
    // parser had invented and which therefore reported nothing. With the names
    // put back together there are no such rows, so the qualifier must be gone.
    expect(deaths.caveat).not.toMatch(/District rows carried no figure for it/);
  });

  it('keeps general drownings out of the flood-death total (PRD §4.2)', () => {
    expect(cumulativeFigure('general-drownings').cumulative).toBe(1);
    // 41, not 42. There is no measure that produces the sum.
    expect(cumulativeFigure('flood-deaths').cumulative).toBe(41);
  });

  it('totals the damage flows', () => {
    expect(cumulativeFigure('houses-fully-severely-damaged').cumulative).toBe(779);
    expect(cumulativeFigure('houses-partially-damaged').cumulative).toBe(8_087);
    expect(cumulativeFigure('huts-and-cattle-sheds-damaged').cumulative).toBe(1_958);
    expect(cumulativeFigure('big-animals-washed-away').cumulative).toBe(2_662);
    expect(cumulativeFigure('small-animals-washed-away').cumulative).toBe(7_568);
    expect(cumulativeFigure('poultry-washed-away').cumulative).toBe(46_630);
    expect(cumulativeFigure('persons-evacuated-by-boat').cumulative).toBe(167);
  });

  it('names the worst single bulletin alongside each total', () => {
    const deaths = cumulativeFigure('flood-deaths');

    expect(deaths.peak).toBe(21);
    expect(deaths.peakDate).toBe('2026-07-21');
  });
});

describe('six real bulletins — peaks, and the totals that must not exist', () => {
  it('peaks Population Affected at 654,838 on 25 July', () => {
    const affected = peakFigure('population-affected');

    expect(affected.peak).toBe(654_838);
    expect(affected.peakDate).toBe('2026-07-25');
    expect(affected.latest).toBe(445_495);
    expect(affected.latestDate).toBe('2026-07-27');
  });

  it('peaks Inmates in Relief Camps at 37,724 on 26 July', () => {
    const inmates = peakFigure('camp-inmates');

    expect(inmates.peak).toBe(37_724);
    expect(inmates.peakDate).toBe('2026-07-26');
    expect(inmates.latest).toBe(28_695);
  });

  it('peaks Crop Area Submerged at 48,742.09 ha on 26 July', () => {
    const crop = peakFigure('crop-area-submerged');

    expect(crop.peak).toBeCloseTo(48_742.09, 2);
    expect(crop.peakDate).toBe('2026-07-26');
  });

  it('peaks Relief Camps at 109 on 26 July', () => {
    expect(peakFigure('relief-camps').peak).toBe(109);
    expect(peakFigure('relief-camps').peakDate).toBe('2026-07-26');
  });

  it('offers no cumulative for any point-in-time figure', () => {
    // 362,933 + 564,660 + 653,164 + 654,838 + 524,733 + 445,495 = 3,205,823 —
    // a number seven times the true peak, counting the same people six times.
    // Nothing in the view model can produce it.
    for (const stock of consoleData().period.peaks) {
      expect(stock.kind).toBe('stock');
      expect(stock.cumulative).toBeUndefined();
    }
  });

  it('warns that the true peak may have fallen on one of the missing days', () => {
    expect(peakFigure('population-affected').caveat).toMatch(
      /may have fallen on one of the missing days/,
    );
  });

  it('states the coverage once, for the whole view', () => {
    expect(consoleData().period.coverage).toEqual({
      bulletinCount: 6,
      fromDate: '2026-07-20',
      toDate: '2026-07-27',
      missingDates: ['2026-07-23', '2026-07-24'],
      description:
        '6 bulletins, 2026-07-20 to 2026-07-27, 2 days missing (2026-07-23, 2026-07-24)',
    });
  });
});

// ---------------------------------------------------------------------------
// Driven through the console, as a user would
// ---------------------------------------------------------------------------

const aContainer = (load: Container['loadBulletin']['execute']) =>
  ({
    bulletins: { parse: vi.fn() },
    reports: {
      save: vi.fn(),
      findById: vi.fn(),
      findByDate: vi.fn(),
      findAll: vi.fn(async () => []),
      delete: vi.fn(),
    },
    clock: { now: () => new Date('2026-07-27T21:49:00+05:30') },
    storage: { durable: true },
    loadBulletin: { execute: load },
    listBulletins: { execute: vi.fn(async () => [] as readonly FloodSituationReport[]) },
    removeBulletin: { execute: vi.fn() },
    exportReport: { execute: vi.fn() },
  }) as unknown as Container;

/** No bundled history: these tests are about the officer's own six bulletins. */
const noArchive = async (): Promise<readonly FloodSituationReport[]> => [];

const dropIn = async (name: string) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('no file input rendered');
  await userEvent.upload(input, new File([new Uint8Array([1])], name, { type: 'application/pdf' }));
};

describe('six real bulletins — dropped into the console one after another', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it('shows the officer their period totals after loading all six', async () => {
    const load = vi.fn();
    for (const report of reports) load.mockResolvedValueOnce(report);
    render(<App container={aContainer(load)} loadArchive={noArchive} />);

    for (const stamp of STAMPS) await dropIn(`Daily_Flood_Report_${stamp}.pdf`);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(6));

    await userEvent.click(screen.getByRole('button', { name: /Cumulative & Peak/ }));

    await waitFor(() => expect(screen.getByTestId('period-coverage')).toBeTruthy());
    const coverage = screen.getByTestId('period-coverage');
    // Their six, plus the eager bundled 1 August that no test double can
    // withhold. Their own 27 July superseded the bundled one, so the seventh
    // bulletin is 1 August and the period runs to it.
    expect(coverage.textContent).toContain('7 bulletins');
    expect(coverage.textContent).toContain('20 July 2026 to 1 August 2026');
    // 23, 24, 28, 29, 30 and 31 July: the two they withheld on purpose, and the
    // four between their newest and the bundled 1 August.
    expect(coverage.textContent).toContain('6 days missing');
    expect(coverage.textContent).toContain(
      '2026-07-23, 2026-07-24, 2026-07-28, 2026-07-29, 2026-07-30, 2026-07-31',
    );

    // 41 across their six, plus 0 on the bundled 1 August — the second cell of
    // that bulletin's printed "Total 0 0 0 0 0 0 0 0" row, read from the PDF
    // rather than from the parser. The first day in this archive with no flood
    // death at all, so the total is unchanged by adding it and that is a fact
    // about the flood rather than a dropped term.
    expect(document.querySelector('[data-total="flood-deaths"]')?.textContent).toBe('41');
    // The peaks are unmoved: 1 August is the mildest day in this set on every
    // one of them (178,837 affected, 11,489 inmates, 15,060 Hect.).
    expect(
      document.querySelector('[data-peak-value="population-affected"]')?.textContent,
    ).toBe('654,838');
    expect(document.querySelector('[data-peak-date="population-affected"]')?.textContent).toBe(
      '2026-07-25',
    );
    expect(document.querySelector('[data-peak-value="camp-inmates"]')?.textContent).toBe(
      '37,724',
    );
    expect(document.querySelector('[data-peak-date="camp-inmates"]')?.textContent).toBe(
      '2026-07-26',
    );
    expect(document.querySelector('[data-peak-value="crop-area-submerged"]')?.textContent).toBe(
      '48,742.09',
    );

    // Exactly one bundled bulletin is left in the count. Their own 27 July
    // superseded the bundled one for that day; the eager 1 August is the only
    // point on this view they did not choose, and the console says so rather
    // than letting it pass as theirs.
    expect(screen.getByTestId('period-archive-note').textContent).toMatch(/1 of these 7/);
  }, 60_000);

  it('gives a trend on the very first upload, with 21–31 July shown as a gap', async () => {
    // The user's actual report: one bulletin loaded, no trend visible. The
    // bundled 1 August bulletin is real ASDMA data and stands as the second
    // point. With the rest of the archive withheld here, the eleven days
    // between are a genuine hole in what the console holds — and are drawn as
    // one.
    const twentieth = reports.find((report) => String(report.reportDate) === '2026-07-20');
    const load = vi.fn().mockResolvedValue(twentieth);
    render(<App container={aContainer(load)} loadArchive={noArchive} />);

    await dropIn('Daily_Flood_Report_20260720.pdf');
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));

    await waitFor(() => expect(screen.getByText(/No bulletin for/)).toBeTruthy());
    const gap = screen.getByText(/No bulletin for/).closest('li');
    expect(gap?.textContent).toContain('2026-07-21, 2026-07-22, 2026-07-23');
    expect(gap?.textContent).toContain('2026-07-31');
    expect(gap?.textContent).toContain('between 2026-07-20 and 2026-08-01');
    expect(screen.queryByText(/1 bulletin held/)).toBeNull();
    // And the console says how many of the points they did not choose.
    expect(screen.getByTestId('trend-archive-note').textContent).toMatch(/1 of the/);
  }, 60_000);

  it('changes the plotted series when the officer changes the metric', async () => {
    const load = vi.fn();
    for (const report of reports) load.mockResolvedValueOnce(report);
    render(<App container={aContainer(load)} loadArchive={noArchive} />);

    for (const stamp of STAMPS) await dropIn(`Daily_Flood_Report_${stamp}.pdf`);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(6));

    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));
    await userEvent.selectOptions(screen.getByLabelText('Metric'), 'floodDeaths');

    // 21 is the 21 July flood-death figure; it exists nowhere in the Population
    // Affected series, so the chart really did change what it is drawing.
    await waitFor(() =>
      expect(
        document.querySelector('[data-delta="2026-07-20→2026-07-21"]'),
      ).not.toBeNull(),
    );
    expect((screen.getByLabelText('Metric') as HTMLSelectElement).value).toBe('floodDeaths');
  }, 60_000);
});

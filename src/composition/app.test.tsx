/**
 * The shell, driven through the UI it hosts.
 *
 * The container is a set of doubles, so these tests assert the interactions the
 * composition root exists for: the load use case is run, the timeline
 * accumulates across loads (FR-1.7), and changing an assumption recomputes the
 * figures rather than reparsing the PDF.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { count } from '../domain/shared/quantity';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import { aReport } from '../application/services/report.fixture';
import { ARCHIVED_BULLETINS } from '../generated/bulletin-archive';
import type { Container } from './container';
import { App } from './app';

afterEach(() => {
  cleanup();
  // The console keeps the active view in the URL, so a test that navigates
  // leaves the next one starting on a different view. Reset between tests.
  window.history.replaceState({}, '', '/');
});

/** The Trend view sizes its chart with a ResponsiveContainer; jsdom has none. */
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const bulletin = (date: string, id: string, affected: number): FloodSituationReport =>
  aReport({
    bulletinId: id as FloodSituationReport['bulletinId'],
    reportDate: date as FloodSituationReport['reportDate'],
    statewideTotals: { ...aReport().statewideTotals, populationAffected: count(affected) },
  });

/**
 * A bulletin of the officer's own, dated after the bundle ends.
 *
 * The console anchors on the newest bulletin it holds, and the bundle now runs
 * to 4 August. A 27 July bulletin the officer loads is therefore *correctly*
 * outranked by the bundled 4 August one — which is right in production, and
 * useless in a test whose subject is what their own load puts on screen. Such a
 * test would silently become an assertion about the bundle instead.
 *
 * So these tests hand the officer a 5 August bulletin. Its figures are the real
 * 27 July statewide totals carried by `aReport`, which is what keeps 365,023
 * meaningful below; only the date moves, and it moves so that the bulletin
 * under test is the one the console actually anchors on.
 *
 * This date tracks the end of the bundle and must be bumped whenever the bundle
 * grows, and it has had to be twice: 31 July, then 2 August, each time because
 * the archive caught up with it and it quietly stopped being the officer's own
 * bulletin at all. That is the exact failure this indirection exists to make
 * loud rather than silent.
 */
const theirOwnBulletin = (overrides: Partial<FloodSituationReport> = {}): FloodSituationReport =>
  aReport({
    bulletinId: 'officers-own-5-august' as FloodSituationReport['bulletinId'],
    reportDate: '2026-08-05' as FloodSituationReport['reportDate'],
    ...overrides,
  });

const aContainer = (overrides: Partial<Container> = {}) => {
  const load = vi.fn(async (_file: Blob) => theirOwnBulletin());
  const list = vi.fn(async () => [] as readonly FloodSituationReport[]);

  const container = {
    bulletins: { parse: vi.fn() },
    reports: {
      save: vi.fn(),
      findById: vi.fn(),
      findByDate: vi.fn(),
      findAll: vi.fn(async () => []),
      delete: vi.fn(),
    },
    // The day after the newest bundled bulletin (4 August), so the bundle reads
    // as one day old rather than as dated in the future.
    clock: { now: () => new Date('2026-08-05T09:00:00+05:30') },
    storage: { durable: true },
    loadBulletin: { execute: load },
    listBulletins: { execute: list },
    removeBulletin: { execute: vi.fn() },
    exportReport: { execute: vi.fn() },
    ...overrides,
  } as unknown as Container;

  return { container, load, list };
};

const pdf = (name: string) => new File([new Uint8Array([1])], name, { type: 'application/pdf' });

/**
 * The historical archive, as an injected collaborator.
 *
 * `noArchive` isolates a test to the eager bulletin, so an assertion about the
 * load use case is not also an assertion about ten days of real data.
 * `theArchive` is the real generated artefact, used where the point *is* the
 * bundled history. `neverArrives` holds the console in its loading state,
 * which is a state an officer can genuinely be in and must not be guessed at.
 */
const noArchive = async (): Promise<readonly FloodSituationReport[]> => [];
const theArchive = async (): Promise<readonly FloodSituationReport[]> => ARCHIVED_BULLETINS;
const neverArrives = (): Promise<readonly FloodSituationReport[]> => new Promise(() => {});

const dropIn = async (file: File) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('no file input rendered');
  await userEvent.upload(input, file);
};

describe('App', () => {
  it('opens on the newest bundled bulletin, with the loader still to hand', async () => {
    const { container, list } = aContainer();

    render(<App container={container} />);

    // No fetch, no pdf.js, no loading state: the figures are on screen in the
    // first paint (NFR-3).
    //
    // 116,249 is the headline gap for 5 August 2026, the newest bundled day.
    // Derived from that bulletin's own printed Total rows, not from parser
    // output: 160,653 affected ("Total 73026 68273 19354 160653 16951.761")
    // − 12,356 camp inmates ("Total 12356 5653 4784 1876 36 7")
    // − 32,048 non-camp inmates ("Total 32048 12184 12730 7134 7155 6272 0")
    // = 116,249.
    expect(screen.getAllByText('116,249').length).toBeGreaterThan(0);
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(screen.getByTestId('bulletin-dropzone')).toBeTruthy();
  });

  it('never parses a PDF to show the bundled bulletins', async () => {
    const { container, list } = aContainer();

    render(<App container={container} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    // The whole point of shipping the parsed report: the default path costs
    // nothing from the `BulletinSource` port, which is where pdf.js lives.
    expect(container.bulletins.parse).not.toHaveBeenCalled();
  });

  it('does not write the bundled archive into the officer’s own store', async () => {
    const { container, list } = aContainer();

    render(<App container={container} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    // History the officer did not choose is not part of their record.
    expect(container.reports.save).not.toHaveBeenCalled();
  });

  it('runs the load use case and renders the parsed figures', async () => {
    const { container, load } = aContainer();

    render(<App container={container} />);
    await dropIn(pdf('bulletin-27.pdf'));

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(load.mock.calls[0]?.[0]).toBeInstanceOf(File);

    // The headline gap, computed by the domain and rendered by the console.
    await waitFor(() => expect(screen.getAllByText('365,023').length).toBeGreaterThan(0));
  });

  it('accumulates the timeline across loads (FR-1.7)', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(bulletin('2026-07-26', 'hash-26', 421_340))
      .mockResolvedValueOnce(bulletin('2026-07-27', 'hash-27', 445_495));
    const { container } = aContainer({
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('bulletin-26.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await dropIn(pdf('bulletin-27.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));

    await waitFor(() => expect(screen.getByText(/Day-over-day change/)).toBeTruthy());
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('2026-07-26') === true)
        .length,
    ).toBeGreaterThan(0);
    // Two bulletins a day apart: a real delta, not a gap.
    expect(screen.getByText(/No gaps/)).toBeTruthy();
  });

  it('surfaces a parse failure verbatim and adopts nothing from the failed file', async () => {
    const load = vi.fn().mockRejectedValue(new Error('This PDF has no text layer'));
    const { container } = aContainer({
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('scan.pdf'));

    await waitFor(() => expect(screen.getByText(/no text layer/)).toBeTruthy());
    // The console falls back to what it had, and still says what that is:
    // bundled history. A failed parse never promotes itself to a bulletin.
    expect(screen.getByTestId('staleness-banner').getAttribute('data-origin')).toBe(
      'bundled-archive',
    );
  });

  it('restores bulletins kept from a previous session', async () => {
    const { container } = aContainer({
      listBulletins: {
        execute: vi.fn(async () => [theirOwnBulletin()]),
      } as unknown as Container['listBulletins'],
    });

    render(<App container={container} />);

    await waitFor(() => expect(screen.getAllByText('365,023').length).toBeGreaterThan(0));
  });

  it('recomputes the derived figures when an assumption changes, without reparsing', async () => {
    const { container, load } = aContainer();

    render(<App container={container} />);
    await dropIn(pdf('bulletin-27.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: /Response Capacity/ }));
    await waitFor(() => expect(screen.getAllByText(/6\.9 days/).length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText(/Rice per person per day/i), {
      target: { value: '1' },
    });

    await waitFor(() => expect(screen.getAllByText(/4\.2 days/).length).toBeGreaterThan(0));
    expect(load).toHaveBeenCalledTimes(1);
  });
});

/**
 * The bundled archive, and the safety control that stops it going stale in
 * silence. These are composition-root tests because the age assessment needs
 * three things only this layer has together: the timeline, the `Clock` port,
 * and the knowledge of which bulletins the officer loaded themselves.
 */
describe('App — the bundled archive and its age', () => {
  const atAssamTime = (iso: string) => ({
    clock: { now: () => new Date(iso) } as Container['clock'],
  });

  const banner = () => screen.getByTestId('staleness-banner');
  const openTrend = () => userEvent.click(screen.getByRole('button', { name: /Trend/ }));

  it('opens on seventeen consecutive real ASDMA bulletins, with no gaps', async () => {
    // The whole point of shipping the archive: a link someone is sent opens on
    // a working sixteen-day trend, not on a blank console they must populate.
    //
    // Seventeen, and consecutive. 28 July was briefly absent — the file uploaded
    // under that name was a 9 kB HTML page from the ASDMA website rather than a
    // PDF, and the sync rightly refused it — so for a while the bundle carried
    // a genuine one-day hole. The real bulletin has since been uploaded. This
    // assertion is what stops the console quietly going back to claiming an
    // unbroken run it does not have.
    //
    // The run now crosses a month boundary, which is the other way an unbroken
    // one can be made to look broken: 31 July to 1 August is a single step.
    const { container } = aContainer();

    render(<App container={container} loadArchive={theArchive} />);
    await openTrend();

    await waitFor(() =>
      expect(screen.getByTestId('trend-archive-note').textContent).toMatch(/17 of the 17/),
    );
    expect(screen.getByText(/No gaps/)).toBeTruthy();
    expect(screen.queryByText(/bulletin held\./)).toBeNull();
  });

  it('draws a delta for every one of the sixteen day-over-day steps, and none across a hole', async () => {
    const { container } = aContainer();

    const { container: dom } = render(<App container={container} loadArchive={theArchive} />);
    await openTrend();

    await waitFor(() =>
      expect(dom.querySelector('[data-delta="2026-07-20→2026-07-21"]')).not.toBeNull(),
    );
    for (const [from, to] of [
      ['2026-07-21', '2026-07-22'],
      ['2026-07-22', '2026-07-23'],
      ['2026-07-23', '2026-07-24'],
      ['2026-07-24', '2026-07-25'],
      ['2026-07-25', '2026-07-26'],
      ['2026-07-26', '2026-07-27'],
      ['2026-07-27', '2026-07-28'],
      ['2026-07-28', '2026-07-29'],
      ['2026-07-29', '2026-07-30'],
      // The month boundary. 31 July → 1 August is one step like any other, and
      // the only one that day-of-month arithmetic gets wrong.
      ['2026-07-30', '2026-07-31'],
      ['2026-07-31', '2026-08-01'],
      ['2026-08-01', '2026-08-02'],
      ['2026-08-02', '2026-08-03'],
      ['2026-08-03', '2026-08-04'],
    ]) {
      expect(dom.querySelector(`[data-delta="${from}→${to}"]`)).not.toBeNull();
    }

    // Sixteen steps across seventeen days, and not one more. A delta that skipped
    // a day would divide the apparent rate of change by the size of the hole, so
    // the spans that would exist only if a day were missing must not be drawn.
    expect(dom.querySelector('[data-delta="2026-07-27→2026-07-29"]')).toBeNull();
    expect(dom.querySelector('[data-delta="2026-07-28→2026-07-30"]')).toBeNull();
    expect(dom.querySelector('[data-delta="2026-07-30→2026-08-01"]')).toBeNull();
  });

  it('has a meaningful Cumulative & Peak on first load, with the flow/stock rule intact', async () => {
    const { container } = aContainer();

    const { container: dom } = render(<App container={container} loadArchive={theArchive} />);
    await userEvent.click(screen.getByRole('button', { name: /Cumulative/ }));

    // Population Affected is a stock: peaked at 721,024 on 23 July, and has no
    // total anywhere in this console because the same person affected on
    // seventeen days is one person.
    //
    // 721,024 is still the peak after the archive grew to seventeen days, and
    // that is a fact about the bulletins rather than an assumption carried over.
    // Every day's printed `Total Population` cell was read from the PDF text
    // layer without this parser: 362,933 / 564,660 / 653,164 / **721,024** /
    // 705,148 / 654,838 / 524,733 / 445,495 / 332,639 / 300,031 / 212,441 /
    // 192,799 / 178,837 / 136,203 / 128,072 / 122,137. The 23rd is the maximum
    // of those seventeen, and the flood has receded monotonically since the 24th
    // — every one of the nine newest days is smaller than the day before.
    await waitFor(() =>
      expect(dom.querySelector('[data-peak-value="population-affected"]')?.textContent).toBe(
        '721,024',
      ),
    );
    expect(dom.querySelector('[data-peak-date="population-affected"]')?.textContent).toBe(
      '2026-07-23',
    );
    expect(dom.querySelector('[data-total="population-affected"]')).toBeNull();

    // Inmates in Relief Camps is a stock too, and it peaks on a different day —
    // camps fill after the water rises, which is the point of showing both.
    // 37,724 on the 26th still leads: the printed camp-inmate totals for the
    // eight days added since are 32,477 (28 Jul), 16,567 (29 Jul), 13,294
    // (30 Jul), 12,994 (31 Jul), 11,489 (1 Aug), 10,844 (2 Aug), 11,066
    // (3 Aug) and 12,382 (4 Aug), all below it. Note the last three tick back
    // up while the affected population keeps falling — people moving into
    // camps as the water recedes, which is exactly the lag this view exists
    // to show.
    expect(dom.querySelector('[data-peak-value="camp-inmates"]')?.textContent).toBe('37,724');
    expect(dom.querySelector('[data-peak-date="camp-inmates"]')?.textContent).toBe('2026-07-26');

    // Relief Camps peaks at 109 on the 26th and is untouched by the newer
    // bulletins: the printed camp counts since are 90, 81, 71, 62, 54, 44, 39,
    // 38 and 39.
    expect(dom.querySelector('[data-peak-value="relief-camps"]')?.textContent).toBe('109');
    expect(dom.querySelector('[data-peak-date="relief-camps"]')?.textContent).toBe('2026-07-26');

    // Crop Area Submerged peaks on a third day again — 24 July, at 56,606.777
    // Hect., rounded to 56,606.78 for display. Worth pinning explicitly,
    // because 48,742.09 on the 26th is the figure a six-bulletin timeline that
    // omits 23 and 24 July produces (see `timeline-integration.test.tsx`), and
    // the two are easy to confuse. Over the full seventeen days the printed crop
    // totals are 19,099.5944 / 24,210.35 / 24,897.27 / 25,375.443 /
    // **56,606.777** / 34,970.8 / 48,742.09 / 37,139.52 / 45,341.98 /
    // 21,523.08 / 17,198.09 / 15,430 / 15,060 / 15,422 / 14,230.148 /
    // 15,342.92, and the 24th leads them.
    expect(dom.querySelector('[data-peak-value="crop-area-submerged"]')?.textContent).toBe(
      '56,606.78',
    );
    expect(dom.querySelector('[data-peak-date="crop-area-submerged"]')?.textContent).toBe(
      '2026-07-24',
    );

    // And it covers a real period with nothing missing from it.
    expect(screen.getByTestId('period-coverage').textContent).toMatch(
      /Computed across 17 bulletins/,
    );
    expect(screen.getByTestId('period-coverage').textContent).toMatch(/no days missing/);
  });

  it('totals the flood deaths as a flow across all seventeen days', async () => {
    // Split out of the peaks above because it is the one Cumulative & Peak
    // figure that *sums* across every day, so it is the one a single broken
    // bulletin silently shrinks. It did: while 28 July parsed to a husk this
    // total read 66, with the console honestly noting that one loaded bulletin
    // did not report the measure. That note is the only thing that stood
    // between a wrong toll and a plausible one.
    //
    // The expected figure is not parser output. Every term is the second cell —
    // the Flood Death column — of that bulletin's own printed `Total` row in
    // the Human Lives Lost - Flood section, read through the text layer:
    //
    //   20 Jul  5     23 Jul  6  ("Total 6 6 0 3 1 1 1 0")
    //   21 Jul 21     24 Jul 14  ("Total 14 14 0 11 3 0 0 0")
    //   22 Jul  9     25 Jul  4      26 Jul  2      27 Jul  0
    //   28 Jul  7  ("Total 7 7 0 3 4 0 0 0")
    //   29 Jul  3  ("Total 3 3 0 2 1 0 0 0")
    //   30 Jul  2  ("Total 2 2 0 0 1 1 0 0")
    //   31 Jul  2  ("Total 2 2 0 2 0 0 0 0")
    //    1 Aug  0  ("Total 0 0 0 0 0 0 0 0")
    //    2 Aug  3  ("Total 3 3 0 2 1 0 0 0")
    //    3 Aug  3  ("Total 3 3 0 1 1 0 1 0")
    //    4 Aug  2  ("Total 2 2 0 1 0 1 0 0")
    //    5 Aug  5  ("Total 5 5 0 4 1 0 0 0")
    //
    // 5 + 21 + 9 + 6 + 14 + 4 + 2 + 0 + 7 + 3 + 2 + 2 + 0 + 3 + 3 + 2 + 5 = 88.
    //
    // Never added to general drownings — the type has no `total` (PRD §4.2).
    const { container } = aContainer();

    const { container: dom } = render(<App container={container} loadArchive={theArchive} />);
    await userEvent.click(screen.getByRole('button', { name: /Cumulative/ }));

    await waitFor(() =>
      expect(dom.querySelector('[data-cumulative="flood-deaths"]')).not.toBeNull(),
    );
    const deaths = dom.querySelector('[data-cumulative="flood-deaths"]') as HTMLElement;
    expect(deaths.textContent).toMatch(
      /5 \+ 21 \+ 9 \+ 6 \+ 14 \+ 4 \+ 2 \+ 0 \+ 7 \+ 3 \+ 2 \+ 2 \+ 0 \+ 3 \+ 3 \+ 2 \+ 5 = 88/,
    );
    expect(dom.querySelector('[data-total="flood-deaths"]')?.textContent).toBe('88');
    // 88 no longer carries the "true figure is higher" caveat, and that is a
    // repair rather than a loss of caution. The caveat fired because Districts
    // reported no flood-death figure — but every such District was half of a
    // wrapped name, a row the parser had invented, which of course reported
    // nothing. With the names put back together every District in all seventeen
    // bulletins carries a figure, so 88 is the toll and not a floor. 5 August
    // nearly broke that: a wrapped NAME LIST published an eighteenth District
    // that reported nothing, and the caveat came straight back. Repaired at
    // source in `resolveWrappedNameList`, which is why this assertion still
    // holds rather than having been relaxed.
    expect(deaths.textContent).not.toMatch(/the true figure is higher/);
  });

  it('renders figures immediately and says the history is still on its way', async () => {
    // First paint holds one bulletin and is about to hold seventeen. Announcing
    // a count it is about to change would teach the officer to distrust the
    // console's own account of what it holds.
    const { container } = aContainer();

    render(<App container={container} loadArchive={neverArrives} />);

    // Real figures, in the first paint, with no waiting — the 4 August headline
    // gap, 122,137 − 12,382 − 5,475.
    expect(screen.getAllByText('116,249').length).toBeGreaterThan(0);

    await openTrend();
    const note = screen.getByTestId('trend-archive-loading');
    expect(note.textContent).toMatch(/Loading the bundled history/);
    // Sixteen: every bundled day but the eager one, already on screen.
    expect(note.textContent).toMatch(/16 more real ASDMA bulletins/);
    expect(screen.queryByText(/1 bulletin held/)).toBeNull();
  });

  it('replaces the loading note with the real history the moment it arrives', async () => {
    let deliver: (reports: readonly FloodSituationReport[]) => void = () => {};
    const arriving = new Promise<readonly FloodSituationReport[]>((resolve) => {
      deliver = resolve;
    });
    const loadArchive = () => arriving;
    const { container } = aContainer();

    render(<App container={container} loadArchive={loadArchive} />);
    await openTrend();
    expect(screen.getByTestId('trend-archive-loading')).toBeTruthy();

    deliver(ARCHIVED_BULLETINS);

    await waitFor(() => expect(screen.queryByTestId('trend-archive-loading')).toBeNull());
    expect(screen.getByTestId('trend-archive-note').textContent).toMatch(/17 of the 17/);
    expect(screen.getByText(/No gaps/)).toBeTruthy();
  });

  it('says the history could not be loaded rather than looking like a one-bulletin console', async () => {
    const failing = () => Promise.reject(new Error('chunk load failed'));
    const { container } = aContainer();

    render(<App container={container} loadArchive={failing} />);

    // The figures it does hold are still real, and still on screen — the eager
    // 4 August bulletin's headline gap.
    expect(screen.getAllByText('116,249').length).toBeGreaterThan(0);

    await openTrend();
    await waitFor(() =>
      expect(screen.getByTestId('trend-archive-unavailable').textContent).toMatch(
        /could not be loaded/,
      ),
    );
  });

  it('frames the archive as bundled history, not as today’s situation', async () => {
    // 5 August: the day the newest bundled bulletin is dated, so the archive is
    // genuinely current rather than merely future-dated.
    const { container, list } = aContainer(atAssamTime('2026-08-05T09:00:00+05:30'));

    render(<App container={container} loadArchive={theArchive} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    expect(banner().getAttribute('data-origin')).toBe('bundled-archive');
    expect(banner().textContent).toMatch(/the archive that ships with this console/);
    expect(banner().textContent).toMatch(/Load today’s bulletin for live figures/);
    // On its own day it is genuinely current; crying wolf here would teach
    // officers to ignore the banner when it matters.
    expect(banner().getAttribute('data-level')).toBe('current');
  });

  it('says in plain words how old the bundled archive has become', async () => {
    const { container, list } = aContainer(atAssamTime('2026-09-05T09:00:00+05:30'));

    render(<App container={container} loadArchive={theArchive} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    // 5 August to 5 September is 31 days — August has 31.
    expect(banner().textContent).toMatch(/This bulletin is 31 days old/);
    expect(banner().getAttribute('data-level')).toBe('obsolete');
    expect(banner().textContent).toMatch(/Do not use these figures for current decisions/);
    expect(banner().getAttribute('role')).toBe('alert');
  });

  it('escalates through the bands as the same console is reopened later', async () => {
    const levelOn = async (iso: string): Promise<string | null> => {
      cleanup();
      const { container, list } = aContainer(atAssamTime(iso));
      render(<App container={container} loadArchive={theArchive} />);
      await waitFor(() => expect(list).toHaveBeenCalled());
      return banner().getAttribute('data-level');
    };

    // Ages measured against the newest bundled bulletin, 5 August, and placed in
    // the bands `STALENESS_BANDS` defines: current 0–1, ageing 2–3, stale 4–14,
    // obsolete beyond. The dates below are 1, 2, 6 and 91 days after it.
    expect(await levelOn('2026-08-06T09:00:00+05:30')).toBe('current');
    expect(await levelOn('2026-08-07T09:00:00+05:30')).toBe('ageing');
    expect(await levelOn('2026-08-11T09:00:00+05:30')).toBe('stale');
    expect(await levelOn('2026-11-04T09:00:00+05:30')).toBe('obsolete');
  });

  it('is superseded, day for day, by a bulletin the officer loads for an archived date', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-07-23', 'officers-own-copy', 721_024));
    const { container } = aContainer({
      ...atAssamTime('2026-08-04T20:07:00+05:30'),
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} loadArchive={theArchive} />);
    await dropIn(pdf('Daily_Flood_Report_20260723.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await openTrend();

    // Still seventeen days — their 23 July replaced the bundled one rather than
    // adding a seventeenth, exactly as the BulletinTimeline aggregate specifies.
    // Sixteen of the seventeen points are now bundled; the seventeenth is theirs.
    await waitFor(() =>
      expect(screen.getByTestId('trend-archive-note').textContent).toMatch(/16 of the 17/),
    );
    expect(screen.getByText(/No gaps/)).toBeTruthy();
  });

  it('follows the newest bulletin held, whether they loaded it or it came bundled', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-11-03', 'todays-bulletin', 12_000));
    const { container } = aContainer({
      ...atAssamTime('2026-11-03T09:00:00+05:30'),
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} loadArchive={theArchive} />);

    // Bundled history anchors the console until they load something newer.
    await waitFor(() => expect(banner().getAttribute('data-origin')).toBe('bundled-archive'));
    expect(banner().getAttribute('data-level')).toBe('obsolete');

    await dropIn(pdf('Daily_Flood_Report_20261103.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // And hands over the moment there is one.
    await waitFor(() =>
      expect(banner().textContent).toMatch(/Assam Flood Report as on 3 November 2026/),
    );
    expect(banner().getAttribute('data-origin')).toBe('loaded');
  });

  it('never lets bundled history make a stale console look current', async () => {
    // The hazard in shipping an archive: an officer opens the console in
    // November, sees seventeen days of confident figures, and is not told they
    // are three months old. Staleness is measured against the newest bulletin
    // held, which here is 5 August — 91 days back (26 + 30 + 31 + 4).
    const { container, list } = aContainer(atAssamTime('2026-11-04T09:00:00+05:30'));

    render(<App container={container} loadArchive={theArchive} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    expect(banner().getAttribute('data-level')).toBe('obsolete');
    expect(banner().textContent).toMatch(/91 days old/);
  });

  it('never lets bundled history make a current console look stale either', async () => {
    // The converse, and just as important: an officer holding today's bulletin
    // must not be warned about the July archive sitting behind it.
    const load = vi.fn().mockResolvedValue(bulletin('2026-11-03', 'todays-bulletin', 12_000));
    const { container } = aContainer({
      ...atAssamTime('2026-11-03T09:00:00+05:30'),
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} loadArchive={theArchive} />);
    await dropIn(pdf('Daily_Flood_Report_20261103.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(banner().getAttribute('data-level')).toBe('current'));
    expect(banner().getAttribute('role')).toBe('status');
  });

  it('lets the officer clear the bundled history, leaving their own record alone', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-07-20', 'asdma-20-july', 362_933));
    const { container } = aContainer({
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} loadArchive={theArchive} />);
    await dropIn(pdf('Daily_Flood_Report_20260720.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await openTrend();

    await userEvent.click(screen.getByRole('button', { name: 'Clear the bundled history' }));

    // Their own 20 July bulletin, and nothing else.
    await waitFor(() => expect(screen.getByText(/1 bulletin held/)).toBeTruthy());
    expect(screen.queryByTestId('trend-archive-note')).toBeNull();
    expect(screen.queryByText(/No bulletin for/)).toBeNull();
    expect(banner().getAttribute('data-origin')).toBe('loaded');
  });

  it('offers no way to clear it while there would be nothing left to show', async () => {
    const { container } = aContainer();

    render(<App container={container} loadArchive={theArchive} />);
    await openTrend();

    await waitFor(() => expect(screen.getByTestId('trend-archive-note')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Clear the bundled history' })).toBeNull();
  });

  it('reads a restored bulletin as one the officer loaded, however old it is', async () => {
    // Their restored bulletin has to outrank the bundle for this test to be
    // about restoration at all — a 27 July one would be superseded by the
    // bundled 4 August and the banner would correctly say `bundled-archive`.
    const { container } = aContainer({
      ...atAssamTime('2026-08-30T09:00:00+05:30'),
      listBulletins: {
        execute: vi.fn(async () => [theirOwnBulletin()]),
      } as unknown as Container['listBulletins'],
    });

    render(<App container={container} loadArchive={theArchive} />);

    // An old bulletin the officer chose is a different situation from bundled
    // history: their source is out of date, not their console. 5 August to
    // 30 August is 25 days.
    await waitFor(() => expect(banner().getAttribute('data-origin')).toBe('loaded'));
    expect(banner().textContent).toMatch(/You loaded this bulletin/);
    expect(banner().textContent).not.toMatch(/the archive that ships with this console/);
    expect(banner().textContent).toMatch(/This bulletin is 25 days old/);
  });

  it('takes its clock from the container, never from the system', async () => {
    // The banner is only a safety control if it can be tested at an arbitrary
    // date. Two different injected clocks, two different answers. Both are
    // measured against the eager 5 August bulletin, which is all `noArchive`
    // leaves the console holding.
    const early = aContainer(atAssamTime('2026-08-05T09:00:00+05:30'));
    render(<App container={early.container} loadArchive={noArchive} />);
    await waitFor(() => expect(early.list).toHaveBeenCalled());
    expect(banner().getAttribute('data-level')).toBe('current');

    cleanup();

    // 2026-08-05 to 2027-08-05 is 365 days — 2027 is not a leap year.
    const late = aContainer(atAssamTime('2027-08-05T09:00:00+05:30'));
    render(<App container={late.container} loadArchive={noArchive} />);
    await waitFor(() => expect(late.list).toHaveBeenCalled());
    expect(banner().getAttribute('data-level')).toBe('obsolete');
    expect(banner().textContent).toMatch(/365 days old/);
  });
});

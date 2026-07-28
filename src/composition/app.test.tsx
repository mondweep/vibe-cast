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

const aContainer = (overrides: Partial<Container> = {}) => {
  const load = vi.fn(async (_file: Blob) => aReport());
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
    clock: { now: () => new Date('2026-07-27T21:49:00+05:30') },
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
 * load use case is not also an assertion about seven days of real data.
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
    // first paint (NFR-3). 365,023 is the headline gap for 27 July 2026.
    expect(screen.getAllByText('365,023').length).toBeGreaterThan(0);
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
        execute: vi.fn(async () => [aReport()]),
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

  it('opens on eight consecutive real ASDMA bulletins, with no gaps', async () => {
    // The whole point of shipping the archive: a link someone is sent opens on
    // a working seven-day trend, not on a blank console they must populate.
    const { container } = aContainer();

    render(<App container={container} loadArchive={theArchive} />);
    await openTrend();

    await waitFor(() =>
      expect(screen.getByTestId('trend-archive-note').textContent).toMatch(/8 of the 8/),
    );
    expect(screen.getByText(/No gaps/)).toBeTruthy();
    expect(screen.queryByText(/bulletin held\./)).toBeNull();
  });

  it('draws a delta for every one of the seven day-over-day steps', async () => {
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
    ]) {
      expect(dom.querySelector(`[data-delta="${from}→${to}"]`)).not.toBeNull();
    }
  });

  it('has a meaningful Cumulative & Peak on first load, with the flow/stock rule intact', async () => {
    const { container } = aContainer();

    const { container: dom } = render(<App container={container} loadArchive={theArchive} />);
    await userEvent.click(screen.getByRole('button', { name: /Cumulative/ }));

    // Population Affected is a stock: peaked at 721,024 on 23 July, and has no
    // total anywhere in this console because the same person affected on eight
    // days is one person.
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
    expect(dom.querySelector('[data-peak-date="camp-inmates"]')?.textContent).toBe('2026-07-26');

    // Flood deaths are a flow, so they are added across the eight days.
    const deaths = dom.querySelector('[data-cumulative="flood-deaths"]') as HTMLElement;
    expect(deaths.textContent).toMatch(/5 \+ 21 \+ 9 \+ 6 \+ 14 \+ 4 \+ 2 \+ 0 = 61/);
    expect(dom.querySelector('[data-total="flood-deaths"]')?.textContent).toBe('61');
    // And the total still carries its caveat: 12 District rows reported no
    // figure, so 61 is a floor, not the toll (ADR-0005).
    expect(deaths.textContent).toMatch(/the true figure is higher/);

    // And it covers a real period with nothing missing from it.
    expect(screen.getByTestId('period-coverage').textContent).toMatch(
      /Computed across 8 bulletins/,
    );
    expect(screen.getByTestId('period-coverage').textContent).toMatch(/no days missing/);
  });

  it('renders figures immediately and says the history is still on its way', async () => {
    // First paint holds one bulletin and is about to hold eight. Announcing a
    // count it is about to change would teach the officer to distrust the
    // console's own account of what it holds.
    const { container } = aContainer();

    render(<App container={container} loadArchive={neverArrives} />);

    // Real figures, in the first paint, with no waiting.
    expect(screen.getAllByText('365,023').length).toBeGreaterThan(0);

    await openTrend();
    const note = screen.getByTestId('trend-archive-loading');
    expect(note.textContent).toMatch(/Loading the bundled history/);
    expect(note.textContent).toMatch(/7 more real ASDMA bulletins/);
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
    expect(screen.getByTestId('trend-archive-note').textContent).toMatch(/8 of the 8/);
    expect(screen.getByText(/No gaps/)).toBeTruthy();
  });

  it('says the history could not be loaded rather than looking like a one-bulletin console', async () => {
    const failing = () => Promise.reject(new Error('chunk load failed'));
    const { container } = aContainer();

    render(<App container={container} loadArchive={failing} />);

    // The figures it does hold are still real, and still on screen.
    expect(screen.getAllByText('365,023').length).toBeGreaterThan(0);

    await openTrend();
    await waitFor(() =>
      expect(screen.getByTestId('trend-archive-unavailable').textContent).toMatch(
        /could not be loaded/,
      ),
    );
  });

  it('frames the archive as bundled history, not as today’s situation', async () => {
    const { container, list } = aContainer(atAssamTime('2026-07-27T09:00:00+05:30'));

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
    const { container, list } = aContainer(atAssamTime('2026-08-30T09:00:00+05:30'));

    render(<App container={container} loadArchive={theArchive} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    expect(banner().textContent).toMatch(/This bulletin is 34 days old/);
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

    expect(await levelOn('2026-07-28T09:00:00+05:30')).toBe('current');
    expect(await levelOn('2026-07-29T09:00:00+05:30')).toBe('ageing');
    expect(await levelOn('2026-08-02T09:00:00+05:30')).toBe('stale');
    expect(await levelOn('2026-11-03T09:00:00+05:30')).toBe('obsolete');
  });

  it('is superseded, day for day, by a bulletin the officer loads for an archived date', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-07-23', 'officers-own-copy', 721_024));
    const { container } = aContainer({
      ...atAssamTime('2026-07-27T21:49:00+05:30'),
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} loadArchive={theArchive} />);
    await dropIn(pdf('Daily_Flood_Report_20260723.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await openTrend();

    // Still eight days — their 23 July replaced the bundled one rather than
    // adding a ninth, exactly as the BulletinTimeline aggregate specifies.
    await waitFor(() =>
      expect(screen.getByTestId('trend-archive-note').textContent).toMatch(/7 of the 8/),
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
    // November, sees eight days of confident figures, and is not told they are
    // four months old. Staleness is measured against the newest bulletin held,
    // which here is a July one.
    const { container, list } = aContainer(atAssamTime('2026-11-03T09:00:00+05:30'));

    render(<App container={container} loadArchive={theArchive} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    expect(banner().getAttribute('data-level')).toBe('obsolete');
    expect(banner().textContent).toMatch(/99 days old/);
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
    const { container } = aContainer({
      ...atAssamTime('2026-08-30T09:00:00+05:30'),
      listBulletins: {
        execute: vi.fn(async () => [aReport()]),
      } as unknown as Container['listBulletins'],
    });

    render(<App container={container} loadArchive={theArchive} />);

    // An old bulletin the officer chose is a different situation from bundled
    // history: their source is out of date, not their console.
    await waitFor(() => expect(banner().getAttribute('data-origin')).toBe('loaded'));
    expect(banner().textContent).toMatch(/You loaded this bulletin/);
    expect(banner().textContent).not.toMatch(/the archive that ships with this console/);
    expect(banner().textContent).toMatch(/This bulletin is 34 days old/);
  });

  it('takes its clock from the container, never from the system', async () => {
    // The banner is only a safety control if it can be tested at an arbitrary
    // date. Two different injected clocks, two different answers.
    const early = aContainer(atAssamTime('2026-07-27T09:00:00+05:30'));
    render(<App container={early.container} loadArchive={noArchive} />);
    await waitFor(() => expect(early.list).toHaveBeenCalled());
    expect(banner().getAttribute('data-level')).toBe('current');

    cleanup();

    const late = aContainer(atAssamTime('2027-07-27T09:00:00+05:30'));
    render(<App container={late.container} loadArchive={noArchive} />);
    await waitFor(() => expect(late.list).toHaveBeenCalled());
    expect(banner().getAttribute('data-level')).toBe('obsolete');
    expect(banner().textContent).toMatch(/365 days old/);
  });
});

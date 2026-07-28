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
import type { Container } from './container';
import { App } from './app';

afterEach(cleanup);

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

const dropIn = async (file: File) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('no file input rendered');
  await userEvent.upload(input, file);
};

describe('App', () => {
  it('opens on the bundled bulletin, with the loader still to hand', async () => {
    const { container, list } = aContainer();

    render(<App container={container} />);

    // No fetch, no pdf.js, no loading state: the figures are on screen in the
    // first paint (NFR-3). 365,023 is the headline gap for 27 July 2026.
    expect(screen.getAllByText('365,023').length).toBeGreaterThan(0);
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(screen.getByTestId('bulletin-dropzone')).toBeTruthy();
  });

  it('never parses a PDF to show the bundled bulletin', async () => {
    const { container, list } = aContainer();

    render(<App container={container} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    // The whole point of shipping the parsed report: the default path costs
    // nothing from the `BulletinSource` port, which is where pdf.js lives.
    expect(container.bulletins.parse).not.toHaveBeenCalled();
  });

  it('does not write the bundled example into the officer’s own store', async () => {
    const { container, list } = aContainer();

    render(<App container={container} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    // A worked example the officer did not choose is not part of their record.
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
    // The console falls back to what it had, and still says what that is: the
    // bundled example. A failed parse never promotes itself to a bulletin.
    expect(screen.getByTestId('staleness-banner').getAttribute('data-origin')).toBe(
      'bundled-sample',
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
 * The bundled bulletin, and the safety control that stops it going stale in
 * silence. These are composition-root tests because the age assessment needs
 * three things only this layer has together: the timeline, the `Clock` port,
 * and the knowledge of whether the officer loaded anything.
 */
describe('App — the bundled bulletin and its age', () => {
  const atAssamTime = (iso: string) => ({
    clock: { now: () => new Date(iso) } as Container['clock'],
  });

  const banner = () => screen.getByTestId('staleness-banner');

  it('frames the bundled bulletin as a worked example, not as today’s situation', async () => {
    const { container, list } = aContainer(atAssamTime('2026-07-27T09:00:00+05:30'));

    render(<App container={container} />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    expect(banner().getAttribute('data-origin')).toBe('bundled-sample');
    expect(banner().textContent).toMatch(/so you can see the console working/);
    expect(banner().textContent).toMatch(/Load today’s bulletin for live figures/);
    // On its own day it is genuinely current; crying wolf here would teach
    // officers to ignore the banner when it matters.
    expect(banner().getAttribute('data-level')).toBe('current');
  });

  it('says in plain words how old the bundled bulletin has become', async () => {
    const { container, list } = aContainer(atAssamTime('2026-08-30T09:00:00+05:30'));

    render(<App container={container} />);
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
      render(<App container={container} />);
      await waitFor(() => expect(list).toHaveBeenCalled());
      return banner().getAttribute('data-level');
    };

    expect(await levelOn('2026-07-28T09:00:00+05:30')).toBe('current');
    expect(await levelOn('2026-07-29T09:00:00+05:30')).toBe('ageing');
    expect(await levelOn('2026-08-02T09:00:00+05:30')).toBe('stale');
    expect(await levelOn('2026-11-03T09:00:00+05:30')).toBe('obsolete');
  });

  it('is superseded by a bulletin the officer loads for the same date', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-07-27', 'officers-own-copy', 445_495));
    const { container } = aContainer({
      ...atAssamTime('2026-07-27T21:49:00+05:30'),
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('Daily_Flood_Report_20260727.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // One bulletin for 27 July, and it is the officer's — exactly what the
    // BulletinTimeline aggregate specifies for a re-issued day.
    await waitFor(() => expect(banner().getAttribute('data-origin')).toBe('loaded'));
    expect(banner().textContent).toMatch(/You loaded this bulletin/);

    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));
    expect(screen.getByText(/1 bulletin loaded/)).toBeTruthy();
  });

  it('keeps showing a trend the moment one earlier bulletin is loaded', async () => {
    // The defect this replaces: loading a bulletin took the console from one
    // bulletin to one bulletin, so the commonest first action a user takes
    // produced no trend at all. The shipped 27 July example is real ASDMA data
    // and stays on the chart as the second point.
    const load = vi.fn().mockResolvedValue(bulletin('2026-07-20', 'asdma-20-july', 362_933));
    const { container } = aContainer({
      ...atAssamTime('2026-07-27T21:49:00+05:30'),
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('Daily_Flood_Report_20260720.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // The bulletin they just dropped in is the one on screen — not the example.
    await waitFor(() =>
      expect(banner().textContent).toMatch(/Assam Flood Report as on 20 July 2026/),
    );
    expect(banner().getAttribute('data-origin')).toBe('loaded');

    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));

    // Two points, and the six days ASDMA did not report between them read as a
    // gap — never as a line drawn from the 20th to the 27th.
    expect(screen.queryByText(/1 bulletin loaded/)).toBeNull();
    const gap = screen.getByText(/No bulletin for/).closest('li');
    expect(gap?.textContent).toContain('2026-07-21');
    expect(gap?.textContent).toContain('2026-07-26');
    expect(gap?.textContent).toContain('between 2026-07-20 and 2026-07-27');
  });

  it('says on the chart which point the officer did not load', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-07-20', 'asdma-20-july', 362_933));
    const { container } = aContainer({
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('Daily_Flood_Report_20260720.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));

    expect(screen.getByTestId('trend-sample-note').textContent).toContain('2026-07-27');
  });

  it('lets the officer remove the example, leaving their own record alone', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-07-20', 'asdma-20-july', 362_933));
    const { container } = aContainer({
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('Daily_Flood_Report_20260720.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Remove the example' }));

    await waitFor(() => expect(screen.getByText(/1 bulletin loaded/)).toBeTruthy());
    expect(screen.queryByTestId('trend-sample-note')).toBeNull();
    expect(screen.queryByText(/No bulletin for/)).toBeNull();
  });

  it('retires the example once the officer holds two bulletins of their own', async () => {
    // Its job in the timeline is to make a comparison possible at all. Once
    // their own record can show a trend, the demonstration is over.
    const load = vi
      .fn()
      .mockResolvedValueOnce(bulletin('2026-07-20', 'asdma-20', 362_933))
      .mockResolvedValueOnce(bulletin('2026-07-21', 'asdma-21', 564_660));
    const { container } = aContainer({
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    const { container: dom } = render(<App container={container} />);
    await dropIn(pdf('bulletin-20.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await dropIn(pdf('bulletin-21.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));

    await waitFor(() => expect(screen.getByText(/No gaps/)).toBeTruthy());
    expect(screen.queryByTestId('trend-sample-note')).toBeNull();
    // Their own two consecutive days, and no third point from a demonstration.
    expect(dom.querySelector('[data-delta="2026-07-20→2026-07-21"]')).not.toBeNull();
    expect(dom.querySelector('[data-delta="2026-07-21→2026-07-27"]')).toBeNull();
  });

  it('drops the example entirely once the officer loads a bulletin of any date', async () => {
    const load = vi.fn().mockResolvedValue(bulletin('2026-11-03', 'todays-bulletin', 12_000));
    const { container } = aContainer({
      ...atAssamTime('2026-11-03T09:00:00+05:30'),
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('Daily_Flood_Report_20261103.pdf'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    // The officer's bulletin is the one on screen, and it is the only one.
    await waitFor(() =>
      expect(banner().textContent).toMatch(/Assam Flood Report as on 3 November 2026/),
    );

    await userEvent.click(screen.getByRole('button', { name: /Trend/ }));
    // A demonstration must not turn up in the officer's deltas, and must not
    // manufacture a 99-day gap in their timeline.
    await waitFor(() => expect(screen.getByText(/1 bulletin loaded/)).toBeTruthy());
    expect(screen.queryByText(/No bulletin for/)).toBeNull();
  });

  it('reads a restored bulletin as one the officer loaded, however old it is', async () => {
    const { container } = aContainer({
      ...atAssamTime('2026-08-30T09:00:00+05:30'),
      listBulletins: {
        execute: vi.fn(async () => [aReport()]),
      } as unknown as Container['listBulletins'],
    });

    render(<App container={container} />);

    // An old bulletin the officer chose is a different situation from the
    // shipped example: their source is out of date, not their console.
    await waitFor(() => expect(banner().getAttribute('data-origin')).toBe('loaded'));
    expect(banner().textContent).toMatch(/You loaded this bulletin/);
    expect(banner().textContent).not.toMatch(/so you can see the console working/);
    expect(banner().textContent).toMatch(/This bulletin is 34 days old/);
  });

  it('takes its clock from the container, never from the system', async () => {
    // The banner is only a safety control if it can be tested at an arbitrary
    // date. Two different injected clocks, two different answers.
    const early = aContainer(atAssamTime('2026-07-27T09:00:00+05:30'));
    render(<App container={early.container} />);
    await waitFor(() => expect(early.list).toHaveBeenCalled());
    expect(banner().getAttribute('data-level')).toBe('current');

    cleanup();

    const late = aContainer(atAssamTime('2027-07-27T09:00:00+05:30'));
    render(<App container={late.container} />);
    await waitFor(() => expect(late.list).toHaveBeenCalled());
    expect(banner().getAttribute('data-level')).toBe('obsolete');
    expect(banner().textContent).toMatch(/365 days old/);
  });
});

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
  const load = vi.fn(async () => aReport());
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
  it('shows the loader and no figures until a bulletin is read', async () => {
    const { container, list } = aContainer();

    render(<App container={container} />);

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(screen.getByTestId('bulletin-dropzone')).toBeTruthy();
    expect(screen.queryByText('365,023')).toBeNull();
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

  it('surfaces a parse failure verbatim and displays nothing it did not read', async () => {
    const load = vi.fn().mockRejectedValue(new Error('This PDF has no text layer'));
    const { container } = aContainer({
      loadBulletin: { execute: load } as unknown as Container['loadBulletin'],
    });

    render(<App container={container} />);
    await dropIn(pdf('scan.pdf'));

    await waitFor(() => expect(screen.getByText(/no text layer/)).toBeTruthy());
    expect(screen.queryByText('365,023')).toBeNull();
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

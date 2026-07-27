/**
 * The object graph, asserted without a browser.
 *
 * Every outside thing the container touches — pdf.js, IndexedDB, the clock —
 * arrives injected, so these tests are about *wiring*: which collaborator is
 * asked, when, and what happens when one of them is unavailable.
 */

import { describe, expect, it, vi } from 'vitest';
import { NoTextLayerError } from '../application/ports';
import { LoadBulletin } from '../application/use-cases';
import { aReport } from '../application/services/report.fixture';
import { createContainer, createLazyBulletinSource } from './container';

/** A pdf.js stand-in: a document with pages but no text layer. */
const emptyPdfJs = () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 0,
      getPage: vi.fn(),
      destroy: vi.fn(async () => undefined),
    }),
  })),
  GlobalWorkerOptions: { workerSrc: '' },
});

/** jsdom's `Blob` has no `arrayBuffer`, and the loader needs one. */
const aPdf = (): Blob =>
  ({
    type: 'application/pdf',
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }) as unknown as Blob;

const workingDatabase = () => ({
  isAvailable: vi.fn(() => true),
  open: vi.fn(async () => ({}) as never),
});

describe('pdf.js is loaded lazily', () => {
  it('does not import pdf.js while building the graph (NFR-3)', async () => {
    const loadPdfJs = vi.fn(async () => emptyPdfJs());

    await createContainer({
      loadPdfJs,
      isIndexedDbAvailable: () => false,
      openDatabase: vi.fn(),
    });

    expect(loadPdfJs).not.toHaveBeenCalled();
  });

  it('imports it once, on the first parse, and reuses it after', async () => {
    const loadPdfJs = vi.fn(async () => emptyPdfJs());
    const source = createLazyBulletinSource(loadPdfJs);

    await expect(source.parse(aPdf())).rejects.toBeInstanceOf(NoTextLayerError);
    await expect(source.parse(aPdf())).rejects.toBeInstanceOf(NoTextLayerError);

    expect(loadPdfJs).toHaveBeenCalledTimes(1);
  });
});

describe('storage', () => {
  it('falls back to in-memory when IndexedDB is unavailable, and says so', async () => {
    const isAvailable = vi.fn(() => false);
    const open = vi.fn();

    const container = await createContainer({
      loadPdfJs: async () => emptyPdfJs(),
      isIndexedDbAvailable: isAvailable,
      openDatabase: open,
    });

    expect(isAvailable).toHaveBeenCalled();
    // Nothing is opened when there is nothing to open.
    expect(open).not.toHaveBeenCalled();
    expect(container.storage.durable).toBe(false);
    expect(container.storage.reason).toMatch(/lost on reload/);
  });

  it('the fallback is a real repository, not a stub', async () => {
    const container = await createContainer({
      loadPdfJs: async () => emptyPdfJs(),
      isIndexedDbAvailable: () => false,
      openDatabase: vi.fn(),
    });

    await container.reports.save(aReport());

    expect(await container.listBulletins.execute()).toHaveLength(1);
    expect(await container.reports.findByDate(aReport().reportDate)).toMatchObject({
      bulletinId: 'hash-27',
    });
  });

  it('falls back when opening the database throws, rather than refusing to start', async () => {
    const container = await createContainer({
      loadPdfJs: async () => emptyPdfJs(),
      isIndexedDbAvailable: () => true,
      openDatabase: vi.fn(async () => {
        throw new Error('the operation is insecure');
      }),
    });

    expect(container.storage.durable).toBe(false);
    expect(container.storage.reason).toContain('the operation is insecure');
  });

  it('reports durable storage when IndexedDB opens', async () => {
    const database = workingDatabase();

    const container = await createContainer({
      loadPdfJs: async () => emptyPdfJs(),
      isIndexedDbAvailable: database.isAvailable,
      openDatabase: database.open,
    });

    expect(database.open).toHaveBeenCalledTimes(1);
    expect(container.storage.durable).toBe(true);
    expect(container.storage.reason).toBeUndefined();
  });
});

describe('the use cases', () => {
  it('are wired to the container’s own source and repository', async () => {
    const container = await createContainer({
      loadPdfJs: async () => emptyPdfJs(),
      isIndexedDbAvailable: () => false,
      openDatabase: vi.fn(),
    });

    expect(container.loadBulletin).toBeInstanceOf(LoadBulletin);
    expect(container.clock.now()).toBeInstanceOf(Date);

    // A bulletin that could not be read is never stored (FR-1.6).
    await expect(container.loadBulletin.execute(aPdf())).rejects.toBeInstanceOf(NoTextLayerError);
    expect(await container.listBulletins.execute()).toEqual([]);
  });

  it('exports a stored bulletin without touching the network', async () => {
    const container = await createContainer({
      loadPdfJs: async () => emptyPdfJs(),
      isIndexedDbAvailable: () => false,
      openDatabase: vi.fn(),
    });

    const exported = container.exportReport.execute(aReport(), 'json');

    expect(exported.filename).toBe('assam-flood-report-2026-07-27.json');
    expect(exported.mimeType).toBe('application/json');
  });

  it('removes a bulletin and reports whether there was one', async () => {
    const container = await createContainer({
      loadPdfJs: async () => emptyPdfJs(),
      isIndexedDbAvailable: () => false,
      openDatabase: vi.fn(),
    });

    await container.reports.save(aReport());

    expect(await container.removeBulletin.execute(aReport().bulletinId)).toBe(true);
    expect(await container.removeBulletin.execute(aReport().bulletinId)).toBe(false);
  });
});

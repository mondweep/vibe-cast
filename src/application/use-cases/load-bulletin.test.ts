import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryReportRepository } from '../../adapters/persistence/in-memory-report-repository';
import { NoTextLayerError, NotADrimsBulletinError } from '../ports';
import type { BulletinSource, ReportRepository } from '../ports';
import { aReport, bulletinId } from '../services/report.fixture';
import { LoadBulletin } from './load-bulletin';

const aRepositoryDouble = (overrides: Partial<ReportRepository> = {}): ReportRepository => ({
  save: vi.fn(async () => undefined),
  findById: vi.fn(async () => undefined),
  findByDate: vi.fn(async () => undefined),
  findAll: vi.fn(async () => []),
  delete: vi.fn(async () => undefined),
  ...overrides,
});

const aPdf = (): Blob => new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoadBulletin', () => {
  it('parses the file and stores exactly what the parser produced', async () => {
    const report = aReport();
    const source: BulletinSource = { parse: vi.fn(async () => report) };
    const repository = aRepositoryDouble();
    const file = aPdf();

    const loaded = await new LoadBulletin(source, repository).execute(file);

    expect(source.parse).toHaveBeenCalledWith(file);
    expect(repository.save).toHaveBeenCalledWith(report);
    expect(loaded).toBe(report);
  });

  it('parses before it saves', async () => {
    const order: string[] = [];
    const source: BulletinSource = {
      parse: vi.fn(async () => {
        order.push('parse');
        return aReport();
      }),
    };
    const repository = aRepositoryDouble({
      save: vi.fn(async () => {
        order.push('save');
      }),
    });

    await new LoadBulletin(source, repository).execute(aPdf());

    expect(order).toEqual(['parse', 'save']);
  });

  it('does not save a scanned PDF, and propagates the no-text-layer failure verbatim', async () => {
    const source: BulletinSource = {
      parse: vi.fn(async () => {
        throw new NoTextLayerError();
      }),
    };
    const repository = aRepositoryDouble();

    const failure = await new LoadBulletin(source, repository)
      .execute(aPdf())
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NoTextLayerError);
    expect((failure as Error).message).toContain('no text layer');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not save a non-DRIMS PDF, and propagates the rejection reason (FR-1.9)', async () => {
    const source: BulletinSource = {
      parse: vi.fn(async () => {
        throw new NotADrimsBulletinError('no "Assam Flood Report as on" heading found');
      }),
    };
    const repository = aRepositoryDouble();

    const failure = await new LoadBulletin(source, repository)
      .execute(aPdf())
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NotADrimsBulletinError);
    expect((failure as Error).message).toContain('Assam Flood Report as on');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('lets a storage failure surface rather than pretending the load succeeded', async () => {
    const source: BulletinSource = { parse: vi.fn(async () => aReport()) };
    const repository = aRepositoryDouble({
      save: vi.fn(async () => {
        throw new Error('Could not save bulletin: browser storage is full.');
      }),
    });

    await expect(new LoadBulletin(source, repository).execute(aPdf())).rejects.toThrow(
      'browser storage is full',
    );
  });

  it('is idempotent: the same file loaded twice leaves one bulletin (PRD §5.6)', async () => {
    // Same file → same content hash → same BulletinId, which is the whole
    // mechanism. Uses the real in-memory repository, because the behaviour under
    // test is the interaction between the id and the store.
    const report = aReport({ bulletinId: bulletinId('content-hash-of-27th') });
    const source: BulletinSource = { parse: vi.fn(async () => report) };
    const repository = new InMemoryReportRepository();
    const loadBulletin = new LoadBulletin(source, repository);

    await loadBulletin.execute(aPdf());
    await loadBulletin.execute(aPdf());

    expect(await repository.findAll()).toHaveLength(1);
  });

  it('makes no network request of any kind (NFR-5)', async () => {
    const fetchSpy = vi.fn(async () => new Response());
    const sendBeaconSpy = vi.fn(() => true);
    const xhrSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconSpy });
    vi.stubGlobal('XMLHttpRequest', xhrSpy);
    vi.stubGlobal('WebSocket', xhrSpy);

    const source: BulletinSource = { parse: vi.fn(async () => aReport()) };
    await new LoadBulletin(source, new InMemoryReportRepository()).execute(aPdf());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeaconSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});

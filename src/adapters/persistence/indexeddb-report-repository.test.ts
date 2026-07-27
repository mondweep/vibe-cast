import { afterEach, describe, expect, it, vi } from 'vitest';

import { aReport, bulletinId, reportDate } from '../../application/services/report.fixture';
import {
  BULLETIN_STORE,
  IndexedDbReportRepository,
  REPORT_DATE_INDEX,
  type BulletinDatabase,
} from './indexeddb-report-repository';
import { ReportStorageError } from './report-storage-error';

const aDatabaseDouble = (overrides: Partial<BulletinDatabase> = {}) => ({
  get: vi.fn(async () => undefined),
  getAll: vi.fn(async () => []),
  getAllFromIndex: vi.fn(async () => []),
  put: vi.fn(async () => 'ok'),
  delete: vi.fn(async () => undefined),
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IndexedDbReportRepository — collaboration with the database', () => {
  it('puts the report into the bulletins store, keyed by bulletinId', async () => {
    const db = aDatabaseDouble();
    const report = aReport({ bulletinId: bulletinId('hash-27') });

    await new IndexedDbReportRepository(async () => db as unknown as BulletinDatabase).save(report);

    expect(db.put).toHaveBeenCalledTimes(1);
    expect(db.put).toHaveBeenCalledWith(BULLETIN_STORE, report);
  });

  it('opens the database once and reuses the connection', async () => {
    const db = aDatabaseDouble();
    const open = vi.fn(async () => db as unknown as BulletinDatabase);
    const repository = new IndexedDbReportRepository(open);

    await repository.save(aReport());
    await repository.findAll();
    await repository.delete(bulletinId('hash-27'));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('reads a single bulletin straight off the primary key', async () => {
    const report = aReport({ bulletinId: bulletinId('hash-27') });
    const db = aDatabaseDouble({ get: vi.fn(async () => report) });

    const found = await new IndexedDbReportRepository(
      async () => db as unknown as BulletinDatabase,
    ).findById(bulletinId('hash-27'));

    expect(db.get).toHaveBeenCalledWith(BULLETIN_STORE, 'hash-27');
    expect(found).toEqual(report);
  });

  it('reads by date through the reportDate index, not by scanning every record', async () => {
    const db = aDatabaseDouble({ getAllFromIndex: vi.fn(async () => [aReport()]) });

    await new IndexedDbReportRepository(async () => db as unknown as BulletinDatabase).findByDate(
      reportDate('2026-07-27'),
    );

    expect(db.getAllFromIndex).toHaveBeenCalledWith(BULLETIN_STORE, REPORT_DATE_INDEX, '2026-07-27');
    expect(db.getAll).not.toHaveBeenCalled();
  });

  it('deletes by primary key', async () => {
    const db = aDatabaseDouble();

    await new IndexedDbReportRepository(async () => db as unknown as BulletinDatabase).delete(
      bulletinId('hash-27'),
    );

    expect(db.delete).toHaveBeenCalledWith(BULLETIN_STORE, 'hash-27');
  });

  it('never reaches the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const db = aDatabaseDouble();
    const repository = new IndexedDbReportRepository(async () => db as unknown as BulletinDatabase);

    await repository.save(aReport());
    await repository.findAll();
    await repository.findById(bulletinId('hash-27'));

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('IndexedDbReportRepository — storage failures degrade loudly', () => {
  it('reports a full quota in words an operator can act on, and does not swallow it', async () => {
    const quotaExceeded = Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    const db = aDatabaseDouble({
      put: vi.fn(async () => {
        throw quotaExceeded;
      }),
    });
    const repository = new IndexedDbReportRepository(async () => db as unknown as BulletinDatabase);

    const failure = await repository.save(aReport()).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ReportStorageError);
    expect((failure as ReportStorageError).message).toContain('storage is full');
    expect((failure as ReportStorageError).operation).toBe('save bulletin hash-27');
    expect((failure as ReportStorageError).cause).toBe(quotaExceeded);
  });

  it('explains a private-browsing block rather than reporting an empty database', async () => {
    const blocked = Object.assign(new Error('nope'), { name: 'InvalidStateError' });
    const repository = new IndexedDbReportRepository(async () => {
      throw blocked;
    });

    const failure = await repository.findAll().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ReportStorageError);
    expect((failure as ReportStorageError).message).toContain('Private browsing');
  });

  it('retries opening after a failed open rather than caching the rejection forever', async () => {
    const db = aDatabaseDouble();
    const open = vi
      .fn<() => Promise<BulletinDatabase>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(db as unknown as BulletinDatabase);
    const repository = new IndexedDbReportRepository(open);

    await expect(repository.findAll()).rejects.toBeInstanceOf(ReportStorageError);
    await expect(repository.findAll()).resolves.toEqual([]);
    expect(open).toHaveBeenCalledTimes(2);
  });
});

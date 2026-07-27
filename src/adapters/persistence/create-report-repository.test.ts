import { describe, expect, it, vi } from 'vitest';

import { createFakeBulletinDatabase } from './fake-bulletin-database';
import { createReportRepository } from './create-report-repository';
import { InMemoryReportRepository } from './in-memory-report-repository';
import { IndexedDbReportRepository } from './indexeddb-report-repository';

describe('createReportRepository', () => {
  it('uses IndexedDB when it is available and opens cleanly', async () => {
    const open = vi.fn(async () => createFakeBulletinDatabase());

    const choice = await createReportRepository({ isAvailable: () => true, open });

    expect(choice.repository).toBeInstanceOf(IndexedDbReportRepository);
    expect(choice.durable).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('falls back to memory when the environment has no IndexedDB, without attempting to open', async () => {
    const open = vi.fn(async () => createFakeBulletinDatabase());

    const choice = await createReportRepository({ isAvailable: () => false, open });

    expect(choice.repository).toBeInstanceOf(InMemoryReportRepository);
    expect(choice.durable).toBe(false);
    expect(choice.reason).toContain('not available');
    expect(open).not.toHaveBeenCalled();
  });

  it('falls back to memory when opening is blocked, and says so instead of failing silently', async () => {
    const open = vi.fn(async () => {
      throw Object.assign(new Error('blocked'), { name: 'InvalidStateError' });
    });

    const choice = await createReportRepository({ isAvailable: () => true, open });

    expect(choice.repository).toBeInstanceOf(InMemoryReportRepository);
    expect(choice.durable).toBe(false);
    expect(choice.reason).toContain('Private browsing');
  });

  it('hands back a repository that works either way', async () => {
    const choice = await createReportRepository({
      isAvailable: () => false,
      open: async () => createFakeBulletinDatabase(),
    });

    expect(await choice.repository.findAll()).toEqual([]);
  });
});

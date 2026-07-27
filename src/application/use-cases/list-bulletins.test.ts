import { describe, expect, it, vi } from 'vitest';

import type { ReportRepository } from '../ports';
import { aReport, bulletinId, reportDate } from '../services/report.fixture';
import { ListBulletins } from './list-bulletins';

const repositoryReturning = (
  reports: ReturnType<typeof aReport>[],
): { repository: ReportRepository; findAll: ReturnType<typeof vi.fn> } => {
  const findAll = vi.fn(async () => reports);
  return {
    findAll,
    repository: {
      save: vi.fn(async () => undefined),
      findById: vi.fn(async () => undefined),
      findByDate: vi.fn(async () => undefined),
      findAll,
      delete: vi.fn(async () => undefined),
    },
  };
};

describe('ListBulletins', () => {
  it('asks the repository for every stored bulletin', async () => {
    const { repository, findAll } = repositoryReturning([]);

    await new ListBulletins(repository).execute();

    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('orders by report date, not by the order bulletins were loaded (PRD §5.6)', async () => {
    // Loaded newest-first, as an officer catching up on a backlog would.
    const { repository } = repositoryReturning([
      aReport({ bulletinId: bulletinId('c'), reportDate: reportDate('2026-07-27') }),
      aReport({ bulletinId: bulletinId('a'), reportDate: reportDate('2026-07-25') }),
      aReport({ bulletinId: bulletinId('b'), reportDate: reportDate('2026-07-26') }),
    ]);

    const listed = await new ListBulletins(repository).execute();

    expect(listed.map((report) => report.reportDate)).toEqual([
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
    ]);
  });

  it('breaks a same-date tie on bulletin id so the order is stable across calls', async () => {
    const { repository } = repositoryReturning([
      aReport({ bulletinId: bulletinId('z'), reportDate: reportDate('2026-07-27') }),
      aReport({ bulletinId: bulletinId('a'), reportDate: reportDate('2026-07-27') }),
    ]);

    const listed = await new ListBulletins(repository).execute();

    expect(listed.map((report) => report.bulletinId)).toEqual(['a', 'z']);
  });

  it('returns an empty list on a cold start rather than failing', async () => {
    const { repository } = repositoryReturning([]);

    expect(await new ListBulletins(repository).execute()).toEqual([]);
  });

  it('a single bulletin is a valid timeline (PRD §5.6 invariant 3)', async () => {
    const { repository } = repositoryReturning([aReport()]);

    expect(await new ListBulletins(repository).execute()).toHaveLength(1);
  });

  it('does not mutate the array the repository handed back', async () => {
    const stored = [
      aReport({ bulletinId: bulletinId('c'), reportDate: reportDate('2026-07-27') }),
      aReport({ bulletinId: bulletinId('a'), reportDate: reportDate('2026-07-25') }),
    ];
    const { repository } = repositoryReturning(stored);

    await new ListBulletins(repository).execute();

    expect(stored.map((report) => report.bulletinId)).toEqual(['c', 'a']);
  });
});

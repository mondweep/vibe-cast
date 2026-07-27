import { describe, expect, it, vi } from 'vitest';

import type { ReportRepository } from '../ports';
import { aReport, bulletinId } from '../services/report.fixture';
import { RemoveBulletin } from './remove-bulletin';

const aRepositoryDouble = (overrides: Partial<ReportRepository> = {}): ReportRepository => ({
  save: vi.fn(async () => undefined),
  findById: vi.fn(async () => undefined),
  findByDate: vi.fn(async () => undefined),
  findAll: vi.fn(async () => []),
  delete: vi.fn(async () => undefined),
  ...overrides,
});

describe('RemoveBulletin', () => {
  it('deletes the bulletin it was asked to remove', async () => {
    const repository = aRepositoryDouble({ findById: vi.fn(async () => aReport()) });

    const removed = await new RemoveBulletin(repository).execute(bulletinId('hash-27'));

    expect(repository.delete).toHaveBeenCalledWith('hash-27');
    expect(removed).toBe(true);
  });

  it('reports that nothing was removed when the bulletin is not stored', async () => {
    const repository = aRepositoryDouble({ findById: vi.fn(async () => undefined) });

    const removed = await new RemoveBulletin(repository).execute(bulletinId('never-loaded'));

    expect(removed).toBe(false);
  });

  it('does not ask the store to delete something it does not hold', async () => {
    const repository = aRepositoryDouble({ findById: vi.fn(async () => undefined) });

    await new RemoveBulletin(repository).execute(bulletinId('never-loaded'));

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('checks before it deletes', async () => {
    const order: string[] = [];
    const repository = aRepositoryDouble({
      findById: vi.fn(async () => {
        order.push('findById');
        return aReport();
      }),
      delete: vi.fn(async () => {
        order.push('delete');
      }),
    });

    await new RemoveBulletin(repository).execute(bulletinId('hash-27'));

    expect(order).toEqual(['findById', 'delete']);
  });

  it('lets a storage failure surface rather than reporting a removal that did not happen', async () => {
    const repository = aRepositoryDouble({
      findById: vi.fn(async () => aReport()),
      delete: vi.fn(async () => {
        throw new Error('Could not remove bulletin: browser storage is unavailable.');
      }),
    });

    await expect(new RemoveBulletin(repository).execute(bulletinId('hash-27'))).rejects.toThrow(
      'storage is unavailable',
    );
  });
});

/**
 * Chooses a `ReportRepository` for the composition root.
 *
 * IndexedDB is blocked outright in some private-browsing modes. The console must
 * still open and still parse a bulletin (NFR-6) — it simply cannot keep it
 * across a reload. So the fallback is a real repository plus an explicit,
 * surfaceable `reason`, never a silent downgrade the user discovers by finding
 * their timeline empty tomorrow.
 */

import type { ReportRepository } from '../../application/ports';
import { InMemoryReportRepository } from './in-memory-report-repository';
import {
  IndexedDbReportRepository,
  type OpenBulletinDatabase,
} from './indexeddb-report-repository';
import { asStorageError } from './report-storage-error';

export type ReportRepositoryChoice = {
  readonly repository: ReportRepository;
  /** False when bulletins will not survive a page reload. */
  readonly durable: boolean;
  /** Present only when `durable` is false; safe to show a user verbatim. */
  readonly reason?: string;
};

export const createReportRepository = async (deps: {
  isAvailable: () => boolean;
  open: OpenBulletinDatabase;
}): Promise<ReportRepositoryChoice> => {
  if (!deps.isAvailable()) {
    return {
      repository: new InMemoryReportRepository(),
      durable: false,
      reason:
        'Browser storage is not available, so bulletins are kept for this session only and will ' +
        'be lost on reload.',
    };
  }

  try {
    // Open eagerly: the failure we care about happens at open time, and we would
    // rather find out now than on the officer's first save. The connection is
    // then handed to the repository so it is opened exactly once.
    const db = await deps.open();
    return { repository: new IndexedDbReportRepository(async () => db), durable: true };
  } catch (cause) {
    return {
      repository: new InMemoryReportRepository(),
      durable: false,
      reason: asStorageError('open browser storage', cause).message,
    };
  }
};

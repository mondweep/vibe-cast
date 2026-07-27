/**
 * An in-test stand-in for the `bulletins` object store.
 *
 * It emulates the IndexedDB semantics the adapter actually relies on — keyPath
 * replacement, structured cloning, primary-key ordering from `getAll`, and index
 * results ordered by index key then primary key — so the IndexedDB adapter can
 * be driven through the full `ReportRepository` contract without a browser or a
 * fake-indexeddb dependency.
 *
 * Test support, not production code.
 */

import type { BulletinDatabase } from './indexeddb-report-repository';
import type { FloodSituationReport } from '../../domain/shared/flood-situation-report';

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const createFakeBulletinDatabase = (): BulletinDatabase => {
  const rows = new Map<string, FloodSituationReport>();

  const allInKeyOrder = (): FloodSituationReport[] =>
    [...rows.entries()]
      .sort(([a], [b]) => byString(a, b))
      .map(([, value]) => structuredClone(value));

  return {
    async get(_store, key) {
      const found = rows.get(key);
      return found === undefined ? undefined : structuredClone(found);
    },
    async getAll() {
      return allInKeyOrder();
    },
    async getAllFromIndex(_store, _index, key) {
      // IndexedDB returns index matches ordered by index key, then primary key.
      return allInKeyOrder().filter((report) => report.reportDate === key);
    },
    async put(_store, value) {
      // keyPath is `bulletinId`, so an existing key is replaced, never appended.
      rows.set(value.bulletinId, structuredClone(value));
      return value.bulletinId;
    },
    async delete(_store, key) {
      rows.delete(key);
    },
  };
};

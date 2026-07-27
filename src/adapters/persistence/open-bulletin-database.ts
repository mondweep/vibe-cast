/**
 * The single module that touches `idb` and the global `indexedDB`.
 *
 * Isolating it keeps `IndexedDbReportRepository` a pure translation layer that
 * unit tests can drive with a double, and keeps the browser-only dependency out
 * of every other file in the adapter.
 */

import { openDB } from 'idb';

import {
  BULLETIN_KEY_PATH,
  BULLETIN_STORE,
  DATABASE_NAME,
  DATABASE_VERSION,
  REPORT_DATE_INDEX,
  type BulletinDatabase,
} from './indexeddb-report-repository';

/** The `IDBPDatabase` surface the upgrade needs — declared locally so it is doubleable. */
export interface UpgradeableDatabase {
  objectStoreNames: { contains(name: string): boolean };
  createObjectStore(
    name: string,
    options: { keyPath: string },
  ): { createIndex(name: string, keyPath: string, options: { unique: boolean }): unknown };
}

/**
 * Schema v1: one store, keyed by content hash, indexed by report date.
 *
 * Keying on `bulletinId` is what makes a re-load idempotent; the `reportDate`
 * index is what lets the timeline order by date rather than load order
 * (PRD §5.6 invariant 1).
 */
export const upgradeBulletinDatabase = (db: UpgradeableDatabase): void => {
  if (db.objectStoreNames.contains(BULLETIN_STORE)) return;
  const store = db.createObjectStore(BULLETIN_STORE, { keyPath: BULLETIN_KEY_PATH });
  store.createIndex(REPORT_DATE_INDEX, REPORT_DATE_INDEX, { unique: false });
};

export const isIndexedDbAvailable = (scope: { indexedDB?: unknown } = globalThis): boolean =>
  typeof scope.indexedDB !== 'undefined' && scope.indexedDB !== null;

export const openBulletinDatabase = async (): Promise<BulletinDatabase> => {
  const db = await openDB(DATABASE_NAME, DATABASE_VERSION, {
    upgrade: (upgrading) => {
      upgradeBulletinDatabase(upgrading as unknown as UpgradeableDatabase);
    },
  });
  return db as unknown as BulletinDatabase;
};

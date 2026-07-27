import { describe, expect, it, vi } from 'vitest';

import {
  BULLETIN_KEY_PATH,
  BULLETIN_STORE,
  REPORT_DATE_INDEX,
} from './indexeddb-report-repository';
import { isIndexedDbAvailable, upgradeBulletinDatabase } from './open-bulletin-database';

describe('upgradeBulletinDatabase', () => {
  it('creates the bulletins store keyed by bulletinId, with a reportDate index', () => {
    const createIndex = vi.fn();
    const createObjectStore = vi.fn(() => ({ createIndex }));
    const db = { objectStoreNames: { contains: () => false }, createObjectStore };

    upgradeBulletinDatabase(db);

    expect(createObjectStore).toHaveBeenCalledWith(BULLETIN_STORE, { keyPath: BULLETIN_KEY_PATH });
    expect(createIndex).toHaveBeenCalledWith(REPORT_DATE_INDEX, REPORT_DATE_INDEX, {
      unique: false,
    });
  });

  it('is idempotent — an existing store is left alone rather than recreated', () => {
    const createObjectStore = vi.fn();
    const db = { objectStoreNames: { contains: () => true }, createObjectStore };

    upgradeBulletinDatabase(db);

    expect(createObjectStore).not.toHaveBeenCalled();
  });
});

describe('isIndexedDbAvailable', () => {
  it('is false when the environment exposes no indexedDB (private browsing, Node)', () => {
    expect(isIndexedDbAvailable({})).toBe(false);
  });

  it('is true when indexedDB is present', () => {
    expect(isIndexedDbAvailable({ indexedDB: {} })).toBe(true);
  });
});

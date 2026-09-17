import type { Candidate, NightAnalysis, JournalEntry } from '@somnus/domain';

/**
 * Offline-first local storage (ADR-007).
 *
 * A Night is a six-to-nine hour run that cannot be repeated, so the network
 * is never on its critical path and nothing is deleted locally until the
 * server has acknowledged it.
 */

const DB_NAME = 'somnus';
const DB_VERSION = 1;

export interface SessionHeader {
  readonly nightId: string;
  readonly date: string;
  readonly startedAtMs: number;
  /** Updated every batch; a header whose heartbeat stopped was interrupted. */
  heartbeatMs: number;
  /** Session-relative ms at the last heartbeat, for honest recovery. */
  lastFrameMs: number;
  stoppedCleanly: boolean;
  sensitivity: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'nightId' });
      }
      if (!db.objectStoreNames.contains('candidates')) {
        db.createObjectStore('candidates', { autoIncrement: true }).createIndex(
          'byNight', 'nightId', { unique: false },
        );
      }
      if (!db.objectStoreNames.contains('nights')) {
        db.createObjectStore('nights', { keyPath: 'nightId' });
      }
      if (!db.objectStoreNames.contains('journal')) {
        db.createObjectStore('journal', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const local = {
  async putSession(header: SessionHeader): Promise<void> {
    await tx('sessions', 'readwrite', (s) => s.put(header));
  },

  async getSessions(): Promise<SessionHeader[]> {
    return tx<SessionHeader[]>('sessions', 'readonly', (s) => s.getAll());
  },

  async deleteSession(nightId: string): Promise<void> {
    await tx('sessions', 'readwrite', (s) => s.delete(nightId));
  },

  /** FR-C6: batched every 30 s, so a hard crash costs at most one batch. */
  async appendCandidates(nightId: string, candidates: readonly Candidate[]): Promise<void> {
    if (candidates.length === 0) return;
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('candidates', 'readwrite');
      const store = t.objectStore('candidates');
      for (const c of candidates) store.put({ nightId, ...c });
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },

  async getCandidates(nightId: string): Promise<Candidate[]> {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('candidates', 'readonly');
      const index = t.objectStore('candidates').index('byNight');
      const req = index.getAll(nightId);
      req.onsuccess = () => resolve(req.result as Candidate[]);
      req.onerror = () => reject(req.error);
    });
  },

  async clearCandidates(nightId: string): Promise<void> {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('candidates', 'readwrite');
      const store = t.objectStore('candidates');
      const req = store.index('byNight').getAllKeys(nightId);
      req.onsuccess = () => {
        for (const key of req.result) store.delete(key);
      };
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },

  async putNight(analysis: NightAnalysis): Promise<void> {
    await tx('nights', 'readwrite', (s) => s.put(analysis));
  },

  async getNights(): Promise<NightAnalysis[]> {
    const all = await tx<NightAnalysis[]>('nights', 'readonly', (s) => s.getAll());
    return all.sort((a, b) => b.date.localeCompare(a.date));
  },

  async putJournal(entry: JournalEntry): Promise<void> {
    await tx('journal', 'readwrite', (s) => s.put(entry));
  },

  async getJournal(): Promise<JournalEntry[]> {
    return tx<JournalEntry[]>('journal', 'readonly', (s) => s.getAll());
  },

  async setMeta(key: string, value: unknown): Promise<void> {
    await tx('meta', 'readwrite', (s) => s.put({ key, value }));
  },

  async getMeta<T>(key: string): Promise<T | null> {
    const row = await tx<{ key: string; value: T } | undefined>('meta', 'readonly', (s) => s.get(key));
    return row?.value ?? null;
  },
};

/**
 * Close out any session that was never stopped cleanly (FR-C8).
 *
 * The gap between the last heartbeat and now is time we were demonstrably not
 * listening, so it becomes interruptedMs and is excluded from monitoredMs.
 * Counting it as monitored would quietly deflate the Snore Index; ignoring the
 * night entirely would lose data the user cannot regenerate.
 */
export async function recoverInterruptedSessions(): Promise<SessionHeader[]> {
  const sessions = await local.getSessions();
  return sessions.filter((s) => !s.stoppedCleanly);
}

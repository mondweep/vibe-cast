import type { NightAnalysis, JournalEntry } from '@somnus/domain';
import { api } from './api';
import { local } from './adapters/idb';

/**
 * Deferred, idempotent sync (ADR-007).
 *
 * Nothing here is on the critical path of a Night. Every push is safe to
 * repeat, because a night is keyed on a client-generated id and the API
 * upserts on it — so a retry after a failed or ambiguous request is a no-op
 * rather than a duplicate. Local stays the source of truth until the server
 * acknowledges.
 */

const SYNCED_KEY = 'syncedNightIds';

export interface SyncResult {
  readonly pushed: number;
  readonly failed: number;
}

export async function syncAll(idToken: string | null): Promise<SyncResult> {
  if (idToken === null) return { pushed: 0, failed: 0 };

  const session = { idToken };
  const synced = new Set((await local.getMeta<string[]>(SYNCED_KEY)) ?? []);

  const nights: NightAnalysis[] = await local.getNights();
  const journal: JournalEntry[] = await local.getJournal();

  let pushed = 0;
  let failed = 0;

  for (const night of nights) {
    if (synced.has(night.nightId)) continue;
    if (await api.pushNight(session, night)) {
      synced.add(night.nightId);
      pushed += 1;
    } else {
      // Left unmarked, so the next attempt picks it up again.
      failed += 1;
    }
  }

  for (const entry of journal) {
    if (!(await api.pushJournal(session, entry))) failed += 1;
  }

  await local.setMeta(SYNCED_KEY, [...synced]);
  return { pushed, failed };
}

import type {
  JournalRepositoryPort,
  NightRepositoryPort,
  NightAnalysis,
  JournalEntry,
  UserId,
  NightId,
  NightDate,
} from '@somnus/domain';

/**
 * In-memory implementations used by the API contract tests and local
 * development.
 *
 * ADR-008 requires every port to be contract-tested against both its double
 * and its real adapter, so these are held to exactly the same suite as the
 * Firestore versions — which is what stops the doubles drifting into a
 * fiction that makes tests pass and production fail.
 */
export class InMemoryNightRepository implements NightRepositoryPort {
  private readonly byUser = new Map<UserId, Map<NightId, NightAnalysis>>();

  async save(userId: UserId, analysis: NightAnalysis): Promise<void> {
    const nights = this.byUser.get(userId) ?? new Map<NightId, NightAnalysis>();
    // ADR-007: keyed on the client-generated id, so replaying a sync is a
    // no-op rather than a duplicate.
    nights.set(analysis.nightId, analysis);
    this.byUser.set(userId, nights);
  }

  async get(userId: UserId, nightId: NightId): Promise<NightAnalysis | null> {
    return this.byUser.get(userId)?.get(nightId) ?? null;
  }

  async listRecent(userId: UserId, limit: number): Promise<NightAnalysis[]> {
    const all = [...(this.byUser.get(userId)?.values() ?? [])];
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }

  async deleteAll(userId: UserId): Promise<void> {
    this.byUser.delete(userId);
  }
}

export class InMemoryJournalRepository implements JournalRepositoryPort {
  private readonly byUser = new Map<UserId, Map<NightDate, JournalEntry>>();

  async save(entry: JournalEntry): Promise<void> {
    const entries = this.byUser.get(entry.userId) ?? new Map<NightDate, JournalEntry>();
    // Invariant I-J1: at most one entry per user per night date.
    entries.set(entry.date, entry);
    this.byUser.set(entry.userId, entries);
  }

  async get(userId: UserId, date: NightDate): Promise<JournalEntry | null> {
    return this.byUser.get(userId)?.get(date) ?? null;
  }

  async listRecent(userId: UserId, limit: number): Promise<JournalEntry[]> {
    const all = [...(this.byUser.get(userId)?.values() ?? [])];
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }

  async deleteAll(userId: UserId): Promise<void> {
    this.byUser.delete(userId);
  }
}

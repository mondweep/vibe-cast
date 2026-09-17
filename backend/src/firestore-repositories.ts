import { Firestore } from '@google-cloud/firestore';
import type {
  JournalEntry,
  JournalRepositoryPort,
  NightAnalysis,
  NightDate,
  NightId,
  NightRepositoryPort,
  UserId,
} from '@somnus/domain';

/**
 * Firestore adapters (ADR-005).
 *
 * The client is created lazily and shared, so a cold start that only serves a
 * static asset never opens a connection.
 */
let shared: Firestore | null = null;
function db(projectId: string): Firestore {
  if (shared === null) shared = new Firestore({ projectId });
  return shared;
}

export class FirestoreNightRepository implements NightRepositoryPort {
  constructor(private readonly projectId: string) {}

  async save(userId: UserId, analysis: NightAnalysis): Promise<void> {
    // set() on the client-generated id is the idempotent upsert ADR-007 needs:
    // replaying a sync overwrites with identical content rather than
    // duplicating the night.
    await db(this.projectId)
      .collection('users').doc(userId)
      .collection('nights').doc(analysis.nightId)
      .set(analysis as unknown as Record<string, unknown>);
  }

  async get(userId: UserId, nightId: NightId): Promise<NightAnalysis | null> {
    const snap = await db(this.projectId)
      .collection('users').doc(userId)
      .collection('nights').doc(nightId)
      .get();
    return snap.exists ? (snap.data() as NightAnalysis) : null;
  }

  async listRecent(userId: UserId, limit: number): Promise<NightAnalysis[]> {
    const snap = await db(this.projectId)
      .collection('users').doc(userId)
      .collection('nights')
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as NightAnalysis);
  }

  async deleteAll(userId: UserId): Promise<void> {
    const col = db(this.projectId).collection('users').doc(userId).collection('nights');
    const snap = await col.get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

export class FirestoreJournalRepository implements JournalRepositoryPort {
  constructor(private readonly projectId: string) {}

  async save(entry: JournalEntry): Promise<void> {
    // Keyed on the date, which enforces I-J1 structurally.
    await db(this.projectId)
      .collection('users').doc(entry.userId)
      .collection('journal').doc(entry.date)
      .set(entry as unknown as Record<string, unknown>);
  }

  async get(userId: UserId, date: NightDate): Promise<JournalEntry | null> {
    const snap = await db(this.projectId)
      .collection('users').doc(userId)
      .collection('journal').doc(date)
      .get();
    return snap.exists ? (snap.data() as JournalEntry) : null;
  }

  async listRecent(userId: UserId, limit: number): Promise<JournalEntry[]> {
    const snap = await db(this.projectId)
      .collection('users').doc(userId)
      .collection('journal')
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as JournalEntry);
  }

  async deleteAll(userId: UserId): Promise<void> {
    const col = db(this.projectId).collection('users').doc(userId).collection('journal');
    const snap = await col.get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

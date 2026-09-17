import type { FrameFeatures } from '../capture/frame';
import type { EpochMs, NightDate, NightId, UserId } from '../shared/types';
import type { NightAnalysis } from '../analysis/night-analysis';
import type { JournalEntry } from '../journal/factors';

/**
 * Ports — the interfaces the domain wishes it had (ADR-004, ADR-008).
 *
 * Each of these was discovered by mocking it from the consumer's side, so the
 * shapes are what the domain needs rather than what a library offers.
 */

/**
 * The microphone, as far as the domain is concerned.
 *
 * ADR-001 is enforced by this signature: the callback receives
 * {@link FrameFeatures} and there is no overload, no escape hatch and no
 * variant that hands over samples. The domain cannot see audio because there
 * is no type through which audio could reach it.
 */
export interface AudioPort {
  start(onFrame: (frame: FrameFeatures) => void): Promise<void>;
  stop(): Promise<void>;
  readonly isRunning: boolean;
}

/** ADR-004: the domain never calls Date.now(), so tests are deterministic. */
export interface ClockPort {
  now(): EpochMs;
  /** The device's local calendar date for a Night beginning now. */
  nightDate(): NightDate;
  timezoneOffsetMinutes(): number;
}

/** ADR-007: ids are client-generated so a Night can start with no network. */
export interface IdPort {
  newId(): string;
}

export interface WakeLockPort {
  acquire(): Promise<boolean>;
  release(): Promise<void>;
  readonly isHeld: boolean;
}

export interface NightRepositoryPort {
  /** ADR-007: idempotent upsert keyed on the client-generated nightId. */
  save(userId: UserId, analysis: NightAnalysis): Promise<void>;
  get(userId: UserId, nightId: NightId): Promise<NightAnalysis | null>;
  /** Newest first. */
  listRecent(userId: UserId, limit: number): Promise<NightAnalysis[]>;
  deleteAll(userId: UserId): Promise<void>;
}

export interface JournalRepositoryPort {
  save(entry: JournalEntry): Promise<void>;
  get(userId: UserId, date: NightDate): Promise<JournalEntry | null>;
  listRecent(userId: UserId, limit: number): Promise<JournalEntry[]>;
  deleteAll(userId: UserId): Promise<void>;
}

export interface SyncPort {
  /** Resolves only when the server has durably accepted the night. */
  pushNight(analysis: NightAnalysis): Promise<void>;
}

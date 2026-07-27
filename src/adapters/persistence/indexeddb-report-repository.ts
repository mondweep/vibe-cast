/**
 * `ReportRepository` backed by IndexedDB (FR-1.6, NFR-6).
 *
 * The database handle is injected as `OpenBulletinDatabase` rather than being
 * opened here, for three reasons: the unit tests need no browser, the `idb`
 * dependency stays in one small module (`open-bulletin-database.ts`), and the
 * composition root can substitute the in-memory repository when IndexedDB is
 * blocked without this class knowing anything about it.
 *
 * A `FloodSituationReport` is plain structured-cloneable data — quantities are
 * `{kind, unit, value}` records — so it is stored as-is. Nothing is flattened on
 * the way in, which is what keeps `unknown` distinguishable from `0` across a
 * reload (PRD §5.1 invariant 4).
 */

import type { ReportRepository } from '../../application/ports';
import type {
  BulletinId,
  FloodSituationReport,
  ReportDate,
} from '../../domain/shared/flood-situation-report';
import { asStorageError } from './report-storage-error';

export const DATABASE_NAME = 'assam-flood-console';
export const DATABASE_VERSION = 1;
export const BULLETIN_STORE = 'bulletins';
export const BULLETIN_KEY_PATH = 'bulletinId';
export const REPORT_DATE_INDEX = 'reportDate';

/**
 * The slice of an `idb` database this adapter uses. Declaring it locally keeps
 * the adapter free of a runtime import of `idb` and makes it trivial to double.
 */
export interface BulletinDatabase {
  get(store: string, key: string): Promise<FloodSituationReport | undefined>;
  getAll(store: string): Promise<FloodSituationReport[]>;
  getAllFromIndex(store: string, index: string, key: string): Promise<FloodSituationReport[]>;
  put(store: string, value: FloodSituationReport): Promise<unknown>;
  delete(store: string, key: string): Promise<void>;
}

export type OpenBulletinDatabase = () => Promise<BulletinDatabase>;

export class IndexedDbReportRepository implements ReportRepository {
  private readonly open: OpenBulletinDatabase;
  private connection: Promise<BulletinDatabase> | undefined;

  constructor(open: OpenBulletinDatabase) {
    this.open = open;
  }

  async save(report: FloodSituationReport): Promise<void> {
    // `put` against a keyPath store replaces by `bulletinId`. Because the id is
    // the content hash of the PDF, loading the identical file twice overwrites
    // one row instead of creating two (PRD §5.6).
    await this.run(`save bulletin ${report.bulletinId}`, (db) => db.put(BULLETIN_STORE, report));
  }

  async findById(id: BulletinId): Promise<FloodSituationReport | undefined> {
    return this.run(`read bulletin ${id}`, (db) => db.get(BULLETIN_STORE, id));
  }

  async findByDate(date: ReportDate): Promise<FloodSituationReport | undefined> {
    const matching = await this.run(`read bulletins for ${date}`, (db) =>
      db.getAllFromIndex(BULLETIN_STORE, REPORT_DATE_INDEX, date),
    );
    // Index results arrive ordered by index key then primary key, so the last
    // entry is the greatest bulletin id for that date — a deterministic
    // tie-break when a revised bulletin is issued for the same day.
    return matching.at(-1);
  }

  async findAll(): Promise<readonly FloodSituationReport[]> {
    return this.run('read stored bulletins', (db) => db.getAll(BULLETIN_STORE));
  }

  async delete(id: BulletinId): Promise<void> {
    await this.run(`remove bulletin ${id}`, (db) => db.delete(BULLETIN_STORE, id));
  }

  private async run<T>(operation: string, work: (db: BulletinDatabase) => Promise<T>): Promise<T> {
    let db: BulletinDatabase;
    try {
      this.connection ??= this.open();
      db = await this.connection;
    } catch (cause) {
      // A rejected open must not be cached, or one transient failure would
      // poison the repository for the rest of the session.
      this.connection = undefined;
      throw asStorageError(operation, cause);
    }
    try {
      return await work(db);
    } catch (cause) {
      throw asStorageError(operation, cause);
    }
  }
}

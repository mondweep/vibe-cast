/**
 * A real, working `ReportRepository` held in memory.
 *
 * Two jobs: it is the fallback when IndexedDB is unavailable (private browsing —
 * bulletins then work for the session but not across a reload), and it is the
 * repository of choice for tests elsewhere in the system, which is why it runs
 * the same behavioural contract as the IndexedDB adapter.
 */

import type { ReportRepository } from '../../application/ports';
import type {
  BulletinId,
  FloodSituationReport,
  ReportDate,
} from '../../domain/shared/flood-situation-report';

/**
 * Deep copy on the way in and on the way out. IndexedDB structured-clones, so
 * the in-memory implementation must too — otherwise a caller who mutates a
 * result silently corrupts the store under one implementation and not the other,
 * and the two stop being substitutable.
 */
const snapshot = <T>(value: T): T => structuredClone(value) as T;

export class InMemoryReportRepository implements ReportRepository {
  private readonly reports: Map<string, FloodSituationReport>;

  constructor(seed: readonly FloodSituationReport[] = []) {
    this.reports = new Map(seed.map((report) => [report.bulletinId, snapshot(report)]));
  }

  async save(report: FloodSituationReport): Promise<void> {
    // Keyed by content hash, so saving the same file twice replaces rather than
    // appends (PRD §5.6).
    this.reports.set(report.bulletinId, snapshot(report));
  }

  async findById(id: BulletinId): Promise<FloodSituationReport | undefined> {
    const found = this.reports.get(id);
    return found === undefined ? undefined : snapshot(found);
  }

  async findByDate(date: ReportDate): Promise<FloodSituationReport | undefined> {
    const matching = (await this.findAll()).filter((report) => report.reportDate === date);
    return matching.at(-1);
  }

  async findAll(): Promise<readonly FloodSituationReport[]> {
    return [...this.reports.values()]
      .sort((a, b) => (a.bulletinId < b.bulletinId ? -1 : a.bulletinId > b.bulletinId ? 1 : 0))
      .map(snapshot);
  }

  async delete(id: BulletinId): Promise<void> {
    this.reports.delete(id);
  }
}

/**
 * Remove a bulletin from the local store.
 *
 * Returns whether anything was actually removed. The repository's `delete` is a
 * silent no-op for an unknown id — correct for a store, wrong for a UI, which
 * needs to distinguish "removed" from "there was nothing there", for instance
 * when two tabs are open on the same timeline.
 */

import type { ReportRepository } from '../ports';
import type { BulletinId } from '../../domain/shared/flood-situation-report';

export class RemoveBulletin {
  private readonly reports: ReportRepository;

  constructor(reports: ReportRepository) {
    this.reports = reports;
  }

  /** @returns true when a stored bulletin was removed, false when there was none. */
  async execute(id: BulletinId): Promise<boolean> {
    const existing = await this.reports.findById(id);
    if (existing === undefined) return false;
    await this.reports.delete(id);
    return true;
  }
}

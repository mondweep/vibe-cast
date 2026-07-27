/**
 * FR-1.1 / FR-1.2 / FR-1.6 — load a DRIMS PDF and keep it.
 *
 * Deliberately thin. Parsing lives in the pdf adapter, storage in the
 * persistence adapter; the use case owns exactly one rule, which is that a
 * bulletin we could not read is never stored. A half-parsed report in the
 * repository would resurface after a reload looking like real data.
 *
 * Nothing here touches the network (NFR-5) — the PDF is read from the `Blob` the
 * user picked and never leaves the browser.
 */

import type { BulletinSource, ReportRepository } from '../ports';
import type { FloodSituationReport } from '../../domain/shared/flood-situation-report';

export class LoadBulletin {
  private readonly bulletins: BulletinSource;
  private readonly reports: ReportRepository;

  constructor(bulletins: BulletinSource, reports: ReportRepository) {
    this.bulletins = bulletins;
    this.reports = reports;
  }

  /**
   * @throws NoTextLayerError when the PDF is a scan (nothing is stored)
   * @throws NotADrimsBulletinError when the PDF is not a DRIMS bulletin (nothing is stored)
   * @throws ReportStorageError when the parse succeeded but the save could not
   */
  async execute(file: Blob): Promise<FloodSituationReport> {
    // No try/catch: a parse failure must reach the caller unchanged, carrying the
    // specific reason the UI needs to show (FR-1.9). Because the throw happens
    // before `save`, "we could not read it" and "we stored it" cannot both be true.
    const report = await this.bulletins.parse(file);
    await this.reports.save(report);
    return report;
  }
}

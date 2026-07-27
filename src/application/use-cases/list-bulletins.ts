/**
 * FR-1.7 — the loaded bulletins, in the order a timeline needs them.
 *
 * PRD §5.6 invariant 1: reports are ordered by `ReportDate`, never by load
 * order. An officer working through a backlog may drag Sunday's bulletin in
 * before Friday's; a trend line built from load order would then show the flood
 * receding when it was building. Sorting here, rather than trusting the store,
 * keeps that invariant true for every repository implementation.
 */

import type { ReportRepository } from '../ports';
import type { FloodSituationReport } from '../../domain/shared/flood-situation-report';

/** `ReportDate` is ISO `YYYY-MM-DD`, so lexicographic order is chronological order. */
const byReportDateThenId = (a: FloodSituationReport, b: FloodSituationReport): number => {
  if (a.reportDate !== b.reportDate) return a.reportDate < b.reportDate ? -1 : 1;
  // A revised bulletin can share a date. Tie-break so the order never flickers
  // between calls.
  return a.bulletinId < b.bulletinId ? -1 : a.bulletinId > b.bulletinId ? 1 : 0;
};

export class ListBulletins {
  private readonly reports: ReportRepository;

  constructor(reports: ReportRepository) {
    this.reports = reports;
  }

  async execute(): Promise<readonly FloodSituationReport[]> {
    const stored = await this.reports.findAll();
    return [...stored].sort(byReportDateThenId);
  }
}

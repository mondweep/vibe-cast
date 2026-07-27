/**
 * Ports (ADR-0001).
 *
 * Interfaces the application layer needs from the outside world, expressed in
 * domain terms. Adapters implement them; the domain never imports them.
 */

import type {
  BulletinId,
  FloodSituationReport,
  ReportDate,
} from '../../domain/shared/flood-situation-report';

/** Driven port: turns a DRIMS PDF into a validated report. */
export interface BulletinSource {
  parse(file: Blob): Promise<FloodSituationReport>;
}

/** Driven port: local persistence of parsed bulletins. */
export interface ReportRepository {
  save(report: FloodSituationReport): Promise<void>;
  findById(id: BulletinId): Promise<FloodSituationReport | undefined>;
  findByDate(date: ReportDate): Promise<FloodSituationReport | undefined>;
  findAll(): Promise<readonly FloodSituationReport[]>;
  delete(id: BulletinId): Promise<void>;
}

/**
 * Injected rather than called directly, so no domain or application code
 * reaches for `new Date()` and becomes untestable (ADR-0001).
 */
export interface Clock {
  now(): Date;
}

/** Raised when a PDF is readable but is not a DRIMS flood bulletin (FR-1.9). */
export class NotADrimsBulletinError extends Error {
  constructor(reason: string) {
    super(`Not a DRIMS Assam flood bulletin: ${reason}`);
    this.name = 'NotADrimsBulletinError';
  }
}

/** Raised when a PDF has no text layer — a scan. OCR is out of scope for v1. */
export class NoTextLayerError extends Error {
  constructor() {
    super(
      'This PDF has no text layer — it appears to be a scan. ' +
        'Only digitally generated DRIMS bulletins can be read.',
    );
    this.name = 'NoTextLayerError';
  }
}

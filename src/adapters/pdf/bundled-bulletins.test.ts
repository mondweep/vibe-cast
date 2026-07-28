/**
 * The guarantee that makes shipping generated data safe.
 *
 * `src/generated/newest-bulletin.ts` and `src/generated/bulletin-archive.ts`
 * are committed source: between them they are the eight-bulletin archive the
 * console opens on, and nothing at build time or run time reparses the PDFs to
 * check them. That is the whole point — the default path costs no pdf.js
 * (NFR-3) — but it means the artefacts could drift from the bulletins they
 * claim to be, and drift in a flood console is figures on a screen that no
 * document supports.
 *
 * So the check moves here. This test parses all eight real fixture PDFs, fresh,
 * on every run, and asserts the results are the committed constants. It fails
 * if anyone hand-edits a generated file, and it fails if the parser changes
 * without the artefacts being regenerated. Either way the fix is the same:
 *
 *     npm run generate:bundled-bulletins
 *
 * It covers **every bundled bulletin**, not just the eager one. An archive
 * verified only at its newest day would be seven-eighths unchecked, and the
 * seven unchecked days are precisely the ones the Trend view draws.
 *
 * Where `golden.test.ts` asserts the parser reads Appendix B correctly, this
 * asserts that what we *ship* is what the parser reads.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { FloodSituationReport } from '../../domain/shared/flood-situation-report';
import { ARCHIVED_BULLETINS } from '../../generated/bulletin-archive';
import {
  ARCHIVE_DATES,
  BUNDLED_DATES,
  BUNDLED_RANGE,
  NEWEST_BUNDLED_BULLETIN,
  loadArchivedBulletins,
} from '../../generated/bundled-bulletins';
import { createPdfBulletinSource } from './pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from './pdfjs-loader';

/** Oldest first — the order the generator emits, and the order the archive holds. */
const STAMPS = [
  '20260720',
  '20260721',
  '20260722',
  '20260723',
  '20260724',
  '20260725',
  '20260726',
  '20260727',
] as const;

const fixture = (stamp: string): string =>
  path.resolve(import.meta.dirname, `../../../fixtures/Daily_Flood_Report_${stamp}.pdf`);

/** Every bundled bulletin as the parser reads it today, keyed by fixture stamp. */
const freshlyParsed = new Map<string, FloodSituationReport>();

describe('the bundled bulletin archive', () => {
  beforeAll(async () => {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
    const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });
    for (const stamp of STAMPS) {
      const bytes = await readFile(fixture(stamp));
      freshlyParsed.set(
        stamp,
        await source.parse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })),
      );
    }
  }, 300_000);

  it('has a freshly parsed bulletin for every fixture, so nothing below passes vacuously', () => {
    expect(freshlyParsed.size).toBe(STAMPS.length);
  });

  it('ships the newest bulletin exactly as the parser reads the 27 July fixture', () => {
    // If this fails, do not edit the generated file to make it pass — run
    // `npm run generate:bundled-bulletins` and read the diff, because the
    // parser changed.
    expect(NEWEST_BUNDLED_BULLETIN).toEqual(freshlyParsed.get('20260727'));
  });

  it.each(STAMPS.slice(0, -1))(
    'ships the archived %s bulletin exactly as the parser reads its fixture',
    (stamp) => {
      const index = STAMPS.indexOf(stamp);
      expect(ARCHIVED_BULLETINS[index]).toEqual(freshlyParsed.get(stamp));
    },
  );

  it('holds seven archived bulletins and one eager one — eight in all', () => {
    expect(ARCHIVED_BULLETINS).toHaveLength(7);
    expect(BUNDLED_DATES).toHaveLength(8);
    expect(BUNDLED_RANGE).toEqual({ from: '2026-07-20', to: '2026-07-27', count: 8 });
  });

  it('covers eight consecutive days, so the console opens on a trend with no gaps', () => {
    // The Trend view draws a break wherever a day is missing, and it is right
    // to. That break must never come from the bundle itself.
    expect(BUNDLED_DATES.map(String)).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
    ]);
  });

  it('announces exactly the days the archive actually holds', () => {
    // The dates are generated, not typed, precisely so the console cannot
    // promise a range the data does not cover.
    expect(ARCHIVE_DATES.map(String)).toEqual(ARCHIVED_BULLETINS.map((r) => String(r.reportDate)));
    expect(BUNDLED_DATES.map(String)).toEqual([
      ...ARCHIVED_BULLETINS.map((r) => String(r.reportDate)),
      String(NEWEST_BUNDLED_BULLETIN.reportDate),
    ]);
  });

  it('resolves the archive through the lazy loader, memoised', async () => {
    // The console reaches the archive only through this function; a second
    // caller must not start a second fetch.
    const first = loadArchivedBulletins();
    const second = loadArchivedBulletins();
    expect(first).toBe(second);
    expect(await first).toEqual(ARCHIVED_BULLETINS);
  });

  it('carries the content hash of each PDF, so the timeline dedupes them', () => {
    // The bulletin id is a content hash (PRD §5.6). Because a bundled bulletin
    // and a user-loaded copy of the same file hash identically, dropping one of
    // these PDFs onto the console is idempotent rather than duplicating the day.
    for (const stamp of STAMPS) {
      expect(freshlyParsed.get(stamp)?.bulletinId).toMatch(/^[0-9a-f]{64}$/);
    }
    const bundled = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN];
    expect(bundled.map((r) => r.bulletinId)).toEqual(
      STAMPS.map((stamp) => freshlyParsed.get(stamp)?.bulletinId),
    );
    expect(new Set(bundled.map((r) => r.bulletinId)).size).toBe(8);
  });

  it('is dated and reconciled throughout, so the console never opens on a broken archive', () => {
    for (const report of [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN]) {
      expect(report.reconciliationFailures).toEqual([]);
      expect(report.provenance.every((p) => p.confidence === 'high')).toBe(true);
      // 23 sections read cleanly on every one of the eight. A degraded section
      // in bundled history would be a permanent asterisk on the first screen.
      expect(report.provenance).toHaveLength(23);
    }
    expect(NEWEST_BUNDLED_BULLETIN.generatedAt).toBe('27-07-2026 09:49 PM');
  });

  it('reports the verified statewide affected population for each of the eight days', () => {
    // Independently verified against the printed bulletins. If the parser ever
    // starts reading a different total, that is a data defect and it stops here
    // rather than on an officer's screen.
    const affected = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].map((report) => [
      String(report.reportDate),
      report.statewideTotals.populationAffected,
    ]);

    expect(affected).toEqual([
      ['2026-07-20', { kind: 'known', unit: 'count', value: 362933 }],
      ['2026-07-21', { kind: 'known', unit: 'count', value: 564660 }],
      ['2026-07-22', { kind: 'known', unit: 'count', value: 653164 }],
      ['2026-07-23', { kind: 'known', unit: 'count', value: 721024 }],
      ['2026-07-24', { kind: 'known', unit: 'count', value: 705148 }],
      ['2026-07-25', { kind: 'known', unit: 'count', value: 654838 }],
      ['2026-07-26', { kind: 'known', unit: 'count', value: 524733 }],
      ['2026-07-27', { kind: 'known', unit: 'count', value: 445495 }],
    ]);
  });

  it('preserves unknown as unknown, not as zero (ADR-0005)', () => {
    // Dhemaji is the sharpest case in the 27 July bulletin: an explicit
    // reported zero for population, and no row at all in Villages Affected.
    // Serialising through TypeScript source must not flatten the second into
    // the first.
    const dhemaji = NEWEST_BUNDLED_BULLETIN.districts.find((d) => d.district === 'Dhemaji');
    expect(dhemaji?.population.total).toEqual({ kind: 'known', unit: 'count', value: 0 });
    expect(dhemaji?.villagesAffected).toEqual({ kind: 'unknown', unit: 'count' });
  });
});

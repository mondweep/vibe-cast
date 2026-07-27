/**
 * The guarantee that makes shipping a generated artefact safe.
 *
 * `src/generated/default-bulletin.ts` is committed source: it is what the
 * console shows on first open, and nothing at build time or run time reparses
 * the PDF to check it. That is the whole point — the default path costs no
 * pdf.js (NFR-3) — but it means the artefact could drift from the bulletin it
 * claims to be, and drift in a flood console is figures on a screen that no
 * document supports.
 *
 * So the check moves here. This test parses the real fixture PDF, fresh, on
 * every run, and asserts the result is the committed constant. It fails if
 * anyone hand-edits the generated file, and it fails if the parser changes
 * without the artefact being regenerated. Either way the fix is the same:
 *
 *     npm run generate:default-bulletin
 *
 * Where `golden.test.ts` asserts the parser reads Appendix B correctly, this
 * asserts that what we *ship* is what the parser reads.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { FloodSituationReport } from '../../domain/shared/flood-situation-report';
import { DEFAULT_BULLETIN } from '../../generated/default-bulletin';
import { createPdfBulletinSource } from './pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from './pdfjs-loader';

const FIXTURE = path.resolve(
  import.meta.dirname,
  '../../../fixtures/Daily_Flood_Report_20260727.pdf',
);

describe('the bundled default bulletin', () => {
  let freshlyParsed: FloodSituationReport;

  beforeAll(async () => {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
    const bytes = await readFile(FIXTURE);
    const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });
    freshlyParsed = await source.parse(
      new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
    );
  }, 60_000);

  it('is exactly what the parser reads from the fixture PDF', () => {
    // The single assertion this file exists for. If it fails, do not edit the
    // generated file to make it pass — run `npm run generate:default-bulletin`
    // and read the diff, because the parser changed.
    expect(DEFAULT_BULLETIN).toEqual(freshlyParsed);
  });

  it('carries the content hash of that PDF, so the timeline dedupes it', () => {
    // The bulletin id is a content hash (PRD §5.6). Because the shipped default
    // and a user-loaded copy of the same file hash identically, dropping the
    // 27 July PDF onto a console already showing the sample is idempotent
    // rather than duplicating the day.
    expect(DEFAULT_BULLETIN.bulletinId).toBe(freshlyParsed.bulletinId);
    expect(DEFAULT_BULLETIN.bulletinId).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is dated and reconciled, so the console never opens on a broken example', () => {
    expect(DEFAULT_BULLETIN.reportDate).toBe('2026-07-27');
    expect(DEFAULT_BULLETIN.generatedAt).toBe('27-07-2026 09:49 PM');
    expect(DEFAULT_BULLETIN.reconciliationFailures).toEqual([]);
    expect(DEFAULT_BULLETIN.provenance.every((p) => p.confidence === 'high')).toBe(true);
  });

  it('preserves unknown as unknown, not as zero (ADR-0005)', () => {
    // Dhemaji is the sharpest case in the bulletin: an explicit reported zero
    // for population, and no row at all in Villages Affected. Serialising
    // through TypeScript source must not flatten the second into the first.
    const dhemaji = DEFAULT_BULLETIN.districts.find((d) => d.district === 'Dhemaji');
    expect(dhemaji?.population.total).toEqual({ kind: 'known', unit: 'count', value: 0 });
    expect(dhemaji?.villagesAffected).toEqual({ kind: 'unknown', unit: 'count' });
  });
});

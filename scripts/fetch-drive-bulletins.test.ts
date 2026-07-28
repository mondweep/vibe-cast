/**
 * The parts of the Drive sync that can be wrong quietly.
 *
 * The subject is `drive-bulletins.ts`, which is the whole of
 * `fetch-drive-bulletins.ts` except its `fetch` calls and its exit code.
 *
 * The extractor is exercised against `__fixtures__/drive-folder-page.html`,
 * which is a byte-verbatim slice of a real response from
 * `https://drive.google.com/drive/folders/18o_wsSbVQvu8M70pYT1bFlcYJNKT6cP_`
 * — two file entries, kept exactly as Google served them, obfuscated class
 * names and all. A fixture written by hand would only prove the extractor
 * matches its author's idea of the markup, which is the one thing already
 * known to be true.
 *
 * Nothing here touches the network: every side effect of `syncBulletins` is
 * injected.
 */

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  bulletinDateOf,
  BulletinSyncError,
  extractDriveFiles,
  fixtureNameFor,
  looksLikePdf,
  mentionedBulletinNames,
  selectNewBulletins,
  syncBulletins,
  type DriveFile,
  type SyncDependencies,
} from './drive-bulletins';
import type { FloodSituationReport } from '../src/domain/shared/flood-situation-report';

const FOLDER_PAGE = readFileSync(
  join(import.meta.dirname, '__fixtures__', 'drive-folder-page.html'),
  'utf8',
);

describe('extracting files from the real folder page', () => {
  it('pairs every bulletin with its Drive file id', () => {
    expect(extractDriveFiles(FOLDER_PAGE)).toEqual([
      { fileId: '1Pz7OVD0LB-n_SNws1wsnk68bcRaHV2AY', fileName: 'Daily_Flood_Report_2026-07-20.pdf' },
      { fileId: '1-zCRHpM1x5ZyYFk8Dl4u68nTqw8b0pkf', fileName: 'Daily_Flood_Report_2026-07-21.pdf' },
    ]);
  });

  it('takes the bare id, not the decorated one Google also writes', () => {
    // The page carries `ssk='6:by9fbe38:<id>-0-16'` beside `data-id="<id>"`.
    // An id with the `-0-16` suffix left on downloads nothing.
    for (const file of extractDriveFiles(FOLDER_PAGE)) {
      expect(file.fileId).not.toMatch(/-\d+-\d+$/);
      expect(FOLDER_PAGE).toContain(`data-id="${file.fileId}"`);
    }
  });

  it('reports one entry per file even though the name appears three times', () => {
    // Each card repeats the filename in an aria-label, a data-tooltip and the
    // visible text; naive matching yields three "files" per bulletin.
    expect(mentionedBulletinNames(FOLDER_PAGE)).toHaveLength(2);
    expect(extractDriveFiles(FOLDER_PAGE)).toHaveLength(2);
  });

  it('finds nothing in markup that mentions no bulletin', () => {
    expect(extractDriveFiles('<html><body>Sign in to continue</body></html>')).toEqual([]);
    expect(extractDriveFiles('')).toEqual([]);
  });

  it('will not guess when an element carries two ids', () => {
    const ambiguous =
      '<div data-id="1AAAAAAAAAAAAAAAAAAAAAAAAAAA" data-other="1BBBBBBBBBBBBBBBBBBBBBBBBBBB" ' +
      'data-tooltip="Daily_Flood_Report_2026-07-20.pdf PDF"></div>';
    expect(extractDriveFiles(ambiguous)).toEqual([]);
  });

  it('ignores ids that belong to no bulletin', () => {
    const other =
      '<div data-id="1CCCCCCCCCCCCCCCCCCCCCCCCCCC" data-tooltip="Minutes_of_meeting.pdf PDF"></div>';
    expect(extractDriveFiles(other)).toEqual([]);
  });
});

describe('normalising the date in a filename', () => {
  it('reads the hyphenated form Drive uses', () => {
    expect(bulletinDateOf('Daily_Flood_Report_2026-07-20.pdf')).toBe('2026-07-20');
  });

  it('reads the compact form fixtures/ uses', () => {
    expect(bulletinDateOf('Daily_Flood_Report_20260720.pdf')).toBe('2026-07-20');
  });

  it('maps both spellings of a day onto the same date', () => {
    expect(bulletinDateOf('Daily_Flood_Report_20260726.pdf')).toBe(
      bulletinDateOf('Daily_Flood_Report_2026-07-26.pdf'),
    );
  });

  it('rejects a name carrying no date, or an impossible one', () => {
    expect(bulletinDateOf('Daily_Flood_Report_final.pdf')).toBeUndefined();
    expect(bulletinDateOf('Daily_Flood_Report_2026-02-30.pdf')).toBeUndefined();
    expect(bulletinDateOf('Daily_Flood_Report_2026-13-01.pdf')).toBeUndefined();
    expect(bulletinDateOf('assam-districts.geojson')).toBeUndefined();
    expect(bulletinDateOf('README.md')).toBeUndefined();
  });

  it('names the fixture in the compact form', () => {
    expect(fixtureNameFor('2026-07-20')).toBe('Daily_Flood_Report_20260720.pdf');
  });
});

describe('deciding what is new', () => {
  const drive: readonly DriveFile[] = [
    { fileId: 'a', fileName: 'Daily_Flood_Report_2026-07-25.pdf' },
    { fileId: 'b', fileName: 'Daily_Flood_Report_2026-07-26.pdf' },
  ];

  it('treats a differently spelled date as already held', () => {
    const selection = selectNewBulletins(drive, [
      'Daily_Flood_Report_20260725.pdf',
      'Daily_Flood_Report_20260726.pdf',
      'README.md',
    ]);
    expect(selection.pending).toEqual([]);
    expect(selection.alreadyHeld).toHaveLength(2);
  });

  it('selects only the day fixtures/ is missing', () => {
    const selection = selectNewBulletins(drive, ['Daily_Flood_Report_20260725.pdf']);
    expect(selection.pending).toEqual([
      {
        fileId: 'b',
        fileName: 'Daily_Flood_Report_2026-07-26.pdf',
        date: '2026-07-26',
        fixtureName: 'Daily_Flood_Report_20260726.pdf',
      },
    ]);
  });

  it('selects everything when fixtures/ holds no bulletins', () => {
    expect(selectNewBulletins(drive, ['README.md']).pending).toHaveLength(2);
  });

  it('does not download the same day twice from one folder', () => {
    const duplicated: readonly DriveFile[] = [
      { fileId: 'a', fileName: 'Daily_Flood_Report_2026-07-25.pdf' },
      { fileId: 'a2', fileName: 'Daily_Flood_Report_20260725.pdf' },
    ];
    expect(selectNewBulletins(duplicated, []).pending).toHaveLength(1);
  });

  it('sets aside a bulletin whose filename carries no date', () => {
    const odd: readonly DriveFile[] = [{ fileId: 'c', fileName: 'Daily_Flood_Report_draft.pdf' }];
    const selection = selectNewBulletins(odd, []);
    expect(selection.pending).toEqual([]);
    expect(selection.undatable).toEqual(odd);
  });
});

describe('recognising a PDF by its first bytes', () => {
  it('accepts %PDF', () => {
    expect(looksLikePdf(new TextEncoder().encode('%PDF-1.7\n…'))).toBe(true);
  });

  it('rejects an HTML interstitial and a truncated file', () => {
    expect(looksLikePdf(new TextEncoder().encode('<!DOCTYPE html>'))).toBe(false);
    expect(looksLikePdf(new Uint8Array([0x25, 0x50]))).toBe(false);
    expect(looksLikePdf(new Uint8Array())).toBe(false);
  });
});

// ---------------------------------------------------------------------------

const pdfBytes = (): Uint8Array => new TextEncoder().encode('%PDF-1.7 pretend bulletin');

const reportDated = (date: string): FloodSituationReport =>
  ({ reportDate: date }) as unknown as FloodSituationReport;

const dependencies = (overrides: Partial<SyncDependencies> = {}): SyncDependencies => ({
  fetchText: vi.fn(async () => FOLDER_PAGE),
  fetchBytes: vi.fn(async () => pdfBytes()),
  listFixtures: vi.fn(async () => []),
  writeFixture: vi.fn(async () => undefined),
  parseBulletin: vi.fn(async () => reportDated('2026-07-20')),
  log: vi.fn(),
  ...overrides,
});

describe('syncing', () => {
  it('downloads nothing when fixtures/ already holds every bulletin', async () => {
    const writeFixture = vi.fn(async () => undefined);
    const fetchBytes = vi.fn(async () => pdfBytes());
    const outcome = await syncBulletins(
      dependencies({
        listFixtures: async () => [
          'Daily_Flood_Report_20260720.pdf',
          'Daily_Flood_Report_20260721.pdf',
        ],
        writeFixture,
        fetchBytes,
      }),
    );

    expect(outcome.found).toHaveLength(2);
    expect(outcome.alreadyHeld).toHaveLength(2);
    expect(outcome.downloaded).toEqual([]);
    expect(fetchBytes).not.toHaveBeenCalled();
    expect(writeFixture).not.toHaveBeenCalled();
  });

  it('writes a validated bulletin under its fixture name', async () => {
    const writeFixture = vi.fn(async () => undefined);
    const outcome = await syncBulletins(
      dependencies({
        listFixtures: async () => ['Daily_Flood_Report_20260721.pdf'],
        writeFixture,
      }),
    );

    expect(outcome.downloaded.map((file) => file.date)).toEqual(['2026-07-20']);
    expect(writeFixture).toHaveBeenCalledWith('Daily_Flood_Report_20260720.pdf', pdfBytes());
    expect(outcome.rejected).toEqual([]);
  });

  it('keeps nothing that is not a PDF', async () => {
    const writeFixture = vi.fn(async () => undefined);
    const outcome = await syncBulletins(
      dependencies({
        listFixtures: async () => ['Daily_Flood_Report_20260721.pdf'],
        fetchBytes: async () => new TextEncoder().encode('<!DOCTYPE html><title>Sign in'),
        writeFixture,
      }),
    );

    expect(writeFixture).not.toHaveBeenCalled();
    expect(outcome.downloaded).toEqual([]);
    expect(outcome.rejected).toHaveLength(1);
    expect(outcome.rejected[0]?.reason).toMatch(/not a PDF/);
  });

  it('keeps nothing the parser refuses', async () => {
    const writeFixture = vi.fn(async () => undefined);
    const outcome = await syncBulletins(
      dependencies({
        listFixtures: async () => ['Daily_Flood_Report_20260721.pdf'],
        parseBulletin: async () => {
          throw new Error('Not a DRIMS Assam flood bulletin: no district table');
        },
        writeFixture,
      }),
    );

    expect(writeFixture).not.toHaveBeenCalled();
    expect(outcome.rejected[0]?.reason).toMatch(/does not parse.*no district table/);
  });

  it('keeps nothing whose bulletin date contradicts its filename', async () => {
    const writeFixture = vi.fn(async () => undefined);
    const outcome = await syncBulletins(
      dependencies({
        listFixtures: async () => ['Daily_Flood_Report_20260721.pdf'],
        parseBulletin: async () => reportDated('2026-07-19'),
        writeFixture,
      }),
    );

    expect(writeFixture).not.toHaveBeenCalled();
    expect(outcome.rejected[0]?.reason).toMatch(/filename says 2026-07-20 .* reports 2026-07-19/);
  });

  it('rejects one bad bulletin without losing the good one', async () => {
    const writeFixture = vi.fn(async () => undefined);
    const outcome = await syncBulletins(
      dependencies({
        parseBulletin: async (bytes) =>
          bytes.length === 1
            ? reportDated('2026-07-21')
            : Promise.reject(new Error('unreadable')),
        // The 20 July download is long, the 21 July one is a single byte.
        fetchBytes: async (url) =>
          url.includes('1-zCRHpM1x5ZyYFk8Dl4u68nTqw8b0pkf')
            ? new Uint8Array([0x25, 0x50, 0x44, 0x46])
            : pdfBytes(),
        writeFixture,
      }),
    );

    expect(outcome.downloaded).toHaveLength(0);
    expect(outcome.rejected).toHaveLength(2);
    expect(writeFixture).not.toHaveBeenCalled();
  });

  it('fails loudly, and says why, when the markup stops yielding ids', async () => {
    // The exact shape of a Google redesign: the names are still on the page,
    // and the bare id is gone — leaving only the decorated `ssk` form, which
    // must not be mistaken for a usable id.
    const renamed = FOLDER_PAGE.replaceAll(/ data-id="[^"]*"/g, '');

    await expect(syncBulletins(dependencies({ fetchText: async () => renamed }))).rejects.toThrow(
      BulletinSyncError,
    );
    await expect(
      syncBulletins(dependencies({ fetchText: async () => renamed })),
    ).rejects.toThrow(/no file id could be paired/);
  });

  it('fails loudly, rather than reporting nothing new, on an empty page', async () => {
    await expect(
      syncBulletins(dependencies({ fetchText: async () => '<html><body>Sign in</body></html>' })),
    ).rejects.toThrow(/No bulletins found/);
  });

  it('does not look at fixtures/ at all when extraction has already failed', async () => {
    const listFixtures = vi.fn(async () => []);
    await expect(
      syncBulletins(dependencies({ fetchText: async () => '', listFixtures })),
    ).rejects.toThrow(BulletinSyncError);
    expect(listFixtures).not.toHaveBeenCalled();
  });
});

/**
 * Deciding which ASDMA Daily Flood Reports a public Google Drive folder holds
 * that `fixtures/` does not, and whether each one is fit to keep.
 *
 * Everything here is a pure function or takes its side effects as arguments.
 * The executable half — real `fetch`, real disk, exit codes — is
 * `fetch-drive-bulletins.ts`, which is what the workflow runs. The split is not
 * ceremony: `fetch-drive-bulletins.ts` performs network I/O the moment it is
 * loaded, and a test that imported it would go to Google. Under `vite-node` an
 * `import.meta`-versus-`argv` entry-point guard cannot save us, because
 * vite-node does not put the script path in `process.argv` at all. So the
 * testable half simply has no side effects to guard.
 *
 * ---------------------------------------------------------------------------
 * Why this scrapes an HTML page instead of calling the Drive API
 * ---------------------------------------------------------------------------
 *
 * `https://www.googleapis.com/drive/v3/files?q=…` returns 403 without an API
 * key, even for a world-readable folder. A key would have to live in repository
 * secrets, be rotated by a human, and be a thing that can silently expire —
 * for data that is already public to anyone with the link. Requesting the
 * folder's own page (`drive.google.com/drive/folders/<ID>`) returns 200 and
 * ~350 kB of HTML that contains every file's name and id, with no credentials
 * at all. That is the trade taken here: no secret to manage, at the cost of
 * depending on markup Google does not document.
 *
 * ---------------------------------------------------------------------------
 * Which is why this file fails loudly and never silently
 * ---------------------------------------------------------------------------
 *
 * Undocumented markup is the known fragility. The dangerous failure is not a
 * crash — it is Google reshuffling their attributes so the extractor pairs
 * nothing, the run goes green, and the console quietly serves a stale archive
 * for weeks while every dashboard says the sync is healthy. A silent zero is
 * indistinguishable from "nothing new today", and those two must never look
 * alike. So: finding no `{fileId, fileName}` pair at all is an ERROR and a
 * non-zero exit, not a no-op. Finding names on the page that could not be
 * paired with an id is a louder error still, because it is the exact
 * fingerprint of an attribute rename. Better a red run that is occasionally
 * about nothing than a green one that is occasionally a lie.
 */

import { isValidReportDate } from '../src/domain/timeline/report-date';
import type { FloodSituationReport } from '../src/domain/shared/flood-situation-report';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * The folder the repository owner uploads to. Overridable with
 * `DRIVE_FOLDER_ID` so pointing the job at a different folder is a workflow
 * setting, not a code change.
 */
export const DEFAULT_FOLDER_ID = '18o_wsSbVQvu8M70pYT1bFlcYJNKT6cP_';

export const folderPageUrl = (folderId: string): string =>
  `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;

/**
 * `drive.usercontent.google.com/download` serves the bytes directly for a
 * public file. The older `drive.google.com/uc?export=download` host answers
 * with an interstitial HTML page for anything large enough to warrant a virus
 * -scan warning, which is why it is not used.
 */
export const downloadUrl = (fileId: string): string =>
  `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`;

// ---------------------------------------------------------------------------
// Extraction — the pure part, tested against a real slice of Google's markup
// ---------------------------------------------------------------------------

export type DriveFile = {
  readonly fileId: string;
  readonly fileName: string;
};

/**
 * A single HTML element, opening tag only. The extractor works element by
 * element rather than over the whole document because proximity in a 350 kB
 * blob proves nothing, whereas two attributes on the *same* element are as
 * close to a stated relationship as this page offers.
 */
const ELEMENT = /<[^<>]{0,16000}>/g;

/** A bulletin filename, wherever it appears — attribute value or text node. */
const BULLETIN_FILE_NAME = /Daily_Flood_Report_[A-Za-z0-9_-]*\.pdf/g;

/**
 * A Drive file id occupying an attribute value *in its entirety*.
 *
 * The whole-value anchor is what makes this specific rather than lucky. Drive
 * ids also appear inside Google's internal `ssk='6:by9fbe38:<id>-0-16'` values,
 * where a loose match would swallow the `-0-16` suffix and produce an id that
 * 404s. Requiring the value to be nothing but id characters skips those and
 * keeps the clean `data-id="<id>"` form — while staying indifferent to what
 * the attribute is actually called, since Google renames attributes far more
 * readily than it changes how an id is written.
 */
const ID_ATTRIBUTE = /=(["'])([A-Za-z0-9_-]{25,})\1/g;

const matches = (source: string, pattern: RegExp, group: number): readonly string[] =>
  [...source.matchAll(pattern)].map((match) => match[group] as string);

/**
 * Pair every bulletin filename on the folder page with its Drive file id.
 *
 * Returns at most one entry per file id, in page order.
 */
export const extractDriveFiles = (html: string): readonly DriveFile[] => {
  const found = new Map<string, string>();

  for (const element of matches(html, ELEMENT, 0)) {
    const names = matches(element, BULLETIN_FILE_NAME, 0);
    if (names.length === 0) continue;

    const ids = matches(element, ID_ATTRIBUTE, 2);
    // An element carrying several ids, or several different filenames, is not
    // a statement about which belongs to which. Ambiguity is dropped rather
    // than guessed at; if that ever leaves us with nothing, the caller errors.
    if (ids.length !== 1) continue;
    if (new Set(names).size !== 1) continue;

    const fileId = ids[0] as string;
    if (!found.has(fileId)) found.set(fileId, names[0] as string);
  }

  return [...found].map(([fileId, fileName]) => ({ fileId, fileName }));
};

/**
 * Bulletin filenames present on the page at all, paired or not.
 *
 * Used only to tell two failures apart: a folder that genuinely holds no
 * bulletins, and a folder that holds them behind markup we no longer read.
 */
export const mentionedBulletinNames = (html: string): readonly string[] => [
  ...new Set(matches(html, BULLETIN_FILE_NAME, 0)),
];

// ---------------------------------------------------------------------------
// Dates — Drive says 2026-07-20, fixtures say 20260720
// ---------------------------------------------------------------------------

const DATE_IN_FILE_NAME = /Daily_Flood_Report_(\d{4})-?(\d{2})-?(\d{2})\.pdf$/;

/**
 * The report date a bulletin filename claims, as an ISO `ReportDate`, or
 * `undefined` if the name does not carry a real calendar date.
 *
 * Both spellings are accepted because both are in use: Drive holds
 * `Daily_Flood_Report_2026-07-20.pdf` and `fixtures/` holds
 * `Daily_Flood_Report_20260720.pdf`, and the whole point is to compare them.
 * Validity is decided by the domain's own `isValidReportDate`, so a filename
 * cannot claim a date the rest of the application would reject.
 */
export const bulletinDateOf = (fileName: string): string | undefined => {
  const match = DATE_IN_FILE_NAME.exec(fileName);
  if (match === null) return undefined;
  const date = `${match[1] as string}-${match[2] as string}-${match[3] as string}`;
  return isValidReportDate(date) ? date : undefined;
};

/** The name a bulletin for `date` takes in `fixtures/`. */
export const fixtureNameFor = (date: string): string =>
  `Daily_Flood_Report_${date.replaceAll('-', '')}.pdf`;

// ---------------------------------------------------------------------------
// Selection — what is new
// ---------------------------------------------------------------------------

export type PendingDownload = DriveFile & {
  readonly date: string;
  readonly fixtureName: string;
};

export type Selection = {
  /** Not in `fixtures/` yet, and worth fetching. */
  readonly pending: readonly PendingDownload[];
  /** Already held, compared by date rather than by spelling. */
  readonly alreadyHeld: readonly DriveFile[];
  /** A `Daily_Flood_Report_*.pdf` whose name carries no usable date. */
  readonly undatable: readonly DriveFile[];
};

/**
 * Split what Drive holds against what `fixtures/` already holds.
 *
 * Comparison is by report date, never by filename: the two sides spell the
 * same day differently, and a naive name comparison would re-download every
 * bulletin every night and call each one new.
 */
export const selectNewBulletins = (
  driveFiles: readonly DriveFile[],
  existingFixtureNames: readonly string[],
): Selection => {
  const held = new Set(
    existingFixtureNames
      .map((name) => bulletinDateOf(name))
      .filter((date): date is string => date !== undefined),
  );

  const pending: PendingDownload[] = [];
  const alreadyHeld: DriveFile[] = [];
  const undatable: DriveFile[] = [];

  for (const file of driveFiles) {
    const date = bulletinDateOf(file.fileName);
    if (date === undefined) {
      undatable.push(file);
    } else if (held.has(date)) {
      alreadyHeld.push(file);
    } else {
      // Guard against one folder holding both spellings of the same day.
      held.add(date);
      pending.push({ ...file, date, fixtureName: fixtureNameFor(date) });
    }
  }

  return { pending, alreadyHeld, undatable };
};

// ---------------------------------------------------------------------------
// Validation — nothing enters fixtures/ unexamined
// ---------------------------------------------------------------------------

/** `%PDF` — the first four bytes of every PDF, per ISO 32000-1 §7.5.2. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];

export const looksLikePdf = (bytes: Uint8Array): boolean =>
  PDF_MAGIC.every((byte, index) => bytes[index] === byte);

// ---------------------------------------------------------------------------
// The sync itself — every side effect injected, so this is testable
// ---------------------------------------------------------------------------

export type SyncDependencies = {
  readonly fetchText: (url: string) => Promise<string>;
  readonly fetchBytes: (url: string) => Promise<Uint8Array>;
  readonly listFixtures: () => Promise<readonly string[]>;
  readonly writeFixture: (fileName: string, bytes: Uint8Array) => Promise<void>;
  readonly parseBulletin: (bytes: Uint8Array) => Promise<FloodSituationReport>;
  readonly log: (line: string) => void;
};

export type Rejection = {
  readonly fileName: string;
  readonly reason: string;
};

export type SyncOutcome = {
  readonly found: readonly DriveFile[];
  readonly alreadyHeld: readonly DriveFile[];
  readonly downloaded: readonly PendingDownload[];
  readonly rejected: readonly Rejection[];
  readonly undatable: readonly DriveFile[];
};

/**
 * Raised for every condition that must stop the run rather than shrink the
 * result set. Distinct from a rejected file, which is a fact about one
 * bulletin; this is a fact about the sync itself no longer working.
 */
export class BulletinSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulletinSyncError';
  }
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const syncBulletins = async (
  dependencies: SyncDependencies,
  folderId: string = DEFAULT_FOLDER_ID,
): Promise<SyncOutcome> => {
  const { fetchText, fetchBytes, listFixtures, writeFixture, parseBulletin, log } = dependencies;

  const html = await fetchText(folderPageUrl(folderId));
  const found = extractDriveFiles(html);

  if (found.length === 0) {
    const mentioned = mentionedBulletinNames(html);
    throw new BulletinSyncError(
      mentioned.length > 0
        ? `The folder page names ${String(mentioned.length)} bulletin(s) — ` +
          `${mentioned.slice(0, 3).join(', ')}${mentioned.length > 3 ? ', …' : ''} — ` +
          'but no file id could be paired with any of them. Google has almost ' +
          'certainly changed how the folder page marks up file ids; the extractor in ' +
          'scripts/drive-bulletins.ts needs updating. See docs/BULLETIN-SYNC.md.'
        : `No bulletins found on the folder page for ${folderId} ` +
          `(${String(html.length)} bytes of HTML read). Either the folder is empty, ` +
          'it is no longer shared publicly, or the page markup has changed. This is ' +
          'reported as a failure rather than as "nothing new" because a silent zero ' +
          'here would leave the deployed console stale indefinitely. ' +
          'See docs/BULLETIN-SYNC.md.',
    );
  }

  const existing = await listFixtures();
  const { pending, alreadyHeld, undatable } = selectNewBulletins(found, existing);

  const downloaded: PendingDownload[] = [];
  const rejected: Rejection[] = [];

  for (const file of pending) {
    log(`  downloading ${file.fileName} (${file.fileId})`);

    let bytes: Uint8Array;
    try {
      bytes = await fetchBytes(downloadUrl(file.fileId));
    } catch (error) {
      rejected.push({ fileName: file.fileName, reason: `download failed: ${describe(error)}` });
      continue;
    }

    if (!looksLikePdf(bytes)) {
      rejected.push({
        fileName: file.fileName,
        reason:
          `not a PDF — the first bytes are not %PDF (${String(bytes.length)} bytes read). ` +
          'Drive may have served an interstitial page instead of the file.',
      });
      continue;
    }

    // Parsed with the real parser before it is kept, because "is a PDF" and
    // "is a bulletin this console can read" are very different claims, and only
    // the second one is worth committing.
    let report: FloodSituationReport;
    try {
      report = await parseBulletin(bytes);
    } catch (error) {
      rejected.push({ fileName: file.fileName, reason: `does not parse: ${describe(error)}` });
      continue;
    }

    // A bulletin filed under the wrong date is worse than a missing one: the
    // timeline would show a day of flood that belongs to another day.
    if (String(report.reportDate) !== file.date) {
      rejected.push({
        fileName: file.fileName,
        reason:
          `the filename says ${file.date} but the bulletin reports ` +
          `${String(report.reportDate)}. Refusing to file it under the wrong date.`,
      });
      continue;
    }

    await writeFixture(file.fixtureName, bytes);
    downloaded.push(file);
    log(`    kept as fixtures/${file.fixtureName} (${String(bytes.length)} bytes)`);
  }

  return { found, alreadyHeld, downloaded, rejected, undatable };
};

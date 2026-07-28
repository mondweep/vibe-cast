/**
 * Keeps `fixtures/` current from the public Google Drive folder the repository
 * owner uploads ASDMA Daily Flood Reports to, so a new bulletin reaches the
 * deployed console by being dropped in a folder rather than by being committed.
 *
 * Run it with:
 *
 *     npx vite-node scripts/fetch-drive-bulletins.ts
 *
 * vite-node rather than bare node for the same reason as the other scripts
 * here: this reaches into `src/`, which uses directory imports that Node's own
 * resolver rejects with ERR_UNSUPPORTED_DIR_IMPORT. It also means a downloaded
 * PDF is validated through exactly the parser the browser would use.
 *
 * Environment:
 *   DRIVE_FOLDER_ID   the folder to read (defaults to the owner's folder)
 *   GITHUB_OUTPUT     if set, `downloaded`, `rejected` and `dates` are appended
 *   GITHUB_ACTIONS    if 'true', rejections are also emitted as ::error::
 *
 * No credentials, by design — see the header of `drive-bulletins.ts` for why
 * this scrapes a public page rather than calling the Drive API, and why it
 * treats "found nothing" as a failure rather than as a quiet success.
 *
 * This file is the side-effecting half and is never imported by a test: it
 * fetches on load. All the logic worth testing lives in `drive-bulletins.ts`.
 */

import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  BulletinSyncError,
  DEFAULT_FOLDER_ID,
  folderPageUrl,
  syncBulletins,
  type SyncOutcome,
} from './drive-bulletins';
import type { FloodSituationReport } from '../src/domain/shared/flood-situation-report';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIXTURES = path.join(ROOT, 'fixtures');

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const readFolderPage = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      // Asked for as a browser would ask: the folder listing is a browser page,
      // and Google serves a thinner thing to a client that admits otherwise.
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      'accept-language': 'en-GB,en;q=0.9',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new BulletinSyncError(
      `Google returned ${String(response.status)} for ${url}. The folder is no longer ` +
        'readable without credentials. This job deliberately holds no secret and no API ' +
        'key: the fix is to share the folder publicly again ("Anyone with the link"), ' +
        'not to add one. See docs/BULLETIN-SYNC.md.',
    );
  }
  if (!response.ok) {
    throw new BulletinSyncError(`Google returned ${String(response.status)} for ${url}.`);
  }

  return response.text();
};

const readFileBytes = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
  return new Uint8Array(await response.arrayBuffer());
};

/**
 * Parse with the application's own parser, by the same route
 * `generate-default-bulletin.ts` takes — the legacy pdf.js build is the one
 * that runs outside a browser. Imported lazily so the machinery is only paid
 * for on the days there is actually something new to check.
 */
const parseWithRealParser = async (bytes: Uint8Array): Promise<FloodSituationReport> => {
  const [{ createPdfBulletinSource }, { createPdfJsLoader }, pdfjs] = await Promise.all([
    import('../src/adapters/pdf/pdf-bulletin-source'),
    import('../src/adapters/pdf/pdfjs-loader'),
    import('pdfjs-dist/legacy/build/pdf.mjs'),
  ]);
  const source = createPdfBulletinSource({
    loader: createPdfJsLoader(pdfjs as unknown as Parameters<typeof createPdfJsLoader>[0]),
  });
  // Copied into an `ArrayBuffer` rather than handed over directly: a
  // `Uint8Array` is only *typed* as possibly sitting on a `SharedArrayBuffer`,
  // which `Blob` will not take, and a cast here would be a lie rather than a
  // fix. The copy costs a millisecond on a 1 MB bulletin.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return source.parse(new Blob([buffer], { type: 'application/pdf' }));
};

/** Hand the calling GitHub Actions step the facts it needs, if there is one. */
const publishStepOutputs = async (outcome: SyncOutcome): Promise<void> => {
  const target = process.env['GITHUB_OUTPUT'];
  if (target === undefined || target === '') return;
  await writeFile(
    target,
    `downloaded=${String(outcome.downloaded.length)}\n` +
      `rejected=${String(outcome.rejected.length)}\n` +
      `dates=${outcome.downloaded.map((file) => file.date).join(', ')}\n`,
    { flag: 'a', encoding: 'utf8' },
  );
};

const main = async (): Promise<void> => {
  const folderId = process.env['DRIVE_FOLDER_ID'] ?? DEFAULT_FOLDER_ID;
  const log = (line: string): void => void process.stdout.write(`${line}\n`);

  log(`Reading ${folderPageUrl(folderId)}`);

  const outcome = await syncBulletins(
    {
      fetchText: readFolderPage,
      fetchBytes: readFileBytes,
      listFixtures: () => readdir(FIXTURES),
      writeFixture: (fileName, bytes) => writeFile(path.join(FIXTURES, fileName), bytes),
      parseBulletin: parseWithRealParser,
      log,
    },
    folderId,
  );

  log('');
  log(`  found      : ${String(outcome.found.length)} bulletin(s) in the folder`);
  log(`  skipped    : ${String(outcome.alreadyHeld.length)} already in fixtures/`);
  log(`  downloaded : ${String(outcome.downloaded.length)} new`);
  log(`  rejected   : ${String(outcome.rejected.length)}`);

  for (const file of outcome.downloaded) log(`    + ${file.date} -> fixtures/${file.fixtureName}`);
  for (const file of outcome.undatable) {
    log(`    ? ${file.fileName} — no report date in the filename; ignored`);
  }
  for (const rejection of outcome.rejected) {
    const message = `${rejection.fileName} was NOT kept: ${rejection.reason}`;
    log(`    ! ${message}`);
    // A rejection does not stop the run: the good bulletins of the day should
    // still ship. The workflow fails the job afterwards, on this count, so the
    // run is red and someone looks — see .github/workflows/sync-bulletins.yml.
    if (process.env['GITHUB_ACTIONS'] === 'true') process.stdout.write(`::error::${message}\n`);
  }

  await publishStepOutputs(outcome);
};

try {
  await main();
} catch (error) {
  process.stderr.write(`FAIL: ${describe(error)}\n`);
  if (process.env['GITHUB_ACTIONS'] === 'true') {
    process.stderr.write(`::error title=Drive bulletin sync failed::${describe(error)}\n`);
  }
  process.exit(1);
}

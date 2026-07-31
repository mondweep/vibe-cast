/**
 * Generates the bundled bulletin archive from the real ASDMA fixtures.
 *
 * Three modules come out of this script, and the split between them is the
 * whole design:
 *
 *   src/generated/newest-bulletin.ts   the newest bulletin, eager
 *   src/generated/bulletin-archive.ts  the seven older ones, dynamic-import only
 *   src/generated/bundled-bulletins.ts the index: dates, range, and the loader
 *
 * Why a generated artefact rather than a runtime parse?
 *
 * The console must open with real history in it, immediately. The eight fixture
 * PDFs are 9.9 MB; the `FloodSituationReport`s they parse to are ~780 kB of
 * TypeScript — about 75 kB gzipped. Shipping the *parsed reports* costs under a
 * hundredth of shipping the PDFs, and — the point of the whole exercise — it
 * costs no pdf.js at all. The default path never touches the parser (NFR-3).
 *
 * Why the split?
 *
 * First paint has a 300 kB budget (NFR-4). Shipping all eight eagerly would
 * spend ~75 kB of it on seven bulletins the visitor may never open, so only the
 * newest is eager — the console still renders instantly, with figures. The
 * seven historical ones are reached through the `import()` in
 * `bundled-bulletins.ts`, which is what puts them in their own build chunk.
 * `scripts/verify-lazy-archive.ts` checks that against the real `dist/`, so the
 * guarantee is mechanical rather than asserted.
 *
 * The generated modules are committed. Netlify must not have to run pdf.js in
 * Node to produce a build, both because it is slow and because it is a failure
 * mode we would only ever discover in production (ADR-0007).
 *
 * The honesty of committed artefacts is guaranteed elsewhere:
 * `src/adapters/pdf/bundled-bulletins.test.ts` reparses all eight fixture PDFs
 * on every test run and asserts they deep-equal what this script emitted.
 * Hand-edit a generated file, or change the parser, and that test fails.
 *
 * Run it with:
 *
 *     npm run generate:bundled-bulletins
 *
 * which is `vite-node scripts/generate-bundled-bulletins.ts`. vite-node is used
 * rather than a bare `node --experimental-strip-types` because the project
 * imports directories (`../../application/ports`), which Node's own resolver
 * rejects with ERR_UNSUPPORTED_DIR_IMPORT. Vite's resolver handles them, and it
 * is the same resolver the app and the tests already use — so what this script
 * parses is what the browser would have parsed.
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { FloodSituationReport } from '../src/domain/shared/flood-situation-report';
import { createPdfBulletinSource } from '../src/adapters/pdf/pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from '../src/adapters/pdf/pdfjs-loader';

const ROOT = path.resolve(import.meta.dirname, '..');
const GENERATED = path.join(ROOT, 'src', 'generated');

/**
 * Every bulletin the console ships with, oldest first.
 *
 * Eight consecutive days: no gaps, so the Trend view draws an unbroken
 * seven-day line out of the box and Cumulative & Peak covers a real period.
 * Keep them consecutive — a hole here becomes a hole on the officer's first
 * screen, and the console is right to draw it as one.
 *
 * The **last** entry is the eager one. The rest are the archive.
 */
export const BUNDLED_STAMPS: readonly string[] = discoverBundledStamps();

/**
 * Read the fixture directory rather than hold a list.
 *
 * A hard-coded list silently broke the whole ingestion chain: the Drive sync
 * would download a new bulletin, this generator would ignore it, the tests and
 * the build would pass, and CI would commit a change that altered nothing. The
 * deployed console would sit unchanged while every signal said success — the
 * worst shape of failure, and the one this project has already been bitten by
 * once in the parser.
 *
 * Discovery makes "what is in fixtures/" and "what the console ships" the same
 * statement by construction, so they cannot drift.
 */
function discoverBundledStamps(): readonly string[] {
  const dir = path.join(ROOT, 'fixtures');
  const stamps = readdirSync(dir)
    .map((name) => /^Daily_Flood_Report_(\d{8})\.pdf$/.exec(name)?.[1])
    .filter((stamp): stamp is string => stamp !== undefined)
    .sort();

  if (stamps.length === 0) {
    throw new Error(
      `No Daily_Flood_Report_YYYYMMDD.pdf files found in ${dir}. The console ships ` +
        'its archive from these, so generating an empty one would quietly strip the ' +
        'history from the deployed site.',
    );
  }
  return stamps;
}

const fixtureFor = (stamp: string): string =>
  path.join(ROOT, 'fixtures', `Daily_Flood_Report_${stamp}.pdf`);

/**
 * The published language brands its identifiers, so a bare string literal is
 * not assignable to them. Casting at exactly these four keys — and nowhere
 * else — keeps every other field under full contextual type checking, which is
 * what makes shape drift in `FloodSituationReport` a compile error in the
 * generated file rather than a silent mismatch.
 */
const BRANDED_KEYS: Readonly<Record<string, string>> = {
  bulletinId: 'BulletinId',
  reportDate: 'ReportDate',
  district: 'DistrictName',
  circle: 'RevenueCircleName',
};

/**
 * Emit a value as TypeScript source.
 *
 * `String(number)` round-trips an IEEE double exactly, which matters: DRIMS
 * publishes `2025.9200000000003` and rounding it here would make the golden
 * test and this artefact disagree about what ASDMA printed.
 *
 * A key whose value is `undefined` is emitted as `undefined` rather than
 * dropped, so key *presence* survives the round trip too. Unknown is not zero,
 * and it is not absent either (ADR-0005).
 */
const toSource = (value: unknown, indent: string, key?: string): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialise the non-finite number ${String(value)} at key "${key}".`);
    }
    return String(value);
  }

  if (typeof value === 'boolean') return String(value);

  if (typeof value === 'string') {
    const literal = JSON.stringify(value);
    const brand = key === undefined ? undefined : BRANDED_KEYS[key];
    return brand === undefined ? literal : `${literal} as ${brand}`;
  }

  const inner = `${indent}  `;

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => `${inner}${toSource(item, inner)}`);
    return `[\n${items.join(',\n')},\n${indent}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const fields = entries.map(
      ([name, field]) => `${inner}${JSON.stringify(name)}: ${toSource(field, inner, name)}`,
    );
    return `{\n${fields.join(',\n')},\n${indent}}`;
  }

  throw new Error(`Cannot serialise a ${typeof value} at key "${key}".`);
};

const TYPE_IMPORTS = `import type {
  BulletinId,
  FloodSituationReport,
  ReportDate,
} from '../domain/shared/flood-situation-report';
import type {
  DistrictName,
  RevenueCircleName,
} from '../domain/shared/administrative-unit';
`;

const generatedBy = (what: string, fixtures: string): string => `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * ${what}
 *
 * Produced by \`scripts/generate-bundled-bulletins.ts\` from
 * ${fixtures}. Regenerate with:
 *
 *     npm run generate:bundled-bulletins
 *
 * Any edit made here will be reported as a failure by
 * \`src/adapters/pdf/bundled-bulletins.test.ts\`, which reparses the fixture
 * PDFs and compares.
 */
`;

const parseFixture = async (
  pdfjs: PdfJsModule,
  stamp: string,
): Promise<FloodSituationReport> => {
  const bytes = await readFile(fixtureFor(stamp));
  const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });
  return source.parse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
};

const newestModule = (report: FloodSituationReport): string =>
  `${generatedBy(
    'The newest bulletin the console ships with, already parsed.\n *\n' +
      ' * This one is **eager**: it is in the entry chunk, so the console renders with\n' +
      ' * real figures on first paint without loading pdf.js and without touching the\n' +
      ' * network (NFR-3, NFR-5, NFR-6). Its seven predecessors are not — see\n' +
      ' * `bulletin-archive.ts`.',
    '`fixtures/Daily_Flood_Report_20260727.pdf`',
  )}
${TYPE_IMPORTS}
export const NEWEST_BUNDLED_BULLETIN: FloodSituationReport = ${toSource(report, '')};
`;

const archiveModule = (reports: readonly FloodSituationReport[]): string => {
  const first = String(reports[0]?.reportDate);
  const last = String(reports[reports.length - 1]?.reportDate);
  const entries = reports.map((report) => `  ${toSource(report, '  ')}`).join(',\n');

  return `${generatedBy(
    `The bundled historical archive — ${String(reports.length)} real ASDMA bulletins, ` +
      `${first} to ${last}.\n *\n` +
      ' * **Nothing may import this module statically.** It is reached only through\n' +
      ' * the `import()` in `bundled-bulletins.ts`, which is what keeps it out of the\n' +
      ' * entry chunk and off the first-paint budget (NFR-4). A static import here\n' +
      ' * would add ~65 kB gzipped to every visitor, and\n' +
      ' * `scripts/verify-lazy-archive.ts` fails if one appears in the built output.',
    '`fixtures/Daily_Flood_Report_2026072{0,1,2,3,4,5,6}.pdf`',
  )}
${TYPE_IMPORTS}
export const ARCHIVED_BULLETINS: readonly FloodSituationReport[] = [
${entries},
];
`;
};

/**
 * The index module: everything about the bundle that the console needs *before*
 * the archive has arrived, plus the one `import()` that fetches it.
 *
 * The dates are generated rather than typed by hand so the console cannot
 * announce a range the archive does not actually cover.
 */
const indexModule = (reports: readonly FloodSituationReport[]): string => {
  const dates = reports.map((report) => String(report.reportDate));
  const archiveDates = dates.slice(0, -1);
  const list = (values: readonly string[]): string =>
    values.map((value) => `  '${value}' as ReportDate,`).join('\n');

  return `${generatedBy(
    'What the console knows about its bundled bulletins before the archive has\n' +
      ' * loaded, and the one dynamic import that loads it.',
    '`fixtures/Daily_Flood_Report_2026072{0,…,7}.pdf`',
  )}
import type {
  FloodSituationReport,
  ReportDate,
} from '../domain/shared/flood-situation-report';

export { NEWEST_BUNDLED_BULLETIN } from './newest-bulletin';

/** Every day the bundle covers, oldest first. */
export const BUNDLED_DATES: readonly ReportDate[] = [
${list(dates)}
];

/** The days held in the lazily-loaded archive — every bundled day but the newest. */
export const ARCHIVE_DATES: readonly ReportDate[] = [
${list(archiveDates)}
];

/** First and last day of the bundle, for copy that must not outrun the data. */
export const BUNDLED_RANGE = {
  from: '${dates[0] ?? ''}' as ReportDate,
  to: '${dates[dates.length - 1] ?? ''}' as ReportDate,
  count: ${String(dates.length)},
} as const;

/**
 * Fetch the historical archive.
 *
 * This \`import()\` is load-bearing: it is the *only* reference to
 * \`bulletin-archive\` in the source tree, and it is what makes the archive its
 * own build chunk rather than ~65 kB gzipped added to first paint. Turning it
 * into a static import would silently spend the NFR-4 budget, so
 * \`npm run verify:lazy-archive\` asserts against the built output that no
 * eagerly-loaded chunk imports it statically.
 *
 * Memoised on the promise, not the value, so two callers cannot start two
 * fetches. A rejection clears the memo — a failed load may be retried.
 */
let pending: Promise<readonly FloodSituationReport[]> | undefined;

export const loadArchivedBulletins = (): Promise<readonly FloodSituationReport[]> => {
  pending ??= import('./bulletin-archive')
    .then((module) => module.ARCHIVED_BULLETINS)
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
};
`;
};

const write = async (name: string, body: string): Promise<number> => {
  const file = path.join(GENERATED, name);
  await mkdir(GENERATED, { recursive: true });
  await writeFile(file, body, 'utf8');
  process.stdout.write(
    `  ${path.relative(ROOT, file).padEnd(36)} ${String(body.length).padStart(8)} bytes\n`,
  );
  return body.length;
};

const main = async (): Promise<void> => {
  // The legacy build is the one that runs outside a browser — same choice the
  // golden test makes, so both read the fixtures through identical machinery.
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;

  const reports: FloodSituationReport[] = [];
  for (const stamp of BUNDLED_STAMPS) {
    const report = await parseFixture(pdfjs, stamp);
    process.stdout.write(
      `Parsed ${stamp}: ${String(report.reportDate)}, ` +
        `${String(report.districts.length)} districts, ` +
        `${String(report.reconciliationFailures.length)} reconciliation failures.\n`,
    );
    reports.push(report);
  }

  const newest = reports[reports.length - 1];
  if (newest === undefined) throw new Error('No bulletins were parsed.');
  const archive = reports.slice(0, -1);

  process.stdout.write('\n');
  const bytes =
    (await write('newest-bulletin.ts', newestModule(newest))) +
    (await write('bulletin-archive.ts', archiveModule(archive))) +
    (await write('bundled-bulletins.ts', indexModule(reports)));

  process.stdout.write(
    `\n${String(reports.length)} bulletins, ` +
      `${String(reports[0]?.reportDate)} to ${String(newest.reportDate)}, ` +
      `${String(bytes)} bytes of TypeScript in total.\n`,
  );
};

await main();

/**
 * Generates `src/generated/default-bulletin.ts` from the real ASDMA fixture.
 *
 * Why a generated artefact rather than a runtime parse?
 *
 * The console must open with something real in it, immediately. The fixture PDF
 * is 1,247,113 bytes; the `FloodSituationReport` it parses to is 60,942 bytes of
 * JSON — 7,353 bytes gzipped. Shipping the *parsed report* costs a fraction of
 * a percent of shipping the PDF, and — the point of the whole exercise — it
 * costs no pdf.js at all. The default path never touches the parser (NFR-3).
 *
 * The generated module is committed. Netlify must not have to run pdf.js in
 * Node to produce a build, both because it is slow and because it is a failure
 * mode we would only ever discover in production (ADR-0007).
 *
 * The honesty of a committed artefact is guaranteed elsewhere:
 * `src/adapters/pdf/default-bulletin.test.ts` parses the fixture PDF fresh on
 * every test run and asserts it deep-equals what this script emitted. Hand-edit
 * the generated file, or change the parser, and that test fails.
 *
 * Run it with:
 *
 *     npm run generate:default-bulletin
 *
 * which is `vite-node scripts/generate-default-bulletin.ts`. vite-node is used
 * rather than a bare `node --experimental-strip-types` because the project
 * imports directories (`../../application/ports`), which Node's own resolver
 * rejects with ERR_UNSUPPORTED_DIR_IMPORT. Vite's resolver handles them, and it
 * is the same resolver the app and the tests already use — so what this script
 * parses is what the browser would have parsed.
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FloodSituationReport } from '../src/domain/shared/flood-situation-report';
import { createPdfBulletinSource } from '../src/adapters/pdf/pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from '../src/adapters/pdf/pdfjs-loader';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'Daily_Flood_Report_20260727.pdf');
const OUTPUT = path.join(ROOT, 'src', 'generated', 'default-bulletin.ts');

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

const HEADER = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Produced by \`scripts/generate-default-bulletin.ts\` from
 * \`fixtures/Daily_Flood_Report_20260727.pdf\`. Regenerate with:
 *
 *     npm run generate:default-bulletin
 *
 * This is the real 2026-07-27 ASDMA Daily Flood Report, already parsed, so the
 * console can open on a working example without loading pdf.js and without
 * touching the network (NFR-3, NFR-5, NFR-6). It is a **worked example**, not
 * today's situation: \`src/domain/timeline/staleness.ts\` and the staleness
 * banner exist to make sure no officer can mistake it for one.
 *
 * Any edit made here will be reported as a failure by
 * \`src/adapters/pdf/default-bulletin.test.ts\`, which reparses the fixture PDF
 * and compares.
 */

import type {
  BulletinId,
  FloodSituationReport,
  ReportDate,
} from '../domain/shared/flood-situation-report';
import type {
  DistrictName,
  RevenueCircleName,
} from '../domain/shared/administrative-unit';
`;

const parseFixture = async (): Promise<FloodSituationReport> => {
  // The legacy build is the one that runs outside a browser — same choice the
  // golden test makes, so both read the fixture through identical machinery.
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  const bytes = await readFile(FIXTURE);
  const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });
  return source.parse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
};

const main = async (): Promise<void> => {
  const report = await parseFixture();

  const body = `${HEADER}
export const DEFAULT_BULLETIN: FloodSituationReport = ${toSource(report, '')};
`;

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, body, 'utf8');

  process.stdout.write(
    `Wrote ${path.relative(ROOT, OUTPUT)} — ` +
      `report date ${String(report.reportDate)}, ` +
      `${String(report.districts.length)} districts, ` +
      `${String(body.length)} bytes of TypeScript.\n`,
  );
};

await main();

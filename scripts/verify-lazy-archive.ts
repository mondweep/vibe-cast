/**
 * Fitness check on the built output: the bundled historical archive must be its
 * own chunk, and nothing loaded eagerly may import it.
 *
 * The console ships with eight real ASDMA bulletins so a shared link opens on
 * real history. Seven of them are ~65 kB gzipped of data a visitor may never
 * look at, and NFR-4 gives first paint a 300 kB budget. So the archive is
 * reached only through the `import()` in `src/generated/bundled-bulletins.ts`.
 *
 * That guarantee lives entirely in the shape of the bundle, so it cannot be
 * asserted by a unit test — and it is quietly breakable by a single import
 * added in the wrong place, at which point every visitor silently pays for
 * seven bulletins on first paint and nothing anywhere goes red.
 *
 * So it is checked against the real `dist/`:
 *
 *     npm run build && npm run verify:lazy-archive
 *
 * Sibling to `verify-lazy-pdfjs.ts`, which does the same job for pdf.js. Four
 * things are asserted, because the first three can each be satisfied while the
 * intent is violated:
 *
 *  1. The archive chunk **exists** in `dist/assets`. Without this the whole
 *     check passes vacuously — a bundler that inlined the archive into the
 *     entry would sail through every other assertion.
 *  2. `index.html` does not preload it. Vite emits a `modulepreload` for every
 *     chunk the entry needs *statically*, so this is the bundler's own account
 *     of what first paint waits on.
 *  3. No **eagerly loaded** chunk imports it statically. Checking only the
 *     entry is not enough: a static import from the `charts` chunk would be
 *     just as eager and just as invisible.
 *  4. Some eagerly loaded chunk *does* import it **dynamically**. Otherwise the
 *     archive could be dead code that never reaches the console at all, and a
 *     green result here would mean the history never loads.
 *
 * It finishes by printing the measured gzipped weight of first paint and of the
 * archive chunk, because "under budget" is a claim that should come with the
 * number that supports it.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

/**
 * The archive chunk, by name. Vite names a dynamic chunk after the module it
 * splits, so `src/generated/bulletin-archive.ts` becomes
 * `assets/bulletin-archive-<hash>.js` with no manual chunking configured.
 */
const ARCHIVE = /bulletin-archive/i;

/** `import ... from '<specifier>'` and `import '<specifier>'`, never `import(`. */
const STATIC_IMPORT = /(?:^|[;\n}])\s*import\s*(?:[^;'"`]*?\bfrom\s*)?(['"`])([^'"`]+)\1/g;
/** `import('<specifier>')` — the lazy form, in any quote style. */
const DYNAMIC_IMPORT = /import\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;

const specifiers = (source: string, pattern: RegExp): readonly string[] =>
  [...source.matchAll(pattern)].map((match) => match[2] as string);

const fail = (message: string): never => {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exit(1);
};

const kib = (bytes: number): string => `${(bytes / 1024).toFixed(1)} kB`;

/** Gzipped at level 9 — the same measure a CDN's stored artefact would be. */
const gzippedSize = async (file: string): Promise<number> =>
  gzipSync(await readFile(file), { level: 9 }).byteLength;

// --- 1. The chunk exists ----------------------------------------------------

const assets = await readdir(path.join(DIST, 'assets'));
const archiveChunks = assets.filter((name) => name.endsWith('.js') && ARCHIVE.test(name));
if (archiveChunks.length === 0) {
  fail(
    'No bulletin-archive chunk exists in dist/assets. Either the archive was ' +
      'folded into another chunk — which is exactly what this check exists to ' +
      'catch — or the build no longer names dynamic chunks after their module.',
  );
}
if (archiveChunks.length > 1) {
  fail(`Expected one bulletin-archive chunk, found ${String(archiveChunks.length)}: ${archiveChunks.join(', ')}`);
}
const archiveChunk = archiveChunks[0] as string;

// --- 2. index.html does not preload it --------------------------------------

const html = await readFile(path.join(DIST, 'index.html'), 'utf8');

const preloaded = [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map(
  (match) => String(match[1]),
);
const preloadedArchive = preloaded.filter((href) => ARCHIVE.test(href));
if (preloadedArchive.length > 0) {
  fail(`index.html preloads the bulletin archive for first paint: ${preloadedArchive.join(', ')}`);
}

const entryHref = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html)?.[1];
if (entryHref === undefined) fail('Could not find the module entry script in dist/index.html.');

const stylesheets = [...html.matchAll(/rel="stylesheet"[^>]*href="([^"]+)"/g)].map((match) =>
  String(match[1]),
);

const fileFor = (href: string): string => path.join(DIST, href.replace(/^\//, ''));

/**
 * Everything the browser fetches before it can paint: the entry, every chunk
 * Vite preloads for it, and the stylesheets. This is the set the archive must
 * stay out of.
 */
const eagerHrefs = [entryHref, ...preloaded];
const eagerScripts = eagerHrefs.map(fileFor);

// --- 3. No eager chunk imports it statically --------------------------------

const statik: string[] = [];
const dynamic: string[] = [];

for (const file of eagerScripts) {
  const source = await readFile(file, 'utf8');
  for (const specifier of specifiers(source, STATIC_IMPORT)) {
    if (ARCHIVE.test(specifier)) statik.push(`${path.basename(file)} → ${specifier}`);
  }
  for (const specifier of specifiers(source, DYNAMIC_IMPORT)) {
    if (ARCHIVE.test(specifier)) dynamic.push(`${path.basename(file)} → ${specifier}`);
  }
}

if (statik.length > 0) {
  fail(
    `an eagerly loaded chunk statically imports the bulletin archive: ${statik.join(', ')}. ` +
      'It must be reached only through the dynamic import in ' +
      'src/generated/bundled-bulletins.ts, or every visitor pays for seven ' +
      'bulletins on first paint (NFR-4).',
  );
}

// --- 4. Something eager does import it dynamically --------------------------

if (dynamic.length === 0) {
  fail(
    'No eagerly loaded chunk imports the bulletin archive at all. The archive ' +
      'is then dead weight in dist/ that the console can never load, and this ' +
      'check would be passing for the wrong reason.',
  );
}

// --- Report -----------------------------------------------------------------

const archiveBytes = await gzippedSize(path.join(DIST, 'assets', archiveChunk));

let firstPaintBytes = gzipSync(Buffer.from(html, 'utf8'), { level: 9 }).byteLength;
const breakdown: string[] = [`index.html ${kib(firstPaintBytes)}`];
for (const href of [...eagerHrefs, ...stylesheets]) {
  const file = fileFor(href);
  await stat(file);
  const bytes = await gzippedSize(file);
  firstPaintBytes += bytes;
  breakdown.push(`${path.basename(href)} ${kib(bytes)}`);
}

/** NFR-4. Printed rather than asserted here; the number is the point. */
const BUDGET = 300 * 1024;

process.stdout.write(
  `PASS: ${archiveChunk} is a separate chunk, dynamically imported and never eager.\n` +
    `  archive chunk        : ${archiveChunk} — ${kib(archiveBytes)} gzipped\n` +
    `  reached by           : ${dynamic.join(', ')}\n` +
    `  eager static imports : none reference the archive\n` +
    `  index.html preloads  : ${preloaded.join(', ')}\n` +
    `  first paint          : ${kib(firstPaintBytes)} gzipped ` +
    `(${((firstPaintBytes / BUDGET) * 100).toFixed(0)}% of the 300 kB NFR-4 budget)\n` +
    `    ${breakdown.join('\n    ')}\n`,
);

if (firstPaintBytes > BUDGET) {
  fail(
    `first paint is ${kib(firstPaintBytes)} gzipped, over the 300 kB NFR-4 budget. ` +
      'Something eager has grown; find it before shipping.',
  );
}

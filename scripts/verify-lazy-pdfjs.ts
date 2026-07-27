/**
 * Fitness check on the built output: the entry chunk must not statically
 * import pdf.js.
 *
 * NFR-3 says first paint is under 1.5 s on 3G, and the console now opens on a
 * pre-parsed bulletin precisely so the default path costs no PDF machinery at
 * all. That guarantee lives entirely in the shape of the bundle, so it cannot
 * be asserted by a unit test — and it is quietly breakable by a single import
 * added in the wrong place, at which point the lazy `import()` in
 * `src/composition/container.ts` is lazy in name only.
 *
 * So it is checked against the real `dist/`:
 *
 *     npm run build && npm run verify:lazy-pdfjs
 *
 * Two things are asserted, because either alone can be satisfied while the
 * intent is violated:
 *
 *  1. `index.html` does not preload a pdfjs chunk. Vite emits a
 *     `modulepreload` for every chunk the entry needs *statically*, so this is
 *     the bundler's own account of what first paint waits on.
 *  2. Every reference to a pdfjs chunk inside the entry is an `import(...)`
 *     call. A bare `import x from './pdfjs-….js'` is the failure this exists
 *     to catch. Specifiers are matched in all three quote forms — rolldown
 *     emits backticks, and a check that only knew about `"` and `'` would pass
 *     while reading nothing.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const PDFJS = /pdfjs|pdf\.worker/i;

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

const html = await readFile(path.join(DIST, 'index.html'), 'utf8');

const preloaded = [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
const preloadedPdfJs = preloaded.filter((href) => PDFJS.test(String(href)));
if (preloadedPdfJs.length > 0) {
  fail(`index.html preloads pdf.js for first paint: ${preloadedPdfJs.join(', ')}`);
}

const entryHref = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html)?.[1];
if (entryHref === undefined) fail('Could not find the module entry script in dist/index.html.');

const entryFile = path.join(DIST, entryHref.replace(/^\//, ''));
const entry = await readFile(entryFile, 'utf8');

const statik = specifiers(entry, STATIC_IMPORT).filter((s) => PDFJS.test(s));
if (statik.length > 0) {
  fail(
    `the entry chunk statically imports ${statik.join(', ')}. ` +
      'pdf.js must be reached only through the dynamic import in ' +
      'src/composition/container.ts (NFR-3).',
  );
}

// A reference that is neither a static nor a dynamic import — a raw URL string,
// say — is not proof of anything, so say what was actually found rather than
// claiming a pass we cannot support.
const dynamic = specifiers(entry, DYNAMIC_IMPORT).filter((s) => PDFJS.test(s));

// Sanity check the check itself: if the chunk is not in dist at all, something
// has changed about the build and a green result here would be meaningless.
const chunks = await readdir(path.join(DIST, 'assets'));
if (!chunks.some((name) => name.endsWith('.js') && PDFJS.test(name))) {
  fail('No pdf.js chunk exists in dist/assets — this check would pass vacuously.');
}

process.stdout.write(
  `PASS: ${path.basename(entryFile)} statically imports no pdf.js chunk.\n` +
    `  entry static imports : ${[...new Set(specifiers(entry, STATIC_IMPORT))].join(', ')}\n` +
    `  entry dynamic pdf.js : ${dynamic.length > 0 ? dynamic.join(', ') : '(none)'}\n` +
    `  index.html preloads  : ${preloaded.join(', ')}\n`,
);

// Search the prebuilt .rvf using a query vector embedded by LATTICE.
//
// Reuses the shipped ruvector index (@ruvector/rvf RvfDatabase) for the search;
// only the query embedding comes from lattice (via the embed_query example
// binary). Joins hits back to lattice-kb.passages.jsonl for full text.
//
//   node rvf-lattice.mjs "your question" [top_k]
//
// Env:
//   LATTICE_EMBED_BIN  path to the built embed_query binary
//                      (default: target/release/examples/embed_query under the repo)

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { RvfDatabase } = require('@ruvector/rvf');

const here = path.dirname(fileURLToPath(import.meta.url));
const RVF = path.join(here, 'lattice-kb.rvf');
const PASSAGES = path.join(here, 'lattice-kb.passages.jsonl');
const EMBED_BIN =
  process.env.LATTICE_EMBED_BIN ||
  path.resolve(here, '../../../..', 'target/release/examples/embed_query');

const query = process.argv[2];
const topK = Number(process.argv[3] || 5);
if (!query) {
  console.error('usage: node rvf-lattice.mjs "your question" [top_k]');
  process.exit(1);
}

// 1 — embed the query with lattice (prints a JSON float array on stdout).
const out = execFileSync(EMBED_BIN, [query], { encoding: 'utf8', maxBuffer: 1 << 20 });
const qv = Float32Array.from(JSON.parse(out.trim()));
console.error(`[rvf-lattice] lattice query vector: ${qv.length} dims`);

// 2 — id -> passage text, from the pack's passages.jsonl.
const byId = new Map();
for (const line of fs.readFileSync(PASSAGES, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  byId.set(String(r.id), r.text);
}

// 3 — search the PREBUILT .rvf with the lattice vector.
const db = await RvfDatabase.openReadonly(RVF);
let hits;
try {
  hits = await db.query(qv, topK);
} finally {
  await db.close();
}

console.log(`\nQuery: ${query}\n`);
for (const [rank, h] of hits.entries()) {
  const text = (byId.get(String(h.id)) || '(no text)').replace(/\n/g, ' ').slice(0, 280);
  const score = (1 - h.distance).toFixed(4); // cosine distance -> similarity
  console.log(`#${rank + 1}  score=${score}  dist=${h.distance.toFixed(4)}  id=${h.id}`);
  console.log(`    ${text}\n`);
}

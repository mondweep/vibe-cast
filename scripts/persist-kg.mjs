import 'dotenv/config';
import WebSocket from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import fs from 'fs';

const { nodes = [], edges = [], lessonConcepts = [] } =
  JSON.parse(fs.readFileSync(process.env.RESULT_FILE, 'utf8')).result;

const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, key, {
  db: { schema: process.env.DATABASE_SCHEMA || 'ruflo_demo' },
  auth: { persistSession: false },
});

const lessonUuid = (order) =>
  `b0000000-0000-4000-8000-0000000000${String(order).padStart(2, '0')}`;

// 1) Nodes — assign UUIDs, upsert, build name->id map
const byName = new Map();
const nodeRows = nodes.map((n) => {
  const id = randomUUID();
  if (!byName.has(n.name.toLowerCase())) byName.set(n.name.toLowerCase(), id);
  return {
    node_id: id,
    kind: n.kind,
    name: n.name,
    aliases: n.aliases ?? [],
    summary: n.summary ?? '',
    body: n.body ?? '',
    source_refs: n.source_refs ?? [],
  };
});
// also index aliases for resolution
nodes.forEach((n, i) => (n.aliases ?? []).forEach((a) => {
  if (!byName.has(a.toLowerCase())) byName.set(a.toLowerCase(), nodeRows[i].node_id);
}));

{
  const { error } = await supabase
    .from('ruflo_demo_kg_node')
    .upsert(nodeRows, { onConflict: 'kind,name' });
  console.log(error ? `NODES ERROR: ${error.message}` : `nodes upserted: ${nodeRows.length}`);
}

const resolve = (name) => (name ? byName.get(name.toLowerCase()) : undefined);

// 2) Edges — resolve names -> ids
let edgeOk = 0, edgeSkip = 0;
const edgeRows = [];
for (const e of edges) {
  const from = resolve(e.from), to = resolve(e.to);
  if (!from || !to || from === to) { edgeSkip++; continue; }
  edgeRows.push({ edge_id: randomUUID(), from_node: from, to_node: to, relation: e.relation, weight: e.weight ?? 1.0 });
}
if (edgeRows.length) {
  const { error } = await supabase
    .from('ruflo_demo_kg_edge')
    .upsert(edgeRows, { onConflict: 'from_node,to_node,relation' });
  if (error) console.log(`EDGES ERROR: ${error.message}`);
  else edgeOk = edgeRows.length;
}
console.log(`edges upserted: ${edgeOk}, skipped (unresolved/self): ${edgeSkip}`);

// 3) Lesson -> concept links
let linkOk = 0, linkSkip = 0;
const linkRows = [];
for (const l of lessonConcepts) {
  const nid = resolve(l.nodeName);
  if (!nid) { linkSkip++; continue; }
  linkRows.push({ lesson_id: lessonUuid(l.lessonOrder), node_id: nid });
}
// dedupe
const seen = new Set();
const dedup = linkRows.filter((r) => {
  const k = r.lesson_id + r.node_id;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
if (dedup.length) {
  const { error } = await supabase
    .from('ruflo_demo_lesson_concept')
    .upsert(dedup, { onConflict: 'lesson_id,node_id' });
  if (error) console.log(`LINKS ERROR: ${error.message}`);
  else linkOk = dedup.length;
}
console.log(`lesson-concept links upserted: ${linkOk}, skipped: ${linkSkip}`);
console.log('\nDONE');

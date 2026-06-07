import 'dotenv/config';
import WebSocket from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;
import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';

const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, key, {
  db: { schema: process.env.DATABASE_SCHEMA || 'ruflo_demo' },
  auth: { persistSession: false },
});

console.log('loading all-MiniLM-L6-v2 (first run downloads ~23MB)...');
const extract = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
console.log('model ready.');

const { data: nodes, error } = await supabase
  .from('ruflo_demo_kg_node')
  .select('node_id, name, summary')
  .is('embedding', null);
if (error) { console.log('FETCH ERROR:', error.message); process.exit(1); }
console.log(`embedding ${nodes.length} nodes...`);

let done = 0;
for (const n of nodes) {
  const text = `${n.name}: ${n.summary}`;
  const out = await extract(text, { pooling: 'mean', normalize: true });
  const vec = Array.from(out.data);
  const { error: upErr } = await supabase
    .from('ruflo_demo_kg_node')
    .update({ embedding: `[${vec.join(',')}]` })
    .eq('node_id', n.node_id);
  if (upErr) { console.log(`  ${n.name}: ERROR ${upErr.message}`); continue; }
  done++;
  if (done % 25 === 0) console.log(`  ${done}/${nodes.length}`);
}
console.log(`\nDONE: embedded ${done}/${nodes.length} nodes (dim=384)`);

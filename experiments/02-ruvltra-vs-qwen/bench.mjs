#!/usr/bin/env node
/**
 * RuvLTRA vs Qwen — head-to-head under llama.cpp
 * ==============================================
 * ruvLLM cannot run its own GGUF weights (see experiment 01), so this uses
 * node-llama-cpp instead. The question: is RuvLTRA-claude-code-0.5B actually
 * better than the Qwen base it was fine-tuned from, on coding tasks?
 *
 * Scoring is objective — generated code is executed against assertions in an
 * isolated child process. No LLM judge.
 *
 * Usage: node bench.mjs [--models a,b] [--maxTokens 300] [--json out.json]
 */

import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import { writeFileSync, existsSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const TASKS = require('./tasks.js');

const MODELS_DIR = process.env.RUVLLM_MODELS_DIR || '/root/.ruvllm/models';
const CANDIDATES = [
  { key: 'ruvltra',  label: 'RuvLTRA claude-code 0.5B', file: 'ruvltra-claude-code-0.5b-q4_k_m.gguf' },
  { key: 'qwen2',    label: 'Qwen2-0.5B-Instruct (true base)', file: 'qwen2-0.5b-instruct-q4_k_m.gguf' },
  { key: 'qwen25',   label: 'Qwen2.5-0.5B-Instruct (ruvnet baseline)', file: 'qwen2.5-0.5b-instruct-q4_k_m.gguf' },
];

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const MAX_TOKENS = parseInt(argOf('maxTokens', '320'), 10);
const ONLY = argOf('models', null)?.split(',');
const JSON_OUT = argOf('json', null);

const models = CANDIDATES
  .filter(m => !ONLY || ONLY.includes(m.key))
  .filter(m => {
    const ok = existsSync(join(MODELS_DIR, m.file));
    if (!ok) console.log(`skipping ${m.key} — ${m.file} not found in ${MODELS_DIR}`);
    return ok;
  });

if (!models.length) { console.error('No models found. See README for download instructions.'); process.exit(2); }

/** Pull the first fenced code block out of a model response, else use it raw. */
function extractCode(text) {
  const fence = text.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/);
  if (fence) return fence[1];
  // Unfenced: take from the first `function` keyword onward.
  const i = text.search(/\b(function|const|let|class)\b/);
  return i >= 0 ? text.slice(i) : text;
}

/**
 * Execute the generated code plus assertions in a separate node process.
 * Isolation matters: 0.5B models emit infinite loops and process.exit calls.
 */
function scoreTask(task, code) {
  const dir = mkdtempSync(join(tmpdir(), 'bench-'));
  const file = join(dir, 'run.js');
  const asserts = task.tests.map(([expr, want]) =>
    `  { const got = (${expr}); const want = ${JSON.stringify(want)};
    if (JSON.stringify(got) !== JSON.stringify(want)) { console.log('FAIL:' + ${JSON.stringify(expr)}); failed++; } }`
  ).join('\n');

  writeFileSync(file, `
${code}
let failed = 0;
try {
${asserts}
} catch (e) { console.log('THREW:' + e.message); process.stdout.write('RESULT:error'); process.exit(0); }
process.stdout.write('RESULT:' + (failed === 0 ? 'pass' : 'fail'));
`);

  try {
    const out = execFileSync(process.execPath, [file], {
      timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (out.includes('RESULT:pass')) return { verdict: 'pass' };
    if (out.includes('RESULT:error')) return { verdict: 'error', detail: (out.match(/THREW:(.*)/) || [])[1] };
    return { verdict: 'fail', detail: (out.match(/FAIL:(.*)/) || [])[1] };
  } catch (e) {
    const why = e.killed || /ETIMEDOUT/.test(String(e.code)) ? 'timeout' : 'crash';
    return { verdict: why, detail: String(e.stderr || e.message).split('\n')[0].slice(0, 120) };
  }
}

const llama = await getLlama();
const results = {};

for (const m of models) {
  console.log(`\n${'='.repeat(72)}\nLoading ${m.label}\n${'='.repeat(72)}`);
  const model = await llama.loadModel({ modelPath: join(MODELS_DIR, m.file) });
  const rows = [];

  for (const task of TASKS) {
    // Fresh context per task — no cross-task contamination.
    const ctx = await model.createContext({ contextSize: 2048 });
    const session = new LlamaChatSession({ contextSequence: ctx.getSequence() });
    const t0 = Date.now();
    let text = '';
    try {
      text = await session.prompt(task.prompt, { maxTokens: MAX_TOKENS, temperature: 0 }); // greedy = reproducible
    } catch (e) {
      text = '';
    }
    const ms = Date.now() - t0;
    const tokens = text ? model.tokenize(text).length : 0;
    const code = extractCode(text);
    const { verdict, detail } = scoreTask(task, code);

    rows.push({ id: task.id, category: task.category, verdict, detail, ms, tokens,
                tps: tokens ? +(tokens / (ms / 1000)).toFixed(1) : 0, response: text });

    const mark = verdict === 'pass' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`${mark} ${task.id.padEnd(18)} ${verdict.padEnd(8)} ${String(ms).padStart(6)}ms  ${String(tokens).padStart(4)}tok  ${rows.at(-1).tps} tok/s${detail ? '  — ' + detail.slice(0, 60) : ''}`);
    await ctx.dispose();
  }

  results[m.key] = { label: m.label, file: m.file, rows };
  await model.dispose();
}

// ---------------------------------------------------------------- summary
const pct = (n, d) => d ? ((n / d) * 100).toFixed(0) + '%' : '—';
const passes = rows => rows.filter(r => r.verdict === 'pass').length;
const byCat = (rows, c) => rows.filter(r => r.category === c);

console.log(`\n${'='.repeat(72)}\nSUMMARY  (${TASKS.length} tasks, greedy decoding, temperature 0)\n${'='.repeat(72)}`);
console.log('model'.padEnd(42) + 'overall'.padEnd(12) + 'general'.padEnd(11) + 'agentic'.padEnd(11) + 'tok/s');
for (const [, r] of Object.entries(results)) {
  const g = byCat(r.rows, 'general'), a = byCat(r.rows, 'agentic');
  const meanTps = (r.rows.reduce((s, x) => s + x.tps, 0) / r.rows.length).toFixed(1);
  console.log(
    r.label.slice(0, 41).padEnd(42) +
    `${passes(r.rows)}/${r.rows.length} ${pct(passes(r.rows), r.rows.length)}`.padEnd(12) +
    `${passes(g)}/${g.length}`.padEnd(11) +
    `${passes(a)}/${a.length}`.padEnd(11) +
    meanTps
  );
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    config: { maxTokens: MAX_TOKENS, temperature: 0, tasks: TASKS.length },
    results,
  }, null, 2));
  console.log(`\nFull transcripts written to ${JSON_OUT}`);
}

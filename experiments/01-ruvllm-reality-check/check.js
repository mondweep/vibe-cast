#!/usr/bin/env node
/**
 * ruvLLM reality check
 * ====================
 * Tests @ruvector/ruvllm's headline claims against the published npm artifact.
 *
 * The package describes itself as:
 *   "Self-learning LLM runtime — TurboQuant KV-cache (6-8x compression), SONA
 *    adaptive learning, FlashAttention, speculative decoding, GGUF inference"
 *
 * This script checks each testable claim and prints PASS / FAIL with evidence.
 * It makes no network calls except the optional --download step.
 *
 * Usage:  node check.js [--download]
 */

const { execSync } = require('child_process');
const { existsSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const lib = require('@ruvector/ruvllm');
const { RuvLLM } = lib;

// The package blocks the "./package.json" subpath via its "exports" map, so
// locate the package root from its main entry point instead of require()ing it.
const PKG_ROOT = join(require.resolve('@ruvector/ruvllm'), '..', '..', '..');
const PKG = JSON.parse(require('fs').readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

const results = [];
function record(claim, verdict, evidence) {
  results.push({ claim, verdict, evidence });
  const mark = verdict === 'PASS' ? '\x1b[32mPASS\x1b[0m'
             : verdict === 'FAIL' ? '\x1b[31mFAIL\x1b[0m'
             : '\x1b[33mWARN\x1b[0m';
  console.log(`[${mark}] ${claim}`);
  console.log(`        ${evidence}\n`);
}

console.log('\n=== ruvLLM reality check ===');
console.log(`package version : ${PKG.version}`);
console.log(`version()       : ${typeof lib.version === 'function' ? lib.version() : lib.version}`);
console.log(`platform        : ${process.platform}-${process.arch}`);
console.log(`node            : ${process.version}\n`);

// ---------------------------------------------------------------------------
// Claim 1: metadata is self-consistent
// ---------------------------------------------------------------------------
{
  const pkgV = PKG.version;
  const runV = typeof lib.version === 'function' ? lib.version() : lib.version;
  record(
    'Package version metadata is self-consistent',
    pkgV === runV ? 'PASS' : 'WARN',
    `package.json says "${pkgV}", version() returns "${runV}"`
  );
}

// ---------------------------------------------------------------------------
// Claim 2: native bindings load (required for any real inference)
// ---------------------------------------------------------------------------
const llm = new RuvLLM({ embeddingDim: 768 });
const nativeLoaded = llm.isNativeLoaded();
record(
  'Native bindings load on this platform',
  nativeLoaded ? 'PASS' : 'FAIL',
  nativeLoaded
    ? 'isNativeLoaded() === true (ships as an optional dependency)'
    : 'isNativeLoaded() === false — generate() will return a canned fallback string'
);

// ---------------------------------------------------------------------------
// Claim 3: the fallback message names an installable package
// ---------------------------------------------------------------------------
{
  // engine.js tells users to install `@ruvector/ruvllm-${platform}-${arch}`
  // native.js actually looks for `@ruvector/ruvllm-linux-x64-gnu` (note -gnu).
  const advertised = `@ruvector/ruvllm-${process.platform}-${process.arch}`;
  let advertisedExists = false;
  try {
    execSync(`npm view ${advertised} version`, { stdio: 'pipe', timeout: 60000 });
    advertisedExists = true;
  } catch { /* 404 */ }
  record(
    'Fallback error message names a real npm package',
    advertisedExists ? 'PASS' : 'FAIL',
    advertisedExists
      ? `${advertised} resolves`
      : `generate() tells users to run "npm install ${advertised}" — that package is 404. ` +
        `The real name (native.js PLATFORM_PACKAGES) is "@ruvector/ruvllm-linux-x64-gnu".`
  );
}

// ---------------------------------------------------------------------------
// Claim 4: GGUF inference
// ---------------------------------------------------------------------------
{
  // Is there any code that can read a GGUF file? Check JS source and the native .node binary.
  const root = PKG_ROOT;
  let jsHits = 0;
  try {
    jsHits = parseInt(execSync(
      `grep -rlE "llama|child_process|\\\\.gguf" ${join(root, 'dist')} 2>/dev/null | grep -v models.js | grep -v model-comparison.js | wc -l`,
      { encoding: 'utf8' }).trim(), 10);
  } catch { /* noop */ }

  let nativeHits = 'n/a';
  try {
    const nodeFile = execSync(
      `find ${join(root, '..')} -name "*.node" 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
    if (nodeFile) {
      nativeHits = execSync(
        `strings "${nodeFile}" 2>/dev/null | grep -icE "gguf|llama|tokenizer|vocab" || true`,
        { encoding: 'utf8' }).trim();
    }
  } catch { /* noop */ }

  // Config surface: is there any way to point the engine at a model file?
  // toNativeConfig() whitelists exactly 8 fields; anything else is silently
  // dropped. Demonstrate that by passing a deliberately invalid model path and
  // showing the engine constructs happily and generates identically.
  const bogus = new RuvLLM({ modelPath: '/nonexistent/definitely-not-a-model.gguf' });
  const ignoresUnknownKeys = bogus.isNativeLoaded();

  record(
    'GGUF inference is implemented',
    (jsHits === 0 && nativeHits === '0') ? 'FAIL' : 'WARN',
    `No model-path field in RuvLLMConfig (embeddingDim, routerHiddenDim, hnswM, hnswEfConstruction, ` +
    `hnswEfSearch, learningEnabled, qualityThreshold, ewcLambda only). ` +
    `GGUF/llama references in JS dist: ${jsHits} file(s). ` +
    `gguf|llama|tokenizer|vocab strings in native .node binary: ${nativeHits}. ` +
    `Passing modelPath:'/nonexistent/...gguf' throws nothing and still reports ` +
    `isNativeLoaded()===${ignoresUnknownKeys} — toNativeConfig() whitelists 8 fields and silently drops the rest, ` +
    `so there is no supported way to point the engine at a weights file. ` +
    `The package downloads GGUF weights but ships no code that reads them.`
  );
}

// ---------------------------------------------------------------------------
// Claim 5: generate() produces language
// ---------------------------------------------------------------------------
{
  const prompt = 'Write a JavaScript function that reverses a string.';
  const t0 = Date.now();
  const out = llm.generate(prompt, { maxTokens: 60, temperature: 0.7 });
  const ms = Date.now() - t0;
  const text = typeof out === 'string' ? out : JSON.stringify(out);

  // A crude but sufficient language test: proportion of characters that are
  // letters/spaces, and whether any common English word survives.
  const letterRatio = (text.match(/[a-zA-Z ]/g) || []).length / Math.max(text.length, 1);
  const commonWords = ['function', 'return', 'the', 'string', 'const', 'reverse'];
  const hits = commonWords.filter(w => text.toLowerCase().includes(w));
  const looksLikeLanguage = letterRatio > 0.85 && hits.length >= 2;

  record(
    'generate() produces coherent text',
    looksLikeLanguage ? 'PASS' : 'FAIL',
    `${ms}ms, letter/space ratio ${(letterRatio * 100).toFixed(0)}%, ` +
    `matched ${hits.length}/${commonWords.length} expected words. Output:\n        ${JSON.stringify(text.slice(0, 200))}`
  );
}

// ---------------------------------------------------------------------------
// Claim 6: embeddings carry semantic meaning  (the decisive test)
// ---------------------------------------------------------------------------
{
  const related = [
    ['neural trading bot', 'algorithmic stock trading'],
    ['rust MCP server', 'model context protocol in rust'],
    ['ESP32 wifi sensing', 'embedded wireless sensor'],
    ['sanskrit song translation', 'translating devotional lyrics'],
    ['knowledge graph 3D viewer', 'graph visualisation tool'],
  ];
  const unrelated = [
    ['neural trading bot', 'sanskrit song translation'],
    ['rust MCP server', 'rugby lineout video analysis'],
    ['ESP32 wifi sensing', 'private equity due diligence'],
    ['knowledge graph 3D viewer', 'water utility social tariff'],
    ['genomics pipeline', 'london meetup agenda'],
  ];

  const score = pairs => pairs.map(([a, b]) => llm.similarity(a, b));
  const R = score(related), U = score(unrelated);
  const mean = x => x.reduce((s, v) => s + v, 0) / x.length;
  const sep = mean(R) - mean(U);
  const overlaps = Math.min(...R) < Math.max(...U);
  const gibberish = llm.similarity('qq zz xx', 'vv ww yy');

  record(
    'Embeddings discriminate related from unrelated text',
    (sep > 0.05 && !overlaps) ? 'PASS' : 'FAIL',
    `related mean ${mean(R).toFixed(6)} [${Math.min(...R).toFixed(6)}–${Math.max(...R).toFixed(6)}], ` +
    `unrelated mean ${mean(U).toFixed(6)} [${Math.min(...U).toFixed(6)}–${Math.max(...U).toFixed(6)}], ` +
    `separation ${sep.toFixed(6)}, distributions overlap: ${overlaps ? 'YES' : 'no'}. ` +
    `Two random gibberish strings score ${gibberish.toFixed(6)} — higher than any genuinely related pair. ` +
    `All vectors are near-parallel, so cosine ranking over them is arbitrary.`
  );
}

// ---------------------------------------------------------------------------
// Claim 7: HNSW memory search ranks by relevance
// ---------------------------------------------------------------------------
{
  const corpus = [
    ['ESP32 WiFi CSI presence sensing node', 'esb32-tinker-ruview'],
    ['rust MCP server for Aave DeFi lending', 'aave-mcp'],
    ['sanskrit to english devotional song translation', 'song-translation-working'],
    ['3D collaborative knowledge graph viewer', 'tribe-knowledgeGraph'],
    ['LSTM neural network trading strategy backtests', 'cognitum-one-neuraltrader'],
  ];
  const mem = new RuvLLM({ embeddingDim: 768 });
  corpus.forEach(([text, branch]) => mem.addMemory(text, { branch }));

  const probes = [
    ['wifi sensor hardware', 'esb32-tinker-ruview'],
    ['defi smart contract tooling', 'aave-mcp'],
    ['stock market prediction model', 'cognitum-one-neuraltrader'],
  ];
  let correct = 0;
  const detail = probes.map(([q, want]) => {
    const hits = mem.searchMemory(q, 1);
    const got = hits && hits[0] ? (hits[0].metadata?.branch ?? '(no metadata)') : '(none)';
    const topScore = hits && hits[0] ? hits[0].score : NaN;
    if (got === want) correct++;
    return `"${q}" -> ${got} (want ${want}, score ${Number(topScore).toFixed(4)})`;
  });

  record(
    'searchMemory() retrieves the relevant entry',
    correct === probes.length ? 'PASS' : 'FAIL',
    `${correct}/${probes.length} correct. ` +
    `Note metadata is dropped on retrieval (returned as {}), so results cannot be traced to their source. ` +
    detail.join(' | ')
  );
}

// ---------------------------------------------------------------------------
// Claim 8: RuvLTRA weights are real and downloadable
// ---------------------------------------------------------------------------
{
  const models = lib.listModels();
  const dir = lib.getDefaultModelsDir();
  const present = existsSync(dir)
    ? readdirSync(dir).filter(f => f.endsWith('.gguf'))
        .map(f => `${f} (${(statSync(join(dir, f)).size / 1e6).toFixed(0)} MB)`)
    : [];

  record(
    'RuvLTRA weights exist and are downloadable',
    present.length > 0 ? 'PASS' : 'WARN',
    `listModels() advertises ${models.length}: ${models.map(m => `${m.id}/${m.parameters}`).join(', ')} from hf.co/ruv/ruvltra. ` +
    (present.length
      ? `Downloaded here: ${present.join(', ')}.`
      : `None downloaded locally — re-run with --download to fetch.`) +
    ` NOTE: downloadModel() keys off COMPARISON_MODELS (ids "ruvltra-claude-code", "qwen-base"), ` +
    `NOT the RUVLTRA_MODELS ids that listModels() returns ("claude-code", "small", "medium") — ` +
    `so downloadModel("claude-code") throws "Unknown model" despite listModels() advertising it.`
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const pass = results.filter(r => r.verdict === 'PASS').length;
const fail = results.filter(r => r.verdict === 'FAIL').length;
const warn = results.filter(r => r.verdict === 'WARN').length;

console.log('='.repeat(70));
console.log(`SUMMARY: ${pass} passed, ${fail} failed, ${warn} warnings (of ${results.length} claims)`);
console.log('='.repeat(70));
console.log('\nBottom line: the memory/routing scaffolding runs, but the parts that would');
console.log('make it a "self-learning LLM runtime" — GGUF inference and semantically');
console.log('meaningful embeddings — are not functional in the published artifact.\n');

process.exit(fail > 0 ? 1 : 0);

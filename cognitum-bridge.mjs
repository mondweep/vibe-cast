#!/usr/bin/env node
// Tiny stdio<->HTTP bridge for the Cognitum.One seed's MCP endpoint.
// Reads JSON-RPC from stdin, POSTs to the seed, writes responses to stdout.
// Handles streamable-http session IDs and SSE-formatted responses.
// Set COGNITUM_DEBUG=1 to log every request/response line to stderr.

import readline from 'node:readline';
import fs from 'node:fs';
import { Agent } from 'undici';

const SEED_URL = process.env.COGNITUM_SEED_URL || 'http://169.254.42.1/mcp';
const TOKEN = process.env.COGNITUM_TOKEN || '';
if (!TOKEN) {
  process.stderr.write('[cognitum-bridge] FATAL: COGNITUM_TOKEN is not set.\n');
  process.exit(1);
}
const DEBUG = process.env.COGNITUM_DEBUG === '1' || process.argv.includes('--debug');
const LOG_FILE = '/tmp/cognitum-bridge.log';

// TLS: if HTTPS, pin the seed cert by SHA-256 fingerprint. Hostname check is
// skipped because we connect by IP (the cert CN is the device's mDNS name).
const PINNED_FP_RAW = (process.env.COGNITUM_CERT_FINGERPRINT || '').trim();
const PINNED_FP = PINNED_FP_RAW.toLowerCase().replace(/[^0-9a-f]/g, '');
const isHttps = SEED_URL.startsWith('https://');
if (isHttps && PINNED_FP.length !== 64) {
  process.stderr.write('[cognitum-bridge] FATAL: HTTPS URL but COGNITUM_CERT_FINGERPRINT is missing or not a 64-hex SHA-256.\n');
  process.exit(1);
}

const dispatcher = isHttps
  ? new Agent({
      connect: {
        rejectUnauthorized: false, // CA is the device CA, not a public one
        checkServerIdentity: (_host, cert) => {
          const got = (cert && cert.fingerprint256 ? cert.fingerprint256 : '')
            .toLowerCase().replace(/[^0-9a-f]/g, '');
          if (got !== PINNED_FP) {
            return new Error(`cert fingerprint mismatch: got ${got || '(none)'}, expected ${PINNED_FP}`);
          }
          return undefined;
        },
      },
    })
  : undefined;

function fileLog(msg) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

fileLog(`SPAWN pid=${process.pid} cwd=${process.cwd()} argv=${JSON.stringify(process.argv)}`);
fileLog(`env.PATH=${process.env.PATH || '(unset)'} node=${process.version}`);

let sessionId = null;
let pending = 0;
let stdinClosed = false;

const log = (msg) => { process.stderr.write(`[cognitum-bridge] ${msg}\n`); fileLog(`LOG ${msg}`); };
const dbg = (msg) => { if (DEBUG) process.stderr.write(`[cognitum-bridge:dbg] ${msg}\n`); fileLog(`DBG ${msg}`); };

function maybeExit() {
  if (stdinClosed && pending === 0) process.exit(0);
}

// Strip schema fields that older client SDKs reject as unknown.
// 1) initialize response: `tasks` capability (cancel/get/list).
// 2) tools/list response: per-tool `execution` field, plus non-standard
//    annotations (`authClass`, `scope`, `relatedTools`, `group`).
const KNOWN_CAPS = new Set([
  'completion', 'logging', 'prompts', 'resources', 'tools',
  'experimental', 'sampling', 'roots', 'elicitation',
]);
const STANDARD_TOOL_ANNOTATIONS = new Set([
  'title', 'readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint',
]);

function sanitizePayload(payload) {
  try {
    const obj = JSON.parse(payload);
    const result = obj && obj.result;
    if (!result) return JSON.stringify(obj);

    // initialize: strip unknown top-level capabilities.
    if (result.capabilities && typeof result.capabilities === 'object') {
      const stripped = [];
      for (const k of Object.keys(result.capabilities)) {
        if (!KNOWN_CAPS.has(k)) {
          stripped.push(k);
          delete result.capabilities[k];
        }
      }
      if (stripped.length) dbg(`stripped unknown capabilities: ${stripped.join(',')}`);
    }

    // tools/list: strip per-tool extras.
    if (Array.isArray(result.tools)) {
      let droppedExecution = 0;
      let cleanedAnnotations = 0;
      for (const tool of result.tools) {
        if (tool && typeof tool === 'object') {
          if ('execution' in tool) { delete tool.execution; droppedExecution++; }
          if (tool.annotations && typeof tool.annotations === 'object') {
            for (const ak of Object.keys(tool.annotations)) {
              if (!STANDARD_TOOL_ANNOTATIONS.has(ak)) {
                delete tool.annotations[ak];
                cleanedAnnotations++;
              }
            }
          }
        }
      }
      if (droppedExecution) dbg(`tools/list: dropped execution from ${droppedExecution} tools`);
      if (cleanedAnnotations) dbg(`tools/list: cleaned ${cleanedAnnotations} non-standard annotations`);
    }

    return JSON.stringify(obj);
  } catch {
    return payload;
  }
}

function emit(text) {
  if (!text || !text.trim()) return;
  const isSSE = text.includes('\ndata:') || text.startsWith('data:') || text.startsWith('event:');
  if (isSSE) {
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (t.startsWith('data:')) {
        const payload = t.slice(5).trim();
        if (payload && payload !== '[DONE]') {
          const clean = sanitizePayload(payload);
          dbg(`<< ${clean}`);
          process.stdout.write(clean + '\n');
        }
      }
    }
  } else {
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (t) {
        const clean = sanitizePayload(t);
        dbg(`<< ${clean}`);
        process.stdout.write(clean + '\n');
      }
    }
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', async (line) => {
  if (!line.trim()) return;
  pending++;
  dbg(`>> ${line.slice(0, 240)}`);
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${TOKEN}`,
    };
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;

    const res = await fetch(SEED_URL, { method: 'POST', headers, body: line, dispatcher });

    const newSession = res.headers.get('mcp-session-id');
    if (newSession && newSession !== sessionId) {
      sessionId = newSession;
      log(`session id: ${sessionId}`);
    }

    dbg(`HTTP ${res.status} ${res.headers.get('content-type') || ''}`);

    if (res.status === 202) return; // notification accepted, no body expected
    const text = await res.text();
    emit(text);
  } catch (e) {
    log(`error: ${e.message}`);
  } finally {
    pending--;
    maybeExit();
  }
});

rl.on('close', () => {
  stdinClosed = true;
  maybeExit();
});

log(`started; forwarding to ${SEED_URL}`);

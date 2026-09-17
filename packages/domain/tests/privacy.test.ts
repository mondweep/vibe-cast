import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { analyseNight } from '../src/analysis/night-analysis';
import { breathingRun, HOUR_MS } from './helpers';

/**
 * ADR-001's central promise — no raw audio ever leaves the device — is
 * enforced in three independent places. This file is the runtime contract and
 * the source check; the type-level enforcement lives in AudioPort's signature.
 */

const AUDIO_KEY = /sample|pcm|audio|buffer|waveform|raw|frames?$/i;

function deepScan(value: unknown, path: string, onFinding: (f: string) => void): void {
  if (value === null || value === undefined) return;

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    onFinding(`${path} is a binary buffer`);
    return;
  }

  if (Array.isArray(value)) {
    // A long run of bare numbers is what audio would look like if it leaked.
    if (value.length > 64 && value.every((v) => typeof v === 'number')) {
      onFinding(`${path} is a ${value.length}-element numeric array`);
    }
    value.forEach((v, i) => deepScan(v, `${path}[${i}]`, onFinding));
    return;
  }

  if (typeof value === 'object') {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (AUDIO_KEY.test(key)) onFinding(`${path}.${key} is named like audio data`);
      deepScan(v, `${path}.${key}`, onFinding);
    }
  }
}

describe('no audio leaves the device (ADR-001, NFR-1)', () => {
  const fullNight = () =>
    analyseNight({
      nightId: 'n1',
      date: '2026-09-16',
      candidates: breathingRun(400),
      startMs: 0,
      stopMs: 8 * HOUR_MS,
    });

  it('a full night of analysis contains no binary buffer or sample array', () => {
    const findings: string[] = [];
    deepScan(JSON.parse(JSON.stringify(fullNight())), 'night', (f) => findings.push(f));
    expect(findings).toEqual([]);
  });

  it('fails loudly if sample data is ever added to a payload', () => {
    // Deliberately break the rule to prove the detector is not vacuous.
    const tampered = {
      ...fullNight(),
      capturedSamples: Array.from({ length: 1024 }, () => 0.1),
    };
    const findings: string[] = [];
    deepScan(tampered, 'night', (f) => findings.push(f));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.join(' ')).toMatch(/capturedSamples/);
  });

  it('an eight-hour night serialises to metadata-sized payload, not audio-sized', () => {
    const bytes = Buffer.byteLength(JSON.stringify(fullNight()), 'utf8');
    // Eight hours of even heavily-compressed audio is tens of megabytes.
    expect(bytes).toBeLessThan(512 * 1024);
  });

  it('no domain type declares a typed array anywhere', () => {
    const srcDir = join(__dirname, '..', 'src');
    const files = (function walk(dir: string): string[] {
      return readdirSync(dir).flatMap((n) => {
        const full = join(dir, n);
        return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
      });
    })(srcDir);

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/Float32Array|Int16Array|Uint8Array|ArrayBuffer/);
      expect(src).not.toMatch(/getChannelData|MediaRecorder|Blob/);
    }
  });
});

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ADR-004 makes the domain package pure by contract. A contract nobody checks
 * is a convention, and conventions decay, so it is checked here.
 */
const SRC = join(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

const files = sourceFiles(SRC);

/**
 * Strip comments before scanning.
 *
 * These rules are about what the code *does*, not what its documentation
 * mentions. Without this, a comment reading "the rolling window" trips the
 * `window.` check and a comment explaining the no-`Date.now()` rule trips the
 * no-`Date.now()` rule — so the checks would punish exactly the files that
 * document themselves best.
 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

describe('domain purity (ADR-004)', () => {
  it('finds the domain sources', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('declares zero runtime dependencies', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it.each(files)('%s imports nothing from node: or a package', (file) => {
    const src = code(file);
    const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    for (const spec of imports) {
      expect(spec.startsWith('.')).toBe(true);
    }
  });

  it.each(files)('%s touches no platform global', (file) => {
    const src = code(file);
    const forbidden = [
      /\bwindow\./, /\bdocument\./, /\bnavigator\./, /\blocalStorage\b/,
      /\bindexedDB\b/, /\bAudioContext\b/, /\bfetch\(/, /\bprocess\.env\b/,
      /\brequire\(/,
    ];
    for (const pattern of forbidden) {
      expect(src).not.toMatch(pattern);
    }
  });

  /**
   * Time and identity must enter through ClockPort and IdPort, or tests
   * become non-deterministic and a night's date starts depending on when the
   * test happened to run.
   */
  it.each(files)('%s derives no time or identity of its own', (file) => {
    const src = code(file);
    expect(src).not.toMatch(/Date\.now\(/);
    expect(src).not.toMatch(/new Date\(/);
    expect(src).not.toMatch(/crypto\.randomUUID/);
    expect(src).not.toMatch(/Math\.random\(/);
  });
});

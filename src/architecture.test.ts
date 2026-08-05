/**
 * Architecture fitness tests.
 *
 * ADR-0001 states the dependency rule — dependencies point inward only — and
 * says it is enforced by a rule rather than by convention. This is that rule.
 * A comment asking people to please not import React into the domain is not an
 * architecture; a failing test is.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(import.meta.dirname, '.');

const sourceFilesUnder = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry)) {
        out.push(full);
      }
    }
  };
  try {
    walk(dir);
  } catch {
    // A layer that no agent has created yet simply has no files to check.
  }
  return out;
};

const importsOf = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const specifiers: string[] = [];
  // Covers `import x from 'y'`, `import type {x} from 'y'`, and `export * from 'y'`.
  const pattern = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) specifiers.push(match[1]);
  return specifiers;
};

/** Resolve a relative specifier to a path rooted at src/, for layer checks. */
const resolveWithinSrc = (file: string, specifier: string): string | undefined => {
  if (!specifier.startsWith('.')) return undefined;
  const dir = join(file, '..');
  const resolved = join(dir, specifier);
  return resolved.startsWith(SRC) ? resolved.slice(SRC.length + 1) : undefined;
};

describe('ADR-0001: dependencies point inward only', () => {
  const domainFiles = sourceFilesUnder(join(SRC, 'domain'));

  it('has domain files to check', () => {
    // Guards against the walk silently finding nothing and the suite passing vacuously.
    expect(domainFiles.length).toBeGreaterThan(0);
  });

  it('domain never imports from adapters or application', () => {
    const violations: string[] = [];
    for (const file of domainFiles) {
      for (const specifier of importsOf(file)) {
        const within = resolveWithinSrc(file, specifier);
        if (within && (within.startsWith('adapters/') || within.startsWith('application/'))) {
          violations.push(`${file.slice(SRC.length + 1)} imports ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('domain never imports a framework or browser API', () => {
    // The domain must be runnable in a bare Node process with no DOM.
    const forbidden = ['react', 'react-dom', 'recharts', 'pdfjs-dist', 'idb'];
    const violations: string[] = [];
    for (const file of domainFiles) {
      for (const specifier of importsOf(file)) {
        if (forbidden.some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`))) {
          violations.push(`${file.slice(SRC.length + 1)} imports ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('application never imports from adapters', () => {
    // The application layer depends on ports it owns; adapters implement them.
    const violations: string[] = [];
    for (const file of sourceFilesUnder(join(SRC, 'application'))) {
      // Tests legitimately wire a real adapter in as a test double — the
      // in-memory repository exists precisely for that. The rule constrains
      // production code, which is where the coupling would actually bite.
      if (/\.test\.tsx?$/.test(file)) continue;
      for (const specifier of importsOf(file)) {
        const within = resolveWithinSrc(file, specifier);
        if (within?.startsWith('adapters/')) {
          violations.push(`${file.slice(SRC.length + 1)} imports ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('bounded contexts do not reach into each other except via the shared kernel', () => {
    // PRD §3.2: contexts integrate through the published language and the
    // shared kernel. A direct domain/scenario -> domain/response import would
    // be the first crack in that boundary.
    // `economics` is listed from its first module on purpose. It is the context
    // most tempted to reach sideways — it wants the timeline's integrals and
    // the situation's quantities — so it takes them as data from the
    // composition root instead. Adding it here later, once something had
    // already reached across, would have been adding a rule to a violation.
    const contexts = [
      'situation',
      'response',
      'scenario',
      'timeline',
      'infrastructure-impact',
      'economics',
    ];
    const violations: string[] = [];
    for (const context of contexts) {
      for (const file of sourceFilesUnder(join(SRC, 'domain', context))) {
        if (/\.test\.tsx?$/.test(file)) continue; // tests may wire contexts together
        for (const specifier of importsOf(file)) {
          const within = resolveWithinSrc(file, specifier);
          if (!within?.startsWith('domain/')) continue;
          const target = within.slice('domain/'.length).split('/')[0];
          if (target !== context && target !== 'shared') {
            violations.push(`domain/${context} imports domain/${target} (${specifier})`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('NFR-5: zero network egress', () => {
  it('no source file calls fetch, XMLHttpRequest, WebSocket, or sendBeacon', () => {
    // ADR-0004 makes this a browser-enforced property via CSP. This test makes
    // it a build-time property too, so a violation is caught before it ships
    // rather than being silently blocked at runtime in production.
    const banned = /\b(fetch\s*\(|XMLHttpRequest|new\s+WebSocket|navigator\.sendBeacon)/;
    const violations: string[] = [];
    for (const file of sourceFilesUnder(SRC)) {
      if (/\.test\.tsx?$/.test(file)) continue; // tests may double fetch to assert it is unused
      const source = readFileSync(file, 'utf8');
      if (banned.test(source)) violations.push(file.slice(SRC.length + 1));
    }
    expect(violations).toEqual([]);
  });
});

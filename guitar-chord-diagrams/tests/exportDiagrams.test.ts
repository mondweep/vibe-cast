import { describe, it, expect } from 'vitest';
import { generateShareUrl } from '../src/utils/exportDiagrams';

describe('generateShareUrl', () => {
  it('generates URL with chord query param', () => {
    const url = generateShareUrl('Am7');
    expect(url).toContain('chord=Am7');
  });

  it('encodes special characters', () => {
    const url = generateShareUrl('F#dim');
    expect(url).toContain('chord=F%23dim');
  });

  it('returns a valid URL', () => {
    const url = generateShareUrl('C');
    expect(() => new URL(url)).not.toThrow();
  });
});

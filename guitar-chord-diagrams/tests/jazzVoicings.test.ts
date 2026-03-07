import { describe, it, expect } from 'vitest';
import {
  generateDrop2Voicings,
  generateDrop3Voicings,
  generateShellVoicings,
  generateAllJazzVoicings,
} from '../src/utils/jazzVoicings';
import type { NoteName } from '../src/types';

const STANDARD: NoteName[] = ['E', 'A', 'D', 'G', 'B', 'E'];

describe('generateDrop2Voicings', () => {
  it('generates voicings for Cmaj7', () => {
    const voicings = generateDrop2Voicings('C', 'maj7', STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    voicings.forEach(v => {
      expect(v.category).toBe('jazz');
      expect(v.root).toBe('C');
    });
  });

  it('returns empty for triads (need 4+ notes)', () => {
    const voicings = generateDrop2Voicings('C', 'major', STANDARD);
    expect(voicings).toEqual([]);
  });

  it('all voicings have fret span <= 4', () => {
    const voicings = generateDrop2Voicings('A', 'min7', STANDARD);
    for (const v of voicings) {
      const fretted = v.strings.filter(f => f !== null && f > 0) as number[];
      if (fretted.length > 0) {
        const span = Math.max(...fretted) - Math.min(...fretted);
        expect(span).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('generateDrop3Voicings', () => {
  it('generates voicings for Dm7', () => {
    const voicings = generateDrop3Voicings('D', 'min7', STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
  });

  it('returns empty for triads', () => {
    const voicings = generateDrop3Voicings('G', 'major', STANDARD);
    expect(voicings).toEqual([]);
  });
});

describe('generateShellVoicings', () => {
  it('generates 3-note voicings for dom7', () => {
    const voicings = generateShellVoicings('G', 'dom7', STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    for (const v of voicings) {
      // Shell voicings use 3 strings
      const usedStrings = v.strings.filter(f => f !== null).length;
      expect(usedStrings).toBe(3);
    }
  });

  it('generates shell voicings for triads too', () => {
    const voicings = generateShellVoicings('C', 'major', STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
  });
});

describe('generateAllJazzVoicings', () => {
  it('deduplicates voicings', () => {
    const voicings = generateAllJazzVoicings('C', 'maj7', STANDARD);
    const keys = voicings.map(v => v.strings.map(f => f ?? 'x').join('-'));
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });

  it('returns empty for unknown quality', () => {
    const voicings = generateAllJazzVoicings('C', 'nonexistent', STANDARD);
    expect(voicings).toEqual([]);
  });

  it('combines drop2, drop3, and shell voicings', () => {
    const all = generateAllJazzVoicings('A', 'min7', STANDARD);
    const drop2 = generateDrop2Voicings('A', 'min7', STANDARD);
    const drop3 = generateDrop3Voicings('A', 'min7', STANDARD);
    const shell = generateShellVoicings('A', 'min7', STANDARD);
    // All should be >= individual counts (after dedup, could be less than sum)
    expect(all.length).toBeGreaterThanOrEqual(
      Math.max(drop2.length, drop3.length, shell.length)
    );
  });
});

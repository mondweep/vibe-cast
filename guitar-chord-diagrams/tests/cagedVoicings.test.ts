import { describe, it, expect } from 'vitest';
import { generateCAGEDVoicings } from '../src/utils/cagedVoicings';
import type { NoteName } from '../src/types';

const STANDARD: NoteName[] = ['E', 'A', 'D', 'G', 'B', 'E'];

describe('generateCAGEDVoicings', () => {
  it('generates voicings for C major', () => {
    const voicings = generateCAGEDVoicings('C', 'major', STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    voicings.forEach(v => {
      expect(v.root).toBe('C');
      expect(v.quality).toBe('major');
      expect(v.name).toBe('C');
    });
  });

  it('generates voicings for G major', () => {
    const voicings = generateCAGEDVoicings('G', 'major', STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    voicings.forEach(v => expect(v.root).toBe('G'));
  });

  it('generates voicings for A minor', () => {
    const voicings = generateCAGEDVoicings('A', 'minor', STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    voicings.forEach(v => {
      expect(v.root).toBe('A');
      expect(v.quality).toBe('minor');
    });
  });

  it('returns empty array for unknown quality', () => {
    const voicings = generateCAGEDVoicings('C', 'nonexistent', STANDARD);
    expect(voicings).toEqual([]);
  });

  it('all voicings have fret span <= 5', () => {
    for (const root of ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as NoteName[]) {
      const voicings = generateCAGEDVoicings(root, 'major', STANDARD);
      for (const v of voicings) {
        const fretted = v.strings.filter(f => f !== null && f > 0) as number[];
        if (fretted.length > 0) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          expect(span).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('voicing notes contain chord tones', () => {
    const voicings = generateCAGEDVoicings('D', 'major', STANDARD);
    for (const v of voicings) {
      // D major should contain at least D and F#
      const hasRoot = v.notes.includes('D');
      expect(hasRoot).toBe(true);
    }
  });

  it('barre voicings have barre info when shifted', () => {
    // F major (E-form shifted by 1) should have a barre
    const voicings = generateCAGEDVoicings('F', 'major', STANDARD);
    const eForm = voicings.find(v => v.barres.length > 0);
    expect(eForm).toBeDefined();
    if (eForm) {
      expect(eForm.barres[0].fret).toBeGreaterThan(0);
    }
  });

  it('works with Drop D tuning', () => {
    const dropD: NoteName[] = ['D', 'A', 'D', 'G', 'B', 'E'];
    const voicings = generateCAGEDVoicings('D', 'major', dropD);
    expect(voicings.length).toBeGreaterThan(0);
  });
});

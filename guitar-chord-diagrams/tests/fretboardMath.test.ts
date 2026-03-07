import { describe, it, expect } from 'vitest';
import { getNoteAtFret, findNotePositions, generateVoicings } from '../src/utils/fretboardMath';
import { STANDARD_TUNING_NOTES } from '../src/data/tunings';

describe('getNoteAtFret', () => {
  it('open E string is E', () => {
    expect(getNoteAtFret('E', 0)).toBe('E');
  });

  it('E string fret 1 is F', () => {
    expect(getNoteAtFret('E', 1)).toBe('F');
  });

  it('E string fret 5 is A', () => {
    expect(getNoteAtFret('E', 5)).toBe('A');
  });

  it('A string fret 3 is C', () => {
    expect(getNoteAtFret('A', 3)).toBe('C');
  });

  it('wraps around past fret 12', () => {
    expect(getNoteAtFret('E', 12)).toBe('E');
  });
});

describe('findNotePositions', () => {
  it('finds E on standard tuning', () => {
    const positions = findNotePositions('E', STANDARD_TUNING_NOTES, 12);
    // E appears on multiple strings at various frets
    expect(positions.length).toBeGreaterThan(0);
    // Open low E string
    expect(positions).toContainEqual({ string: 0, fret: 0 });
    // Open high e string
    expect(positions).toContainEqual({ string: 5, fret: 0 });
  });

  it('finds C on standard tuning', () => {
    const positions = findNotePositions('C', STANDARD_TUNING_NOTES, 5);
    // A string fret 3
    expect(positions).toContainEqual({ string: 1, fret: 3 });
    // B string fret 1
    expect(positions).toContainEqual({ string: 4, fret: 1 });
  });
});

describe('generateVoicings', () => {
  it('generates voicings for C major', () => {
    const voicings = generateVoicings('C', 'major', STANDARD_TUNING_NOTES);
    expect(voicings.length).toBeGreaterThan(0);

    // Each voicing should have correct metadata
    for (const v of voicings) {
      expect(v.root).toBe('C');
      expect(v.quality).toBe('major');
      expect(v.name).toBe('C');
      expect(v.strings).toHaveLength(6);
      expect(v.fingers).toHaveLength(6);
      // At least 3 strings played
      expect(v.strings.filter(f => f !== null).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('generates voicings for Am', () => {
    const voicings = generateVoicings('A', 'minor', STANDARD_TUNING_NOTES);
    expect(voicings.length).toBeGreaterThan(0);

    for (const v of voicings) {
      expect(v.root).toBe('A');
      expect(v.name).toBe('Am');
    }
  });

  it('generates voicings for E7', () => {
    const voicings = generateVoicings('E', 'dom7', STANDARD_TUNING_NOTES);
    expect(voicings.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown quality', () => {
    const voicings = generateVoicings('C', 'nonexistent', STANDARD_TUNING_NOTES);
    expect(voicings).toEqual([]);
  });

  it('includes root note in all voicings', () => {
    const voicings = generateVoicings('G', 'major', STANDARD_TUNING_NOTES);
    for (const v of voicings) {
      expect(v.notes).toContain('G');
    }
  });
});

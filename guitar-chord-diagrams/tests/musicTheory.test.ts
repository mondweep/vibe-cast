import { describe, it, expect } from 'vitest';
import {
  normalizeNote,
  transposeNote,
  getInterval,
  applyFormula,
  noteToFrequency,
  frequencyToNote,
  CHROMATIC_NOTES,
} from '../src/utils/musicTheory';

describe('CHROMATIC_NOTES', () => {
  it('has 12 notes', () => {
    expect(CHROMATIC_NOTES).toHaveLength(12);
  });

  it('starts with C and ends with B', () => {
    expect(CHROMATIC_NOTES[0]).toBe('C');
    expect(CHROMATIC_NOTES[11]).toBe('B');
  });
});

describe('normalizeNote', () => {
  it('passes through sharp notes unchanged', () => {
    expect(normalizeNote('C#')).toBe('C#');
    expect(normalizeNote('F#')).toBe('F#');
  });

  it('converts flats to sharps', () => {
    expect(normalizeNote('Db')).toBe('C#');
    expect(normalizeNote('Eb')).toBe('D#');
    expect(normalizeNote('Gb')).toBe('F#');
    expect(normalizeNote('Ab')).toBe('G#');
    expect(normalizeNote('Bb')).toBe('A#');
  });

  it('throws for unknown notes', () => {
    expect(() => normalizeNote('X')).toThrow();
  });
});

describe('transposeNote', () => {
  it('transposes up by semitones', () => {
    expect(transposeNote('C', 4)).toBe('E');   // major 3rd
    expect(transposeNote('C', 7)).toBe('G');   // perfect 5th
    expect(transposeNote('A', 3)).toBe('C');   // minor 3rd
  });

  it('wraps around at B→C', () => {
    expect(transposeNote('B', 1)).toBe('C');
    expect(transposeNote('G', 7)).toBe('D');
  });

  it('handles negative transposition', () => {
    expect(transposeNote('C', -1)).toBe('B');
    expect(transposeNote('E', -4)).toBe('C');
  });
});

describe('getInterval', () => {
  it('returns semitone distance', () => {
    expect(getInterval('C', 'E')).toBe(4);
    expect(getInterval('C', 'G')).toBe(7);
    expect(getInterval('A', 'C')).toBe(3);
  });

  it('returns 0 for same note', () => {
    expect(getInterval('A', 'A')).toBe(0);
  });
});

describe('applyFormula', () => {
  it('builds a C major triad', () => {
    expect(applyFormula('C', [0, 4, 7])).toEqual(['C', 'E', 'G']);
  });

  it('builds an Am chord', () => {
    expect(applyFormula('A', [0, 3, 7])).toEqual(['A', 'C', 'E']);
  });

  it('builds a G7 chord', () => {
    expect(applyFormula('G', [0, 4, 7, 10])).toEqual(['G', 'B', 'D', 'F']);
  });

  it('builds F#m', () => {
    expect(applyFormula('F#', [0, 3, 7])).toEqual(['F#', 'A', 'C#']);
  });
});

describe('noteToFrequency', () => {
  it('returns 440 for A4', () => {
    expect(noteToFrequency('A', 4)).toBeCloseTo(440, 1);
  });

  it('returns ~261.63 for C4 (middle C)', () => {
    expect(noteToFrequency('C', 4)).toBeCloseTo(261.63, 0);
  });

  it('returns ~82.41 for E2 (low E string)', () => {
    expect(noteToFrequency('E', 2)).toBeCloseTo(82.41, 0);
  });
});

describe('frequencyToNote', () => {
  it('converts 440Hz to A4', () => {
    const result = frequencyToNote(440);
    expect(result.note).toBe('A');
    expect(result.octave).toBe(4);
    expect(result.cents).toBe(0);
  });

  it('converts ~330Hz to E4', () => {
    const result = frequencyToNote(329.63);
    expect(result.note).toBe('E');
    expect(result.octave).toBe(4);
  });
});

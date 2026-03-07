import { describe, it, expect } from 'vitest';
import { parseChordName, formatChordName, CHORD_DEFINITIONS } from '../src/data/chordDefinitions';

describe('CHORD_DEFINITIONS', () => {
  it('has all expected chord types', () => {
    expect(CHORD_DEFINITIONS.major).toBeDefined();
    expect(CHORD_DEFINITIONS.minor).toBeDefined();
    expect(CHORD_DEFINITIONS.dom7).toBeDefined();
    expect(CHORD_DEFINITIONS.maj7).toBeDefined();
    expect(CHORD_DEFINITIONS.min7).toBeDefined();
    expect(CHORD_DEFINITIONS.dim).toBeDefined();
    expect(CHORD_DEFINITIONS.aug).toBeDefined();
    expect(CHORD_DEFINITIONS.sus2).toBeDefined();
    expect(CHORD_DEFINITIONS.sus4).toBeDefined();
    expect(CHORD_DEFINITIONS.power).toBeDefined();
  });

  it('major chord has intervals [0, 4, 7]', () => {
    expect(CHORD_DEFINITIONS.major.intervals).toEqual([0, 4, 7]);
  });

  it('minor chord has intervals [0, 3, 7]', () => {
    expect(CHORD_DEFINITIONS.minor.intervals).toEqual([0, 3, 7]);
  });
});

describe('parseChordName', () => {
  it('parses simple major chords', () => {
    const result = parseChordName('C');
    expect(result).toEqual({ root: 'C', quality: 'major', displayName: 'C' });
  });

  it('parses minor chords', () => {
    const result = parseChordName('Am');
    expect(result).toEqual({ root: 'A', quality: 'minor', displayName: 'Am' });
  });

  it('parses 7th chords', () => {
    const result = parseChordName('G7');
    expect(result).toEqual({ root: 'G', quality: 'dom7', displayName: 'G7' });
  });

  it('parses maj7 chords', () => {
    const result = parseChordName('Cmaj7');
    expect(result).toEqual({ root: 'C', quality: 'maj7', displayName: 'Cmaj7' });
  });

  it('parses sharp root chords', () => {
    const result = parseChordName('F#m');
    expect(result).toEqual({ root: 'F#', quality: 'minor', displayName: 'F#m' });
  });

  it('parses flat root chords (normalizes to sharp)', () => {
    const result = parseChordName('Bbm7');
    expect(result).toEqual({ root: 'A#', quality: 'min7', displayName: 'A#m7' });
  });

  it('parses sus chords', () => {
    expect(parseChordName('Dsus4')).toEqual({ root: 'D', quality: 'sus4', displayName: 'Dsus4' });
    expect(parseChordName('Asus2')).toEqual({ root: 'A', quality: 'sus2', displayName: 'Asus2' });
  });

  it('parses dim chords', () => {
    expect(parseChordName('Bdim')).toEqual({ root: 'B', quality: 'dim', displayName: 'Bdim' });
  });

  it('parses power chords', () => {
    expect(parseChordName('E5')).toEqual({ root: 'E', quality: 'power', displayName: 'E5' });
  });

  it('returns null for empty input', () => {
    expect(parseChordName('')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(parseChordName('XYZ')).toBeNull();
  });
});

describe('formatChordName', () => {
  it('formats major chords', () => {
    expect(formatChordName('C', 'major')).toBe('C');
  });

  it('formats minor chords', () => {
    expect(formatChordName('A', 'minor')).toBe('Am');
  });

  it('formats 7th chords', () => {
    expect(formatChordName('G', 'dom7')).toBe('G7');
  });

  it('formats sharp root chords', () => {
    expect(formatChordName('F#', 'minor')).toBe('F#m');
  });
});

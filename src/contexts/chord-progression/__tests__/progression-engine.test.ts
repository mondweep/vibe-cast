import { describe, it, expect } from 'vitest';
import { resolveCurrentChord, resolveCurrentSegment, isSilenceBeat } from '../domain/progression-engine.ts';
import { RSD_LESSON_PROGRESSION, CHORD_LIBRARY } from '../domain/chord-data.ts';
import type { BeatPosition } from '../../metronome/domain/types.ts';

function pos(bar: number, beat: 1 | 2 | 3 | 4, subdivision: 'down' | 'and' = 'down'): BeatPosition {
  return { bar, beat, subdivision, tick: 0 };
}

describe('resolveCurrentChord', () => {
  it('should return Am for bar 1, beat 1', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(1, 1))).toBe('Am');
  });

  it('should return Am for bar 1, beat 2', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(1, 2))).toBe('Am');
  });

  it('should return Am9 for bar 1, beat 3', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(1, 3))).toBe('Am9');
  });

  it('should return Am9 for bar 1, beat 4', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(1, 4))).toBe('Am9');
  });

  it('should return C for bar 2, beat 1', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(2, 1))).toBe('C');
  });

  it('should return D for bar 2, beat 3', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(2, 3))).toBe('D');
  });

  it('should return Fmaj7 for bar 3, any beat', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(3, 1))).toBe('Fmaj7');
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(3, 2))).toBe('Fmaj7');
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(3, 3))).toBe('Fmaj7');
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(3, 4))).toBe('Fmaj7');
  });

  it('should return G for bar 4, beat 1', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(4, 1))).toBe('G');
  });

  it('should return Am for bar 4, beat 3 (transition)', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(4, 3))).toBe('Am');
  });

  it('should return null for invalid bar', () => {
    expect(resolveCurrentChord(RSD_LESSON_PROGRESSION, pos(5, 1))).toBeNull();
  });
});

describe('isSilenceBeat', () => {
  it('should return true for bar 3, beat 3 downbeat (Fmaj7 silence)', () => {
    expect(isSilenceBeat(RSD_LESSON_PROGRESSION, pos(3, 3, 'down'))).toBe(true);
  });

  it('should return false for bar 3, beat 3 upbeat', () => {
    expect(isSilenceBeat(RSD_LESSON_PROGRESSION, pos(3, 3, 'and'))).toBe(false);
  });

  it('should return false for bar 3, beat 1', () => {
    expect(isSilenceBeat(RSD_LESSON_PROGRESSION, pos(3, 1))).toBe(false);
  });

  it('should return false for bar 1 (no silence)', () => {
    expect(isSilenceBeat(RSD_LESSON_PROGRESSION, pos(1, 3))).toBe(false);
  });
});

describe('resolveCurrentSegment', () => {
  it('should return segment with silence property for Fmaj7 bar', () => {
    const segment = resolveCurrentSegment(RSD_LESSON_PROGRESSION, pos(3, 3));
    expect(segment).not.toBeNull();
    expect(segment?.silence).toEqual({ onBeat: 3 });
  });
});

describe('Chord Library', () => {
  it('should contain all 6 chords', () => {
    expect(Object.keys(CHORD_LIBRARY)).toHaveLength(6);
    expect(CHORD_LIBRARY['Am']).toBeDefined();
    expect(CHORD_LIBRARY['Am9']).toBeDefined();
    expect(CHORD_LIBRARY['C']).toBeDefined();
    expect(CHORD_LIBRARY['D']).toBeDefined();
    expect(CHORD_LIBRARY['Fmaj7']).toBeDefined();
    expect(CHORD_LIBRARY['G']).toBeDefined();
  });

  it('should have correct Am voicing', () => {
    const am = CHORD_LIBRARY['Am'];
    expect(am?.positions).toContainEqual({ string: 2, fret: 1 });
    expect(am?.positions).toContainEqual({ string: 3, fret: 2 });
    expect(am?.positions).toContainEqual({ string: 4, fret: 2 });
  });
});

describe('RSD Lesson Progression', () => {
  it('should have 4 bars', () => {
    expect(RSD_LESSON_PROGRESSION.bars).toHaveLength(4);
  });

  it('should have bar 4 labeled as Transition', () => {
    expect(RSD_LESSON_PROGRESSION.bars[3]?.label).toBe('Transition');
  });
});

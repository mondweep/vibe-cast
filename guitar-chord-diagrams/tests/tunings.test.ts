import { describe, it, expect } from 'vitest';
import {
  STANDARD_TUNING,
  ALTERNATE_TUNINGS,
  getTuningNotes,
} from '../src/data/tunings';
import type { NoteName } from '../src/types';

describe('tunings', () => {
  it('STANDARD_TUNING has 6 strings', () => {
    expect(STANDARD_TUNING.notes).toHaveLength(6);
  });

  it('ALTERNATE_TUNINGS includes Standard', () => {
    const names = ALTERNATE_TUNINGS.map(t => t.name);
    expect(names).toContain('Standard');
  });

  it('all tunings have 6 strings', () => {
    for (const tuning of ALTERNATE_TUNINGS) {
      expect(tuning.notes).toHaveLength(6);
    }
  });

  it('getTuningNotes strips octave numbers', () => {
    const notes = getTuningNotes(STANDARD_TUNING);
    expect(notes).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
    notes.forEach(n => {
      expect(n).not.toMatch(/\d/);
    });
  });

  it('getTuningNotes works for Drop D', () => {
    const dropD = ALTERNATE_TUNINGS.find(t => t.name === 'Drop D')!;
    const notes = getTuningNotes(dropD);
    expect(notes[0]).toBe('D');
    expect(notes).toHaveLength(6);
  });

  it('getTuningNotes works for Open G', () => {
    const openG = ALTERNATE_TUNINGS.find(t => t.name === 'Open G')!;
    const notes = getTuningNotes(openG);
    expect(notes).toEqual(['D', 'G', 'D', 'G', 'B', 'D']);
  });

  it('all alternate tunings have unique names', () => {
    const names = ALTERNATE_TUNINGS.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

import type { NoteName } from '../types';
import { CHROMATIC_NOTES } from '../utils/musicTheory';

export const NOTE_FREQUENCIES: Record<string, number> = {};

// Generate frequencies for octaves 0-8
for (let octave = 0; octave <= 8; octave++) {
  for (const note of CHROMATIC_NOTES) {
    const key = `${note}${octave}`;
    const semitonesFromA4 = (octave - 4) * 12 + (CHROMATIC_NOTES.indexOf(note) - CHROMATIC_NOTES.indexOf('A' as NoteName));
    NOTE_FREQUENCIES[key] = 440 * Math.pow(2, semitonesFromA4 / 12);
  }
}

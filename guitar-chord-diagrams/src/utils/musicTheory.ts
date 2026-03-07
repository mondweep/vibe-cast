import type { NoteName } from '../types';

export const CHROMATIC_NOTES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const ENHARMONIC_MAP: Record<string, NoteName> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Fb': 'E',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
  'Cb': 'B',
  'B#': 'C',
  'E#': 'F',
};

export function normalizeNote(note: string): NoteName {
  if (CHROMATIC_NOTES.includes(note as NoteName)) {
    return note as NoteName;
  }
  const normalized = ENHARMONIC_MAP[note];
  if (normalized) return normalized;
  throw new Error(`Unknown note: ${note}`);
}

export function noteIndex(note: NoteName): number {
  return CHROMATIC_NOTES.indexOf(note);
}

export function transposeNote(note: NoteName, semitones: number): NoteName {
  const idx = noteIndex(note);
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return CHROMATIC_NOTES[newIdx];
}

export function getInterval(root: NoteName, target: NoteName): number {
  const rootIdx = noteIndex(root);
  const targetIdx = noteIndex(target);
  return ((targetIdx - rootIdx) % 12 + 12) % 12;
}

export function applyFormula(root: NoteName, intervals: number[]): NoteName[] {
  return intervals.map(interval => transposeNote(root, interval));
}

export function noteToFrequency(note: NoteName, octave: number): number {
  const a4 = 440;
  const semitonesFromA4 = (octave - 4) * 12 + (noteIndex(note) - noteIndex('A'));
  return a4 * Math.pow(2, semitonesFromA4 / 12);
}

export function frequencyToNote(freq: number): { note: NoteName; octave: number; cents: number } {
  const a4 = 440;
  const semitonesFromA4 = 12 * Math.log2(freq / a4);
  const roundedSemitones = Math.round(semitonesFromA4);
  const cents = Math.round((semitonesFromA4 - roundedSemitones) * 100);

  const noteIdx = ((roundedSemitones + noteIndex('A')) % 12 + 12) % 12;
  const octave = 4 + Math.floor((roundedSemitones + noteIndex('A')) / 12);

  return { note: CHROMATIC_NOTES[noteIdx], octave, cents };
}

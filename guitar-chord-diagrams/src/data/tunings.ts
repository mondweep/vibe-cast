import type { Tuning, NoteName } from '../types';

export const STANDARD_TUNING: Tuning = {
  name: 'Standard',
  notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
};

export const STANDARD_TUNING_NOTES: NoteName[] = ['E', 'A', 'D', 'G', 'B', 'E'];

/** Extract just the note names (without octave) from a Tuning */
export function getTuningNotes(tuning: Tuning): NoteName[] {
  return tuning.notes.map(n => n.replace(/\d+$/, '') as NoteName);
}

export const ALTERNATE_TUNINGS: Tuning[] = [
  STANDARD_TUNING,
  { name: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { name: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { name: 'Open D', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
  { name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { name: 'Half Step Down', notes: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'] },
];

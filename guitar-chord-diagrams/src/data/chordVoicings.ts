import type { NoteName, ChordVoicing } from '../types';
import { CHORD_DEFINITIONS } from './chordDefinitions';
import { getNoteAtFret } from '../utils/fretboardMath';
import { STANDARD_TUNING_NOTES } from './tunings';

function curated(
  root: NoteName,
  quality: string,
  strings: (number | null)[],
  fingers: (number | null)[],
  barres: ChordVoicing['barres'] = [],
  baseFret: number = 1,
  category: ChordVoicing['category'] = 'open'
): ChordVoicing {
  const def = CHORD_DEFINITIONS[quality];
  const notes: NoteName[] = [];
  for (let i = 0; i < strings.length; i++) {
    if (strings[i] !== null) {
      notes.push(getNoteAtFret(STANDARD_TUNING_NOTES[i], strings[i]!));
    }
  }
  return {
    name: `${root}${def.symbol}`,
    root,
    quality,
    strings,
    fingers,
    barres,
    baseFret,
    notes,
    category,
  };
}

// Canonical open chord shapes that every guitarist should know
export const CURATED_VOICINGS: ChordVoicing[] = [
  // C Major
  curated('C', 'major', [null, 3, 2, 0, 1, 0], [null, 3, 2, null, 1, null]),
  // D Major
  curated('D', 'major', [null, null, 0, 2, 3, 2], [null, null, null, 1, 3, 2]),
  // E Major
  curated('E', 'major', [0, 2, 2, 1, 0, 0], [null, 2, 3, 1, null, null]),
  // G Major
  curated('G', 'major', [3, 2, 0, 0, 0, 3], [2, 1, null, null, null, 3]),
  // A Major
  curated('A', 'major', [null, 0, 2, 2, 2, 0], [null, null, 1, 2, 3, null]),
  // F Major (barre)
  curated('F', 'major', [1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1],
    [{ fret: 1, fromString: 0, toString: 5, finger: 1 }], 1, 'barre'),

  // Am
  curated('A', 'minor', [null, 0, 2, 2, 1, 0], [null, null, 2, 3, 1, null]),
  // Dm
  curated('D', 'minor', [null, null, 0, 2, 3, 1], [null, null, null, 2, 3, 1]),
  // Em
  curated('E', 'minor', [0, 2, 2, 0, 0, 0], [null, 2, 3, null, null, null]),

  // C7
  curated('C', 'dom7', [null, 3, 2, 3, 1, 0], [null, 3, 2, 4, 1, null]),
  // D7
  curated('D', 'dom7', [null, null, 0, 2, 1, 2], [null, null, null, 2, 1, 3]),
  // E7
  curated('E', 'dom7', [0, 2, 0, 1, 0, 0], [null, 2, null, 1, null, null]),
  // G7
  curated('G', 'dom7', [3, 2, 0, 0, 0, 1], [3, 2, null, null, null, 1]),
  // A7
  curated('A', 'dom7', [null, 0, 2, 0, 2, 0], [null, null, 2, null, 3, null]),
  // B7
  curated('B', 'dom7', [null, 2, 1, 2, 0, 2], [null, 2, 1, 3, null, 4]),

  // Am7
  curated('A', 'min7', [null, 0, 2, 0, 1, 0], [null, null, 2, null, 1, null]),
  // Dm7
  curated('D', 'min7', [null, null, 0, 2, 1, 1], [null, null, null, 2, 1, 1]),
  // Em7
  curated('E', 'min7', [0, 2, 0, 0, 0, 0], [null, 2, null, null, null, null]),

  // Cmaj7
  curated('C', 'maj7', [null, 3, 2, 0, 0, 0], [null, 3, 2, null, null, null]),
  // Fmaj7
  curated('F', 'maj7', [null, null, 3, 2, 1, 0], [null, null, 3, 2, 1, null]),
  // Gmaj7
  curated('G', 'maj7', [3, 2, 0, 0, 0, 2], [3, 2, null, null, null, 1]),

  // Asus2
  curated('A', 'sus2', [null, 0, 2, 2, 0, 0], [null, null, 1, 2, null, null]),
  // Dsus2
  curated('D', 'sus2', [null, null, 0, 2, 3, 0], [null, null, null, 1, 3, null]),
  // Esus2 (not standard open — skip)

  // Asus4
  curated('A', 'sus4', [null, 0, 2, 2, 3, 0], [null, null, 1, 2, 3, null]),
  // Dsus4
  curated('D', 'sus4', [null, null, 0, 2, 3, 3], [null, null, null, 1, 2, 3]),
  // Esus4
  curated('E', 'sus4', [0, 2, 2, 2, 0, 0], [null, 2, 3, 4, null, null]),

  // Power chords
  curated('E', 'power', [0, 2, 2, null, null, null], [null, 1, 2, null, null, null], [], 1, 'partial'),
  curated('A', 'power', [null, 0, 2, 2, null, null], [null, null, 1, 2, null, null], [], 1, 'partial'),

  // Dim
  curated('B', 'dim', [null, 2, 3, 4, 3, null], [null, 1, 2, 4, 3, null], [], 1, 'partial'),

  // Aug
  curated('C', 'aug', [null, 3, 2, 1, 1, 0], [null, 4, 3, 2, 1, null]),
];

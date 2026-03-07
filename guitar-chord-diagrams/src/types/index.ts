export type NoteName =
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F'
  | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type NoteWithOctave = `${NoteName}${number}`;

export interface Barre {
  fret: number;
  fromString: number; // 0 = low E, 5 = high e
  toString: number;
  finger: number;
}

export interface ChordVoicing {
  name: string;              // e.g., "Am7"
  root: NoteName;
  quality: string;           // e.g., "min7"
  strings: (number | null)[]; // Fret per string [E,A,D,G,B,e], null = muted
  fingers: (number | null)[]; // Finger per string, null = open/muted
  barres: Barre[];
  baseFret: number;          // Starting fret position (1 for open chords)
  notes: NoteName[];         // Notes sounding in this voicing
  category: 'open' | 'barre' | 'partial' | 'jazz';
}

export interface ChordDefinition {
  name: string;              // Display name e.g. "Major", "Minor 7th"
  symbol: string;            // Short symbol e.g. "", "m", "7", "maj7"
  intervals: number[];       // Semitone intervals e.g. [0, 4, 7]
}

export interface ParsedChord {
  root: NoteName;
  quality: string;           // Key into CHORD_DEFINITIONS
  displayName: string;       // e.g. "Am7"
}

export interface Tuning {
  name: string;
  notes: NoteWithOctave[];   // 6 strings low to high
}

export interface DetectedChord {
  name: string;
  root: NoteName;
  quality: string;
  confidence: number;
  detectedNotes: NoteName[];
  allVoicings: ChordVoicing[];
}

export interface DetectedPitch {
  note: NoteName;
  frequency: number;
  confidence: number;
  octave: number;
}

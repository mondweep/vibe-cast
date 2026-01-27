/**
 * Score Intermediate Representation (IR)
 * Published language between OMR and Audio contexts
 * See ADR-004 for design rationale
 */

export interface ScoreIR {
  irVersion: string;
  metadata: ScoreMetadata;
  staves: StaffIR[];
  rehearsalMarks: RehearsalMark[];
}

export interface ScoreMetadata {
  title: string;
  tempo: number; // BPM (e.g., 113-114)
  timeSignature: [number, number]; // [numerator, denominator]
  keySignature: string; // "Bm", "CA7", etc.
}

export interface StaffIR {
  id: string;
  instrument: InstrumentType;
  measures: MeasureIR[];
}

export interface MeasureIR {
  number: number;
  startTime: number; // In beats from start
  events: NoteEvent[];
  dynamics?: Dynamic;
  chordSymbol?: string; // "F#m7b5/A", "EmAdd9"
}

export interface NoteEvent {
  type: 'note-on' | 'note-off';
  pitch: number; // MIDI note number (0-127)
  time: number; // Beat offset within measure
  duration: number; // In beats
  velocity: number; // 0-127 (derived from dynamics)
  lyric?: string; // Assamese text if present
}

export interface RehearsalMark {
  label: string; // "A1", "A2", "S1", "M1"
  measureNumber: number;
}

export type InstrumentType =
  | 'soprano'
  | 'lead-vocal'
  | 'space-synth'
  | 'piano'
  | 'acoustic-guitar-strum'
  | 'acoustic-guitar-lead'
  | 'bass-guitar'
  | 'drums'
  | 'strings'
  | 'brass'
  | 'choir';

export type Dynamic = 'pppp' | 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'ffff';

/**
 * Convert dynamic marking to MIDI velocity
 */
export function dynamicToVelocity(dynamic: Dynamic): number {
  const velocityMap: Record<Dynamic, number> = {
    pppp: 16,
    ppp: 24,
    pp: 33,
    p: 49,
    mp: 64,
    mf: 80,
    f: 96,
    ff: 112,
    fff: 120,
    ffff: 127,
  };
  return velocityMap[dynamic];
}

/**
 * Create an empty score IR with default values
 */
export function createEmptyScoreIR(): ScoreIR {
  return {
    irVersion: '1.0.0',
    metadata: {
      title: 'Untitled',
      tempo: 120,
      timeSignature: [4, 4],
      keySignature: 'C',
    },
    staves: [],
    rehearsalMarks: [],
  };
}

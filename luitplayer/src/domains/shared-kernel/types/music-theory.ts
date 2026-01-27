/**
 * Music Theory Value Objects
 * Shared across all bounded contexts
 */

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface KeySignature {
  root: NoteName;
  mode: 'major' | 'minor';
  accidentals: number; // Positive = sharps, negative = flats
}

export type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';

export interface Pitch {
  noteName: NoteName;
  octave: number; // MIDI octave (middle C = C4)
  accidental?: Accidental;
}

/**
 * Convert pitch to MIDI note number
 * C4 (middle C) = 60
 */
export function pitchToMidi(pitch: Pitch): number {
  const noteValues: Record<NoteName, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  const accidentalOffset: Record<Accidental, number> = {
    'double-flat': -2,
    flat: -1,
    natural: 0,
    sharp: 1,
    'double-sharp': 2,
  };

  const base = noteValues[pitch.noteName];
  const octaveOffset = (pitch.octave + 1) * 12; // MIDI octave starts at -1
  const accOffset = pitch.accidental ? accidentalOffset[pitch.accidental] : 0;

  return base + octaveOffset + accOffset;
}

/**
 * Convert MIDI note number to pitch
 */
export function midiToPitch(midi: number): Pitch {
  const noteNames: NoteName[] = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const hasSharp = [false, true, false, true, false, false, true, false, true, false, true, false];

  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;

  return {
    noteName: noteNames[noteIndex],
    octave,
    accidental: hasSharp[noteIndex] ? 'sharp' : undefined,
  };
}

/**
 * Convert MIDI note to frequency in Hz
 * A4 = 440Hz = MIDI 69
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert frequency to MIDI note (rounded)
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

/**
 * Duration types in music notation
 */
export type DurationType =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'thirty-second';

/**
 * Convert duration type to beats (assuming quarter = 1 beat)
 */
export function durationToBeats(duration: DurationType, dotted = false): number {
  const beatValues: Record<DurationType, number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    sixteenth: 0.25,
    'thirty-second': 0.125,
  };

  const baseBeats = beatValues[duration];
  return dotted ? baseBeats * 1.5 : baseBeats;
}

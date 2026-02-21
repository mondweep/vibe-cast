export type BPM = number;

export type Subdivision = 'down' | 'and';

export interface BeatPosition {
  bar: number;
  beat: 1 | 2 | 3 | 4;
  subdivision: Subdivision;
  tick: number;
}

export interface MetronomeConfig {
  bpm: BPM;
  beatsPerBar: 4;
  loopLengthBars: number;
}

export interface MetronomeState {
  bpm: BPM;
  isPlaying: boolean;
  currentPosition: BeatPosition;
  loopLengthBars: number;
}

export type BeatCallback = (position: BeatPosition) => void;

export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 80;

export const SUBDIVISIONS_PER_BEAT = 2;
export const BEATS_PER_BAR = 4;
export const TICKS_PER_BAR = BEATS_PER_BAR * SUBDIVISIONS_PER_BEAT;

export const SUBDIVISION_LABELS = ['1', '&', '2', '&', '3', '&', '4', '&'] as const;

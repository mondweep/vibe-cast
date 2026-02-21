import type { BeatPosition } from '../../metronome/domain/types.ts';
import type { Bar } from '../../chord-progression/domain/types.ts';

export interface TapEvent {
  timestamp: number;
  nearestBeat: BeatPosition;
  deviationMs: number;
}

export type TapJudgement = 'perfect' | 'good' | 'miss' | 'silence_violation';

export interface TapResult {
  tap: TapEvent;
  judgement: TapJudgement;
}

export interface DrillConfig {
  bar: Bar;
  perfectWindowMs: number;
  goodWindowMs: number;
}

export interface RhythmDrillResult {
  taps: readonly TapResult[];
  silenceViolations: number;
  accuracy: number;
  timestamp: number;
}

export const DEFAULT_PERFECT_WINDOW_MS = 50;
export const DEFAULT_GOOD_WINDOW_MS = 120;

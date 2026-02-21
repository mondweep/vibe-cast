import type { FretPosition, StringNumber } from '../../../shared/types/common.ts';
import type { ChordName } from '../../chord-progression/domain/types.ts';

export type { FretPosition, StringNumber };

export interface FingerPlacement {
  position: FretPosition;
  finger?: 1 | 2 | 3 | 4;
}

export interface FretboardConfig {
  fretCount: number;
  orientation: 'vertical' | 'horizontal';
}

export interface DrillResult {
  targetChord: ChordName;
  correct: readonly FretPosition[];
  incorrect: readonly FretPosition[];
  missed: readonly FretPosition[];
  score: number;
  timestamp: number;
}

export const DEFAULT_FRET_COUNT = 12;

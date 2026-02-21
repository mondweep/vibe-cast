import type { FretPosition } from '../../../shared/types/common.ts';

export type ChordName = 'Am' | 'Am9' | 'C' | 'D' | 'Fmaj7' | 'G';

export interface ChordVoicing {
  name: ChordName;
  positions: readonly FretPosition[];
  fingering?: readonly (1 | 2 | 3 | 4 | null)[];
}

export interface BarSegment {
  chord: ChordName;
  startBeat: 1 | 2 | 3 | 4;
  endBeat: 1 | 2 | 3 | 4;
  silence?: { onBeat: number };
}

export interface Bar {
  barNumber: number;
  segments: readonly BarSegment[];
  label?: string;
}

export interface Progression {
  name: string;
  bars: readonly Bar[];
}

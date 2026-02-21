import { useMemo } from 'react';
import type { BeatPosition } from '../../metronome/domain/types.ts';
import type { Progression, ChordName, BarSegment } from '../domain/types.ts';
import { resolveCurrentChord, resolveCurrentSegment, isSilenceBeat } from '../domain/progression-engine.ts';
import { RSD_LESSON_PROGRESSION } from '../domain/chord-data.ts';

export function useProgression(currentPosition: BeatPosition, progression: Progression = RSD_LESSON_PROGRESSION) {
  const currentChord = useMemo<ChordName | null>(
    () => resolveCurrentChord(progression, currentPosition),
    [progression, currentPosition]
  );

  const currentSegment = useMemo<BarSegment | null>(
    () => resolveCurrentSegment(progression, currentPosition),
    [progression, currentPosition]
  );

  const isSilence = useMemo(
    () => isSilenceBeat(progression, currentPosition),
    [progression, currentPosition]
  );

  return { currentChord, currentSegment, isSilence, progression };
}

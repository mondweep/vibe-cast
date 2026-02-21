import type { BeatPosition } from '../../metronome/domain/types.ts';
import type { Progression, BarSegment, ChordName } from './types.ts';

export function resolveCurrentSegment(
  progression: Progression,
  position: BeatPosition
): BarSegment | null {
  const bar = progression.bars.find(b => b.barNumber === position.bar);
  if (!bar) return null;

  for (const segment of bar.segments) {
    if (position.beat >= segment.startBeat && position.beat <= segment.endBeat) {
      return segment;
    }
  }
  return null;
}

export function resolveCurrentChord(
  progression: Progression,
  position: BeatPosition
): ChordName | null {
  const segment = resolveCurrentSegment(progression, position);
  return segment?.chord ?? null;
}

export function isSilenceBeat(
  progression: Progression,
  position: BeatPosition
): boolean {
  const segment = resolveCurrentSegment(progression, position);
  if (!segment?.silence) return false;
  return position.beat === segment.silence.onBeat && position.subdivision === 'down';
}

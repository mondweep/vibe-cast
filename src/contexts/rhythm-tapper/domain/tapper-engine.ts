import type { BeatPosition } from '../../metronome/domain/types.ts';
import type { BarSegment } from '../../chord-progression/domain/types.ts';
import type { TapJudgement, TapResult, TapEvent } from './types.ts';
import { DEFAULT_PERFECT_WINDOW_MS, DEFAULT_GOOD_WINDOW_MS } from './types.ts';

export function judgeTap(
  deviationMs: number,
  isSilenceBeat: boolean,
  perfectWindowMs: number = DEFAULT_PERFECT_WINDOW_MS,
  goodWindowMs: number = DEFAULT_GOOD_WINDOW_MS
): TapJudgement {
  if (isSilenceBeat) {
    return 'silence_violation';
  }

  const absDeviation = Math.abs(deviationMs);
  if (absDeviation <= perfectWindowMs) {
    return 'perfect';
  }
  if (absDeviation <= goodWindowMs) {
    return 'good';
  }
  return 'miss';
}

export function calculateAccuracy(taps: readonly TapResult[]): number {
  if (taps.length === 0) return 0;

  let score = 0;
  for (const tap of taps) {
    switch (tap.judgement) {
      case 'perfect':
        score += 1;
        break;
      case 'good':
        score += 0.75;
        break;
      case 'miss':
        score += 0;
        break;
      case 'silence_violation':
        score -= 0.5;
        break;
    }
  }

  return Math.max(0, Math.round((score / taps.length) * 100));
}

export function checkSilenceBeat(
  position: BeatPosition,
  currentSegment: BarSegment | null
): boolean {
  if (!currentSegment?.silence) return false;
  return position.beat === currentSegment.silence.onBeat && position.subdivision === 'down';
}

export function createTapResult(
  timestamp: number,
  nearestBeat: BeatPosition,
  deviationMs: number,
  isSilenceBeat: boolean,
  perfectWindowMs?: number,
  goodWindowMs?: number
): TapResult {
  const tap: TapEvent = { timestamp, nearestBeat, deviationMs };
  const judgement = judgeTap(deviationMs, isSilenceBeat, perfectWindowMs, goodWindowMs);
  return { tap, judgement };
}

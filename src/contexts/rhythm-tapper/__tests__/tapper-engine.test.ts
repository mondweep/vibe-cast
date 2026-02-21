import { describe, it, expect } from 'vitest';
import { judgeTap, calculateAccuracy, checkSilenceBeat, createTapResult } from '../domain/tapper-engine.ts';
import type { TapResult } from '../domain/types.ts';
import type { BeatPosition } from '../../metronome/domain/types.ts';
import type { BarSegment } from '../../chord-progression/domain/types.ts';

function pos(bar: number, beat: 1 | 2 | 3 | 4, subdivision: 'down' | 'and' = 'down'): BeatPosition {
  return { bar, beat, subdivision, tick: 0 };
}

describe('judgeTap', () => {
  it('should return perfect when within perfect window', () => {
    expect(judgeTap(30, false)).toBe('perfect');
    expect(judgeTap(-40, false)).toBe('perfect');
    expect(judgeTap(0, false)).toBe('perfect');
  });

  it('should return good when within good window but outside perfect', () => {
    expect(judgeTap(80, false)).toBe('good');
    expect(judgeTap(-100, false)).toBe('good');
  });

  it('should return miss when outside good window', () => {
    expect(judgeTap(200, false)).toBe('miss');
    expect(judgeTap(-150, false)).toBe('miss');
  });

  it('should return silence_violation when tapping on silence beat', () => {
    expect(judgeTap(10, true)).toBe('silence_violation');
    expect(judgeTap(0, true)).toBe('silence_violation');
  });

  it('should use custom windows', () => {
    expect(judgeTap(80, false, 100, 200)).toBe('perfect');
    expect(judgeTap(150, false, 100, 200)).toBe('good');
  });
});

describe('calculateAccuracy', () => {
  it('should return 0 for empty taps', () => {
    expect(calculateAccuracy([])).toBe(0);
  });

  it('should return 100 for all perfect taps', () => {
    const taps: TapResult[] = [
      { tap: { timestamp: 0, nearestBeat: pos(1, 1), deviationMs: 10 }, judgement: 'perfect' },
      { tap: { timestamp: 0, nearestBeat: pos(1, 2), deviationMs: 20 }, judgement: 'perfect' },
    ];
    expect(calculateAccuracy(taps)).toBe(100);
  });

  it('should return 75 for all good taps', () => {
    const taps: TapResult[] = [
      { tap: { timestamp: 0, nearestBeat: pos(1, 1), deviationMs: 80 }, judgement: 'good' },
      { tap: { timestamp: 0, nearestBeat: pos(1, 2), deviationMs: 90 }, judgement: 'good' },
    ];
    expect(calculateAccuracy(taps)).toBe(75);
  });

  it('should reduce accuracy for silence violations', () => {
    const taps: TapResult[] = [
      { tap: { timestamp: 0, nearestBeat: pos(1, 1), deviationMs: 10 }, judgement: 'perfect' },
      { tap: { timestamp: 0, nearestBeat: pos(1, 3), deviationMs: 10 }, judgement: 'silence_violation' },
    ];
    const accuracy = calculateAccuracy(taps);
    expect(accuracy).toBeLessThan(100);
  });

  it('should floor accuracy at 0', () => {
    const taps: TapResult[] = [
      { tap: { timestamp: 0, nearestBeat: pos(1, 3), deviationMs: 10 }, judgement: 'silence_violation' },
      { tap: { timestamp: 0, nearestBeat: pos(1, 3), deviationMs: 10 }, judgement: 'silence_violation' },
    ];
    expect(calculateAccuracy(taps)).toBe(0);
  });
});

describe('checkSilenceBeat', () => {
  const fmaj7Segment: BarSegment = {
    chord: 'Fmaj7',
    startBeat: 1,
    endBeat: 4,
    silence: { onBeat: 3 },
  };

  it('should return true for beat 3 downbeat on Fmaj7', () => {
    expect(checkSilenceBeat(pos(3, 3, 'down'), fmaj7Segment)).toBe(true);
  });

  it('should return false for beat 3 upbeat on Fmaj7', () => {
    expect(checkSilenceBeat(pos(3, 3, 'and'), fmaj7Segment)).toBe(false);
  });

  it('should return false for other beats on Fmaj7', () => {
    expect(checkSilenceBeat(pos(3, 1, 'down'), fmaj7Segment)).toBe(false);
    expect(checkSilenceBeat(pos(3, 2, 'down'), fmaj7Segment)).toBe(false);
  });

  it('should return false when segment has no silence', () => {
    const normalSegment: BarSegment = { chord: 'Am', startBeat: 1, endBeat: 2 };
    expect(checkSilenceBeat(pos(1, 1), normalSegment)).toBe(false);
  });

  it('should return false when segment is null', () => {
    expect(checkSilenceBeat(pos(1, 1), null)).toBe(false);
  });
});

describe('createTapResult', () => {
  it('should create a tap result with judgement', () => {
    const result = createTapResult(1000, pos(1, 1), 30, false);
    expect(result.judgement).toBe('perfect');
    expect(result.tap.timestamp).toBe(1000);
    expect(result.tap.deviationMs).toBe(30);
  });

  it('should mark silence violation', () => {
    const result = createTapResult(1000, pos(3, 3), 10, true);
    expect(result.judgement).toBe('silence_violation');
  });
});

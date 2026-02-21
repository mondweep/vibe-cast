import { useState, useCallback, useRef } from 'react';
import type { BeatPosition } from '../../metronome/domain/types.ts';
import type { BarSegment } from '../../chord-progression/domain/types.ts';
import type { TapResult, RhythmDrillResult } from '../domain/types.ts';
import { createTapResult, calculateAccuracy, checkSilenceBeat } from '../domain/tapper-engine.ts';
import { bpmToSubdivisionMs } from '../../metronome/domain/metronome-engine.ts';

export function useRhythmTapper(bpm: number) {
  const [taps, setTaps] = useState<TapResult[]>([]);
  const [silenceViolations, setSilenceViolations] = useState(0);
  const lastBeatRef = useRef<BeatPosition | null>(null);
  const lastBeatTimeRef = useRef<number>(0);

  const updateBeat = useCallback((position: BeatPosition) => {
    lastBeatRef.current = position;
    lastBeatTimeRef.current = performance.now();
  }, []);

  const tap = useCallback((currentSegment: BarSegment | null) => {
    const now = performance.now();
    const beat = lastBeatRef.current;
    if (!beat) return;

    const subdivMs = bpmToSubdivisionMs(bpm);
    const deviationMs = now - lastBeatTimeRef.current;
    const adjustedDeviation = deviationMs > subdivMs / 2
      ? deviationMs - subdivMs
      : deviationMs;

    const isSilence = checkSilenceBeat(beat, currentSegment);
    const result = createTapResult(now, beat, adjustedDeviation, isSilence);

    setTaps(prev => [...prev, result]);
    if (result.judgement === 'silence_violation') {
      setSilenceViolations(prev => prev + 1);
    }

    return result;
  }, [bpm]);

  const getResult = useCallback((): RhythmDrillResult => {
    return {
      taps,
      silenceViolations,
      accuracy: calculateAccuracy(taps),
      timestamp: Date.now(),
    };
  }, [taps, silenceViolations]);

  const reset = useCallback(() => {
    setTaps([]);
    setSilenceViolations(0);
  }, []);

  return {
    taps,
    silenceViolations,
    accuracy: calculateAccuracy(taps),
    tap,
    updateBeat,
    getResult,
    reset,
  };
}

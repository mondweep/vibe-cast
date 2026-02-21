import { useState, useEffect, useRef, useCallback } from 'react';
import { type BeatPosition, type MetronomeState, DEFAULT_BPM } from '../domain/types.ts';
import { createMetronomeEngine, type MetronomeEngine } from '../domain/metronome-engine.ts';

export function useMetronome(initialBpm: number = DEFAULT_BPM, loopLengthBars: number = 4) {
  const engineRef = useRef<MetronomeEngine | null>(null);
  const [state, setState] = useState<MetronomeState>({
    bpm: initialBpm,
    isPlaying: false,
    currentPosition: { bar: 1, beat: 1, subdivision: 'down', tick: 0 },
    loopLengthBars,
  });

  useEffect(() => {
    const engine = createMetronomeEngine(initialBpm, loopLengthBars);
    engineRef.current = engine;

    const unsub = engine.onTick((position: BeatPosition) => {
      setState(prev => ({
        ...prev,
        currentPosition: position,
        isPlaying: engine.isPlaying(),
      }));
    });

    return () => {
      unsub();
      engine.stop();
    };
  }, [initialBpm, loopLengthBars]);

  const start = useCallback(() => {
    engineRef.current?.start();
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (engineRef.current?.isPlaying()) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  const setBpm = useCallback((bpm: number) => {
    engineRef.current?.setBpm(bpm);
    setState(prev => ({ ...prev, bpm: engineRef.current?.getBpm() ?? prev.bpm }));
  }, []);

  return { ...state, start, stop, toggle, setBpm };
}

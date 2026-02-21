import {
  type BPM,
  type BeatPosition,
  type BeatCallback,
  MIN_BPM,
  MAX_BPM,
  DEFAULT_BPM,
  SUBDIVISIONS_PER_BEAT,
  TICKS_PER_BAR,
} from './types.ts';

export function clampBpm(bpm: number): BPM {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function tickToBeatPosition(tick: number, loopLengthBars: number): BeatPosition {
  const totalTicks = loopLengthBars * TICKS_PER_BAR;
  const loopedTick = tick % totalTicks;
  const bar = Math.floor(loopedTick / TICKS_PER_BAR) + 1;
  const tickInBar = loopedTick % TICKS_PER_BAR;
  const beat = (Math.floor(tickInBar / SUBDIVISIONS_PER_BEAT) + 1) as 1 | 2 | 3 | 4;
  const subdivision = tickInBar % SUBDIVISIONS_PER_BEAT === 0 ? 'down' : 'and';

  return { bar, beat, subdivision, tick: loopedTick };
}

export function nextTick(current: BeatPosition, loopLengthBars: number): BeatPosition {
  return tickToBeatPosition(current.tick + 1, loopLengthBars);
}

export function getSubdivisionLabel(position: BeatPosition): string {
  if (position.subdivision === 'down') {
    return String(position.beat);
  }
  return '&';
}

export function bpmToSubdivisionMs(bpm: BPM): number {
  return 60000 / (bpm * SUBDIVISIONS_PER_BEAT);
}

export interface MetronomeEngine {
  start: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  getBpm: () => BPM;
  isPlaying: () => boolean;
  getCurrentPosition: () => BeatPosition;
  onTick: (callback: BeatCallback) => () => void;
}

export function createMetronomeEngine(
  initialBpm: number = DEFAULT_BPM,
  loopLengthBars: number = 4
): MetronomeEngine {
  let bpm = clampBpm(initialBpm);
  let playing = false;
  let currentTick = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const listeners: Set<BeatCallback> = new Set();

  function getCurrentPosition(): BeatPosition {
    return tickToBeatPosition(currentTick, loopLengthBars);
  }

  function emitTick() {
    const position = getCurrentPosition();
    for (const listener of listeners) {
      listener(position);
    }
  }

  function start() {
    if (playing) return;
    playing = true;
    currentTick = 0;
    emitTick();
    intervalId = setInterval(() => {
      currentTick++;
      emitTick();
    }, bpmToSubdivisionMs(bpm));
  }

  function stop() {
    if (!playing) return;
    playing = false;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function setBpm(newBpm: number) {
    bpm = clampBpm(newBpm);
    if (playing && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        currentTick++;
        emitTick();
      }, bpmToSubdivisionMs(bpm));
    }
  }

  function onTick(callback: BeatCallback): () => void {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  }

  return {
    start,
    stop,
    setBpm,
    getBpm: () => bpm,
    isPlaying: () => playing,
    getCurrentPosition,
    onTick,
  };
}

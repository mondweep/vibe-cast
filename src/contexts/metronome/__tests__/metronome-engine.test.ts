import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clampBpm,
  tickToBeatPosition,
  nextTick,
  getSubdivisionLabel,
  bpmToSubdivisionMs,
  createMetronomeEngine,
} from '../domain/metronome-engine.ts';
import { MIN_BPM, MAX_BPM, DEFAULT_BPM } from '../domain/types.ts';

describe('clampBpm', () => {
  it('should return the value when within range', () => {
    expect(clampBpm(120)).toBe(120);
  });

  it('should clamp to MAX_BPM when above range', () => {
    expect(clampBpm(300)).toBe(MAX_BPM);
  });

  it('should clamp to MIN_BPM when below range', () => {
    expect(clampBpm(10)).toBe(MIN_BPM);
  });

  it('should round to nearest integer', () => {
    expect(clampBpm(120.7)).toBe(121);
  });
});

describe('tickToBeatPosition', () => {
  it('should return bar 1, beat 1, downbeat for tick 0', () => {
    const pos = tickToBeatPosition(0, 4);
    expect(pos).toEqual({ bar: 1, beat: 1, subdivision: 'down', tick: 0 });
  });

  it('should return beat 1 upbeat for tick 1', () => {
    const pos = tickToBeatPosition(1, 4);
    expect(pos).toEqual({ bar: 1, beat: 1, subdivision: 'and', tick: 1 });
  });

  it('should return beat 2 downbeat for tick 2', () => {
    const pos = tickToBeatPosition(2, 4);
    expect(pos).toEqual({ bar: 1, beat: 2, subdivision: 'down', tick: 2 });
  });

  it('should return beat 3 downbeat for tick 4', () => {
    const pos = tickToBeatPosition(4, 4);
    expect(pos).toEqual({ bar: 1, beat: 3, subdivision: 'down', tick: 4 });
  });

  it('should advance to bar 2 after 8 ticks', () => {
    const pos = tickToBeatPosition(8, 4);
    expect(pos).toEqual({ bar: 2, beat: 1, subdivision: 'down', tick: 8 });
  });

  it('should loop back to bar 1 after all bars complete', () => {
    // 4 bars * 8 ticks = 32 ticks
    const pos = tickToBeatPosition(32, 4);
    expect(pos).toEqual({ bar: 1, beat: 1, subdivision: 'down', tick: 0 });
  });

  it('should walk through full bar: 1 & 2 & 3 & 4 &', () => {
    const labels = [];
    for (let tick = 0; tick < 8; tick++) {
      const pos = tickToBeatPosition(tick, 4);
      labels.push(getSubdivisionLabel(pos));
    }
    expect(labels).toEqual(['1', '&', '2', '&', '3', '&', '4', '&']);
  });
});

describe('nextTick', () => {
  it('should advance to next tick', () => {
    const current = tickToBeatPosition(0, 4);
    const next = nextTick(current, 4);
    expect(next.tick).toBe(1);
    expect(next.subdivision).toBe('and');
  });

  it('should loop back after last tick', () => {
    const current = tickToBeatPosition(31, 4);
    const next = nextTick(current, 4);
    expect(next.bar).toBe(1);
    expect(next.beat).toBe(1);
    expect(next.tick).toBe(0);
  });
});

describe('bpmToSubdivisionMs', () => {
  it('should convert 120 BPM to 250ms per subdivision', () => {
    expect(bpmToSubdivisionMs(120)).toBe(250);
  });

  it('should convert 60 BPM to 500ms per subdivision', () => {
    expect(bpmToSubdivisionMs(60)).toBe(500);
  });
});

describe('createMetronomeEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default BPM', () => {
    const engine = createMetronomeEngine();
    expect(engine.getBpm()).toBe(DEFAULT_BPM);
    expect(engine.isPlaying()).toBe(false);
  });

  it('should initialize with custom BPM', () => {
    const engine = createMetronomeEngine(120);
    expect(engine.getBpm()).toBe(120);
  });

  it('should clamp out-of-range BPM on init', () => {
    const engine = createMetronomeEngine(300);
    expect(engine.getBpm()).toBe(MAX_BPM);
  });

  it('should start playing and emit ticks', () => {
    const engine = createMetronomeEngine(120, 4);
    const ticks: ReturnType<typeof tickToBeatPosition>[] = [];
    engine.onTick(pos => ticks.push(pos));

    engine.start();
    expect(engine.isPlaying()).toBe(true);
    // Should have emitted tick 0 immediately
    expect(ticks).toHaveLength(1);
    expect(ticks[0]?.beat).toBe(1);

    // Advance one subdivision (250ms at 120 BPM)
    vi.advanceTimersByTime(250);
    expect(ticks).toHaveLength(2);
    expect(ticks[1]?.subdivision).toBe('and');
  });

  it('should stop playing', () => {
    const engine = createMetronomeEngine(120, 4);
    const ticks: ReturnType<typeof tickToBeatPosition>[] = [];
    engine.onTick(pos => ticks.push(pos));

    engine.start();
    engine.stop();
    expect(engine.isPlaying()).toBe(false);

    vi.advanceTimersByTime(1000);
    // Should only have the initial tick, no more
    expect(ticks).toHaveLength(1);
  });

  it('should update BPM while playing', () => {
    const engine = createMetronomeEngine(120, 4);
    engine.start();
    engine.setBpm(60);
    expect(engine.getBpm()).toBe(60);
  });

  it('should unsubscribe from tick events', () => {
    const engine = createMetronomeEngine(120, 4);
    const ticks: ReturnType<typeof tickToBeatPosition>[] = [];
    const unsub = engine.onTick(pos => ticks.push(pos));

    engine.start();
    expect(ticks).toHaveLength(1);

    unsub();
    vi.advanceTimersByTime(250);
    // Should not receive new ticks
    expect(ticks).toHaveLength(1);
  });

  it('should not start twice', () => {
    const engine = createMetronomeEngine(120, 4);
    const ticks: ReturnType<typeof tickToBeatPosition>[] = [];
    engine.onTick(pos => ticks.push(pos));

    engine.start();
    engine.start(); // double start
    expect(ticks).toHaveLength(1); // only one initial emit
  });

  it('should cycle through all beats in a bar', () => {
    const engine = createMetronomeEngine(120, 4);
    const labels: string[] = [];
    engine.onTick(pos => labels.push(getSubdivisionLabel(pos)));

    engine.start();
    // Advance through 7 more subdivisions (8 total = 1 bar)
    for (let i = 0; i < 7; i++) {
      vi.advanceTimersByTime(250);
    }

    expect(labels).toEqual(['1', '&', '2', '&', '3', '&', '4', '&']);
  });
});

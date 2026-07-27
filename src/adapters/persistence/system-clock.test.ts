import { afterEach, describe, expect, it, vi } from 'vitest';

import { FixedClock, SystemClock } from './system-clock';

afterEach(() => {
  vi.useRealTimers();
});

describe('SystemClock', () => {
  it('reports the current instant', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T21:49:00.000Z'));

    expect(new SystemClock().now().toISOString()).toBe('2026-07-27T21:49:00.000Z');
  });

  it('moves with the system time rather than caching a value', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T00:00:00.000Z'));
    const clock = new SystemClock();
    const first = clock.now();

    vi.advanceTimersByTime(60_000);

    expect(clock.now().getTime() - first.getTime()).toBe(60_000);
  });
});

describe('FixedClock', () => {
  it('always reports the instant it was built with', () => {
    const clock = new FixedClock(new Date('2026-07-27T21:49:00.000Z'));

    expect(clock.now().toISOString()).toBe('2026-07-27T21:49:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-07-27T21:49:00.000Z');
  });

  it('hands out a copy, so a caller cannot mutate the clock', () => {
    const clock = new FixedClock(new Date('2026-07-27T21:49:00.000Z'));

    clock.now().setFullYear(1999);

    expect(clock.now().toISOString()).toBe('2026-07-27T21:49:00.000Z');
  });
});

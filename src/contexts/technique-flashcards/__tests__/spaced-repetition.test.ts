import { describe, it, expect } from 'vitest';
import { createInitialSchedule, updateSchedule, isDue } from '../domain/spaced-repetition.ts';
import { TECHNIQUE_CARDS } from '../domain/card-data.ts';

describe('createInitialSchedule', () => {
  it('should create a schedule with 0 repetitions and 2.5 ease factor', () => {
    const schedule = createInitialSchedule('test-card');
    expect(schedule.cardId).toBe('test-card');
    expect(schedule.repetitions).toBe(0);
    expect(schedule.easeFactor).toBe(2.5);
    expect(schedule.interval).toBe(0);
  });
});

describe('updateSchedule', () => {
  it('should set interval to 1 day after first good rating', () => {
    const schedule = createInitialSchedule('test');
    const updated = updateSchedule(schedule, 'good');
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(1);
  });

  it('should set interval to 6 days after second good rating', () => {
    let schedule = createInitialSchedule('test');
    schedule = updateSchedule(schedule, 'good');
    schedule = updateSchedule(schedule, 'good');
    expect(schedule.interval).toBe(6);
    expect(schedule.repetitions).toBe(2);
  });

  it('should multiply interval by ease factor after third good rating', () => {
    let schedule = createInitialSchedule('test');
    schedule = updateSchedule(schedule, 'good');
    schedule = updateSchedule(schedule, 'good');
    schedule = updateSchedule(schedule, 'good');
    expect(schedule.interval).toBe(Math.round(6 * schedule.easeFactor));
    expect(schedule.repetitions).toBe(3);
  });

  it('should reset on "again" rating', () => {
    let schedule = createInitialSchedule('test');
    schedule = updateSchedule(schedule, 'good');
    schedule = updateSchedule(schedule, 'good');
    schedule = updateSchedule(schedule, 'again');
    expect(schedule.interval).toBe(1);
    expect(schedule.repetitions).toBe(0);
  });

  it('should increase ease factor on "easy" rating', () => {
    const schedule = createInitialSchedule('test');
    const updated = updateSchedule(schedule, 'easy');
    expect(updated.easeFactor).toBeGreaterThan(2.5);
  });

  it('should decrease ease factor on "hard" rating', () => {
    const schedule = createInitialSchedule('test');
    const updated = updateSchedule(schedule, 'hard');
    expect(updated.easeFactor).toBeLessThan(2.5);
  });

  it('should never let ease factor go below 1.3', () => {
    let schedule = createInitialSchedule('test');
    // Repeatedly rate as hard to drive ease factor down
    for (let i = 0; i < 20; i++) {
      schedule = updateSchedule(schedule, 'hard');
    }
    expect(schedule.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe('isDue', () => {
  it('should return true when next review is today', () => {
    const today = '2026-02-21';
    const schedule = { ...createInitialSchedule('test'), nextReview: '2026-02-21' };
    expect(isDue(schedule, today)).toBe(true);
  });

  it('should return true when next review is in the past', () => {
    const today = '2026-02-21';
    const schedule = { ...createInitialSchedule('test'), nextReview: '2026-02-19' };
    expect(isDue(schedule, today)).toBe(true);
  });

  it('should return false when next review is in the future', () => {
    const today = '2026-02-21';
    const schedule = { ...createInitialSchedule('test'), nextReview: '2026-02-25' };
    expect(isDue(schedule, today)).toBe(false);
  });
});

describe('TECHNIQUE_CARDS', () => {
  it('should contain a card for slide technique', () => {
    const slideCard = TECHNIQUE_CARDS.find(c => c.category === 'slide');
    expect(slideCard).toBeDefined();
    expect(slideCard?.id).toBe('slide-a-string');
  });

  it('should contain a card for finger substitution', () => {
    const card = TECHNIQUE_CARDS.find(c => c.category === 'finger_substitution');
    expect(card).toBeDefined();
  });

  it('should contain a card for fingerstyle arpeggio', () => {
    const card = TECHNIQUE_CARDS.find(c => c.category === 'arpeggio');
    expect(card).toBeDefined();
  });

  it('should have at least 6 cards', () => {
    expect(TECHNIQUE_CARDS.length).toBeGreaterThanOrEqual(6);
  });
});

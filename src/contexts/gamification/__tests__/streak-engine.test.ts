import { describe, it, expect } from 'vitest';
import { createInitialStreak, recordPractice, getDailySummary } from '../domain/streak-engine.ts';
import type { PracticeSession } from '../domain/types.ts';

describe('createInitialStreak', () => {
  it('should create a streak with 0 current and longest', () => {
    const streak = createInitialStreak();
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(0);
    expect(streak.lastPracticeDate).toBe('');
  });
});

describe('recordPractice', () => {
  it('should start a new streak when no previous practice', () => {
    const streak = createInitialStreak();
    const updated = recordPractice(streak, '2026-02-21');
    expect(updated.currentStreak).toBe(1);
    expect(updated.lastPracticeDate).toBe('2026-02-21');
  });

  it('should continue streak when practiced yesterday', () => {
    const streak = { currentStreak: 5, longestStreak: 5, lastPracticeDate: '2026-02-20' };
    const updated = recordPractice(streak, '2026-02-21');
    expect(updated.currentStreak).toBe(6);
  });

  it('should break streak when gap is more than 1 day', () => {
    const streak = { currentStreak: 5, longestStreak: 5, lastPracticeDate: '2026-02-19' };
    const updated = recordPractice(streak, '2026-02-21');
    expect(updated.currentStreak).toBe(1);
  });

  it('should not change streak when practiced same day', () => {
    const streak = { currentStreak: 3, longestStreak: 5, lastPracticeDate: '2026-02-21' };
    const updated = recordPractice(streak, '2026-02-21');
    expect(updated.currentStreak).toBe(3);
  });

  it('should update longest streak when current exceeds it', () => {
    const streak = { currentStreak: 10, longestStreak: 10, lastPracticeDate: '2026-02-20' };
    const updated = recordPractice(streak, '2026-02-21');
    expect(updated.currentStreak).toBe(11);
    expect(updated.longestStreak).toBe(11);
  });

  it('should preserve longest streak when current is lower', () => {
    const streak = { currentStreak: 3, longestStreak: 10, lastPracticeDate: '2026-02-19' };
    const updated = recordPractice(streak, '2026-02-21');
    expect(updated.currentStreak).toBe(1);
    expect(updated.longestStreak).toBe(10);
  });
});

describe('getDailySummary', () => {
  it('should aggregate drill counts from multiple sessions', () => {
    const sessions: PracticeSession[] = [
      { date: '2026-02-21', durationMinutes: 10, drillsCompleted: { fretboard: 2, rhythm: 1, flashcards: 0 } },
      { date: '2026-02-21', durationMinutes: 15, drillsCompleted: { fretboard: 1, rhythm: 2, flashcards: 3 } },
    ];
    const summary = getDailySummary(sessions);
    expect(summary.fretboard).toBe(3);
    expect(summary.rhythm).toBe(3);
    expect(summary.flashcards).toBe(3);
    expect(summary.totalMinutes).toBe(25);
  });

  it('should return zeros for empty sessions', () => {
    const summary = getDailySummary([]);
    expect(summary.fretboard).toBe(0);
    expect(summary.rhythm).toBe(0);
    expect(summary.flashcards).toBe(0);
    expect(summary.totalMinutes).toBe(0);
  });
});

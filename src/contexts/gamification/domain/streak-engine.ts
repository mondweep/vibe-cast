import type { StreakData, PracticeSession } from './types.ts';

export function createInitialStreak(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastPracticeDate: '' };
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function recordPractice(streak: StreakData, today: string): StreakData {
  if (streak.lastPracticeDate === today) {
    return streak;
  }

  const gap = streak.lastPracticeDate ? daysBetween(streak.lastPracticeDate, today) : 0;

  let newStreak: number;
  if (gap <= 1 && streak.lastPracticeDate !== '') {
    newStreak = streak.currentStreak + 1;
  } else {
    newStreak = 1;
  }

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(streak.longestStreak, newStreak),
    lastPracticeDate: today,
  };
}

export function getDailySummary(sessions: readonly PracticeSession[]): {
  fretboard: number;
  rhythm: number;
  flashcards: number;
  totalMinutes: number;
} {
  let fretboard = 0;
  let rhythm = 0;
  let flashcards = 0;
  let totalMinutes = 0;

  for (const session of sessions) {
    fretboard += session.drillsCompleted.fretboard;
    rhythm += session.drillsCompleted.rhythm;
    flashcards += session.drillsCompleted.flashcards;
    totalMinutes += session.durationMinutes;
  }

  return { fretboard, rhythm, flashcards, totalMinutes };
}

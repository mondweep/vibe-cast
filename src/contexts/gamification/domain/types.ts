export interface PracticeSession {
  date: string;
  durationMinutes: number;
  drillsCompleted: {
    fretboard: number;
    rhythm: number;
    flashcards: number;
  };
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
}

export interface DailyLog {
  date: string;
  sessions: readonly PracticeSession[];
  totalMinutes: number;
}

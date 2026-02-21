import { useCallback } from 'react';
import type { StreakData, PracticeSession } from '../domain/types.ts';
import { createInitialStreak, recordPractice, getDailySummary } from '../domain/streak-engine.ts';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage.ts';

export function useGamification() {
  const [streak, setStreak] = useLocalStorage<StreakData>('streak-data', createInitialStreak());
  const [sessions, setSessions] = useLocalStorage<PracticeSession[]>('practice-sessions', []);

  const recordDrill = useCallback((type: 'fretboard' | 'rhythm' | 'flashcards') => {
    const today = new Date().toISOString().split('T')[0]!;

    setStreak(prev => recordPractice(prev, today));

    setSessions(prev => {
      const todaySession = prev.find(s => s.date === today);
      if (todaySession) {
        return prev.map(s =>
          s.date === today
            ? {
                ...s,
                durationMinutes: s.durationMinutes + 1,
                drillsCompleted: {
                  ...s.drillsCompleted,
                  [type]: s.drillsCompleted[type] + 1,
                },
              }
            : s
        );
      }
      return [
        ...prev,
        {
          date: today,
          durationMinutes: 1,
          drillsCompleted: { fretboard: 0, rhythm: 0, flashcards: 0, [type]: 1 },
        },
      ];
    });
  }, [setStreak, setSessions]);

  const today = new Date().toISOString().split('T')[0]!;
  const todaySessions = sessions.filter(s => s.date === today);
  const dailySummary = getDailySummary(todaySessions);

  return { streak, dailySummary, recordDrill };
}

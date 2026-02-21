import { useState, useCallback, useMemo } from 'react';
import type { Flashcard, ReviewSchedule, Confidence } from '../domain/types.ts';
import { createInitialSchedule, updateSchedule, isDue } from '../domain/spaced-repetition.ts';
import { TECHNIQUE_CARDS } from '../domain/card-data.ts';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage.ts';

export function useFlashcards() {
  const [schedules, setSchedules] = useLocalStorage<Record<string, ReviewSchedule>>(
    'flashcard-schedules',
    Object.fromEntries(TECHNIQUE_CARDS.map(c => [c.id, createInitialSchedule(c.id)]))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const dueCards = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]!;
    return TECHNIQUE_CARDS.filter(card => {
      const schedule = schedules[card.id];
      return schedule ? isDue(schedule, today) : true;
    });
  }, [schedules]);

  const currentCard: Flashcard | null = dueCards[currentIndex] ?? null;

  const flip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const rate = useCallback((confidence: Confidence) => {
    if (!currentCard) return;
    const schedule = schedules[currentCard.id];
    if (!schedule) return;

    const updated = updateSchedule(schedule, confidence);
    setSchedules(prev => ({ ...prev, [currentCard.id]: updated }));
    setIsFlipped(false);
    setCurrentIndex(prev => (prev + 1) % Math.max(1, dueCards.length));
  }, [currentCard, schedules, setSchedules, dueCards.length]);

  return {
    currentCard,
    isFlipped,
    dueCount: dueCards.length,
    totalCount: TECHNIQUE_CARDS.length,
    flip,
    rate,
  };
}

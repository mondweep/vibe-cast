import type { Confidence, ReviewSchedule } from './types.ts';

const MIN_EASE_FACTOR = 1.3;

function confidenceToQuality(confidence: Confidence): number {
  switch (confidence) {
    case 'again': return 0;
    case 'hard': return 3;
    case 'good': return 4;
    case 'easy': return 5;
  }
}

export function createInitialSchedule(cardId: string): ReviewSchedule {
  return {
    cardId,
    nextReview: new Date().toISOString().split('T')[0]!,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
  };
}

export function updateSchedule(
  schedule: ReviewSchedule,
  confidence: Confidence
): ReviewSchedule {
  const quality = confidenceToQuality(confidence);

  if (quality < 3) {
    // Failed — reset
    return {
      ...schedule,
      interval: 1,
      repetitions: 0,
      nextReview: addDays(new Date(), 1),
    };
  }

  let newInterval: number;
  const newRepetitions = schedule.repetitions + 1;

  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(schedule.interval * schedule.easeFactor);
  }

  const newEaseFactor = Math.max(
    MIN_EASE_FACTOR,
    schedule.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return {
    ...schedule,
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    nextReview: addDays(new Date(), newInterval),
  };
}

export function isDue(schedule: ReviewSchedule, today?: string): boolean {
  const todayStr = today ?? new Date().toISOString().split('T')[0]!;
  return schedule.nextReview <= todayStr;
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0]!;
}

/**
 * A deterministic Scheduler for domain tests: fixed intervals, no FSRS.
 * Lets progression logic be tested without depending on a real algorithm's
 * tuning, which would make the tests fragile and the failures unreadable.
 */

import type { Rating } from '../domain/grading'
import type { Scheduler } from '../ports/scheduler'

const DAYS: Record<Rating, number> = { again: 0, hard: 1, good: 3, easy: 7 }

export const createStubScheduler = (): Scheduler => ({
  newCard: (at) => ({
    due: at.toISOString(),
    stability: 0,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 0,
  }),

  review: (card, rating, at) => {
    const days = DAYS[rating]
    return {
      ...card,
      due: new Date(at.getTime() + days * 86_400_000).toISOString(),
      stability: rating === 'again' ? 0 : days,
      scheduledDays: days,
      reps: card.reps + 1,
      lapses: rating === 'again' ? card.lapses + 1 : card.lapses,
      state: rating === 'again' ? 1 : 2,
      lastReview: at.toISOString(),
    }
  },

  retrievability: (card, at) => {
    if (card.stability <= 0) return 0
    const elapsed = (at.getTime() - new Date(card.lastReview ?? card.due).getTime()) / 86_400_000
    return Math.max(0, Math.min(1, 1 - elapsed / (card.stability * 2)))
  },
})

/** ts-fsrs behind the Scheduler port (ADR 0005). The only file that imports it. */

import { FSRS, Rating as FsrsRating, State, createEmptyCard, type Card, type Grade } from 'ts-fsrs'
import type { Rating } from '../domain/grading'
import type { ReviewCard, Scheduler } from '../ports/scheduler'

// FSRS distinguishes Grade (what a learner can score) from Rating (which also
// includes Manual). Only grades are reachable from an assessment.
const RATINGS: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
}

const toPort = (card: Card): ReviewCard => ({
  due: card.due.toISOString(),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsedDays: card.elapsed_days,
  scheduledDays: card.scheduled_days,
  reps: card.reps,
  lapses: card.lapses,
  state: card.state,
  lastReview: card.last_review ? card.last_review.toISOString() : undefined,
})

const fromPort = (card: ReviewCard): Card =>
  ({
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  }) as Card

export const createFsrsScheduler = (): Scheduler => {
  const fsrs = new FSRS({})

  return {
    newCard: (at) => toPort(createEmptyCard(at)),

    review: (card, rating, at) => toPort(fsrs.next(fromPort(card), at, RATINGS[rating]).card),

    retrievability: (card, at) => {
      // A card never studied has nothing to recall.
      if (card.state === State.New || card.stability <= 0) return 0
      const elapsedDays = Math.max(
        0,
        (at.getTime() - new Date(card.lastReview ?? card.due).getTime()) / 86_400_000,
      )
      // FSRS forgetting curve.
      return Math.pow(1 + (19 / 81) * (elapsedDays / card.stability), -0.5)
    },
  }
}

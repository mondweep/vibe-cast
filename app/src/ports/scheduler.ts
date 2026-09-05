/**
 * Spaced repetition, as a port (ADR 0005, ADR 0008).
 *
 * The domain never imports ts-fsrs. We mock only what we own, so tests assert
 * against this interface and never against a third-party call shape.
 */

import type { Rating } from '../domain/grading'

export type ReviewCard = {
  readonly due: string
  readonly stability: number
  readonly difficulty: number
  readonly elapsedDays: number
  readonly scheduledDays: number
  readonly reps: number
  readonly lapses: number
  readonly state: number
  readonly lastReview?: string
}

export interface Scheduler {
  newCard(at: Date): ReviewCard
  review(card: ReviewCard, rating: Rating, at: Date): ReviewCard
  /** Probability the learner still recalls this, 0..1. Drives displayed mastery. */
  retrievability(card: ReviewCard, at: Date): number
}

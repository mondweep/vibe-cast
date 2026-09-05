/**
 * Assessment outcome -> review rating (ADR 0005).
 *
 * This is the single point where the whole progression model can silently go
 * wrong: everything the learner does reaches the scheduler through here. It is
 * therefore a pure function with disproportionate test coverage.
 *
 * Ratings are derived from *performance*, never from a self-reported "how well
 * did you know that?" — recognition is not retrieval (PRD §5.3).
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export type Attempt = {
  readonly correct: boolean
  /** Attempts taken, including the successful one. */
  readonly attempts: number
  readonly hintsUsed: number
}

export const rate = (attempt: Attempt): Rating => {
  if (!attempt.correct) return 'again'
  if (attempt.attempts <= 1 && attempt.hintsUsed === 0) return 'easy'
  if (attempt.attempts <= 2 && attempt.hintsUsed <= 1) return 'good'
  return 'hard'
}

/** A lesson's rating is its weakest item: mastery means all of it, not most of it. */
export const rateLesson = (attempts: readonly Attempt[]): Rating => {
  if (attempts.length === 0) return 'again'
  const order: readonly Rating[] = ['again', 'hard', 'good', 'easy']
  return attempts
    .map(rate)
    .reduce((worst, r) => (order.indexOf(r) < order.indexOf(worst) ? r : worst), 'easy' as Rating)
}

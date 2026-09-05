/**
 * The service the UI talks to. Composes the three ports and holds the rules
 * that turn a finished lesson into scheduled, decaying mastery (ADR 0005/0008).
 */

import type { Clock } from '../ports/clock'
import type { Progress, ProgressStore } from '../ports/progress-store'
import type { Scheduler } from '../ports/scheduler'
import { rateLesson, type Attempt } from './grading'
import { MASTERY_THRESHOLD, frontier, type MasteryState } from './graph'
import type { Lesson } from './lesson'

export type StudyService = ReturnType<typeof createStudyService>

const HISTORY_LIMIT = 500

export const createStudyService = (deps: {
  store: ProgressStore
  scheduler: Scheduler
  clock: Clock
}) => {
  const { store, scheduler, clock } = deps

  /**
   * Displayed mastery is *retrievability*, not a high-water mark: it falls as
   * the review date approaches, which is the honest thing to show (PRD §5.4).
   */
  const masteryState = (progress: Progress): MasteryState => {
    const now = clock.now()
    return new Map(
      Object.entries(progress.cards).map(([id, card]) => [id, scheduler.retrievability(card, now)]),
    )
  }

  const completeLesson = async (
    userId: string,
    lessonId: string,
    attempts: readonly Attempt[],
  ): Promise<Progress> => {
    const now = clock.now()
    const progress = await store.load(userId)
    const rating = rateLesson(attempts)
    const existing = progress.cards[lessonId] ?? scheduler.newCard(now)

    const updated: Progress = {
      cards: { ...progress.cards, [lessonId]: scheduler.review(existing, rating, now) },
      history: [...progress.history, { lessonId, at: now.toISOString(), rating }].slice(
        -HISTORY_LIMIT,
      ),
    }

    await store.save(userId, updated)
    return updated
  }

  /** Concepts whose review date has arrived — study these before anything new. */
  const dueForReview = (progress: Progress): readonly string[] => {
    const now = clock.now()
    return Object.entries(progress.cards)
      .filter(([, card]) => new Date(card.due).getTime() <= now.getTime() && card.reps > 0)
      .sort((a, b) => new Date(a[1].due).getTime() - new Date(b[1].due).getTime())
      .map(([id]) => id)
  }

  /**
   * What to do next: overdue reviews first, then the ready frontier
   * (PRD §5, ADR 0005).
   */
  const nextUp = (lessons: readonly Lesson[], progress: Progress): Lesson | null => {
    const byId = new Map(lessons.map((l) => [l.id, l]))
    for (const id of dueForReview(progress)) {
      const lesson = byId.get(id)
      if (lesson) return lesson
    }
    return frontier(lessons, masteryState(progress))[0] ?? null
  }

  const isMastered = (progress: Progress, lessonId: string): boolean =>
    (masteryState(progress).get(lessonId) ?? 0) >= MASTERY_THRESHOLD

  return { masteryState, completeLesson, dueForReview, nextUp, isMastered }
}

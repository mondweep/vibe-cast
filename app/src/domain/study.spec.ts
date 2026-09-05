import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStudyService, type StudyService } from './study'
import { createMemoryProgressStore } from '../adapters/memory-progress-store'
import { createStubScheduler } from '../adapters/stub-scheduler'
import { fixedClock } from '../ports/clock'
import { EMPTY_PROGRESS, type ProgressStore } from '../ports/progress-store'
import type { Lesson } from './lesson'
import type { Attempt } from './grading'

const lesson = (id: string, prerequisites: string[] = []): Lesson =>
  ({ id, pcm: 'I.3', title: id, summary: '', prerequisites, sections: [], assessment: [] }) as Lesson

const SET = lesson('set')
const VECTOR_SPACE = lesson('vector-space', ['set'])
const LESSONS = [SET, VECTOR_SPACE]

const perfect: Attempt[] = [{ correct: true, attempts: 1, hintsUsed: 0 }]
const failed: Attempt[] = [{ correct: false, attempts: 3, hintsUsed: 2 }]

describe('StudyService', () => {
  let clock: ReturnType<typeof fixedClock>
  let store: ProgressStore
  let service: StudyService

  beforeEach(() => {
    clock = fixedClock(new Date('2026-09-05T09:00:00Z'))
    store = createMemoryProgressStore()
    service = createStudyService({ store, scheduler: createStubScheduler(), clock })
  })

  it('starts a new learner at the first lesson with no prerequisites', async () => {
    expect(service.nextUp(LESSONS, EMPTY_PROGRESS)?.id).toBe('set')
  })

  it('unlocks the next lesson once the previous one is mastered', async () => {
    const progress = await service.completeLesson('u1', 'set', perfect)
    expect(service.isMastered(progress, 'set')).toBe(true)
    expect(service.nextUp(LESSONS, progress)?.id).toBe('vector-space')
  })

  it('does not unlock the next lesson after a failed attempt', async () => {
    const progress = await service.completeLesson('u1', 'set', failed)
    expect(service.isMastered(progress, 'set')).toBe(false)
    expect(service.nextUp(LESSONS, progress)?.id).toBe('set')
  })

  it('lets mastery decay, and surfaces the concept for review when it is due', async () => {
    const progress = await service.completeLesson('u1', 'set', perfect)
    expect(service.dueForReview(progress)).toEqual([])

    clock.advanceDays(10) // stub schedules 'easy' 7 days out

    expect(service.dueForReview(progress)).toEqual(['set'])
    expect(service.masteryState(progress).get('set')!).toBeLessThan(1)
  })

  it('puts an overdue review ahead of new material', async () => {
    let progress = await service.completeLesson('u1', 'set', perfect)
    clock.advanceDays(10)
    progress = await service.completeLesson('u1', 'vector-space', perfect)
    clock.advanceDays(10)

    expect(service.nextUp(LESSONS, progress)?.id).toBe('set')
  })

  it('persists through the store rather than holding state in memory', async () => {
    await service.completeLesson('u1', 'set', perfect)
    const reloaded = await store.load('u1')
    expect(Object.keys(reloaded.cards)).toEqual(['set'])
    expect(reloaded.history).toHaveLength(1)
  })

  it('grades from performance, never asking the scheduler for a self-report', async () => {
    // London-school check: the scheduler is told a rating derived from attempts,
    // and is never consulted about how well the learner felt they did.
    const scheduler = createStubScheduler()
    const review = vi.spyOn(scheduler, 'review')
    const spied = createStudyService({ store, scheduler, clock })

    await spied.completeLesson('u1', 'set', [{ correct: true, attempts: 2, hintsUsed: 0 }])

    expect(review).toHaveBeenCalledWith(expect.anything(), 'good', clock.now())
  })
})

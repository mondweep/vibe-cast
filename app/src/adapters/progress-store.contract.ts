/**
 * One suite, run against every ProgressStore adapter (ADR 0008).
 *
 * This is what keeps mockist testing honest: without it, the in-memory fake
 * quietly stops resembling Firestore and a green suite stops meaning anything.
 */

import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type ProgressStore } from '../ports/progress-store'

export const progressStoreContract = (name: string, create: () => ProgressStore): void => {
  describe(`ProgressStore contract: ${name}`, () => {
    it('returns empty progress for a user it has never seen', async () => {
      await expect(create().load('nobody')).resolves.toEqual(EMPTY_PROGRESS)
    })

    it('round-trips what was saved', async () => {
      const store = create()
      const progress = {
        cards: {
          'vector-space': {
            due: '2026-09-12T00:00:00.000Z',
            stability: 3,
            difficulty: 5,
            elapsedDays: 0,
            scheduledDays: 3,
            reps: 1,
            lapses: 0,
            state: 2,
          },
        },
        history: [{ lessonId: 'vector-space', at: '2026-09-05T00:00:00.000Z', rating: 'good' }],
      }
      await store.save('user-1', progress)
      await expect(store.load('user-1')).resolves.toEqual(progress)
    })

    it('keeps users separate', async () => {
      const store = create()
      await store.save('user-1', { cards: {}, history: [{ lessonId: 'a', at: 'x', rating: 'good' }] })
      await expect(store.load('user-2')).resolves.toEqual(EMPTY_PROGRESS)
    })

    it('overwrites rather than merging on save', async () => {
      const store = create()
      await store.save('user-1', { cards: {}, history: [{ lessonId: 'a', at: 'x', rating: 'good' }] })
      await store.save('user-1', EMPTY_PROGRESS)
      await expect(store.load('user-1')).resolves.toEqual(EMPTY_PROGRESS)
    })

    it('does not let a caller mutate stored state through the object it passed in', async () => {
      const store = create()
      const history: { lessonId: string; at: string; rating: string }[] = []
      await store.save('user-1', { cards: {}, history })
      history.push({ lessonId: 'sneaky', at: 'x', rating: 'easy' })
      const loaded = await store.load('user-1')
      expect(loaded.history).toEqual([])
    })
  })
}

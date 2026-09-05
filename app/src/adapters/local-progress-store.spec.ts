import { beforeEach, describe, expect, it, vi } from 'vitest'
import { progressStoreContract } from './progress-store.contract'
import { createLocalProgressStore } from './local-progress-store'
import { EMPTY_PROGRESS } from '../ports/progress-store'

beforeEach(() => localStorage.clear())

// The same contract the in-memory fake satisfies, so the two cannot drift.
progressStoreContract('localStorage', () => {
  localStorage.clear()
  return createLocalProgressStore()
})

describe('localStorage progress store', () => {
  it('reports empty progress rather than throwing when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    await expect(createLocalProgressStore().load('u1')).resolves.toEqual(EMPTY_PROGRESS)
    vi.restoreAllMocks()
  })

  it('swallows a failed write, because progress is a convenience and not the product', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    await expect(createLocalProgressStore().save('u1', EMPTY_PROGRESS)).resolves.toBeUndefined()
    vi.restoreAllMocks()
  })
})

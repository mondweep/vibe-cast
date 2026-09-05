/**
 * Browser-local ProgressStore. Ships v1 without forcing sign-in; the Firestore
 * adapter replaces it behind the same port once auth lands (issue #31).
 *
 * Every access is wrapped: private windows, cleared site data and storage-blocking
 * browser settings all make these throw rather than return empty.
 */

import { EMPTY_PROGRESS, type Progress, type ProgressStore } from '../ports/progress-store'

const key = (userId: string): string => `vmd:progress:${userId}`

export const createLocalProgressStore = (): ProgressStore => ({
  load: async (userId) => {
    try {
      const raw = localStorage.getItem(key(userId))
      return raw ? (JSON.parse(raw) as Progress) : EMPTY_PROGRESS
    } catch {
      return EMPTY_PROGRESS
    }
  },

  save: async (userId, progress) => {
    try {
      localStorage.setItem(key(userId), JSON.stringify(progress))
    } catch {
      // Progress is a convenience, not the product. Losing it must never break a lesson.
    }
  },
})

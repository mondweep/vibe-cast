/** In-memory ProgressStore. Stands in for Firestore in domain tests (ADR 0008). */

import { EMPTY_PROGRESS, type Progress, type ProgressStore } from '../ports/progress-store'

export const createMemoryProgressStore = (): ProgressStore => {
  const byUser = new Map<string, Progress>()

  return {
    load: async (userId) => byUser.get(userId) ?? EMPTY_PROGRESS,
    // Clone on write so a caller holding the object cannot mutate stored state —
    // Firestore serialises, and the fake must not be more permissive than the
    // real adapter or the contract test is worthless.
    save: async (userId, progress) => {
      byUser.set(userId, structuredClone(progress))
    },
  }
}

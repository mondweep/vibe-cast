/** Per-user progress, as a port, so the domain never imports Firestore (ADR 0006/0008). */

import type { ReviewCard } from './scheduler'

export type Progress = {
  readonly cards: Readonly<Record<string, ReviewCard>>
  /** Assessment attempts, most recent last, capped by the adapter. */
  readonly history: readonly {
    readonly lessonId: string
    readonly at: string
    readonly rating: string
  }[]
}

export const EMPTY_PROGRESS: Progress = { cards: {}, history: [] }

export interface ProgressStore {
  load(userId: string): Promise<Progress>
  save(userId: string, progress: Progress): Promise<void>
}

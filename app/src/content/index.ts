import type { Lesson } from '../domain/lesson'
import { linearMap } from './lessons/linear-map'
import { vectorSpace } from './lessons/vector-space'

/** Every lesson in the app. The prerequisite graph is derived from these. */
export const lessons: readonly Lesson[] = [vectorSpace, linearMap]

export const lessonById = (id: string): Lesson | undefined => lessons.find((l) => l.id === id)

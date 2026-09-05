import type { Lesson } from '../domain/lesson'
import { distributionShift } from './lessons/distribution-shift'
import { highDimensionalGeometry } from './lessons/high-dimensional-geometry'
import { linearMap } from './lessons/linear-map'
import { metricSpace } from './lessons/metric-space'
import { probabilityDistribution } from './lessons/probability-distribution'
import { vectorSpace } from './lessons/vector-space'

/** Every lesson in the app. The prerequisite graph is derived from these. */
export const lessons: readonly Lesson[] = [
  vectorSpace,
  linearMap,
  probabilityDistribution,
  metricSpace,
  highDimensionalGeometry,
  distributionShift,
]

export const lessonById = (id: string): Lesson | undefined => lessons.find((l) => l.id === id)

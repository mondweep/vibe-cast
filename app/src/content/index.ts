import type { Lesson } from '../domain/lesson'
import { bayesianAnalysis } from './lessons/bayesian-analysis'
import { dimension } from './lessons/dimension'
import { distributionShift } from './lessons/distribution-shift'
import { graphs } from './lessons/graphs'
import { highDimensionalGeometry } from './lessons/high-dimensional-geometry'
import { hilbertSpace } from './lessons/hilbert-space'
import { information } from './lessons/information'
import { linearMap } from './lessons/linear-map'
import { metricSpace } from './lessons/metric-space'
import { optimization } from './lessons/optimization'
import { probabilityDistribution } from './lessons/probability-distribution'
import { vectorSpace } from './lessons/vector-space'

/** Every lesson in the app. The prerequisite graph is derived from these. */
export const lessons: readonly Lesson[] = [
  vectorSpace,
  linearMap,
  dimension,
  hilbertSpace,
  metricSpace,
  highDimensionalGeometry,
  probabilityDistribution,
  bayesianAnalysis,
  information,
  optimization,
  graphs,
  distributionShift,
]

export const lessonById = (id: string): Lesson | undefined => lessons.find((l) => l.id === id)

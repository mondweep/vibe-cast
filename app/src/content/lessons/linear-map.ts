import {
  IDENTITY,
  apply,
  determinant,
  ease,
  eigenvector,
  lerpMat2,
  realEigenvalues,
  vec,
  type Mat2,
} from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

const SHEAR: Mat2 = [
  [1, 1],
  [0, 1],
]
const STRETCH: Mat2 = [
  [2, 0],
  [0, 0.5],
]
const COLLAPSE: Mat2 = [
  [1, 2],
  [0.5, 1],
]
const ROTATE: Mat2 = [
  [0, -1],
  [1, 0],
]

const I = vec(1, 0)
const J = vec(0, 1)

const transformed = (m: Mat2, extraMarks: Mark[] = []): Mark[] => [
  { kind: 'grid', id: 'grid', extent: EXTENT, transform: m },
  { kind: 'vector', id: 'i', from: vec(0, 0), to: apply(m, I), label: 'image of i', emphasis: 'focus' },
  { kind: 'vector', id: 'j', from: vec(0, 0), to: apply(m, J), label: 'image of j', emphasis: 'focus' },
  ...extraMarks,
]

/** The grid bending from identity to a shear. */
const shearScene = (t: number): SceneState => {
  const m = lerpMat2(IDENTITY, SHEAR, ease(t))
  return {
    extent: EXTENT,
    marks: transformed(m),
    caption:
      t < 0.1
        ? 'The plane before anything happens.'
        : 'The grid bends, but the lines stay straight, parallel and evenly spaced.',
  }
}

/** An arbitrary vector following its basis decomposition. */
const basisScene = (t: number): SceneState => {
  const m = lerpMat2(IDENTITY, STRETCH, ease(t))
  const p = vec(2, 1.5)
  return {
    extent: EXTENT,
    marks: transformed(m, [
      { kind: 'point', id: 'p', at: apply(m, p), label: 'p = 2i + 1.5j', emphasis: 'focus' },
      { kind: 'vector', id: 'pv', from: vec(0, 0), to: apply(m, p), emphasis: 'muted' },
    ]),
    caption: 'p stays at 2 of the first arrow plus 1.5 of the second, whatever those arrows become.',
  }
}

/** The unit square becoming a parallelogram; the determinant is its area. */
const areaScene = (t: number): SceneState => {
  const m = lerpMat2(IDENTITY, STRETCH, ease(t))
  const det = determinant(m)
  return {
    extent: EXTENT,
    marks: transformed(m, [
      {
        kind: 'polygon',
        id: 'unit',
        points: [vec(0, 0), apply(m, I), apply(m, vec(1, 1)), apply(m, J)],
        label: `area ${det.toFixed(2)}`,
        emphasis: 'focus',
      },
    ]),
    caption: `The unit square becomes a parallelogram of area ${det.toFixed(2)} — that number is the determinant.`,
  }
}

/** A map whose determinant reaches zero: the plane collapses onto a line. */
const collapseScene = (t: number): SceneState => {
  const m = lerpMat2(IDENTITY, COLLAPSE, ease(t))
  const det = determinant(m)
  return {
    extent: EXTENT,
    marks: transformed(m, [
      {
        kind: 'polygon',
        id: 'unit',
        points: [vec(0, 0), apply(m, I), apply(m, vec(1, 1)), apply(m, J)],
        label: `area ${det.toFixed(2)}`,
        emphasis: det < 0.1 ? 'focus' : 'muted',
      },
    ]),
    caption:
      det < 0.05
        ? 'Determinant zero: the whole plane has been squashed onto a single line, and nothing can be undone.'
        : `Area shrinking — determinant ${det.toFixed(2)}.`,
  }
}

/** Directions the map merely stretches — and a rotation, which has none. */
const eigenScene = (t: number): SceneState => {
  const showRotation = t > 0.55
  const m = showRotation ? lerpMat2(IDENTITY, ROTATE, ease((t - 0.55) / 0.45)) : STRETCH
  const eigenvalues = realEigenvalues(m)
  const lines: Mark[] = eigenvalues
    .map<Mark | null>((lambda, index) => {
      const direction = eigenvector(m, lambda)
      return direction
        ? ({
            kind: 'line',
            id: `eig-${index}`,
            through: vec(0, 0),
            direction,
            label: `stretched by ${lambda.toFixed(2)}`,
            emphasis: 'focus',
          } satisfies Mark)
        : null
    })
    .filter((mark): mark is Mark => mark !== null)

  return {
    extent: EXTENT,
    marks: transformed(m, lines),
    caption: showRotation
      ? eigenvalues.length === 0
        ? 'A rotation fixes no direction at all — every line is moved off itself.'
        : 'Turning towards a rotation.'
      : 'These lines are only stretched, never turned. Their stretch factors are the eigenvalues.',
  }
}

export const linearMap: Lesson = {
  id: 'linear-map',
  pcm: 'I.3',
  title: 'Linear Map',
  summary: 'Transformations that keep the grid a grid — and why knowing two arrows tells you everything.',
  prerequisites: ['vector-space'],

  sections: [
    {
      id: 'grid',
      heading: 'Move the plane, keep the grid',
      prose: [
        'A linear map moves every point of the plane at once. Not any motion qualifies: the grid lines must stay straight, stay parallel, and stay evenly spaced, and the origin must not move.',
        'Watch the grid shear. It has visibly changed, and yet it is still recognisably a grid — no line has bent, no two parallel lines have converged. That constraint is severe, and it is the entire definition.',
        'Everything else in this lesson is a consequence of it.',
      ],
      scene: shearScene,
      inset: 'vector-space',
    },
    {
      id: 'basis',
      heading: 'Two arrows decide everything',
      prose: [
        'Here is the consequence that does the work. The point p sits at two steps along the first arrow plus one and a half along the second. Because the grid stays a grid, it must still sit at two-and-one-and-a-half of them *after* the map.',
        'So if you know where the two basis arrows go, you know where every point goes. Not approximately — exactly, and for all of the infinitely many points at once.',
        'That is why a linear map in the plane can be written as four numbers. The four numbers are just the coordinates of the two image arrows, and the matrix is nothing more mysterious than those two arrows written side by side.',
      ],
      scene: basisScene,
    },
    {
      id: 'determinant',
      heading: 'One number for how much it stretches',
      prose: [
        'The unit square, spanned by the two basis arrows, becomes a parallelogram. Its area is the determinant.',
        'Because the grid stays evenly spaced, every region in the plane is scaled by that same factor — measure it once on the unit square and you know it everywhere.',
        'A negative determinant means the plane has been flipped over. The magnitude tells you the stretch; the sign tells you the orientation.',
      ],
      scene: areaScene,
    },
    {
      id: 'collapse',
      heading: 'When the determinant is zero',
      prose: [
        'Now watch the area shrink to nothing. At determinant zero the plane has been flattened onto a line: a two-dimensional thing has become one-dimensional.',
        'Infinitely many points now land on the same place, so there is no way back. This is exactly what it means for the map to have no inverse, and for the matrix to be singular.',
        'The determinant being zero is not a technical condition to memorise. It is the moment in this animation when something visibly irreversible happens.',
      ],
      scene: collapseScene,
    },
    {
      id: 'eigen',
      heading: 'Directions that survive',
      prose: [
        'Most lines through the origin get tilted by a linear map. A few special ones do not: they are stretched, perhaps reversed, but they end up lying along themselves. Those directions are the eigenvectors, and their stretch factors are the eigenvalues.',
        'They matter because along those directions a complicated transformation becomes ordinary multiplication by a number. Repeating the map a thousand times is hopeless in general and trivial along an eigenvector.',
        'Then watch the rotation. It has no real eigenvalues at all — every single line is knocked off itself. Eigenvectors are a privilege, not a guarantee, and that is why so much of linear algebra is about when they exist.',
      ],
      scene: eigenScene,
    },
  ],

  assessment: [
    {
      kind: 'predict',
      id: 'predict-shear',
      prompt: 'The shear sends i to (1, 0) and j to (1, 1). Drag the point to where (1, 1) ends up.',
      initial: vec(3, 3),
      truth: apply(SHEAR, vec(1, 1)),
      tolerance: 0.5,
      scene: (guess, reveal) => ({
        extent: EXTENT,
        marks: [
          { kind: 'grid', id: 'grid', extent: EXTENT, transform: reveal > 0 ? SHEAR : IDENTITY },
          { kind: 'vector', id: 'i', from: vec(0, 0), to: apply(SHEAR, I), label: 'image of i', emphasis: 'muted' },
          { kind: 'vector', id: 'j', from: vec(0, 0), to: apply(SHEAR, J), label: 'image of j', emphasis: 'muted' },
          { kind: 'point', id: 'guess', at: guess, label: 'your answer', emphasis: 'focus' },
          ...(reveal > 0.4
            ? [{ kind: 'point' as const, id: 'truth', at: apply(SHEAR, vec(1, 1)), label: '(1,1) lands here', emphasis: 'focus' as const }]
            : []),
        ],
        caption: reveal > 0 ? 'Add the image of i to the image of j.' : 'Where does the corner of the unit square go?',
      }),
    },
    {
      kind: 'counterexample',
      id: 'counter-eigen',
      claim: 'Every linear map of the plane has a direction it does not turn.',
      candidates: [
        { id: 'shear', label: 'The shear (1,1;0,1)' },
        { id: 'stretch', label: 'The stretch (2,0;0,0.5)' },
        { id: 'rotation', label: 'Rotation by 90 degrees' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['rotation'],
      hint: 'Try to picture a line through the origin that a quarter-turn leaves lying along itself.',
      explanation:
        'A quarter-turn moves every line through the origin to a perpendicular one, so no direction survives and there are no real eigenvalues. The shear and the stretch both do have fixed directions — the shear keeps the x-axis, and the stretch keeps both axes — which is exactly why they feel like the typical case and a rotation does not.',
    },
  ],
}

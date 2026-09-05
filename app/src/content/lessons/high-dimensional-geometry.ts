import { clamp01, ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

/**
 * Project the corners of an n-dimensional cube onto the page: each axis gets a
 * direction, and a corner is the sum of the directions its coordinates switch on.
 * n = 2 gives a square, n = 3 the familiar cube drawing, n = 4 a tesseract.
 */
const axisDirection = (index: number, count: number): Vec2 => {
  const angle = (index / count) * Math.PI * 2 + Math.PI / 7
  const length = 2.5 / Math.sqrt(count)
  return vec(Math.cos(angle) * length, Math.sin(angle) * length)
}

const cubeMarks = (n: number): Mark[] => {
  const dirs = Array.from({ length: n }, (_, i) => axisDirection(i, n))
  const corners: Vec2[] = []
  for (let bits = 0; bits < 2 ** n; bits += 1) {
    let point = vec(0, 0)
    for (let axis = 0; axis < n; axis += 1) {
      if (bits & (1 << axis)) point = vec(point.x + dirs[axis]!.x, point.y + dirs[axis]!.y)
    }
    // Centre the drawing on the origin.
    const centre = dirs.reduce((a, d) => vec(a.x + d.x / 2, a.y + d.y / 2), vec(0, 0))
    corners.push(vec(point.x - centre.x, point.y - centre.y))
  }

  const edges: Mark[] = []
  for (let bits = 0; bits < 2 ** n; bits += 1) {
    for (let axis = 0; axis < n; axis += 1) {
      const neighbour = bits | (1 << axis)
      if (neighbour === bits) continue
      edges.push({
        kind: 'segment',
        id: `e-${bits}-${axis}`,
        from: corners[bits]!,
        to: corners[neighbour]!,
        emphasis: 'muted',
      })
    }
  }

  const dots: Mark[] = corners.map((at, i) => ({ kind: 'point', id: `c-${i}`, at, emphasis: 'focus' }))
  return [...edges, ...dots]
}

/** Dimension climbing from 2 to 6, corners doubling each time. */
const corners = (t: number): SceneState => {
  const n = 2 + Math.floor(ease(t) * 4.999)
  return {
    extent: EXTENT,
    marks: [
      ...cubeMarks(n),
      { kind: 'label', id: 'n', at: vec(0, -4.3), text: `${n} dimensions · ${2 ** n} corners` },
    ],
    caption:
      n <= 3
        ? 'A square has four corners. A cube has eight. So far this is drawable.'
        : `In ${n} dimensions the same object has ${2 ** n} corners, and the picture has stopped helping.`,
  }
}

/** The fraction of a ball's volume lying in the outer 10% shell, as dimension rises. */
const shellFraction = (d: number): number => 1 - Math.pow(0.9, d)

const shell = (t: number): SceneState => {
  const d = 1 + Math.round(ease(t) * 39)
  const fraction = shellFraction(d)
  const inner = 4 * (1 - fraction) ** 0.5
  const ring = (radius: number, id: string, emphasis: Mark['emphasis']): Mark[] =>
    Array.from({ length: 56 }, (_, i) => {
      const angle = (i / 56) * Math.PI * 2
      return {
        kind: 'point',
        id: `${id}-${i}`,
        at: vec(Math.cos(angle) * radius, Math.sin(angle) * radius),
        emphasis,
      }
    })
  return {
    extent: EXTENT,
    marks: [
      ...ring(4, 'outer', 'focus'),
      ...ring(inner, 'inner', 'muted'),
      { kind: 'label', id: 'd', at: vec(0, 0), text: `${Math.round(fraction * 100)}% near the surface` },
      { kind: 'label', id: 'dim', at: vec(0, -4.4), text: `${d} dimension${d === 1 ? '' : 's'}` },
    ],
    caption:
      d < 5
        ? 'In low dimensions, most of a ball is comfortably inside it.'
        : `By ${d} dimensions, ${Math.round(fraction * 100)}% of the volume is crammed into the outermost tenth. The middle is empty.`,
  }
}

/** Pairwise distances between random points, tightening as dimension rises. */
const SPREAD = [0.15, 0.62, 0.31, 0.88, 0.44, 0.73, 0.22, 0.95, 0.51, 0.68, 0.37, 0.81]

const distances = (t: number): SceneState => {
  const concentration = ease(t)
  const marks: Mark[] = SPREAD.map((value, i) => {
    // Low dimension: distances spread widely. High dimension: they collapse together.
    const spread = value * 7 - 3.5
    const x = spread * (1 - concentration * 0.93)
    return {
      kind: 'point',
      id: `d-${i}`,
      at: vec(x, 1.2 - (i % 4) * 0.5),
      emphasis: 'focus',
    }
  })
  return {
    extent: EXTENT,
    marks: [
      { kind: 'line', id: 'axis', through: vec(0, -1.6), direction: vec(1, 0), emphasis: 'muted' },
      ...marks,
      { kind: 'label', id: 'note', at: vec(0, -2.6), text: concentration > 0.6 ? 'all roughly the same distance apart' : 'near and far are meaningfully different' },
      { kind: 'label', id: 'axislabel', at: vec(0, -4.3), text: concentration > 0.6 ? 'high dimension' : 'low dimension' },
    ],
    caption:
      concentration > 0.6
        ? 'Every pair of points is now about equally far apart. "Nearest" still returns something, but it has stopped meaning much.'
        : 'Twelve points, and the distances between them differ usefully.',
  }
}

const pilot = (t: number): SceneState => {
  const grown = ease(t) > 0.5
  const count = grown ? 60 : 8
  const points: Mark[] = Array.from({ length: count }, (_, i) => {
    const angle = (i * 2.399) % (Math.PI * 2)
    const radius = grown ? 1.2 + ((i * 37) % 100) / 36 : 1.0 + ((i * 53) % 100) / 90
    return {
      kind: 'point',
      id: `p-${i}`,
      at: vec(Math.cos(angle) * radius, Math.sin(angle) * radius),
      emphasis: i === 0 ? 'focus' : 'muted',
    }
  })
  return {
    extent: EXTENT,
    marks: [
      ...points,
      { kind: 'label', id: 'n', at: vec(0, -4.3), text: grown ? '60 documents · threshold now wrong' : '8 documents · threshold tuned here' },
    ],
    caption: grown
      ? 'Same threshold, more data, and the neighbourhood it captures is nothing like the one you tuned it on.'
      : 'A similarity threshold, tuned on a small pilot corpus, works beautifully.',
  }
}

export const highDimensionalGeometry: Lesson = {
  id: 'high-dimensional-geometry',
  pcm: 'IV.26',
  title: 'High-Dimensional Geometry',
  summary: 'Why intuition built in three dimensions does not merely fail in three hundred — it actively misleads.',
  prerequisites: ['vector-space'],

  sections: [
    {
      id: 'corners',
      heading: 'Everything multiplies',
      prose: [
        'A square has four corners, a cube has eight, and a four-dimensional cube has sixteen. The pattern is simple — each new dimension doubles the count — and it runs away from you immediately.',
        'By ten dimensions there are 1,024 corners. By three hundred, which is a modest size for the spaces AI systems actually work in, the number of corners exceeds the count of atoms in the observable universe by an absurd margin.',
        'Watch the drawing stop helping somewhere around four. That is not a failure of the illustration. It is the honest situation.',
      ],
      scene: corners,
    },
    {
      id: 'shell',
      heading: 'The middle empties out',
      prose: [
        'Here is the first thing that has no analogue in your experience. Take a ball and ask how much of its volume lies in the outer tenth — the thin rind just under the surface.',
        'In one dimension it is 10%. In three, about 27%. By forty dimensions it is 98.5%, and the interior — the part you picture when you picture a ball — contains essentially nothing.',
        'High-dimensional objects are all surface. Everything is out at the edge, which means everything is out at the edge together, and the notion of a comfortable centre simply evaporates.',
      ],
      scene: shell,
    },
    {
      id: 'distances',
      heading: 'And everything is equally far away',
      prose: [
        'The second thing follows from the first. Scatter points in a high-dimensional space and the distances between them concentrate: the nearest pair and the furthest pair end up almost the same distance apart.',
        'This is the concentration of measure, and it is fatal to intuition. "Find the nearest neighbour" is still a well-defined computation. It just stops carrying the meaning you assumed, because the nearest is barely nearer than the fiftieth-nearest.',
        'Every similarity search, every recommendation, every retrieval step is standing on ground that gets softer as the space gets bigger.',
      ],
      scene: distances,
    },
    {
      id: 'pilot',
      heading: 'Which is why the pilot lied to you',
      prose: [
        'Now the consequence that costs money. You tune a similarity threshold on a pilot corpus of two hundred documents and it performs superbly. You roll out to two hundred thousand.',
        'The threshold does not degrade gracefully. The geometry it was tuned against has changed — distances have concentrated, the neighbourhood at any given radius has swollen — and a number that was well chosen is now simply wrong.',
        'This gets diagnosed as an engineering problem, and engineers are asked to fix it with better infrastructure. It was never an engineering problem. It was a geometric one, present from the day the threshold was chosen, and invisible at pilot scale by construction.',
      ],
      scene: pilot,
    },
  ],

  assessment: [
    {
      kind: 'predict',
      id: 'predict-shell',
      prompt: 'In 40 dimensions, what fraction of a ball\'s volume lies in the outer 10% shell? Drag the marker up the bar — bottom is none, top is all.',
      initial: vec(0, 0),
      truth: vec(0, (shellFraction(40) - 0.5) * 8),
      tolerance: 0.9,
      scene: (guess, reveal) => {
        const truthY = (shellFraction(40) - 0.5) * 8
        const clamped = Math.max(-4, Math.min(4, guess.y))
        return {
          extent: EXTENT,
          marks: [
            { kind: 'segment', id: 'bar', from: vec(0, -4), to: vec(0, 4), label: 'all', emphasis: 'muted' },
            { kind: 'label', id: 'none', at: vec(0, -4.5), text: 'none' },
            { kind: 'point', id: 'guess', at: vec(0, clamped), label: `${Math.round(clamp01((clamped / 8) + 0.5) * 100)}%`, emphasis: 'focus' },
            ...(reveal > 0.3
              ? [
                  {
                    kind: 'point' as const,
                    id: 'truth',
                    at: vec(1.6, truthY),
                    label: `${Math.round(shellFraction(40) * 100)}% — the true answer`,
                    emphasis: 'focus' as const,
                  },
                ]
              : []),
          ],
          caption: reveal > 0.3 ? 'Almost all of it. In high dimensions a ball is essentially its own skin.' : 'How much of the ball is near its surface?',
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-pilot',
      claim: 'If a similarity threshold works well on a sample of our documents, it will work on all of them.',
      candidates: [
        { id: 'same-topic', label: 'The full corpus covers the same topics as the sample' },
        { id: 'bigger', label: 'The full corpus is a thousand times larger, in the same space' },
        { id: 'cleaner', label: 'The full corpus has been better cleaned than the sample' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['bigger'],
      hint: 'Nothing about the documents needs to change for the threshold to break. Ask what changes when there are simply more of them.',
      explanation:
        'Sheer size breaks it, with no change in topic or quality. A fixed radius that caught three documents among two hundred catches three thousand among two hundred thousand, and concentration of measure means those three thousand are barely less similar to one another than the original three were. The threshold was never a property of your documents; it was a property of how many of them there were. This is why a threshold has to be re-tuned at production scale, and why "it worked in the pilot" carries so little information here.',
    },
  ],
}

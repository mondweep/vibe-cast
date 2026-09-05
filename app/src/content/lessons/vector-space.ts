import { IDENTITY, apply, ease, lerpVec2, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5
const U = vec(3, 1)
const V = vec(-1, 2)

const grid = (): Mark => ({ kind: 'grid', id: 'grid', extent: EXTENT, transform: IDENTITY })

const arrow = (id: string, to: Vec2, label: string, emphasis: Mark['emphasis'] = 'normal'): Mark => ({
  kind: 'vector',
  id,
  from: vec(0, 0),
  to,
  label,
  emphasis,
})

/** Two arrows, then the parallelogram that defines their sum. */
const addition = (t: number): SceneState => {
  const p = ease(t)
  const sum = vec(U.x + V.x, U.y + V.y)
  const marks: Mark[] = [grid(), arrow('u', U, 'u', 'focus'), arrow('v', V, 'v', 'focus')]

  if (p > 0.15) {
    // v, slid along u — the move that makes addition obvious.
    const slide = Math.min(1, (p - 0.15) / 0.5)
    marks.push({
      kind: 'vector',
      id: 'v-shifted',
      from: lerpVec2(vec(0, 0), U, slide),
      to: lerpVec2(V, sum, slide),
      label: 'v again',
      emphasis: 'muted',
    })
  }
  if (p > 0.65) {
    marks.push(arrow('sum', lerpVec2(vec(0, 0), sum, Math.min(1, (p - 0.65) / 0.35)), 'u + v', 'focus'))
  }

  return {
    extent: EXTENT,
    marks,
    caption:
      p < 0.15
        ? 'Two arrows from the origin.'
        : p < 0.65
          ? 'The second arrow slides to the tip of the first.'
          : 'Their sum is the arrow to where you end up.',
  }
}

/** One arrow, stretched and flipped by a scalar swinging from -1 to 2. */
const scaling = (t: number): SceneState => {
  const s = -1 + 3 * ease(t)
  const scaled = vec(U.x * s, U.y * s)
  return {
    extent: EXTENT,
    marks: [
      grid(),
      { kind: 'line', id: 'span', through: vec(0, 0), direction: U, label: 'every multiple of u', emphasis: 'muted' },
      arrow('u', U, 'u', 'muted'),
      arrow('scaled', scaled, `${s.toFixed(1)} u`, 'focus'),
    ],
    caption:
      s < 0
        ? 'A negative multiple points the other way.'
        : s < 1
          ? 'Multiples shorter than one sit between the origin and the tip.'
          : 'Every multiple of u lies on one line through the origin.',
  }
}

/** Two independent arrows reaching an arbitrary point — then collapsing to parallel. */
const span = (t: number): SceneState => {
  const p = ease(t)
  // Past halfway, v swings until it is parallel to u and the plane collapses to a line.
  const collapse = Math.max(0, (p - 0.5) / 0.5)
  const current = lerpVec2(V, vec(-U.x * 0.6, -U.y * 0.6), collapse)
  const degenerate = collapse > 0.9

  return {
    extent: EXTENT,
    marks: [
      grid(),
      arrow('u', U, 'u', 'focus'),
      arrow('v', current, 'v', 'focus'),
      ...(degenerate
        ? [
            {
              kind: 'line' as const,
              id: 'collapsed',
              through: vec(0, 0),
              direction: U,
              label: 'everything you can reach',
              emphasis: 'focus' as const,
            },
          ]
        : []),
      {
        kind: 'label',
        id: 'note',
        at: vec(0, -EXTENT + 0.8),
        text: degenerate ? 'span = a line' : 'span = the whole plane',
      },
    ],
    caption: degenerate
      ? 'Once v lies along u, combinations of them reach only that one line.'
      : 'Adding scaled copies of u and v reaches every point in the plane.',
  }
}

const axioms = (): SceneState => ({
  extent: EXTENT,
  marks: [grid(), arrow('u', U, 'u'), arrow('v', V, 'v'), arrow('sum', vec(U.x + V.x, U.y + V.y), 'u + v', 'focus')],
  caption: 'The rules that made all of the above work.',
})

/** Two vectors are dependent when the parallelogram they span has no area. */
const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x

export const vectorSpace: Lesson = {
  id: 'vector-space',
  pcm: 'I.3',
  title: 'Vector Space',
  summary: 'Arrows you can add and scale — and the surprising amount that follows from just those two moves.',
  prerequisites: [],

  sections: [
    {
      id: 'addition',
      heading: 'Two arrows make a third',
      prose: [
        'Start with something concrete: an arrow from the origin. Not a list of numbers, not a definition — an arrow.',
        'Given two of them, there is an obvious way to combine them. Walk along the first, then walk along the second. Where you end up is a third arrow, and that arrow is what we call their sum.',
        'Watch the second arrow slide to the tip of the first. Nothing about it changes — an arrow is a displacement, not a location, so moving it does not make it a different arrow. That is the whole content of the picture, and it is the reason addition works the way it does.',
      ],
      scene: addition,
    },
    {
      id: 'scaling',
      heading: 'And you can stretch them',
      prose: [
        'The second move is scaling: take an arrow and multiply it by a number. Two makes it twice as long, a half makes it half as long, and a negative number turns it around.',
        'Every multiple of a single arrow lies on one line through the origin. Scaling alone can never get you off that line, however cleverly you choose the number.',
        'That limitation is not a defect. It is precisely what makes the next question interesting.',
      ],
      scene: scaling,
    },
    {
      id: 'span',
      heading: 'What can two arrows reach?',
      prose: [
        'Now allow both moves at once: scale each arrow by any number you like, then add the results. The set of points you can reach is called the span.',
        'With two arrows pointing in genuinely different directions, the span is the entire plane. Every point is reachable, and reachable in exactly one way.',
        'But watch what happens as the second arrow swings until it lies along the first. The moment they are parallel, the plane collapses. Two arrows, and yet you can only reach a line. The number of arrows was never the point — their independence was.',
      ],
      scene: span,
    },
    {
      id: 'axioms',
      heading: 'Now the definition',
      prose: [
        'A vector space is a set with an addition and a scaling operation, satisfying eight rules: addition is commutative and associative, there is a zero, every element has a negative, and scaling distributes over both kinds of addition, is associative, and leaves things alone when you scale by one.',
        'Read that list now and it should feel like an anticlimax — every rule is something you already watched happen. That is deliberate. The axioms were not invented and then illustrated; they were extracted from the picture.',
        'The reward is that anything obeying these rules behaves like arrows, whether or not it looks like one. Polynomials, solutions of a differential equation, and functions on a set are all vector spaces. Everything you just learned about arrows applies to all of them, unchanged.',
      ],
      scene: axioms,
    },
  ],

  assessment: [
    {
      kind: 'predict',
      id: 'predict-sum',
      prompt: 'Drag the point to where you think 2u + v lands, then release to check.',
      initial: vec(0, 3),
      truth: vec(2 * U.x + V.x, 2 * U.y + V.y),
      tolerance: 0.6,
      scene: (guess, reveal) => {
        const truth = vec(2 * U.x + V.x, 2 * U.y + V.y)
        return {
          extent: 8,
          marks: [
            grid(),
            arrow('u', U, 'u', 'muted'),
            arrow('v', V, 'v', 'muted'),
            { kind: 'point', id: 'guess', at: guess, label: 'your answer', emphasis: 'focus' },
            ...(reveal > 0
              ? [
                  { kind: 'point' as const, id: 'truth', at: lerpVec2(guess, truth, ease(reveal)), label: '2u + v', emphasis: 'focus' as const },
                ]
              : []),
          ],
          caption: reveal > 0 ? 'Doubling u, then adding v.' : 'Where does 2u + v land?',
        }
      },
    },
    {
      kind: 'construct',
      id: 'construct-dependent',
      prompt: 'Move the two arrows so that together they span only a line, not the plane.',
      initial: [vec(3, 1), vec(-1, 2)],
      satisfies: (vectors) => {
        const [a, b] = vectors
        if (!a || !b) return { ok: false, reason: 'Both arrows are needed.' }
        if (Math.hypot(a.x, a.y) < 0.4 || Math.hypot(b.x, b.y) < 0.4) {
          return { ok: false, reason: 'That works, but only because an arrow is nearly zero — find the interesting way.' }
        }
        const area = Math.abs(cross(a, b))
        return area < 0.35
          ? { ok: true, reason: 'Parallel: every combination stays on one line.' }
          : { ok: false, reason: 'They still point in different directions, so together they reach the whole plane.' }
      },
      scene: (vectors) => {
        const [a, b] = [vectors[0] ?? vec(1, 0), vectors[1] ?? vec(0, 1)]
        const dependent = Math.abs(cross(a, b)) < 0.35
        return {
          extent: EXTENT,
          marks: [
            grid(),
            arrow('a', a, 'a', 'focus'),
            arrow('b', b, 'b', 'focus'),
            ...(dependent
              ? [{ kind: 'line' as const, id: 'span', through: vec(0, 0), direction: a, label: 'span', emphasis: 'focus' as const }]
              : [{ kind: 'polygon' as const, id: 'area', points: [vec(0, 0), a, vec(a.x + b.x, a.y + b.y), b], label: 'span', emphasis: 'muted' as const }]),
          ],
          caption: dependent ? 'Parallel — the span has collapsed to a line.' : 'Independent — these two reach every point.',
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-span',
      claim: 'Any two non-zero vectors in the plane span the whole plane.',
      candidates: [
        { id: 'perpendicular', label: '(1, 0) and (0, 1)' },
        { id: 'parallel', label: '(1, 2) and (2, 4)' },
        { id: 'oblique', label: '(3, 1) and (-1, 2)' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['parallel'],
      hint: 'Non-zero is not the same as pointing in different directions.',
      explanation:
        '(2, 4) is exactly twice (1, 2). Both are non-zero, but every combination of them lands on the same line through the origin, so they span a line rather than the plane. What matters is independence, not being non-zero.',
    },
  ],
}

export const _internals = { apply, IDENTITY }

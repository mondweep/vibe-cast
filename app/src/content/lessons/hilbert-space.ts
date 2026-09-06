import { ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

const grid = (): Mark => ({ kind: 'grid', id: 'grid', extent: EXTENT, transform: [[1, 0], [0, 1]] })

const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y
const norm = (v: Vec2): number => Math.hypot(v.x, v.y) || 1e-9
const cosine = (a: Vec2, b: Vec2): number => dot(a, b) / (norm(a) * norm(b))

const arrow = (id: string, to: Vec2, label: string, emphasis: Mark['emphasis'] = 'normal'): Mark => ({
  kind: 'vector',
  id,
  from: vec(0, 0),
  to,
  label,
  emphasis,
})

const A = vec(3.2, 1.4)

/** One operation, and both length and angle fall out of it. */
const oneOperation = (t: number): SceneState => {
  const p = ease(t)
  return {
    extent: EXTENT,
    marks: [
      grid(),
      arrow('a', A, 'a', 'focus'),
      ...(p > 0.4
        ? [
            { kind: 'label' as const, id: 'len', at: vec(0, -3.4), text: `length² = a·a = ${dot(A, A).toFixed(2)}` },
          ]
        : []),
      ...(p > 0.75
        ? [{ kind: 'label' as const, id: 'note', at: vec(0, -4.2), text: 'no separate ruler required' }]
        : []),
    ],
    caption:
      p < 0.4
        ? 'A Hilbert space is a vector space with one extra operation: the inner product, which eats two vectors and returns a number.'
        : 'Feed a vector to itself and you get its length squared. Length was never a separate idea.',
  }
}

/** Two vectors; similarity is the angle between them, not the gap. */
const angleNotDistance = (t: number): SceneState => {
  const swing = ease(t)
  const angle = Math.PI * 0.18 + swing * Math.PI * 0.62
  const b = vec(Math.cos(angle) * 2.0, Math.sin(angle) * 2.0)
  const similarity = cosine(A, b)
  return {
    extent: EXTENT,
    marks: [
      grid(),
      arrow('a', A, 'a', 'normal'),
      arrow('b', b, 'b', 'focus'),
      { kind: 'label', id: 'cos', at: vec(0, -3.6), text: `similarity = ${similarity.toFixed(2)}` },
      { kind: 'label', id: 'note', at: vec(0, -4.3), text: similarity > 0.85 ? 'nearly the same meaning' : similarity > 0.2 ? 'loosely related' : 'unrelated' },
    ],
    caption:
      similarity > 0.85
        ? 'Pointing the same way: the inner product is near its maximum, and these count as saying nearly the same thing.'
        : 'Swing b away from a and the similarity falls — even though b has not changed length at all.',
  }
}

/** Projection: the closest you can get to a using only multiples of b. */
const projection = (t: number): SceneState => {
  const p = ease(t)
  const b = vec(2.6, -1.9)
  const scale = dot(A, b) / dot(b, b)
  const foot = vec(b.x * scale * p, b.y * scale * p)
  return {
    extent: EXTENT,
    marks: [
      grid(),
      { kind: 'line', id: 'span', through: vec(0, 0), direction: b, label: 'everything you can build from b', emphasis: 'muted' },
      arrow('a', A, 'a', 'normal'),
      arrow('b', b, 'b', 'muted'),
      { kind: 'point', id: 'foot', at: foot, label: p > 0.8 ? 'best approximation' : '', emphasis: 'focus' },
      ...(p > 0.5 ? [{ kind: 'segment' as const, id: 'err', from: A, to: foot, label: 'what you lose', emphasis: 'focus' as const }] : []),
    ],
    caption:
      p > 0.5
        ? 'Drop a perpendicular. The foot is the closest point to a that b can reach, and the perpendicular is exactly what gets discarded.'
        : 'Suppose you may only use multiples of b. How close to a can you get?',
  }
}

/** The same rules hold when the vectors are functions, with no upper limit on dimension. */
const infinite = (t: number): SceneState => {
  const shown = Math.round(ease(t) * 5)
  const waves: Mark[] = []
  for (let k = 1; k <= 5; k += 1) {
    if (k > shown) continue
    for (let i = -40; i < 40; i += 1) {
      const x1 = i / 10
      const x2 = (i + 1) / 10
      const f = (x: number) => Math.sin(x * k * 0.85) * (2.6 / k)
      waves.push({
        kind: 'segment',
        id: `w-${k}-${i}`,
        from: vec(x1, f(x1)),
        to: vec(x2, f(x2)),
        emphasis: k === shown ? 'focus' : 'muted',
      })
    }
  }
  return {
    extent: EXTENT,
    marks: [
      { kind: 'line', id: 'axis', through: vec(0, 0), direction: vec(1, 0), emphasis: 'muted' },
      ...waves,
      { kind: 'label', id: 'n', at: vec(0, -4.3), text: shown === 0 ? 'one function' : `${shown} perpendicular directions` },
    ],
    caption:
      shown > 2
        ? 'These waves are mutually perpendicular in exactly the sense above. Each is a direction, and there is no limit to how many there are.'
        : 'Now let the vectors be whole functions rather than arrows.',
  }
}

export const hilbertSpace: Lesson = {
  id: 'hilbert-space',
  pcm: 'III.37',
  title: 'Hilbert Spaces',
  summary: 'The single operation behind every "similarity score" you have ever been shown — and what it quietly throws away.',
  prerequisites: ['vector-space'],

  sections: [
    {
      id: 'one-operation',
      heading: 'One operation, and geometry follows',
      prose: [
        'Take a vector space and add one thing: a way of multiplying two vectors together to get a number. That is the inner product, and a space with one is a Hilbert space.',
        'Everything geometric then falls out of it. Feed a vector to itself and you get its length squared, so length needed no separate definition. Feed two different vectors in and the answer tells you how aligned they are.',
        'This is not decoration on top of the vector space. It is the smallest addition that turns pure algebra into something with shape.',
      ],
      scene: oneOperation,
    },
    {
      id: 'angle',
      heading: 'Similarity is an angle',
      prose: [
        'Normalise the inner product by both lengths and you get the cosine of the angle between the vectors — a number from one, meaning pointing the same way, down to minus one, meaning opposite.',
        'This is cosine similarity, and it is the operation running underneath essentially every retrieval and recommendation system you will be sold. When a vendor says two documents are 0.87 similar, this is the arithmetic.',
        'Note carefully what it ignores. Swing b around and the score moves, but stretching b changes nothing at all. Direction carries the meaning; magnitude is discarded. That is usually what you want — a long document and a short one about the same subject should match — and occasionally it is exactly what you did not want, because emphasis and intensity live in magnitude.',
      ],
      scene: angleNotDistance,
    },
    {
      id: 'projection',
      heading: 'Projection is approximation',
      prose: [
        'Now the operation that does the real work. Suppose you may only use multiples of b, and you want to get as close to a as possible. Drop a perpendicular from a to b\'s line; the foot of it is the answer, and provably the best one.',
        'Everything in applied mathematics that says "best fit" is doing this. Least-squares regression is a projection. Principal component analysis is a projection. Compressing an embedding to fewer dimensions is a projection.',
        'And each one discards precisely the perpendicular part — the component that the space you kept simply cannot express. That discarded piece is not noise by definition. It is whatever your chosen directions could not represent, and if the thing you cared about lived there, it is gone and nothing will report its absence.',
      ],
      scene: projection,
    },
    {
      id: 'infinite',
      heading: 'And it does not stop at arrows',
      prose: [
        'The reason this idea earns a name of its own is that none of it required the vectors to be arrows. Let them be whole functions and every rule survives: functions have lengths, angles between them, and perpendicular directions.',
        'These waves are mutually perpendicular in exactly the sense of the previous section, and there is no ceiling on how many such directions exist. That is a Hilbert space with infinitely many dimensions, and it is entirely ordinary.',
        'Which is the practical point for anyone buying this technology: the machinery does not strain as the dimension count grows. A system working in fifteen hundred dimensions is doing the same four operations as the picture above, and the reason it works is that the geometry genuinely does carry over.',
      ],
      scene: infinite,
    },
  ],

  assessment: [
    {
      kind: 'construct',
      id: 'construct-orthogonal',
      prompt: 'Move the second arrow so the two are completely unrelated — a similarity score of zero.',
      initial: [vec(3.2, 1.4), vec(2.8, 1.1)],
      satisfies: (vectors) => {
        const [a, b] = vectors
        if (!a || !b) return { ok: false, reason: 'Both arrows are needed.' }
        if (norm(b) < 0.5) return { ok: false, reason: 'A zero-length arrow has no direction — find the honest way.' }
        const c = cosine(a, b)
        return Math.abs(c) < 0.08
          ? { ok: true, reason: 'Perpendicular: the inner product vanishes, and neither vector says anything about the other.' }
          : { ok: false, reason: `Similarity is ${c.toFixed(2)}. Zero means a right angle.` }
      },
      scene: (vectors) => {
        const [a, b] = [vectors[0] ?? vec(1, 0), vectors[1] ?? vec(0, 1)]
        const c = cosine(a, b)
        return {
          extent: EXTENT,
          marks: [
            grid(),
            arrow('a', a, 'a', 'normal'),
            arrow('b', b, 'b', 'focus'),
            { kind: 'label', id: 'cos', at: vec(0, -4.2), text: `similarity = ${c.toFixed(2)}` },
          ],
          caption: Math.abs(c) < 0.08 ? 'A right angle: no shared direction at all.' : 'Still partly aligned.',
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-cosine',
      claim: 'If two documents score high on cosine similarity, they say similar things.',
      candidates: [
        { id: 'paraphrase', label: 'One is a paraphrase of the other' },
        { id: 'negation', label: 'One states a policy, the other states its exact opposite' },
        { id: 'length', label: 'One is ten times longer than the other, same subject' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['negation'],
      hint: 'The score measures shared direction. Ask what two texts about the same subject share, regardless of what they claim about it.',
      explanation:
        'Negation breaks it, and it breaks it badly. "Staff may expense travel" and "staff may not expense travel" are about the same subject, share nearly all their vocabulary, and land close together — so a retrieval system will happily return the opposite of your policy as a highly relevant match. Length is a distractor: cosine deliberately ignores magnitude, so that case is fine. This is the single most under-tested failure in enterprise retrieval, and it is why any system giving policy answers needs evaluating specifically on negated pairs.',
    },
  ],
}

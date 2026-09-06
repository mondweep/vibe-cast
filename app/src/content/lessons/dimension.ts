import { ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

const grid = (): Mark => ({ kind: 'grid', id: 'grid', extent: EXTENT, transform: [[1, 0], [0, 1]] })

/** A wandering curve — one-dimensional, but drawn in the plane. */
const curvePoint = (s: number): Vec2 => vec(s * 3.6, Math.sin(s * 2.1) * 1.9 + s * 0.7)

const curveMarks = (emphasis: Mark['emphasis'] = 'muted'): Mark[] => {
  const marks: Mark[] = []
  for (let i = -12; i < 12; i += 1) {
    marks.push({
      kind: 'segment',
      id: `c-${i}`,
      from: curvePoint(i / 10),
      to: curvePoint((i + 1) / 10),
      emphasis,
    })
  }
  return marks
}

/** Counting the numbers you need: a line, then a plane. */
const freedom = (t: number): SceneState => {
  const twoD = ease(t) > 0.5
  const at = twoD ? vec(2.1, 1.6) : vec(2.1, 0)
  return {
    extent: EXTENT,
    marks: [
      grid(),
      { kind: 'line', id: 'x', through: vec(0, 0), direction: vec(1, 0), emphasis: twoD ? 'muted' : 'focus' },
      ...(twoD ? [{ kind: 'line' as const, id: 'y', through: vec(0, 0), direction: vec(0, 1), emphasis: 'focus' as const }] : []),
      { kind: 'point', id: 'p', at, label: twoD ? '(2.1, 1.6) — two numbers' : '2.1 — one number', emphasis: 'focus' },
      { kind: 'segment', id: 'drop', from: at, to: vec(at.x, 0), emphasis: 'muted' },
    ],
    caption: twoD
      ? 'To pin down a point in the plane you must supply two numbers. That count is the dimension.'
      : 'On a line, one number locates you completely.',
  }
}

/** A curve drawn in the plane is still one-dimensional to anything living on it. */
const onTheCurve = (t: number): SceneState => {
  const s = -1.1 + ease(t) * 2.2
  return {
    extent: EXTENT,
    marks: [
      grid(),
      ...curveMarks('normal'),
      { kind: 'point', id: 'bug', at: curvePoint(s), label: `position ${s.toFixed(2)} — one number`, emphasis: 'focus' },
    ],
    caption:
      'This curve is drawn in two dimensions, but anything travelling along it has one choice: how far. The curve is one-dimensional.',
  }
}

/** Points that look two-dimensional turn out to hug a one-dimensional curve. */
const manifold = (t: number): SceneState => {
  const collapse = ease(t)
  const seeds = [-0.95, -0.7, -0.45, -0.2, 0.05, 0.3, 0.55, 0.8, 1.05, -0.85, -0.35, 0.15, 0.65, 0.95]
  const jitter = [0.9, -1.2, 0.5, -0.7, 1.4, -0.4, 0.8, -1.1, 0.3, -0.9, 1.1, -0.6, 0.7, -1.3]
  const points: Mark[] = seeds.map((s, i) => {
    const on = curvePoint(s)
    const off = vec(on.x, on.y + jitter[i]! * (1 - collapse))
    return { kind: 'point', id: `d-${i}`, at: off, emphasis: 'focus' }
  })
  return {
    extent: EXTENT,
    marks: [grid(), ...(collapse > 0.55 ? curveMarks('normal') : []), ...points],
    caption:
      collapse < 0.55
        ? 'Fourteen data points, scattered across the plane. Two numbers each.'
        : 'They were never really using both dimensions. They hug a curve — one number of genuine variation, plus noise.',
  }
}

/** What 1,536 dimensions means: dials, not directions you could point at. */
const many = (t: number): SceneState => {
  const shown = Math.round(ease(t) * 24)
  const dials: Mark[] = Array.from({ length: 24 }, (_, i) => {
    const x = -4 + (i % 8) * 1.15
    const y = 2.4 - Math.floor(i / 8) * 2.1
    const lit = i < shown
    const height = lit ? 0.35 + ((i * 37) % 90) / 90 : 0.05
    return {
      kind: 'segment',
      id: `dial-${i}`,
      from: vec(x, y - 0.7),
      to: vec(x, y - 0.7 + height * 1.4),
      emphasis: lit ? 'focus' : 'muted',
    }
  })
  return {
    extent: EXTENT,
    marks: [
      ...dials,
      { kind: 'label', id: 'n', at: vec(0, -4.2), text: shown < 24 ? `${shown} of 1,536 dials` : '…and 1,512 more' },
    ],
    caption:
      shown < 24
        ? 'Each independent thing the data can vary is one dimension.'
        : 'An embedding is a list of about fifteen hundred numbers. Fifteen hundred independent dials, all set at once.',
  }
}

const collinear = (points: readonly Vec2[]): boolean => {
  const [a, b] = points
  if (!a || !b) return false
  return points.every((p) => {
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
    const scale = Math.hypot(b.x - a.x, b.y - a.y) || 1
    return Math.abs(cross) / scale < 0.35
  })
}

export const dimension: Lesson = {
  id: 'dimension',
  pcm: 'III.17',
  title: 'Dimension',
  summary: 'What it actually means for data to have 1,536 dimensions — and why almost none of them are doing anything.',
  prerequisites: [],

  sections: [
    {
      id: 'freedom',
      heading: 'Dimension is a count of choices',
      prose: [
        'Dimension has a plainer meaning than its reputation suggests: it is how many numbers you must supply to say exactly where something is.',
        'On a line, one. In the plane, two. In the room you are sitting in, three. There is no mysticism in the fourth — it is simply a situation where you need a fourth number, which happens constantly and has nothing to do with time or science fiction.',
        'A customer record with age, income, tenure and region is a point in four dimensions. That is all the word is doing.',
      ],
      scene: freedom,
    },
    {
      id: 'curve',
      heading: 'Freedom, not the space it sits in',
      prose: [
        'Here is the distinction that matters. This curve is drawn on a two-dimensional page. But an ant walking along it has exactly one choice — how far along — so the curve itself is one-dimensional.',
        'Dimension belongs to the object, not to the space you happened to draw it in. A road is one-dimensional even though it crosses a county.',
        'Keep hold of that, because it is the whole reason machine learning works at all.',
      ],
      scene: onTheCurve,
    },
    {
      id: 'manifold',
      heading: 'Real data uses far fewer dimensions than it has',
      prose: [
        'Now watch fourteen data points, each described by two numbers, settle onto a curve. They were never using both dimensions independently. There was one real degree of variation, and some noise on top.',
        'This turns out to be true of almost all real data, and it is the quiet assumption underneath every model your organisation will buy. Photographs are millions of pixels but live near a far smaller surface of plausible images. Your customers are described by two hundred fields and vary along perhaps a dozen genuine axes.',
        'It is why compression works, why embeddings work, and why a model can generalise from far fewer examples than the raw dimension count would suggest it needs. The data was never as high-dimensional as its description.',
      ],
      scene: manifold,
    },
    {
      id: 'many',
      heading: 'So what is 1,536 dimensions?',
      prose: [
        'When a vendor says their embeddings are 1,536-dimensional, they mean each piece of text becomes a list of 1,536 numbers. Fifteen hundred dials, set simultaneously.',
        'Nobody can picture that and nobody needs to. What matters is knowing what the number is a count *of* — independent things that can vary — and knowing, from the previous section, that the meaningful variation is almost certainly far lower than the count suggests.',
        'It also matters because that count is what puts you into a regime where ordinary geometric intuition stops working. That is the next concept, and it is the one that costs money.',
      ],
      scene: many,
    },
  ],

  assessment: [
    {
      kind: 'construct',
      id: 'construct-collinear',
      prompt: 'Move the two markers so that all four points lie on one straight line — making the data genuinely one-dimensional.',
      initial: [vec(-3, 2.6), vec(1.4, -2.8)],
      satisfies: (vectors) => {
        const all = [...vectors, vec(-1.5, -0.5), vec(2.5, 1.5)]
        if (!vectors[0] || !vectors[1]) return { ok: false, reason: 'Move both markers.' }
        return collinear(all)
          ? { ok: true, reason: 'All four now sit on one line: two numbers each, one degree of real variation.' }
          : { ok: false, reason: 'Not yet on a line — the points still need two independent numbers to describe them.' }
      },
      scene: (vectors) => {
        const fixed = [vec(-1.5, -0.5), vec(2.5, 1.5)]
        const all = [...vectors, ...fixed]
        const flat = collinear(all)
        return {
          extent: EXTENT,
          marks: [
            grid(),
            ...(flat
              ? [{ kind: 'line' as const, id: 'axis', through: fixed[0]!, direction: vec(fixed[1]!.x - fixed[0]!.x, fixed[1]!.y - fixed[0]!.y), label: 'one dimension', emphasis: 'focus' as const }]
              : []),
            ...fixed.map((at, i) => ({ kind: 'point' as const, id: `fixed-${i}`, at, emphasis: 'normal' as const })),
            ...vectors.map((at, i) => ({ kind: 'point' as const, id: `move-${i}`, at, label: `move me`, emphasis: 'focus' as const })),
          ],
          caption: flat ? 'One line, so one degree of freedom.' : 'Two independent numbers are still needed.',
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-dimension',
      claim: 'A dataset with 200 columns has 200 dimensions of genuine variation.',
      candidates: [
        { id: 'independent', label: '200 columns that vary completely independently' },
        { id: 'derived', label: '200 columns, where 190 are computed from the other 10' },
        { id: 'wide', label: '200 columns and only 50 rows' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['derived', 'wide'],
      hint: 'Ask how many of the columns could be thrown away without losing anything.',
      explanation:
        'Both break it. Derived columns are the everyday case: total, average, ratio, month-from-date — each looks like a new dimension and adds no freedom at all, because it is determined by the others. The narrow-and-wide case breaks it too: fifty rows can only ever exhibit fifty dimensions of variation however many columns you record, which is why a model trained on a wide, short table finds structure that is not there. The column count is a description; the dimension is a property of the data.',
    },
  ],
}

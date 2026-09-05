import { clamp01, ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5
const BASE = -3 // the horizontal axis sits here, leaving room for labels below

/** A skewed hump: a long right tail, which is what response times and costs actually look like. */
const density = (x: number): number => {
  const shifted = x + 2.2
  if (shifted <= 0) return 0
  // Log-normal-ish, scaled to fit the frame.
  const value = Math.exp(-Math.pow(Math.log(shifted / 1.5), 2) / 0.5) / shifted
  return value * 4.2
}

const MEAN = 0.35 // where the balance point actually is — well right of the peak
const PEAK = -0.85

/** Twenty draws from that density, fixed so the picture is the same every time. */
const DRAWS = [
  -1.1, -0.6, -0.95, -0.2, -1.3, 0.1, -0.75, -0.45, 0.6, -1.0,
  -0.3, 1.4, -0.85, 0.25, -0.55, -1.15, 3.1, -0.4, 0.05, -0.7,
]

const axis = (): Mark => ({
  kind: 'line',
  id: 'axis',
  through: vec(0, BASE),
  direction: vec(1, 0),
  emphasis: 'muted',
})

/** The density drawn as a filled region under the curve. */
const curve = (emphasis: Mark['emphasis'] = 'normal'): Mark => {
  const points: Vec2[] = [vec(-EXTENT, BASE)]
  for (let x = -EXTENT; x <= EXTENT; x += 0.2) {
    points.push(vec(x, BASE + density(x)))
  }
  points.push(vec(EXTENT, BASE))
  return { kind: 'polygon', id: 'density', points, emphasis }
}

const draws = (count: number, emphasis: Mark['emphasis'] = 'focus'): Mark[] =>
  DRAWS.slice(0, count).map((x, index) => ({
    kind: 'point',
    id: `draw-${index}`,
    at: vec(x, BASE - 0.35),
    emphasis,
  }))

const shape = (t: number): SceneState => ({
  extent: EXTENT,
  marks: [axis(), curve('focus')],
  caption:
    t < 0.5
      ? 'Not a number. A shape: how much of the possible answer lies where.'
      : 'Taller means more likely — but nothing here is ruled out.',
})

const sampling = (t: number): SceneState => {
  const count = Math.round(ease(t) * DRAWS.length)
  return {
    extent: EXTENT,
    marks: [axis(), curve('muted'), ...draws(count)],
    caption:
      count === 0
        ? 'Ask once, and the system draws one value from that shape.'
        : `${count} draw${count === 1 ? '' : 's'}. Most land under the hump; one has already gone a long way right.`,
  }
}

const meanVsTypical = (t: number): SceneState => {
  const revealMean = ease(clamp01((t - 0.35) / 0.4))
  return {
    extent: EXTENT,
    marks: [
      axis(),
      curve('muted'),
      ...draws(DRAWS.length, 'muted'),
      { kind: 'line', id: 'peak', through: vec(PEAK, 0), direction: vec(0, 1), label: 'typical', emphasis: 'focus' },
      ...(revealMean > 0.1
        ? [
            {
              kind: 'line' as const,
              id: 'mean',
              through: vec(PEAK + (MEAN - PEAK) * revealMean, 0),
              direction: vec(0, 1),
              label: 'the average',
              emphasis: 'normal' as const,
            },
          ]
        : []),
    ],
    caption:
      revealMean < 0.1
        ? 'The peak is the most common outcome — what you would call typical.'
        : 'The average sits somewhere else entirely. The long tail drags it right, away from anything that actually happens often.',
  }
}

const tail = (t: number): SceneState => {
  const lit = ease(t) > 0.35
  return {
    extent: EXTENT,
    marks: [
      axis(),
      curve('muted'),
      ...(lit
        ? [
            {
              kind: 'polygon' as const,
              id: 'tail',
              points: [
                vec(1.6, BASE),
                ...Array.from({ length: 18 }, (_, i) => {
                  const x = 1.6 + (i * (EXTENT - 1.6)) / 17
                  return vec(x, BASE + density(x))
                }),
                vec(EXTENT, BASE),
              ],
              label: 'rare',
              emphasis: 'focus' as const,
            },
          ]
        : []),
      { kind: 'point', id: 'outlier', at: vec(3.1, BASE - 0.35), label: 'the one you will hear about', emphasis: lit ? 'focus' : 'muted' },
    ],
    caption: lit
      ? 'Thin, but not empty. Run the thing ten thousand times and this region is where your incident report comes from.'
      : 'Almost nothing happens out here. Almost.',
  }
}

export const probabilityDistribution: Lesson = {
  id: 'probability-distribution',
  pcm: 'III.71',
  title: 'Probability Distributions',
  summary: 'Why an AI system gives you a different answer the second time you ask — and why that is the design, not a fault.',
  prerequisites: [],

  sections: [
    {
      id: 'shape',
      heading: 'A shape, not a number',
      prose: [
        'Ask what a system will output and the honest answer is not a value. It is this: a shape, spread across everything it might say, taller where an outcome is more likely.',
        'That is what a probability distribution is. Not a prediction — an accounting of possibility, with the total always adding to one.',
        'Notice what the shape does not contain: a flat region of zero on the right-hand side. Nothing is ruled out. Some things are merely very thin.',
      ],
      scene: shape,
    },
    {
      id: 'sampling',
      heading: 'Every answer is a draw',
      prose: [
        'Now ask the question. The system does not read the peak off the chart and hand it to you. It draws — the way you would draw a ball from a bag where the popular answers have more balls in it.',
        'Watch twenty draws land. They cluster where the shape is tall, which is why the thing feels reliable. And then one lands a long way to the right, because the shape said it could.',
        'Ask the same question twice and get two answers, and nothing has gone wrong. You have drawn twice.',
      ],
      scene: sampling,
    },
    {
      id: 'average',
      heading: 'The average is not the typical case',
      prose: [
        'Here is the confusion that costs organisations real money. The peak — the most common outcome — is one thing. The average is another, and on a shape with a long tail they are nowhere near each other.',
        'The average is a balance point. A few extreme values pull it a long way, even though almost nothing lands there. Quote the average response time of a system like this and you will describe an experience that hardly any user has.',
        'Whenever a single number is offered to summarise a system, the first question is which number, and the second is what the shape looked like before it got flattened into one.',
      ],
      scene: meanVsTypical,
    },
    {
      id: 'tail',
      heading: 'The tail is where the trouble lives',
      prose: [
        'The right-hand region is thin. It is also where the failure you have to explain to a regulator comes from.',
        'A demonstration draws from this shape perhaps a dozen times, and a dozen draws almost never reach the tail. A production system draws from it a million times a week, and then the tail is not rare at all — it is Tuesday.',
        'This is the whole reason a successful pilot tells you so much less than it feels like it should. The pilot did not fail to find the tail because the tail is not there. It failed to find it because it did not draw enough times.',
      ],
      scene: tail,
    },
  ],

  assessment: [
    {
      kind: 'predict',
      id: 'predict-mean',
      prompt: 'The vertical line marks the most common outcome. Drag it to where you think the *average* sits, then check.',
      initial: vec(PEAK, 0),
      truth: vec(MEAN, 0),
      tolerance: 0.55,
      scene: (guess, reveal) => ({
        extent: EXTENT,
        marks: [
          axis(),
          curve('muted'),
          ...draws(DRAWS.length, 'muted'),
          { kind: 'line', id: 'peak', through: vec(PEAK, 0), direction: vec(0, 1), label: 'most common', emphasis: 'muted' },
          { kind: 'line', id: 'guess', through: vec(guess.x, 0), direction: vec(0, 1), label: 'your answer', emphasis: 'focus' },
          ...(reveal > 0.3
            ? [
                {
                  kind: 'line' as const,
                  id: 'truth',
                  through: vec(MEAN, 0),
                  direction: vec(0, 1),
                  label: 'the average',
                  emphasis: 'normal' as const,
                },
              ]
            : []),
        ],
        caption:
          reveal > 0.3
            ? 'Further right than it looks. The tail is light but it has a long lever.'
            : 'Where does the balance point of this shape sit?',
      }),
    },
    {
      kind: 'counterexample',
      id: 'counter-average',
      claim: 'Knowing the average outcome tells you what a typical case looks like.',
      candidates: [
        { id: 'symmetric', label: 'A symmetric bell — most values near the middle' },
        { id: 'skewed', label: 'A long right tail — most values low, a few enormous' },
        { id: 'bimodal', label: 'Two separate humps — fast cached answers, slow uncached ones' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['skewed', 'bimodal'],
      hint: 'Try to imagine a shape where the average lands somewhere that almost never actually happens.',
      explanation:
        'Both the skewed and the bimodal shapes break it, and enterprise systems produce both constantly. With two humps — cached and uncached responses, say — the average falls in the valley between them, describing a response time that literally no user ever experiences. With a long tail, a few extreme cases drag the average away from the bulk. The average is only a good summary of a shape you have already looked at.',
    },
  ],
}

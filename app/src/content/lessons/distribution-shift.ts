import { ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

/** The world as it was when the training data was collected. */
const TRAINING: Vec2[] = [
  vec(-3.4, -2.1), vec(-2.6, -1.4), vec(-1.9, -1.1), vec(-1.1, -0.3),
  vec(-0.4, 0.2), vec(0.3, 0.6), vec(1.0, 1.2), vec(1.8, 1.6),
  vec(2.5, 2.2), vec(3.2, 2.6),
]

/** The fitted rule: what the model learned, and never unlearns. */
const FIT_SLOPE = 0.72
const FIT_INTERCEPT = 0.28
const predict = (x: number): number => FIT_SLOPE * x + FIT_INTERCEPT

/** How the world drifts: the relationship flattens and lifts over time. */
const drifted = (point: Vec2, amount: number): Vec2 =>
  vec(point.x, point.y * (1 - 0.55 * amount) + 2.4 * amount)

const fitLine = (emphasis: Mark['emphasis'] = 'focus'): Mark => ({
  kind: 'line',
  id: 'fit',
  through: vec(0, FIT_INTERCEPT),
  direction: vec(1, FIT_SLOPE),
  label: 'the model',
  emphasis,
})

const dots = (points: readonly Vec2[], emphasis: Mark['emphasis'], prefix: string): Mark[] =>
  points.map((at, i) => ({ kind: 'point', id: `${prefix}-${i}`, at, emphasis }))

/** Residuals drawn as segments from each observation to what the model expected. */
const errors = (points: readonly Vec2[]): Mark[] =>
  points.map((at, i) => ({
    kind: 'segment',
    id: `err-${i}`,
    from: at,
    to: vec(at.x, predict(at.x)),
    emphasis: 'muted',
  }))

const fitting = (t: number): SceneState => {
  const settled = ease(t)
  return {
    extent: EXTENT,
    marks: [
      { kind: 'grid', id: 'grid', extent: EXTENT, transform: [[1, 0], [0, 1]] },
      ...dots(TRAINING, 'focus', 'train'),
      ...(settled > 0.35 ? [fitLine()] : []),
      ...(settled > 0.7 ? errors(TRAINING) : []),
    ],
    caption:
      settled < 0.35
        ? 'What the world looked like when the data was collected.'
        : settled < 0.7
          ? 'The model is the line: the rule that sits closest to what was observed.'
          : 'It fits well. The gaps are small, and this is the number that goes in the launch deck.',
  }
}

const drifting = (t: number): SceneState => {
  const amount = ease(t)
  const now = TRAINING.map((p) => drifted(p, amount))
  const months = Math.round(amount * 18)
  return {
    extent: EXTENT,
    marks: [
      { kind: 'grid', id: 'grid', extent: EXTENT, transform: [[1, 0], [0, 1]] },
      ...dots(TRAINING, 'muted', 'train'),
      ...dots(now, 'focus', 'now'),
      fitLine(),
      ...errors(now),
      { kind: 'label', id: 'clock', at: vec(0, -4.4), text: months === 0 ? 'launch' : `${months} months later` },
    ],
    caption:
      amount < 0.15
        ? 'Nothing has changed yet.'
        : 'The world moves — new customers, new products, a competitor, a rule change. The line does not.',
  }
}

const confidence = (t: number): SceneState => {
  const amount = 1
  const now = TRAINING.map((p) => drifted(p, amount))
  const probe = vec(1.0, predict(1.0))
  const shown = ease(t) > 0.4
  return {
    extent: EXTENT,
    marks: [
      { kind: 'grid', id: 'grid', extent: EXTENT, transform: [[1, 0], [0, 1]] },
      ...dots(now, 'muted', 'now'),
      fitLine('normal'),
      { kind: 'point', id: 'answer', at: probe, label: shown ? 'answer: 1.0 (94% confident)' : 'answer', emphasis: 'focus' },
      ...(shown
        ? [
            { kind: 'point' as const, id: 'truth', at: vec(1.0, drifted(vec(1.0, predict(1.0)), amount).y), label: 'what actually happens now', emphasis: 'focus' as const },
            { kind: 'segment' as const, id: 'gap', from: probe, to: vec(1.0, drifted(vec(1.0, predict(1.0)), amount).y), emphasis: 'normal' as const },
          ]
        : []),
    ],
    caption: shown
      ? 'The gap is large and the confidence score is unchanged. Nothing in the system is aware that the ground moved.'
      : 'Ask the model a question today. It answers exactly as fluently as it did at launch.',
  }
}

const monitoring = (t: number): SceneState => {
  const p = ease(t)
  const bars: Mark[] = Array.from({ length: 12 }, (_, i) => {
    const height = 0.4 + i * 0.28 * p
    return {
      kind: 'segment',
      id: `bar-${i}`,
      from: vec(-3.6 + i * 0.62, -3),
      to: vec(-3.6 + i * 0.62, -3 + height),
      emphasis: height > 2.6 ? 'focus' : 'normal',
    }
  })
  return {
    extent: EXTENT,
    marks: [
      { kind: 'line', id: 'axis', through: vec(0, -3), direction: vec(1, 0), emphasis: 'muted' },
      ...bars,
      { kind: 'line', id: 'threshold', through: vec(0, -0.4), direction: vec(1, 0), label: 'retrain', emphasis: 'muted' },
      { kind: 'label', id: 'x', at: vec(0, -4.3), text: 'measured error, month by month' },
    ],
    caption:
      p > 0.6
        ? 'Measured continuously, the decay is obvious months before anyone complains.'
        : 'The only defence is to keep measuring against fresh, labelled reality.',
  }
}

export const distributionShift: Lesson = {
  id: 'distribution-shift',
  pcm: 'VII.10',
  title: 'Distribution Shift',
  summary: 'Why an AI system quietly decays while continuing to sound completely certain — and what that does to a business case.',
  prerequisites: ['probability-distribution'],

  sections: [
    {
      id: 'fitting',
      heading: 'A model is a fitted shape',
      prose: [
        'Strip away the vocabulary and a trained model is a rule fitted to observations: find the shape that sits closest to what we saw, then use it to answer questions about what we have not seen.',
        'Here it is a line, because a line is drawable. In practice it is a surface in hundreds of dimensions, but the logic is identical and so is the vulnerability.',
        'The fit is good. The gaps are small. This is the accuracy figure that appears in the business case, and on the day it is measured it is entirely honest.',
      ],
      scene: fitting,
    },
    {
      id: 'drifting',
      heading: 'Then the world moves',
      prose: [
        'Your customer mix changes. A product launches. A competitor does something. A regulation lands. Inflation shifts what a "large" order means. None of this is unusual — it is simply what a business does over eighteen months.',
        'The observations move. The fitted line does not, because nothing has told it to. Statisticians call the mismatch distribution shift, and it is not a bug that gets patched. It is a property of the arrangement: you fitted a shape to a world, and then you kept the shape while the world carried on.',
        'Watch the gaps open up. Nobody did anything wrong. That is the uncomfortable part.',
      ],
      scene: drifting,
    },
    {
      id: 'confidence',
      heading: 'Confidence does not decay with accuracy',
      prose: [
        'Here is what makes this genuinely dangerous rather than merely annoying. The model does not get quieter as it gets wronger.',
        'Its confidence is computed from its own internal fit, not from any comparison with the world. So it answers today with precisely the assurance it had at launch, while being materially wrong, and there is no signal anywhere in the output that anything has changed.',
        'A system that failed loudly would be a manageable operational problem. This one fails silently and fluently, which is why it is usually a customer, an auditor or a journalist who finds it first.',
      ],
      scene: confidence,
    },
    {
      id: 'monitoring',
      heading: 'So you measure, or you find out',
      prose: [
        'There is no clever fix. There is only measurement: hold back fresh, labelled examples of what actually happened, and keep scoring the model against them.',
        'Do that and the decay is a visible slope with months of warning on it. Skip it and the first signal is an incident.',
        'The commercial consequence is the one worth carrying into your next investment committee. An AI system is not an asset that holds its value the way a database does. It has a decay rate. If the business case has no standing line for continuous evaluation and periodic retraining, the case is not merely incomplete — it is overstated, and the overstatement lands in year two, after the sponsor who approved it has moved on.',
      ],
      scene: monitoring,
    },
  ],

  assessment: [
    {
      kind: 'predict',
      id: 'predict-drift',
      prompt: 'Eighteen months have passed and the world has drifted. The model still answers 1.0 for this input. Drag the marker to where the true value sits now.',
      initial: vec(1.0, predict(1.0)),
      truth: vec(1.0, drifted(vec(1.0, predict(1.0)), 1).y),
      tolerance: 0.7,
      scene: (guess, reveal) => {
        const now = TRAINING.map((p) => drifted(p, 1))
        const truth = vec(1.0, drifted(vec(1.0, predict(1.0)), 1).y)
        return {
          extent: EXTENT,
          marks: [
            { kind: 'grid', id: 'grid', extent: EXTENT, transform: [[1, 0], [0, 1]] },
            ...dots(now, 'muted', 'now'),
            fitLine('muted'),
            { kind: 'point', id: 'guess', at: guess, label: 'your answer', emphasis: 'focus' },
            ...(reveal > 0.3
              ? [{ kind: 'point' as const, id: 'truth', at: truth, label: 'where reality is', emphasis: 'focus' as const }]
              : []),
          ],
          caption: reveal > 0.3 ? 'The model is confidently answering from a world that no longer exists.' : 'Follow the current data, not the line.',
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-decay',
      claim: 'A model that was accurate at launch, and has not been changed since, is still accurate.',
      candidates: [
        { id: 'frozen', label: 'The code is frozen and the infrastructure is unchanged' },
        { id: 'world', label: 'The code is frozen, but the customers it serves have changed' },
        { id: 'tested', label: 'It still passes the original test set every night' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['world', 'tested'],
      hint: 'Accuracy is not a property of the model alone. It is a property of the model and the world together.',
      explanation:
        'Two of these break it. Changed customers break it obviously — the model is unchanged, but what it is being asked about is not. The nightly test set is the subtler and more common trap: it passes every night precisely because it is the *original* data, so it measures whether the code still runs, not whether the model is still right. A green dashboard built on a frozen test set is worse than no dashboard, because it manufactures confidence that the thing being feared is not happening.',
    },
  ],
}

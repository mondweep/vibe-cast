import { ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5
const COLS = 20
const ROWS = 10
const POPULATION = COLS * ROWS // 200 people

/** One person in 100 genuinely has the thing we are screening for. */
const AFFECTED = [37, 142]
/** The test never misses, but flags 5% of everyone else. */
const FALSE_POSITIVES = [4, 19, 58, 73, 96, 111, 128, 155, 171, 188]

const seatAt = (index: number): Vec2 => {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return vec(-4.4 + col * 0.463, 2.5 - row * 0.556)
}

const isAffected = (i: number): boolean => AFFECTED.includes(i)
const isFalsePositive = (i: number): boolean => FALSE_POSITIVES.includes(i)
const isFlagged = (i: number): boolean => isAffected(i) || isFalsePositive(i)

const crowd = (state: (index: number) => Mark['emphasis']): Mark[] =>
  Array.from({ length: POPULATION }, (_, i) => ({
    kind: 'point' as const,
    id: `p-${i}`,
    at: seatAt(i),
    emphasis: state(i),
  }))

const caption = (text: string): string => text

/** Two hundred people; two of them have the condition. */
const baseRate = (t: number): SceneState => {
  const revealed = ease(t) > 0.45
  return {
    extent: EXTENT,
    marks: [
      ...crowd((i) => (revealed && isAffected(i) ? 'focus' : 'muted')),
      { kind: 'label', id: 'n', at: vec(0, -4.1), text: revealed ? '2 of 200 — the base rate' : '200 people' },
    ],
    caption: revealed
      ? caption('Two people in two hundred actually have it. That figure — the base rate — is the one everybody forgets.')
      : caption('Two hundred people. Nothing yet distinguishes any of them.'),
  }
}

/** The test runs. It catches both real cases — and ten others. */
const testing = (t: number): SceneState => {
  const p = ease(t)
  const showTrue = p > 0.2
  const showFalse = p > 0.55
  return {
    extent: EXTENT,
    marks: [
      ...crowd((i) => {
        if (showTrue && isAffected(i)) return 'focus'
        if (showFalse && isFalsePositive(i)) return 'normal'
        return 'muted'
      }),
      {
        kind: 'label',
        id: 'n',
        at: vec(0, -4.1),
        text: showFalse ? '12 flagged: 2 real, 10 false alarms' : showTrue ? '2 correctly flagged' : 'run the test',
      },
    ],
    caption: showFalse
      ? caption('It never misses a real case. But it also flags five per cent of the healthy — and there are a great many more healthy people.')
      : showTrue
        ? caption('The test is excellent: it catches both real cases.')
        : caption('Now screen everybody with a test that is right almost all the time.'),
  }
}

/** Only the flagged remain. Two in twelve. */
const posterior = (t: number): SceneState => {
  const isolate = ease(t) > 0.4
  return {
    extent: EXTENT,
    marks: [
      ...crowd((i) => {
        if (!isFlagged(i)) return isolate ? 'muted' : 'muted'
        return isAffected(i) ? 'focus' : 'normal'
      }),
      ...(isolate
        ? [
            { kind: 'label' as const, id: 'odds', at: vec(0, -3.5), text: '2 of the 12 flagged actually have it' },
            { kind: 'label' as const, id: 'pct', at: vec(0, -4.2), text: 'about 17%' },
          ]
        : []),
    ],
    caption: isolate
      ? caption('You were flagged by a test that is right 95% of the time, and the odds you actually have it are about one in six.')
      : caption('Throw away everyone the test cleared. Twelve people remain.'),
  }
}

/** The same arithmetic, applied to a model's confidence score. */
const confidence = (t: number): SceneState => {
  const p = ease(t)
  const bars: { label: string; value: number; emphasis: Mark['emphasis'] }[] = [
    { label: 'stated confidence', value: 0.94, emphasis: 'normal' },
    { label: 'actually correct', value: 0.17 + (0.94 - 0.17) * (1 - p), emphasis: 'focus' },
  ]
  return {
    extent: EXTENT,
    marks: [
      { kind: 'line', id: 'axis', through: vec(0, -3), direction: vec(1, 0), emphasis: 'muted' },
      ...bars.flatMap((bar, i) => {
        const x = -1.6 + i * 3.2
        return [
          {
            kind: 'segment' as const,
            id: `bar-${i}`,
            from: vec(x, -3),
            to: vec(x, -3 + bar.value * 6),
            emphasis: bar.emphasis,
          },
          { kind: 'label' as const, id: `lab-${i}`, at: vec(x, -3.6), text: bar.label },
          { kind: 'label' as const, id: `val-${i}`, at: vec(x, -3 + bar.value * 6 + 0.4), text: `${Math.round(bar.value * 100)}%` },
        ]
      }),
    ],
    caption:
      p > 0.7
        ? caption('The score answers "how sure am I of this output". Your question was "how often is it right". Those are different quantities.')
        : caption('A model reports 94% confidence. It sounds like a probability of being correct.'),
  }
}

export const bayesianAnalysis: Lesson = {
  id: 'bayesian-analysis',
  pcm: 'III.3',
  title: 'Bayesian Analysis',
  summary: 'Why a 95%-accurate detector, pointed at a rare event, is wrong most of the time it fires — and what that means for every confidence score you are shown.',
  prerequisites: ['probability-distribution'],

  sections: [
    {
      id: 'base-rate',
      heading: 'Start with how common the thing is',
      prose: [
        'Two hundred people. Two of them have the thing you are looking for — fraud, a fault, a churn risk, a disease. One per cent.',
        'That number is the base rate, and it is the single most neglected quantity in applied analytics. Everybody asks how accurate the detector is. Almost nobody asks how rare the thing is.',
        'Hold on to the two. Everything that follows is a consequence of the fact that there are only two of them and a hundred and ninety-eight of everybody else.',
      ],
      scene: baseRate,
    },
    {
      id: 'test',
      heading: 'Now run a genuinely good test',
      prose: [
        'The detector is excellent. It never misses a real case — both are correctly flagged. And it raises a false alarm on only five per cent of healthy people.',
        'Five per cent sounds negligible. But five per cent of a hundred and ninety-eight is about ten, and ten is five times larger than two.',
        'Watch the false alarms appear. Nothing has gone wrong with the test. It is performing exactly to specification, and it is about to give you a deeply misleading answer.',
      ],
      scene: testing,
    },
    {
      id: 'posterior',
      heading: 'The result that surprises everybody',
      prose: [
        'Twelve people are flagged. Two of them have the condition. If you are one of the twelve, the probability you actually have it is about one in six — seventeen per cent.',
        'This is Bayes\' theorem, and the arithmetic is not the hard part. The hard part is that the intuition points the wrong way: a 95% accurate test feels like it should give you a 95% answer, and it gives you 17%.',
        'The rarer the thing you are hunting, the worse this gets. At one in ten thousand, an excellent detector produces almost nothing but false alarms — and the people receiving those alarms will, quite reasonably, stop believing them.',
      ],
      scene: posterior,
    },
    {
      id: 'confidence',
      heading: 'Which brings us to confidence scores',
      prose: [
        'A model tells you it is 94% confident. It is very hard not to read that as "wrong about one time in sixteen".',
        'It does not mean that. The score is computed from the model\'s own internal state — how strongly its machinery favoured this output over the alternatives. It is a statement about the model, not a measured frequency of being right in your world.',
        'To know how often it is actually right, somebody has to check outputs against reality and count. That number depends on your base rates, and it is routinely far below the confidence score. Anyone who has done the counting will show you; anyone who has not will quote the confidence figure. The question that separates them is simply: measured against what, and how many?',
      ],
      scene: confidence,
    },
  ],

  assessment: [
    {
      kind: 'predict',
      id: 'predict-posterior',
      prompt: 'The condition affects 1 in 100. The test never misses and false-alarms on 5%. Of everyone it flags, what fraction truly has it? Drag up the bar.',
      initial: vec(0, 0),
      truth: vec(0, (2 / 12 - 0.5) * 8),
      tolerance: 0.85,
      scene: (guess, reveal) => {
        const clamped = Math.max(-4, Math.min(4, guess.y))
        return {
          extent: EXTENT,
          marks: [
            { kind: 'segment', id: 'bar', from: vec(0, -4), to: vec(0, 4), label: 'all of them', emphasis: 'muted' },
            { kind: 'label', id: 'none', at: vec(0, -4.5), text: 'none of them' },
            { kind: 'point', id: 'guess', at: vec(0, clamped), label: `${Math.round((clamped / 8 + 0.5) * 100)}%`, emphasis: 'focus' },
            ...(reveal > 0.3
              ? [
                  {
                    kind: 'point' as const,
                    id: 'truth',
                    at: vec(1.7, (2 / 12 - 0.5) * 8),
                    label: '17% — 2 of the 12 flagged',
                    emphasis: 'focus' as const,
                  },
                ]
              : []),
          ],
          caption: reveal > 0.3 ? 'Ten false alarms drown two real cases, because there are so many more healthy people to be wrong about.' : 'How much should a flag actually worry you?',
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-accuracy',
      claim: 'A model that is 95% accurate will be right about 95% of the decisions we use it for.',
      candidates: [
        { id: 'balanced', label: 'Used on a population where half the cases are positive' },
        { id: 'rare', label: 'Used to find something that occurs in 1% of cases' },
        { id: 'more-data', label: 'Used on ten times as much data of the same kind' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['rare'],
      hint: 'Accuracy is measured across everything. Your decisions are only made on the cases it flags.',
      explanation:
        'Rarity breaks it. Overall accuracy averages across a population that is overwhelmingly negative, so a model can score 95% while being wrong about most of the cases it actually flags — and the flagged cases are the only ones anyone acts on. This is why headline accuracy is close to meaningless for rare-event detection, and why the figures to demand instead are precision and recall on the positives, measured at your own base rate rather than the vendor\'s benchmark.',
    },
  ],
}

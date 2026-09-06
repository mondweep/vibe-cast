import { ease, vec } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

/** A loss landscape with a shallow trap on the left and the true minimum on the right. */
const loss = (x: number): number =>
  0.16 * x * x + 1.15 * Math.sin(x * 1.35) - 0.35 * x - 0.6

const slope = (x: number): number => 0.32 * x + 1.15 * 1.35 * Math.cos(x * 1.35) - 0.35

const terrain = (emphasis: Mark['emphasis'] = 'muted'): Mark[] => {
  const marks: Mark[] = []
  for (let i = -46; i < 46; i += 1) {
    const a = i / 10
    const b = (i + 1) / 10
    marks.push({ kind: 'segment', id: `t-${i}`, from: vec(a, loss(a)), to: vec(b, loss(b)), emphasis })
  }
  return marks
}

/** Gradient descent from a starting point: follow the slope down, step by step. */
const descend = (from: number, steps: number): number => {
  let x = from
  for (let i = 0; i < steps; i += 1) x -= 0.28 * slope(x)
  return x
}

const rolling = (t: number): SceneState => {
  const steps = Math.round(ease(t) * 30)
  const x = descend(3.9, steps)
  return {
    extent: EXTENT,
    marks: [
      ...terrain('normal'),
      { kind: 'point', id: 'ball', at: vec(x, loss(x)), label: 'the model', emphasis: 'focus' },
      ...(steps > 0
        ? [{ kind: 'segment' as const, id: 'grad', from: vec(x, loss(x)), to: vec(x - 0.9, loss(x) - 0.9 * slope(x)), emphasis: 'muted' as const }]
        : []),
      { kind: 'label', id: 'n', at: vec(0, -4.3), text: `${steps} steps` },
    ],
    caption:
      steps === 0
        ? 'Training starts somewhere arbitrary. Height is error: how wrong the model currently is.'
        : 'Each step feels which way is downhill and moves a little that way. That is training, entire.',
  }
}

const trapped = (t: number): SceneState => {
  const steps = Math.round(ease(t) * 30)
  const stuck = descend(-3.6, steps)
  const best = descend(3.9, 60)
  return {
    extent: EXTENT,
    marks: [
      ...terrain('normal'),
      { kind: 'point', id: 'stuck', at: vec(stuck, loss(stuck)), label: 'settled here', emphasis: 'focus' },
      ...(steps > 18
        ? [{ kind: 'point' as const, id: 'best', at: vec(best, loss(best)), label: 'genuinely the best', emphasis: 'normal' as const }]
        : []),
    ],
    caption:
      steps > 18
        ? 'It has stopped in a dip that is not the deepest one. From inside, the two are indistinguishable — every direction is uphill.'
        : 'Start somewhere else and the same rule takes you somewhere else.',
  }
}

/** Nudging one point drags the whole surface: you cannot edit a single answer. */
const globalEffect = (t: number): SceneState => {
  const push = ease(t)
  const marks: Mark[] = []
  for (let i = -46; i < 46; i += 1) {
    const a = i / 10
    const b = (i + 1) / 10
    const bump = (x: number) => loss(x) - push * 1.6 * Math.exp(-Math.pow((x - 1.1) / 1.5, 2))
    marks.push({ kind: 'segment', id: `t-${i}`, from: vec(a, bump(a)), to: vec(b, bump(b)), emphasis: push > 0.1 ? 'focus' : 'normal' })
  }
  return {
    extent: EXTENT,
    marks: [
      ...terrain('muted'),
      ...marks,
      { kind: 'point', id: 'target', at: vec(1.1, loss(1.1) - push * 1.6), label: 'the one answer you wanted to fix', emphasis: 'focus' },
    ],
    caption:
      push > 0.15
        ? 'Correcting one answer deforms the landscape everywhere nearby. Things that were right can quietly stop being right.'
        : 'Suppose one particular answer is wrong and you want to fix it.',
  }
}

/** A constraint curve: the best point you are allowed is not the best point there is. */
const constrained = (t: number): SceneState => {
  const p = ease(t)
  const free = descend(3.9, 60)
  const limit = -0.6
  const allowed = Math.max(limit, free * (1 - p) + limit * p)
  return {
    extent: EXTENT,
    marks: [
      ...terrain('normal'),
      { kind: 'line', id: 'bound', through: vec(limit, 0), direction: vec(0, 1), label: 'policy limit', emphasis: 'normal' },
      { kind: 'point', id: 'free', at: vec(free, loss(free)), label: 'unconstrained best', emphasis: 'muted' },
      { kind: 'point', id: 'allowed', at: vec(allowed, loss(allowed)), label: 'best you may have', emphasis: 'focus' },
    ],
    caption:
      p > 0.6
        ? 'The best permitted answer sits against the boundary — worse than the free optimum, and that gap is the price of the constraint.'
        : 'Now forbid part of the space: a safety rule, a budget, a regulation.',
  }
}

export const optimization: Lesson = {
  id: 'optimization',
  pcm: 'III.64',
  title: 'Optimization',
  summary: 'What "training" actually does, why you cannot simply tell a model a fact, and what a guardrail costs you.',
  prerequisites: [],

  sections: [
    {
      id: 'rolling',
      heading: 'Training is walking downhill',
      prose: [
        'The landscape is error: how wrong the model is for each possible setting of its parameters. Low ground is good. Training means starting somewhere arbitrary and repeatedly stepping downhill.',
        'That is the entire mechanism. Feel the slope where you are standing, take a small step in the downhill direction, repeat a few million times. Nobody designs the destination; it is wherever the walk ends up.',
        'The real landscape has billions of dimensions rather than one, but nothing about the picture changes — you still only ever know the slope directly beneath your feet.',
      ],
      scene: rolling,
    },
    {
      id: 'trapped',
      heading: 'You only know the ground you are standing on',
      prose: [
        'Start the same procedure somewhere else and it finishes somewhere else — in a dip that is not the deepest available.',
        'From inside that dip there is no signal that a better one exists. Every direction leads upward, which is precisely the condition for stopping. The walk cannot see over the ridge.',
        'This is why two training runs of the same system on the same data produce different models, and why "we retrained it" is not a guarantee of improvement. It is also why the honest answer to "is this the best model?" is almost always "it is a good one we could reach from where we started".',
      ],
      scene: trapped,
    },
    {
      id: 'global',
      heading: 'Why you cannot just tell it a fact',
      prose: [
        'Here is the thing executives find most surprising. Suppose one specific answer is wrong and you want it corrected. There is no field to edit. The only lever is to add examples and let the walk continue — which deforms the whole landscape around that point.',
        'Watch what happens to the neighbourhood. Answers that were right can quietly stop being right, and nothing announces it.',
        'This is the mechanism behind "we fixed that and something else broke", and it is why every fine-tuning cycle needs a regression suite of things that were already correct. A model is not a database with rows you can update. It is a shape, and you can only push on the whole shape.',
      ],
      scene: globalEffect,
    },
    {
      id: 'constrained',
      heading: 'Every guardrail has a price, and you can measure it',
      prose: [
        'Now add a constraint: a safety rule, a compliance boundary, a cost ceiling. Part of the landscape is out of bounds.',
        'The best permitted answer now sits pressed against the boundary — and it is worse than the unconstrained one. Lagrange\'s insight was that the size of that gap is itself a meaningful number: it tells you exactly what the constraint is costing you.',
        'That reframes an argument that usually goes nowhere. "Do we want safety or performance" is unanswerable. "This control costs us four points of accuracy — is that worth it" is a decision a board can actually take, and the mathematics says the number exists and can be measured.',
      ],
      scene: constrained,
    },
  ],

  assessment: [
    {
      kind: 'predict',
      id: 'predict-descent',
      prompt: 'A model starts training at the far left of this landscape. Drag the marker to where you think it settles.',
      initial: vec(0, 2),
      truth: vec(descend(-3.6, 60), loss(descend(-3.6, 60))),
      tolerance: 0.9,
      scene: (guess, reveal) => {
        const settled = descend(-3.6, 60)
        return {
          extent: EXTENT,
          marks: [
            ...terrain('normal'),
            { kind: 'point', id: 'start', at: vec(-3.6, loss(-3.6)), label: 'starts here', emphasis: 'muted' },
            { kind: 'point', id: 'guess', at: guess, label: 'your answer', emphasis: 'focus' },
            ...(reveal > 0.3
              ? [{ kind: 'point' as const, id: 'truth', at: vec(settled, loss(settled)), label: 'settles here', emphasis: 'focus' as const }]
              : []),
          ],
          caption: reveal > 0.3 ? 'It stops at the first dip it reaches — not the deepest one on the page.' : 'Downhill from the left. Where does it stop?',
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-training',
      claim: 'If we retrain the model on more data, it will get better.',
      candidates: [
        { id: 'more-same', label: 'More data of exactly the same kind' },
        { id: 'different-start', label: 'Same data, but the run starts from a different place and lands in a worse dip' },
        { id: 'corrections', label: 'Extra examples added to fix specific wrong answers' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['different-start', 'corrections'],
      hint: 'Two things can go wrong: where the walk ends up, and what happens to everything you were not trying to change.',
      explanation:
        'Both break it. A different starting point can land the walk in a worse dip on the same data — which is why retraining needs evaluating, not assuming. And targeted corrections are worse than they look: they deform the landscape around the thing you fixed, so answers that were previously right can regress. Neither failure announces itself. This is why a regression suite of already-correct behaviour is not optional, and why "we added more data" is a description of activity rather than of improvement.',
    },
  ],
}

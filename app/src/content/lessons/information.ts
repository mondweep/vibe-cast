import { ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

/** Surprise, measured in bits: how much you learn from an outcome you thought unlikely. */
const surprise = (probability: number): number => -Math.log2(Math.max(probability, 1e-6))

const bar = (id: string, x: number, height: number, label: string, emphasis: Mark['emphasis']): Mark[] => [
  { kind: 'segment', id, from: vec(x, -3), to: vec(x, -3 + height), emphasis },
  { kind: 'label', id: `${id}-lab`, at: vec(x, -3.6), text: label },
]

/** Common outcomes tell you little; rare ones tell you a lot. */
const surpriseScene = (t: number): SceneState => {
  const grown = ease(t)
  const cases = [
    { p: 0.9, label: '"the"' },
    { p: 0.5, label: 'coin toss' },
    { p: 0.1, label: 'unusual word' },
    { p: 0.01, label: 'a name you invented' },
  ]
  return {
    extent: EXTENT,
    marks: [
      { kind: 'line', id: 'axis', through: vec(0, -3), direction: vec(1, 0), emphasis: 'muted' },
      ...cases.flatMap((c, i) =>
        bar(`b-${i}`, -3.3 + i * 2.2, surprise(c.p) * 0.72 * grown, c.label, i === 3 ? 'focus' : 'normal'),
      ),
      { kind: 'label', id: 'y', at: vec(0, -4.3), text: 'information carried, in bits' },
    ],
    caption:
      grown > 0.7
        ? 'A word you expected tells you almost nothing. A word you did not expect tells you a great deal. Information is surprise.'
        : 'How much does each outcome actually tell you?',
  }
}

/** Predictable structure is squeezed out; only the unpredictable part must be stored. */
const compression = (t: number): SceneState => {
  const squeeze = ease(t)
  const original = 16
  const kept = Math.max(4, Math.round(original * (1 - squeeze * 0.72)))
  const blocks: Mark[] = Array.from({ length: original }, (_, i) => {
    const keep = i < kept
    const x = -4.2 + i * 0.56
    return {
      kind: 'segment',
      id: `blk-${i}`,
      from: vec(x, 0.6),
      to: vec(x, 0.6 + (keep ? 1.6 : 0.12)),
      emphasis: keep ? 'focus' : 'muted',
    }
  })
  return {
    extent: EXTENT,
    marks: [
      ...blocks,
      { kind: 'label', id: 'n', at: vec(0, -1.2), text: `${kept} of ${original} units needed` },
      { kind: 'label', id: 'note', at: vec(0, -2.4), text: squeeze > 0.6 ? 'the predictable part was never worth storing' : 'store everything' },
    ],
    caption:
      squeeze > 0.6
        ? 'Compression is exactly this: find what was predictable, stop storing it, keep only the surprises.'
        : 'Raw text stores every symbol, including all the ones you could have guessed.',
  }
}

/** A model as lossy compression: structure survives, specifics do not. */
const lossy = (t: number): SceneState => {
  const p = ease(t)
  const originals: Vec2[] = [
    vec(-3.4, 2.2), vec(-2.4, 2.7), vec(-1.2, 1.9), vec(-0.2, 2.4),
    vec(1.0, 1.7), vec(2.2, 2.3), vec(3.2, 1.6),
  ]
  const line = (x: number): number => 2.1 - 0.06 * x
  return {
    extent: EXTENT,
    marks: [
      ...originals.map((at, i) => ({
        kind: 'point' as const,
        id: `o-${i}`,
        at: vec(at.x, at.y * (1 - p) + line(at.x) * p),
        emphasis: 'focus' as const,
      })),
      ...(p > 0.5
        ? [{ kind: 'line' as const, id: 'kept', through: vec(0, 2.1), direction: vec(1, -0.06), label: 'what the model keeps', emphasis: 'normal' as const }]
        : []),
      { kind: 'label', id: 'note', at: vec(0, -1.6), text: p > 0.6 ? 'the pattern survives; the individual facts do not' : 'training data' },
      ...(p > 0.8
        ? [{ kind: 'label' as const, id: 'note2', at: vec(0, -2.8), text: 'asked for a specific one, it reconstructs from the pattern' }]
        : []),
    ],
    caption:
      p > 0.6
        ? 'The regularities are kept because they are cheap. The particulars are discarded because they are expensive and rare.'
        : 'A model is trained on far more text than it could possibly store.',
  }
}

/** Redundancy: spare capacity is what lets you detect and survive an error. */
const redundancy = (t: number): SceneState => {
  const p = ease(t)
  const withChecks = p > 0.45
  const corrupted = p > 0.75
  const cells: Mark[] = Array.from({ length: 9 }, (_, i) => {
    const x = -3.4 + (i % 3) * 1.1
    const y = 2.0 - Math.floor(i / 3) * 1.1
    const bad = corrupted && i === 4
    return { kind: 'point', id: `c-${i}`, at: vec(x, y), emphasis: bad ? 'focus' : 'normal' }
  })
  const checks: Mark[] = withChecks
    ? Array.from({ length: 3 }, (_, i) => ({
        kind: 'point' as const,
        id: `chk-${i}`,
        at: vec(0.5, 2.0 - i * 1.1),
        label: i === 0 ? 'checks' : '',
        emphasis: corrupted && i === 1 ? 'focus' : ('muted' as const),
      }))
    : []
  return {
    extent: EXTENT,
    marks: [
      ...cells,
      ...checks,
      {
        kind: 'label',
        id: 'note',
        at: vec(0, -1.8),
        text: corrupted ? 'one value is wrong — and the checks say which' : withChecks ? 'spare capacity added' : 'data, stored exactly once',
      },
    ],
    caption: corrupted
      ? 'The corruption is detectable only because you spent capacity on redundancy before you needed it.'
      : withChecks
        ? 'Redundancy looks like waste right up until something goes wrong.'
        : 'Store it once and an error is undetectable: there is nothing to compare against.',
  }
}

export const information: Lesson = {
  id: 'information',
  pcm: 'VII.6',
  title: 'Information and Entropy',
  summary: 'Why a model cannot reliably quote the documents it was trained on — and why that is compression working correctly, not a defect.',
  prerequisites: ['probability-distribution'],

  sections: [
    {
      id: 'surprise',
      heading: 'Information is surprise',
      prose: [
        'Shannon\'s idea, and it is one of the most useful in applied mathematics: the information content of a message is how much it reduces your uncertainty.',
        'An outcome you were already expecting carries almost nothing. Told that the next word is "the", you have learned close to zero. Told that it is a name you have never encountered, you have learned a great deal — and that is measurable, in bits.',
        'This inverts the intuition that common things are important. In information terms the common parts of any message are the cheap ones, precisely because they were predictable.',
      ],
      scene: surpriseScene,
    },
    {
      id: 'compression',
      heading: 'Compression removes the predictable',
      prose: [
        'If the predictable parts carry no information, you need not store them. Work out what could have been guessed, throw it away, and keep only the surprises. That is compression, and Shannon proved there is a hard floor below which no scheme can go.',
        'A language model is a very good predictor of the next word. Any very good predictor is, by this argument, a very good compressor — the two are the same capability viewed from different ends.',
        'That equivalence is not a metaphor. It is the most useful single sentence for understanding what these systems are: a model of your documents is a compression of them.',
      ],
      scene: compression,
    },
    {
      id: 'lossy',
      heading: 'And the compression is lossy',
      prose: [
        'Now the consequence people find hardest. A model is trained on vastly more text than it has capacity to hold, so it cannot be storing the text. It stores the *regularities* — what tends to follow what, how a contract is phrased, the shape of an invoice.',
        'Watch the individual points collapse onto the pattern. The structure survives because it is cheap and repeated. The particulars go, because each one is expensive and appears once.',
        'So when you ask for a specific fact, the machinery does what it always does: reconstructs a plausible answer from the pattern. When the fact survived compression the reconstruction is right. When it did not, you get something correctly shaped and untrue — and there is no internal difference between the two cases. That is what "hallucination" is. It is not a bug that a future release removes; it is what lossy compression feels like from the outside.',
      ],
      scene: lossy,
    },
    {
      id: 'redundancy',
      heading: 'So put the redundancy back deliberately',
      prose: [
        'Shannon\'s other result runs the opposite way. If you want to survive errors, you must spend capacity on redundancy — extra information whose only job is to let you detect and correct corruption. Every error-correcting code, every checksum, every RAID array is this.',
        'The parallel for AI systems is exact and it is the practical instruction in this lesson. Compression removed the redundancy that would have let you tell a reconstruction from a recollection. Nothing inside the model can put it back.',
        'So it has to be added outside. Retrieval that supplies the actual source document, citations checked against real text, a second system that verifies rather than generates. These feel like overhead until the first confidently wrong answer reaches a customer — and mathematically they are not overhead at all. They are the redundancy the compression removed, restored where it can be checked.',
      ],
      scene: redundancy,
    },
  ],

  assessment: [
    {
      kind: 'counterexample',
      id: 'counter-recall',
      claim: 'A model trained on our documents can reliably quote them back.',
      candidates: [
        { id: 'boilerplate', label: 'A clause that appears in thousands of our contracts' },
        { id: 'unique', label: 'A single figure that appears once, in one document' },
        { id: 'recent', label: 'A paragraph repeated across many recent filings' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['unique'],
      hint: 'Ask which facts were expensive to store, and what a compressor does with expensive rare things.',
      explanation:
        'The unique figure breaks it. Repeated boilerplate survives compression easily — it is a strong regularity, cheap to keep, and the model will reproduce it well. A number appearing exactly once is the opposite: maximally surprising, therefore maximally expensive, therefore the first thing discarded. Asked for it, the model reconstructs something plausibly shaped and often wrong. This is why "it quoted our standard terms perfectly" is no evidence at all that it will quote a specific figure correctly, and why the facts most worth retrieving are precisely the ones least likely to have survived.',
    },
    {
      kind: 'predict',
      id: 'predict-surprise',
      prompt: 'An outcome you thought had a 1-in-1000 chance actually happens. How many bits of information is that? Drag up the bar — the top is 16 bits.',
      initial: vec(0, -4),
      truth: vec(0, (surprise(0.001) / 16) * 8 - 4),
      tolerance: 0.9,
      scene: (guess, reveal) => {
        const clamped = Math.max(-4, Math.min(4, guess.y))
        const bits = ((clamped + 4) / 8) * 16
        return {
          extent: EXTENT,
          marks: [
            { kind: 'segment', id: 'bar', from: vec(0, -4), to: vec(0, 4), label: '16 bits', emphasis: 'muted' },
            { kind: 'label', id: 'zero', at: vec(0, -4.5), text: '0 bits' },
            { kind: 'point', id: 'guess', at: vec(0, clamped), label: `${bits.toFixed(1)} bits`, emphasis: 'focus' },
            ...(reveal > 0.3
              ? [{ kind: 'point' as const, id: 'truth', at: vec(1.8, (surprise(0.001) / 16) * 8 - 4), label: '≈10 bits', emphasis: 'focus' as const }]
              : []),
          ],
          caption:
            reveal > 0.3
              ? 'Roughly ten bits — about the same as one rare word. Surprise grows with the logarithm, so a thousandfold drop in probability is only ten doublings.'
              : 'How much have you learned?',
        }
      },
    },
  ],
}

/**
 * The AI track: why these concepts, in this order.
 *
 * The Companion maps pure mathematics — 288 articles, most of which have
 * nothing to say about AI. This track is the curated path through the part
 * that does. Each entry records what intuition it is meant to leave you with,
 * so a reader can see the objective rather than infer it.
 */

import type { Lesson } from '../domain/lesson'
import { lessonById } from './index'

export type Step = {
  readonly lessonId: string
  /** The AI intuition this lesson exists to build. One sentence, plainly put. */
  readonly gives: string
  readonly lesson: Lesson
}

export type Stage = {
  readonly id: string
  readonly title: string
  readonly question: string
  readonly steps: readonly Step[]
}

const step = (lessonId: string, gives: string): Step => {
  const lesson = lessonById(lessonId)
  if (!lesson) throw new Error(`track references unknown lesson: ${lessonId}`)
  return { lessonId, gives, lesson }
}

export const trackPurpose = {
  title: 'Understanding AI, from the mathematics up',
  lede:
    'You do not need to do any mathematics to use this. You need to have seen a handful of ideas move, because every one of them is an idea about change — and a static definition of a moving thing teaches nothing.',
  body: [
    'These twelve concepts are chosen for one purpose: to make the behaviour of AI systems predictable to someone who has to buy, govern or depend on them. Each lesson leads with something that moves, and only then gives the formal statement.',
    'They are not a course in mathematics, and they are not the whole Companion — most of that book is magnificent and irrelevant here. This is the part that pays for itself.',
  ],
  closing:
    'Work through the track and you should be able to hear a claim about an AI system and know which question makes it fall apart. That is the entire objective.',
}

export const stages: readonly Stage[] = [
  {
    id: 'made-of',
    title: 'What a model is made of',
    question: 'What is actually inside the thing you are being sold?',
    steps: [
      step('vector-space', 'Meaning gets turned into arrows you can add and scale. Everything downstream assumes this.'),
      step('linear-map', 'Most of what a model does is this transformation, which is why models are big and why they need the hardware they do.'),
      step('dimension', 'What "1,536 dimensions" counts, and why the real variation in your data is far lower than the column count suggests.'),
    ],
  },
  {
    id: 'finds',
    title: 'How it finds things',
    question: 'Why does retrieval work, and how does it fail on your documents?',
    steps: [
      step('hilbert-space', 'Cosine similarity, the operation under every relevance score — including the case where it confidently matches the opposite of your policy.'),
      step('metric-space', 'Retrieval is geometry, and a term your organisation invented has no position, so the system answers from whatever happens to be nearby.'),
      step('high-dimensional-geometry', 'Why a similarity threshold tuned on a pilot corpus is simply wrong at production scale — the single most expensive misunderstanding here.'),
    ],
  },
  {
    id: 'uncertain',
    title: 'Why it is uncertain',
    question: 'What does the system actually know, and what is it reconstructing?',
    steps: [
      step('probability-distribution', 'An answer is a draw from a shape, not a fact — so one successful demo is one draw and tells you very little.'),
      step('bayesian-analysis', 'Why a 95% accurate detector aimed at a rare event is wrong most times it fires, and why a confidence score is not a probability of being right.'),
      step('information', 'A model is a lossy compression of its training data, which is why it cannot reliably quote a figure that appeared once.'),
    ],
  },
  {
    id: 'built',
    title: 'How it is built, and how it decays',
    question: 'What happens after you buy it?',
    steps: [
      step('optimization', 'What training does, why you cannot simply tell a model a fact, and how to price a guardrail instead of arguing about it.'),
      step('graphs', 'Why long context costs what it does, and how to find the blast radius of an agent architecture before someone else does.'),
      step('distribution-shift', 'An AI system decays while sounding exactly as confident as it did at launch — so the business case needs a line for that.'),
    ],
  },
]

export const trackSteps = (): readonly Step[] => stages.flatMap((stage) => stage.steps)

export const stepFor = (lessonId: string): Step | undefined =>
  trackSteps().find((s) => s.lessonId === lessonId)

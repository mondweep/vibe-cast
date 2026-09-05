/**
 * Lesson shape and its runtime schema (ADR 0004).
 *
 * Lessons are TypeScript modules, not MDX or CMS content, because the valuable
 * structure here is the typed prerequisite graph, the scene builders and the
 * assessment predicates — all of which degrade to untyped props anywhere else.
 */

import { z } from 'zod'
import type { Vec2 } from './geometry'
import type { SceneState } from './scene'

/** Scene as a function of progress through a section: 0 on entry, 1 on exit. */
export type SceneBuilder = (t: number) => SceneState

export type Section = {
  readonly id: string
  readonly heading: string
  readonly prose: readonly string[]
  readonly scene: SceneBuilder
  /** Prerequisite concept to offer as a hyperframe inset while this section is on screen. */
  readonly inset?: string
}

/** Predict where something lands, then watch the animation adjudicate. */
export type PredictItem = {
  readonly kind: 'predict'
  readonly id: string
  readonly prompt: string
  readonly initial: Vec2
  readonly truth: Vec2
  /** Distance in world units within which a prediction counts as right. */
  readonly tolerance: number
  readonly scene: (guess: Vec2, reveal: number) => SceneState
}

/** Build an object satisfying a constraint. Graded by predicate, not answer key. */
export type ConstructItem = {
  readonly kind: 'construct'
  readonly id: string
  readonly prompt: string
  readonly initial: readonly Vec2[]
  readonly satisfies: (vectors: readonly Vec2[]) => { ok: boolean; reason: string }
  readonly scene: (vectors: readonly Vec2[]) => SceneState
}

/** Find the case that breaks a plausible claim — or establish that none does. */
export type CounterexampleItem = {
  readonly kind: 'counterexample'
  readonly id: string
  readonly claim: string
  readonly candidates: readonly { readonly id: string; readonly label: string }[]
  /** Candidate ids that genuinely refute the claim. Empty means the claim is true. */
  readonly refutedBy: readonly string[]
  readonly hint: string
  readonly explanation: string
}

export type AssessmentItem = PredictItem | ConstructItem | CounterexampleItem

export type Lesson = {
  readonly id: string
  /** Article in the Companion this lesson corresponds to, e.g. "I.3". */
  readonly pcm: string
  readonly title: string
  readonly summary: string
  readonly prerequisites: readonly string[]
  readonly sections: readonly Section[]
  readonly assessment: readonly AssessmentItem[]
}

/**
 * Runtime schema. Behaviour (scene builders, predicates) is checked by the type
 * system; this validates the data that the graph tooling and CI depend on.
 */
export const lessonSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'lesson ids are lowercase kebab-case'),
  pcm: z.string().regex(/^[IVX]+\.\d+$/, 'pcm must be a Companion article id like "III.21"'),
  title: z.string().min(1),
  summary: z.string().min(1),
  prerequisites: z.array(z.string()),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        heading: z.string().min(1),
        prose: z.array(z.string().min(1)).min(1),
        scene: z.function(),
        inset: z.string().optional(),
      }),
    )
    .min(1, 'a lesson needs at least one section'),
  assessment: z.array(z.object({ kind: z.string(), id: z.string().min(1) })).min(1,
    'a lesson without assessment cannot establish mastery'),
})

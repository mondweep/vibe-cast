/**
 * The prerequisite DAG — which is the curriculum (PRD §5.2).
 *
 * Prerequisites *advise* by default and gate only boss levels, so the graph
 * guides a route through the Companion without becoming a cage (PRD §10).
 */

import type { Lesson } from './lesson'

export type MasteryLevel = number // 0 (unseen) to 1 (solid)

export const MASTERY_THRESHOLD = 0.7

export type MasteryState = ReadonlyMap<string, MasteryLevel>

export type GraphProblem =
  | { kind: 'unknown-prerequisite'; lesson: string; missing: string }
  | { kind: 'cycle'; path: readonly string[] }
  | { kind: 'duplicate-id'; lesson: string }

/**
 * Validates the graph. Run in CI so a broken prerequisite or a cycle fails the
 * build rather than surprising a learner (ADR 0004).
 */
export const validateGraph = (lessons: readonly Lesson[]): GraphProblem[] => {
  const problems: GraphProblem[] = []
  const byId = new Map<string, Lesson>()

  for (const lesson of lessons) {
    if (byId.has(lesson.id)) problems.push({ kind: 'duplicate-id', lesson: lesson.id })
    byId.set(lesson.id, lesson)
  }

  for (const lesson of lessons) {
    for (const prerequisite of lesson.prerequisites) {
      if (!byId.has(prerequisite)) {
        problems.push({ kind: 'unknown-prerequisite', lesson: lesson.id, missing: prerequisite })
      }
    }
  }

  // Depth-first search, reporting the actual cycle path rather than just "a cycle exists".
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []

  const visit = (id: string): void => {
    const status = state.get(id)
    if (status === 'done') return
    if (status === 'visiting') {
      const start = stack.indexOf(id)
      problems.push({ kind: 'cycle', path: [...stack.slice(start), id] })
      return
    }
    state.set(id, 'visiting')
    stack.push(id)
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
      if (byId.has(prerequisite)) visit(prerequisite)
    }
    stack.pop()
    state.set(id, 'done')
  }

  for (const lesson of lessons) visit(lesson.id)
  return problems
}

export const masteryOf = (mastery: MasteryState, id: string): MasteryLevel => mastery.get(id) ?? 0

/** A lesson is ready when every prerequisite is at or above the mastery threshold. */
export const isReady = (lesson: Lesson, mastery: MasteryState): boolean =>
  lesson.prerequisites.every((p) => masteryOf(mastery, p) >= MASTERY_THRESHOLD)

/** Prerequisites the learner has not yet mastered — shown as advice, not a lock. */
export const missingPrerequisites = (lesson: Lesson, mastery: MasteryState): readonly string[] =>
  lesson.prerequisites.filter((p) => masteryOf(mastery, p) < MASTERY_THRESHOLD)

/** Ready but not yet mastered: what the learner should do next. */
export const frontier = (lessons: readonly Lesson[], mastery: MasteryState): readonly Lesson[] =>
  lessons.filter((l) => masteryOf(mastery, l.id) < MASTERY_THRESHOLD && isReady(l, mastery))

/** A suggested route: prerequisites always before the lessons that need them. */
export const suggestedOrder = (lessons: readonly Lesson[]): readonly Lesson[] => {
  const byId = new Map(lessons.map((l) => [l.id, l]))
  const emitted = new Set<string>()
  const order: Lesson[] = []

  const emit = (lesson: Lesson): void => {
    if (emitted.has(lesson.id)) return
    emitted.add(lesson.id) // set before recursing so a cycle cannot loop forever
    for (const prerequisite of lesson.prerequisites) {
      const parent = byId.get(prerequisite)
      if (parent) emit(parent)
    }
    order.push(lesson)
  }

  for (const lesson of lessons) emit(lesson)
  return order
}

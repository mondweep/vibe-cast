/**
 * Content validation (ADR 0004). These run in CI, so a broken citation, a
 * dangling prerequisite or a cycle fails the build rather than reaching a learner.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lessons } from './index'
import { lessonSchema } from '../domain/lesson'
import { validateGraph } from '../domain/graph'
import { describeScene } from '../domain/scene'

type Curriculum = {
  parts: { id: string; articles: { id: string; title: string }[] }[]
}

// Vitest runs from the app root; the citation index lives at the repo root.
const curriculum: Curriculum = JSON.parse(
  readFileSync(resolve(process.cwd(), '../data/curriculum.json'), 'utf-8'),
)

const knownArticles = new Set(
  curriculum.parts.flatMap((part) => part.articles.map((article) => article.id)),
)

describe('lesson content', () => {
  it('has lessons to serve', () => {
    expect(lessons.length).toBeGreaterThan(0)
  })

  it.each(lessons.map((l) => [l.id, l] as const))('%s satisfies the lesson schema', (_id, lesson) => {
    expect(() => lessonSchema.parse(lesson)).not.toThrow()
  })

  it.each(lessons.map((l) => [l.id, l] as const))('%s cites a real Companion article', (_id, lesson) => {
    expect(knownArticles.has(lesson.pcm)).toBe(true)
  })

  it('forms a valid prerequisite graph', () => {
    expect(validateGraph(lessons)).toEqual([])
  })

  it.each(lessons.map((l) => [l.id, l] as const))(
    '%s renders a described scene at every point of every section',
    (_id, lesson) => {
      for (const section of lesson.sections) {
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const scene = section.scene(t)
          expect(scene.marks.length, `${section.id} at t=${t}`).toBeGreaterThan(0)
          expect(scene.caption.length, `${section.id} at t=${t}`).toBeGreaterThan(0)
          // Every scene must yield a usable text alternative (ADR 0003).
          expect(describeScene(scene).length).toBeGreaterThan(scene.caption.length - 1)
        }
      }
    },
  )

  it.each(lessons.map((l) => [l.id, l] as const))(
    '%s only offers hyperframe insets for real prerequisites',
    (_id, lesson) => {
      const ids = new Set(lessons.map((l) => l.id))
      for (const section of lesson.sections) {
        if (section.inset) expect(ids.has(section.inset)).toBe(true)
      }
    },
  )

  it('grades every counterexample item against a candidate that exists', () => {
    for (const lesson of lessons) {
      for (const item of lesson.assessment) {
        if (item.kind !== 'counterexample') continue
        const candidateIds = new Set(item.candidates.map((c) => c.id))
        for (const refuter of item.refutedBy) expect(candidateIds.has(refuter)).toBe(true)
        // "no counterexample" must always be offered, so hunting is not a reflex.
        expect(candidateIds.has('none')).toBe(true)
      }
    }
  })

  it('accepts a correct construction and rejects the starting position', () => {
    for (const lesson of lessons) {
      for (const item of lesson.assessment) {
        if (item.kind !== 'construct') continue
        // The initial arrangement must not already be the answer.
        expect(item.satisfies(item.initial).ok).toBe(false)
        expect(item.satisfies(item.initial).reason.length).toBeGreaterThan(0)
      }
    }
  })

  it('places every predict target within the scene it is shown in', () => {
    for (const lesson of lessons) {
      for (const item of lesson.assessment) {
        if (item.kind !== 'predict') continue
        const scene = item.scene(item.initial, 1)
        expect(Math.abs(item.truth.x)).toBeLessThanOrEqual(scene.extent)
        expect(Math.abs(item.truth.y)).toBeLessThanOrEqual(scene.extent)
        expect(item.tolerance).toBeGreaterThan(0)
      }
    }
  })
})

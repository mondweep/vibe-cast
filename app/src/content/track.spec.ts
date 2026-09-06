import { describe, expect, it } from 'vitest'
import { stages, stepFor, trackSteps } from './track'
import { lessons } from './index'
import { MASTERY_THRESHOLD, isReady } from '../domain/graph'

describe('the AI track', () => {
  it('covers every lesson exactly once', () => {
    const ids = trackSteps().map((s) => s.lessonId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(ids)).toEqual(new Set(lessons.map((l) => l.id)))
  })

  it('says what each lesson gives the reader', () => {
    for (const s of trackSteps()) expect(s.gives.length).toBeGreaterThan(40)
  })

  it('gives every stage a question it answers', () => {
    for (const stage of stages) {
      expect(stage.question).toMatch(/\?$/)
      expect(stage.steps.length).toBeGreaterThan(0)
    }
  })

  it('never places a lesson before one of its own prerequisites', () => {
    const order = trackSteps().map((s) => s.lessonId)
    for (const step of trackSteps()) {
      for (const prerequisite of step.lesson.prerequisites) {
        expect(order.indexOf(prerequisite), `${step.lessonId} needs ${prerequisite} first`)
          .toBeLessThan(order.indexOf(step.lessonId))
      }
    }
  })

  it('is walkable start to finish: each step is ready once the previous ones are mastered', () => {
    const mastered = new Map<string, number>()
    for (const step of trackSteps()) {
      expect(isReady(step.lesson, mastered), `${step.lessonId} is not reachable in track order`).toBe(true)
      mastered.set(step.lessonId, MASTERY_THRESHOLD)
    }
  })

  it('resolves a step for any lesson', () => {
    expect(stepFor('bayesian-analysis')?.gives).toContain('confidence')
    expect(stepFor('nonexistent')).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import {
  MASTERY_THRESHOLD,
  frontier,
  isReady,
  missingPrerequisites,
  suggestedOrder,
  validateGraph,
} from './graph'
import type { Lesson } from './lesson'

const lesson = (id: string, prerequisites: string[] = []): Lesson =>
  ({ id, pcm: 'I.3', title: id, summary: '', prerequisites, sections: [], assessment: [] }) as Lesson

const SET = lesson('set')
const VECTOR_SPACE = lesson('vector-space', ['set'])
const LINEAR_MAP = lesson('linear-map', ['vector-space'])
const EIGENVALUE = lesson('eigenvalue', ['linear-map'])
const CHAIN = [EIGENVALUE, LINEAR_MAP, VECTOR_SPACE, SET] // deliberately out of order

const mastered = (...ids: string[]) => new Map(ids.map((id) => [id, 1]))

describe('validateGraph', () => {
  it('passes a well-formed chain', () => {
    expect(validateGraph(CHAIN)).toEqual([])
  })

  it('names the prerequisite that does not exist', () => {
    const problems = validateGraph([lesson('eigenvalue', ['nonexistent'])])
    expect(problems).toEqual([
      { kind: 'unknown-prerequisite', lesson: 'eigenvalue', missing: 'nonexistent' },
    ])
  })

  it('reports the path of a cycle, not merely that one exists', () => {
    const problems = validateGraph([lesson('a', ['b']), lesson('b', ['a'])])
    const cycle = problems.find((p) => p.kind === 'cycle')
    expect(cycle).toBeDefined()
    expect(cycle!.kind === 'cycle' && cycle!.path).toContain('a')
    expect(cycle!.kind === 'cycle' && cycle!.path).toContain('b')
  })

  it('catches a duplicate lesson id', () => {
    const problems = validateGraph([lesson('set'), lesson('set')])
    expect(problems).toContainEqual({ kind: 'duplicate-id', lesson: 'set' })
  })
})

describe('isReady', () => {
  it('is true for a lesson with no prerequisites', () => {
    expect(isReady(SET, new Map())).toBe(true)
  })

  it('is false while a prerequisite is unmastered', () => {
    expect(isReady(LINEAR_MAP, new Map())).toBe(false)
  })

  it('becomes true once the prerequisite reaches the threshold', () => {
    expect(isReady(LINEAR_MAP, new Map([['vector-space', MASTERY_THRESHOLD]]))).toBe(true)
  })

  it('withdraws readiness when a prerequisite decays below the threshold', () => {
    expect(isReady(LINEAR_MAP, new Map([['vector-space', MASTERY_THRESHOLD - 0.01]]))).toBe(false)
  })
})

describe('missingPrerequisites', () => {
  it('lists what to study first, as advice rather than a lock', () => {
    expect(missingPrerequisites(LINEAR_MAP, new Map())).toEqual(['vector-space'])
    expect(missingPrerequisites(LINEAR_MAP, mastered('vector-space'))).toEqual([])
  })
})

describe('frontier', () => {
  it('offers only the next reachable step', () => {
    expect(frontier(CHAIN, new Map()).map((l) => l.id)).toEqual(['set'])
  })

  it('advances as concepts are mastered', () => {
    expect(frontier(CHAIN, mastered('set')).map((l) => l.id)).toEqual(['vector-space'])
  })

  it('excludes what is already mastered', () => {
    const ids = frontier(CHAIN, mastered('set', 'vector-space')).map((l) => l.id)
    expect(ids).not.toContain('set')
    expect(ids).toEqual(['linear-map'])
  })
})

describe('suggestedOrder', () => {
  it('puts every prerequisite before the lesson that needs it', () => {
    const ids = suggestedOrder(CHAIN).map((l) => l.id)
    expect(ids.indexOf('set')).toBeLessThan(ids.indexOf('vector-space'))
    expect(ids.indexOf('vector-space')).toBeLessThan(ids.indexOf('linear-map'))
    expect(ids.indexOf('linear-map')).toBeLessThan(ids.indexOf('eigenvalue'))
  })

  it('terminates on a cyclic graph instead of recursing forever', () => {
    expect(suggestedOrder([lesson('a', ['b']), lesson('b', ['a'])])).toHaveLength(2)
  })
})

import { describe, expect, it } from 'vitest'
import { describeScene, focused, type SceneState } from './scene'
import { IDENTITY, vec } from './geometry'

const scene: SceneState = {
  extent: 4,
  caption: 'The basis vectors before any transformation.',
  marks: [
    { kind: 'grid', id: 'g', extent: 4, transform: IDENTITY },
    { kind: 'vector', id: 'i', from: vec(0, 0), to: vec(1, 0), label: 'i', emphasis: 'focus' },
    { kind: 'vector', id: 'j', from: vec(0, 0), to: vec(0, 1), label: 'j' },
  ],
}

describe('describeScene', () => {
  it('builds a text alternative from the marks, not from a hand-written string', () => {
    const text = describeScene(scene)
    expect(text).toContain('The basis vectors before any transformation.')
    expect(text).toContain('i from (0, 0) to (1, 0)')
    expect(text).toContain('j from (0, 0) to (0, 1)')
  })

  it('omits the grid, which is context rather than content', () => {
    expect(describeScene(scene)).not.toContain('grid')
  })

  it('falls back to the caption alone when nothing is drawn', () => {
    expect(describeScene({ extent: 4, caption: 'An empty plane.', marks: [] })).toBe('An empty plane.')
  })
})

describe('focused', () => {
  it('picks out only what the learner should be looking at', () => {
    expect(focused(scene).map((m) => m.id)).toEqual(['i'])
  })
})

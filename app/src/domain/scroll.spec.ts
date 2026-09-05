import { describe, expect, it } from 'vitest'
import { computeProgress, type SectionGeometry } from './scroll'

const VIEWPORT = 800
// The anchor sits at scrollTop + 400, so these tops are reached at scrollTop 0,
// 600 and 1600 respectively.
const SECTIONS: SectionGeometry[] = [
  { id: 'intro', top: 400, height: 1000 },
  { id: 'transform', top: 1400, height: 1000 },
  { id: 'eigen', top: 2400, height: 1000 },
]

describe('computeProgress', () => {
  it('returns null when a lesson has no sections', () => {
    expect(computeProgress(0, VIEWPORT, [])).toBeNull()
  })

  it('holds the first section at its opening state before the lesson starts', () => {
    const progress = computeProgress(0, VIEWPORT, SECTIONS)!
    expect(progress.sectionId).toBe('intro')
    expect(progress.withinSection).toBe(0)
    expect(progress.overall).toBe(0)
  })

  it('advances within a section as the reader scrolls through it', () => {
    // anchor = 500 + 400 = 900, which is 500 into the 1000-high intro section
    const progress = computeProgress(500, VIEWPORT, SECTIONS)!
    expect(progress.sectionId).toBe('intro')
    expect(progress.withinSection).toBeCloseTo(0.5)
  })

  it('hands over to the next section when the anchor passes its top', () => {
    // anchor = 1000 + 400 = 1400, exactly the top of 'transform'
    const progress = computeProgress(1000, VIEWPORT, SECTIONS)!
    expect(progress.sectionId).toBe('transform')
    expect(progress.sectionIndex).toBe(1)
    expect(progress.withinSection).toBe(0)
  })

  it('clamps to the final section past the end of the lesson', () => {
    const progress = computeProgress(99_999, VIEWPORT, SECTIONS)!
    expect(progress.sectionId).toBe('eigen')
    expect(progress.withinSection).toBe(1)
    expect(progress.overall).toBe(1)
  })

  it('never reports progress outside [0, 1], even scrolled above the lesson', () => {
    const progress = computeProgress(-5000, VIEWPORT, SECTIONS)!
    expect(progress.withinSection).toBeGreaterThanOrEqual(0)
    expect(progress.overall).toBeGreaterThanOrEqual(0)
  })

  it('survives a zero-height section rather than dividing by zero', () => {
    const collapsed: SectionGeometry[] = [{ id: 'only', top: 0, height: 0 }]
    const progress = computeProgress(0, VIEWPORT, collapsed)!
    expect(progress.withinSection).toBe(1)
    expect(Number.isFinite(progress.overall)).toBe(true)
  })

  it('tracks the same relative position when the viewport resizes mid-scroll', () => {
    // A taller viewport moves the anchor down, so the equivalent scrollTop is lower.
    const tall = computeProgress(300, 1200, SECTIONS)!
    const short = computeProgress(500, 800, SECTIONS)!
    expect(tall.withinSection).toBeCloseTo(short.withinSection)
  })
})

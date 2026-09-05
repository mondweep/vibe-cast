/**
 * The pure half of the scrollytelling engine (ADR 0002).
 *
 *   scrollTop, viewport, sectionGeometry  ──▶  LessonProgress
 *
 * No DOM access lives here, so every animation decision is unit-testable at
 * speed. The DOM layer's only job is to measure geometry and hand it over.
 */

import { clamp01 } from './geometry'

export type SectionGeometry = {
  readonly id: string
  /** Distance from the top of the scroll container to the top of the section. */
  readonly top: number
  readonly height: number
}

export type LessonProgress = {
  /** Index of the section currently driving the pinned figure. */
  readonly sectionIndex: number
  readonly sectionId: string
  /** 0 when the section has just become active, 1 as it is about to hand over. */
  readonly withinSection: number
  /** 0 at the very start of the lesson, 1 at the very end. */
  readonly overall: number
}

/**
 * The reader is "in" a section once its top passes the anchor line, which sits
 * partway down the viewport rather than at its very top — otherwise a section
 * would activate while still below the fold and the figure would change for
 * something the reader cannot yet see.
 */
const ANCHOR_FRACTION = 0.5

export const anchorLine = (scrollTop: number, viewportHeight: number): number =>
  scrollTop + viewportHeight * ANCHOR_FRACTION

/**
 * Sections shorter than the viewport would otherwise race through their
 * progress, so progress is measured against the section's own height.
 */
const progressWithin = (anchor: number, section: SectionGeometry): number =>
  section.height <= 0 ? 1 : clamp01((anchor - section.top) / section.height)

export const computeProgress = (
  scrollTop: number,
  viewportHeight: number,
  sections: readonly SectionGeometry[],
): LessonProgress | null => {
  if (sections.length === 0) return null

  const anchor = anchorLine(scrollTop, viewportHeight)

  // The active section is the last one whose top the anchor has passed. Before
  // the first section starts, the first section is still the active one — the
  // figure should be showing its opening state, not nothing.
  let index = 0
  for (let i = 0; i < sections.length; i += 1) {
    if (anchor >= sections[i]!.top) index = i
  }

  const section = sections[index]!
  const first = sections[0]!
  const last = sections[sections.length - 1]!
  const lessonTop = first.top
  const lessonHeight = last.top + last.height - lessonTop

  return {
    sectionIndex: index,
    sectionId: section.id,
    withinSection: progressWithin(anchor, section),
    overall: lessonHeight <= 0 ? 1 : clamp01((anchor - lessonTop) / lessonHeight),
  }
}

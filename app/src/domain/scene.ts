/**
 * The declarative diagram model (ADR 0003).
 *
 * A scene is data. Rendering it is a pure function, its text alternative is
 * derived from it, and its state at any scroll offset can be asserted on
 * directly — no screenshots, no browser.
 */

import type { Mat2, Vec2 } from './geometry'

export type Emphasis = 'muted' | 'normal' | 'focus'

export type Mark =
  | { kind: 'grid'; id: string; extent: number; transform: Mat2; emphasis?: Emphasis }
  | { kind: 'vector'; id: string; from: Vec2; to: Vec2; label?: string; emphasis?: Emphasis }
  | { kind: 'point'; id: string; at: Vec2; label?: string; emphasis?: Emphasis }
  | { kind: 'line'; id: string; through: Vec2; direction: Vec2; label?: string; emphasis?: Emphasis }
  | { kind: 'polygon'; id: string; points: readonly Vec2[]; label?: string; emphasis?: Emphasis }
  | { kind: 'label'; id: string; at: Vec2; text: string; emphasis?: Emphasis }

export type SceneState = {
  /** Half-width of the visible plane in world units; the view is always square. */
  readonly extent: number
  readonly marks: readonly Mark[]
  /** One sentence naming what the figure currently shows. Drives the caption and the alt text. */
  readonly caption: string
}

const describeMark = (mark: Mark): string | null => {
  switch (mark.kind) {
    case 'grid':
      return null // the grid is context, not content
    case 'vector':
      return `${mark.label ?? 'a vector'} from (${fmt(mark.from)}) to (${fmt(mark.to)})`
    case 'point':
      return `${mark.label ?? 'a point'} at (${fmt(mark.at)})`
    case 'line':
      return `${mark.label ?? 'a line'} through (${fmt(mark.through)})`
    case 'polygon':
      return `${mark.label ?? 'a region'} with ${mark.points.length} corners`
    case 'label':
      return mark.text
  }
}

const fmt = (v: Vec2): string => `${round(v.x)}, ${round(v.y)}`
const round = (n: number): number => Math.round(n * 100) / 100

/**
 * Text alternative generated from the scene, so a figure cannot ship without
 * one and the description cannot drift from what is drawn (ADR 0003).
 */
export const describeScene = (scene: SceneState): string => {
  const parts = scene.marks.map(describeMark).filter((d): d is string => d !== null)
  return parts.length === 0 ? scene.caption : `${scene.caption} Showing ${parts.join('; ')}.`
}

/** Marks the learner is meant to be looking at right now. */
export const focused = (scene: SceneState): readonly Mark[] =>
  scene.marks.filter((m) => m.emphasis === 'focus')

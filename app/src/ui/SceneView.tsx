/**
 * Renders a SceneState as SVG (ADR 0003). A pure function of the scene — no
 * animation state, no scroll awareness. The scene decides what is drawn; this
 * only decides how it looks.
 */

import { Fragment } from 'react'
import { apply, vec, type Mat2, type Vec2 } from '../domain/geometry'
import { describeScene, type Mark, type SceneState } from '../domain/scene'

const emphasisClass = (mark: { emphasis?: string }): string => `mark mark--${mark.emphasis ?? 'normal'}`

/** SVG's y axis points down; mathematics points up. Flip once, here. */
const px = (v: Vec2): { x: number; y: number } => ({ x: v.x, y: -v.y })

/**
 * Labels near the frame edge would be clipped by the viewBox, so flip them
 * inward instead of letting them run off the diagram.
 */
const labelAnchor = (
  at: { x: number; y: number },
  extent: number,
): { dx: number; dy: number; anchor: 'start' | 'end' } => {
  const nearRight = at.x > extent * 0.55
  const nearTop = at.y < -extent * 0.8
  return {
    dx: nearRight ? -0.25 : 0.25,
    dy: nearTop ? 0.55 : -0.25,
    anchor: nearRight ? 'end' : 'start',
  }
}

const gridLines = (extent: number, transform: Mat2): JSX.Element[] => {
  const lines: JSX.Element[] = []
  const reach = Math.ceil(extent) + 4
  for (let n = -reach; n <= reach; n += 1) {
    const axis = n === 0
    const horizontal = [apply(transform, vec(-reach, n)), apply(transform, vec(reach, n))]
    const vertical = [apply(transform, vec(n, -reach)), apply(transform, vec(n, reach))]
    for (const [from, to] of [horizontal, vertical]) {
      const a = px(from!)
      const b = px(to!)
      lines.push(
        <line
          key={`${n}-${a.x}-${a.y}-${b.x}-${b.y}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          className={axis ? 'grid-line grid-line--axis' : 'grid-line'}
        />,
      )
    }
  }
  return lines
}

const MarkView = ({ mark, extent }: { mark: Mark; extent: number }): JSX.Element | null => {
  switch (mark.kind) {
    case 'grid':
      return <g className="grid">{gridLines(mark.extent, mark.transform)}</g>

    case 'vector': {
      const from = px(mark.from)
      const to = px(mark.to)
      const label = labelAnchor(to, extent)
      return (
        <g className={emphasisClass(mark)}>
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="vector-line" markerEnd="url(#arrowhead)" />
          {mark.label && (
            <text x={to.x} y={to.y} dx={label.dx} dy={label.dy} textAnchor={label.anchor} className="mark-label">
              {mark.label}
            </text>
          )}
        </g>
      )
    }

    case 'point': {
      const at = px(mark.at)
      const label = labelAnchor(at, extent)
      return (
        <g className={emphasisClass(mark)}>
          <circle cx={at.x} cy={at.y} r={0.16} className="point-dot" />
          {mark.label && (
            <text x={at.x} y={at.y} dx={label.dx} dy={label.dy} textAnchor={label.anchor} className="mark-label">
              {mark.label}
            </text>
          )}
        </g>
      )
    }

    case 'line': {
      // Extend well past the viewport so it reads as an infinite line.
      const length = extent * 3
      const magnitude = Math.hypot(mark.direction.x, mark.direction.y) || 1
      const unit = vec(mark.direction.x / magnitude, mark.direction.y / magnitude)
      const a = px(vec(mark.through.x - unit.x * length, mark.through.y - unit.y * length))
      const b = px(vec(mark.through.x + unit.x * length, mark.through.y + unit.y * length))
      return (
        <g className={emphasisClass(mark)}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="span-line" />
          {mark.label && (
            <text x={px(vec(unit.x * extent * 0.6, unit.y * extent * 0.6)).x} y={px(vec(unit.x * extent * 0.6, unit.y * extent * 0.6)).y} dy={-0.3} className="mark-label">
              {mark.label}
            </text>
          )}
        </g>
      )
    }

    case 'polygon': {
      const points = mark.points.map(px).map((p) => `${p.x},${p.y}`).join(' ')
      const centroid = mark.points.reduce((acc, p) => vec(acc.x + p.x / mark.points.length, acc.y + p.y / mark.points.length), vec(0, 0))
      const c = px(centroid)
      return (
        <g className={emphasisClass(mark)}>
          <polygon points={points} className="region" />
          {mark.label && (
            <text x={c.x} y={c.y} className="mark-label mark-label--centred">
              {mark.label}
            </text>
          )}
        </g>
      )
    }

    case 'label': {
      const at = px(mark.at)
      return (
        <text x={at.x} y={at.y} className="mark-label mark-label--centred">
          {mark.text}
        </text>
      )
    }
  }
}

export const SceneView = ({ scene }: { scene: SceneState }): JSX.Element => {
  const e = scene.extent
  return (
    <figure className="scene">
      <svg
        viewBox={`${-e} ${-e} ${e * 2} ${e * 2}`}
        role="img"
        aria-label={describeScene(scene)}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3.2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill="currentColor" />
          </marker>
        </defs>
        {scene.marks.map((mark) => (
          <Fragment key={mark.id}>
            <MarkView mark={mark} extent={e} />
          </Fragment>
        ))}
      </svg>
      <figcaption className="scene-caption">{scene.caption}</figcaption>
    </figure>
  )
}

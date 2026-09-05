/**
 * A scene the learner can manipulate. Pointer dragging and keyboard nudging are
 * both first-class — no assessment may depend on fine motor control (PRD §7).
 */

import { useRef, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react'
import { vec, type Vec2 } from '../domain/geometry'
import type { SceneState } from '../domain/scene'
import { SceneView } from './SceneView'

const STEP = 0.25

export const InteractivePlane = ({
  scene,
  handles,
  onMove,
  disabled = false,
  label,
}: {
  scene: SceneState
  handles: readonly Vec2[]
  onMove: (index: number, to: Vec2) => void
  disabled?: boolean
  label: string
}): JSX.Element => {
  const surface = useRef<HTMLDivElement>(null)
  const dragging = useRef<number | null>(null)

  const toWorld = (event: { clientX: number; clientY: number }): Vec2 | null => {
    const box = surface.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    const e = scene.extent
    // The SVG uses preserveAspectRatio, so the drawn plane is the largest
    // centred square inside the box.
    const size = Math.min(box.width, box.height)
    const originX = box.left + (box.width - size) / 2
    const originY = box.top + (box.height - size) / 2
    const x = ((event.clientX - originX) / size) * (e * 2) - e
    const y = -(((event.clientY - originY) / size) * (e * 2) - e)
    return vec(Math.round(x * 20) / 20, Math.round(y * 20) / 20)
  }

  const nearestHandle = (at: Vec2): number => {
    let best = 0
    let bestDistance = Infinity
    handles.forEach((handle, index) => {
      const d = Math.hypot(handle.x - at.x, handle.y - at.y)
      if (d < bestDistance) {
        bestDistance = d
        best = index
      }
    })
    return best
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled) return
    const at = toWorld(event)
    if (!at) return
    const index = nearestHandle(at)
    dragging.current = index
    event.currentTarget.setPointerCapture(event.pointerId)
    onMove(index, at)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled || dragging.current === null) return
    const at = toWorld(event)
    if (at) onMove(dragging.current, at)
  }

  const endDrag = (): void => {
    dragging.current = null
  }

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>): void => {
    const handle = handles[index]
    if (disabled || !handle) return
    const deltas: Record<string, Vec2> = {
      ArrowLeft: vec(-STEP, 0),
      ArrowRight: vec(STEP, 0),
      ArrowUp: vec(0, STEP),
      ArrowDown: vec(0, -STEP),
    }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    onMove(index, vec(handle.x + delta.x, handle.y + delta.y))
  }

  return (
    <div className="interactive">
      <div
        ref={surface}
        className={disabled ? 'interactive-surface is-disabled' : 'interactive-surface'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <SceneView scene={scene} />
      </div>

      <div className="handle-controls">
        <span className="handle-hint">Drag on the diagram, or focus a control and use the arrow keys:</span>
        {handles.map((handle, index) => (
          <button
            key={index}
            type="button"
            className="handle-button"
            disabled={disabled}
            onKeyDown={onKeyDown(index)}
            aria-label={`${label} ${handles.length > 1 ? index + 1 : ''} at ${handle.x.toFixed(2)}, ${handle.y.toFixed(2)}. Arrow keys to move.`}
          >
            ({handle.x.toFixed(2)}, {handle.y.toFixed(2)})
          </button>
        ))}
      </div>
    </div>
  )
}

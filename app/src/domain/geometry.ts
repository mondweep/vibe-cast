/** Plane geometry and 2x2 linear algebra. Pure, dependency-free. */

export type Vec2 = { readonly x: number; readonly y: number }

/** A 2x2 matrix in row-major order: [[a, b], [c, d]]. */
export type Mat2 = readonly [readonly [number, number], readonly [number, number]]

export const IDENTITY: Mat2 = [
  [1, 0],
  [0, 1],
]

export const vec = (x: number, y: number): Vec2 => ({ x, y })

export const apply = (m: Mat2, v: Vec2): Vec2 => ({
  x: m[0][0] * v.x + m[0][1] * v.y,
  y: m[1][0] * v.x + m[1][1] * v.y,
})

export const determinant = (m: Mat2): number => m[0][0] * m[1][1] - m[0][1] * m[1][0]

export const trace = (m: Mat2): number => m[0][0] + m[1][1]

/** Linear interpolation between two matrices — how a transform animates under scroll. */
export const lerpMat2 = (from: Mat2, to: Mat2, t: number): Mat2 => [
  [from[0][0] + (to[0][0] - from[0][0]) * t, from[0][1] + (to[0][1] - from[0][1]) * t],
  [from[1][0] + (to[1][0] - from[1][0]) * t, from[1][1] + (to[1][1] - from[1][1]) * t],
]

export const lerpVec2 = (from: Vec2, to: Vec2, t: number): Vec2 => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
})

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

/** Smoothstep. Used for scroll-driven easing so motion starts and ends at rest. */
export const ease = (t: number): number => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

/**
 * Real eigenvalues of a 2x2 matrix, ascending. Empty when the eigenvalues are
 * complex — which is the interesting case for the learner (a rotation has no
 * real eigenvector, so nothing on screen stays on its own line).
 */
export const realEigenvalues = (m: Mat2): number[] => {
  const t = trace(m)
  const d = determinant(m)
  const discriminant = t * t - 4 * d
  if (discriminant < 0) return []
  const root = Math.sqrt(discriminant)
  const lo = (t - root) / 2
  const hi = (t + root) / 2
  return discriminant === 0 ? [lo] : [lo, hi]
}

/** A unit eigenvector for a real eigenvalue, or null if the matrix is a scaling of the identity. */
export const eigenvector = (m: Mat2, lambda: number): Vec2 | null => {
  // Solve (m - lambda I) v = 0. Take whichever row is non-degenerate.
  const a = m[0][0] - lambda
  const b = m[0][1]
  const c = m[1][0]
  const d = m[1][1] - lambda
  const candidates: Vec2[] = [vec(-b, a), vec(-d, c)]
  for (const v of candidates) {
    const length = Math.hypot(v.x, v.y)
    if (length > 1e-9) return vec(v.x / length, v.y / length)
  }
  return null
}

import { describe, expect, it } from 'vitest'
import {
  IDENTITY,
  apply,
  determinant,
  ease,
  eigenvector,
  lerpMat2,
  realEigenvalues,
  vec,
  type Mat2,
} from './geometry'

const SHEAR: Mat2 = [
  [1, 1],
  [0, 1],
]
const ROTATE_90: Mat2 = [
  [0, -1],
  [1, 0],
]
const SCALE_2_3: Mat2 = [
  [2, 0],
  [0, 3],
]

describe('apply', () => {
  it('leaves vectors alone under the identity', () => {
    expect(apply(IDENTITY, vec(3, -4))).toEqual(vec(3, -4))
  })

  it('shears in the x direction proportionally to y', () => {
    expect(apply(SHEAR, vec(0, 1))).toEqual(vec(1, 1))
    expect(apply(SHEAR, vec(1, 0))).toEqual(vec(1, 0))
  })
})

describe('determinant', () => {
  it('is the area scale factor', () => {
    expect(determinant(SCALE_2_3)).toBe(6)
    expect(determinant(SHEAR)).toBe(1)
  })

  it('is zero when the map collapses the plane onto a line', () => {
    expect(determinant([
      [1, 2],
      [2, 4],
    ])).toBe(0)
  })
})

describe('realEigenvalues', () => {
  it('returns the diagonal for a diagonal matrix', () => {
    expect(realEigenvalues(SCALE_2_3)).toEqual([2, 3])
  })

  it('returns a single value when the eigenvalue is repeated', () => {
    expect(realEigenvalues(SHEAR)).toEqual([1])
  })

  it('returns nothing for a rotation, which fixes no direction', () => {
    expect(realEigenvalues(ROTATE_90)).toEqual([])
  })
})

describe('eigenvector', () => {
  it('finds a direction the map only stretches', () => {
    const v = eigenvector(SCALE_2_3, 3)
    expect(v).not.toBeNull()
    const image = apply(SCALE_2_3, v!)
    // image should be 3x the original, so the cross product vanishes
    expect(Math.abs(image.x * v!.y - image.y * v!.x)).toBeLessThan(1e-9)
  })

  it('finds the shear-invariant x-axis', () => {
    const v = eigenvector(SHEAR, 1)!
    expect(Math.abs(v.y)).toBeLessThan(1e-9)
  })
})

describe('lerpMat2', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(lerpMat2(IDENTITY, SHEAR, 0)).toEqual(IDENTITY)
    expect(lerpMat2(IDENTITY, SHEAR, 1)).toEqual(SHEAR)
  })

  it('passes through the halfway transform', () => {
    expect(lerpMat2(IDENTITY, SHEAR, 0.5)).toEqual([
      [1, 0.5],
      [0, 1],
    ])
  })
})

describe('ease', () => {
  it('pins the endpoints and clamps beyond them', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(-5)).toBe(0)
    expect(ease(5)).toBe(1)
  })

  it('starts and ends at rest', () => {
    // Symmetric about the midpoint, so motion is slow at both ends.
    expect(ease(0.5)).toBeCloseTo(0.5)
    expect(ease(0.1)).toBeLessThan(0.1)
    expect(ease(0.9)).toBeGreaterThan(0.9)
  })
})

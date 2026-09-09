import {
  createVelocityField,
  addVelocityVector,
  computeDivergence,
  traceStreamline,
  seedDemoField,
  seedFieldForModule,
} from '../velocityField';

const cellVx = (resolution: number, x: number, y: number): number => (y * resolution + x) * 2;

describe('createVelocityField', () => {
  it('returns a zero-filled Float32Array sized resolution^2 * 2', () => {
    const field = createVelocityField(4);
    expect(field).toBeInstanceOf(Float32Array);
    expect(field.length).toBe(4 * 4 * 2);
    expect(Array.from(field).every((v) => v === 0)).toBe(true);
  });
});

describe('addVelocityVector', () => {
  it('adds the given vector to the target cell without mutating the input field', () => {
    const field = createVelocityField(4);
    const updated = addVelocityVector(field, 4, 1, 2, 0.5, -0.25);

    // input untouched (immutable update)
    expect(field[(2 * 4 + 1) * 2]).toBe(0);
    expect(field[(2 * 4 + 1) * 2 + 1]).toBe(0);

    // target cell (x=1, y=2) updated
    const idx = (2 * 4 + 1) * 2;
    expect(updated[idx]).toBeCloseTo(0.5);
    expect(updated[idx + 1]).toBeCloseTo(-0.25);
  });

  it('accumulates on top of an existing value at the same cell', () => {
    let field = createVelocityField(2);
    field = addVelocityVector(field, 2, 0, 0, 1, 1);
    field = addVelocityVector(field, 2, 0, 0, 0.5, -2);

    expect(field[0]).toBeCloseTo(1.5);
    expect(field[1]).toBeCloseTo(-1);
  });

  it('ignores coordinates outside the grid', () => {
    const field = createVelocityField(2);
    const updated = addVelocityVector(field, 2, 5, 5, 1, 1);
    expect(Array.from(updated).every((v) => v === 0)).toBe(true);
  });
});

describe('computeDivergence', () => {
  it('is zero for a spatially uniform field', () => {
    const resolution = 3;
    const field = createVelocityField(resolution);
    for (let i = 0; i < resolution * resolution; i++) {
      field[i * 2] = 5;
      field[i * 2 + 1] = -3;
    }
    expect(computeDivergence(field, resolution)).toBeCloseTo(0);
  });

  it('is positive for an outward-expanding field (vx=x, vy=y)', () => {
    const resolution = 3;
    const field = createVelocityField(resolution);
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const idx = (y * resolution + x) * 2;
        field[idx] = x;
        field[idx + 1] = y;
      }
    }
    // Central difference on the single interior cell (1,1):
    // d(vx)/dx = ((2)-(0))/2 = 1, d(vy)/dy = 1 => divergence = 2
    expect(computeDivergence(field, resolution)).toBeCloseTo(2);
  });

  it('returns 0 for a field with no interior cells (resolution <= 2)', () => {
    const field = createVelocityField(2);
    expect(computeDivergence(field, 2)).toBe(0);
  });
});

describe('traceStreamline', () => {
  it('follows a straight line through a uniform +x field', () => {
    const resolution = 20;
    const field = createVelocityField(resolution);
    for (let i = 0; i < resolution * resolution; i++) {
      field[i * 2] = 1; // vx = 1
      field[i * 2 + 1] = 0; // vy = 0
    }

    const points = traceStreamline(field, resolution, 2, 10, 5, 1);

    expect(points.length).toBeGreaterThan(1);
    expect(points[0]).toEqual({ x: 2, y: 10 });
    const last = points[points.length - 1];
    expect(last.x).toBeGreaterThan(points[0].x);
    expect(last.y).toBeCloseTo(10, 1);
  });

  it('stops once it leaves the grid bounds', () => {
    const resolution = 4;
    const field = createVelocityField(resolution);
    for (let i = 0; i < resolution * resolution; i++) {
      field[i * 2] = 10; // large vx, exits quickly
      field[i * 2 + 1] = 0;
    }

    const points = traceStreamline(field, resolution, 0, 0, 50, 1);
    expect(points.length).toBeLessThan(50);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(resolution);
    }
  });
});

describe('seedDemoField', () => {
  it('returns a non-empty rotational field sized for the given resolution', () => {
    const resolution = 32;
    const field = seedDemoField(resolution);
    expect(field).toBeInstanceOf(Float32Array);
    expect(field.length).toBe(resolution * resolution * 2);
    expect(Array.from(field).some((v) => v !== 0)).toBe(true);
  });

  it('is close to divergence-free (a pure rotation has ~0 divergence)', () => {
    const resolution = 32;
    const field = seedDemoField(resolution);
    expect(computeDivergence(field, resolution)).toBeLessThan(0.5);
  });
});

describe('seedFieldForModule', () => {
  const RES = 16;

  it('module 0: ambient uniform flow (constant, non-zero, no vertical component)', () => {
    const field = seedFieldForModule(0, RES);
    const first = field[0];
    const last = field[(RES * RES - 1) * 2];
    expect(first).not.toBe(0);
    expect(last).toBeCloseTo(first);
    for (let i = 0; i < RES * RES; i++) {
      expect(field[i * 2 + 1]).toBeCloseTo(0);
    }
  });

  it('module 1: solid-body rotation (matches seedDemoField)', () => {
    expect(Array.from(seedFieldForModule(1, RES))).toEqual(Array.from(seedDemoField(RES)));
  });

  it('module 2: converging force field (points inward toward center)', () => {
    const field = seedFieldForModule(2, RES);
    const center = Math.floor(RES / 2);
    const rightOfCenter = field[cellVx(RES, RES - 2, center)];
    const leftOfCenter = field[cellVx(RES, 1, center)];
    expect(rightOfCenter).toBeLessThan(0); // pointing left, back toward center
    expect(leftOfCenter).toBeGreaterThan(0); // pointing right, toward center
  });

  it('module 3: pressure-driven channel flow (fastest at center, ~0 at walls)', () => {
    const field = seedFieldForModule(3, RES);
    const center = Math.floor(RES / 2);
    const centerSpeed = field[cellVx(RES, 5, center)];
    const wallSpeed = field[cellVx(RES, 5, 0)];
    expect(centerSpeed).toBeGreaterThan(wallSpeed);
  });

  it('module 4: shear (Couette) flow (increases from bottom to top, zero at bottom)', () => {
    const field = seedFieldForModule(4, RES);
    const bottom = field[cellVx(RES, 5, 0)];
    const top = field[cellVx(RES, 5, RES - 1)];
    expect(bottom).toBeCloseTo(0);
    expect(top).toBeGreaterThan(bottom);
  });

  it('module 5: combined rotation + drift (differs from pure rotation)', () => {
    const combined = seedFieldForModule(5, RES);
    const pureRotation = seedDemoField(RES);
    expect(Array.from(combined)).not.toEqual(Array.from(pureRotation));
    expect(Array.from(combined).some((v) => v !== 0)).toBe(true);
  });

  it('falls back to the rotation demo field for an unrecognized module id', () => {
    expect(Array.from(seedFieldForModule(99, RES))).toEqual(Array.from(seedDemoField(RES)));
  });
});

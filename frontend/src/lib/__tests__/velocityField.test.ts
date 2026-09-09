import {
  createVelocityField,
  addVelocityVector,
  computeDivergence,
  traceStreamline,
} from '../velocityField';

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

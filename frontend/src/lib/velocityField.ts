export interface StreamlinePoint {
  x: number;
  y: number;
}

const cellIndex = (resolution: number, x: number, y: number): number =>
  (y * resolution + x) * 2;

const inBounds = (resolution: number, x: number, y: number): boolean =>
  x >= 0 && x < resolution && y >= 0 && y < resolution;

export function createVelocityField(resolution: number): Float32Array {
  return new Float32Array(resolution * resolution * 2);
}

export function addVelocityVector(
  field: Float32Array,
  resolution: number,
  x: number,
  y: number,
  vx: number,
  vy: number
): Float32Array {
  const updated = new Float32Array(field);
  if (!inBounds(resolution, x, y)) {
    return updated;
  }
  const idx = cellIndex(resolution, x, y);
  updated[idx] += vx;
  updated[idx + 1] += vy;
  return updated;
}

export function computeDivergence(field: Float32Array, resolution: number): number {
  if (resolution <= 2) {
    return 0;
  }

  let total = 0;
  let count = 0;

  for (let y = 1; y < resolution - 1; y++) {
    for (let x = 1; x < resolution - 1; x++) {
      const dVxDx =
        (field[cellIndex(resolution, x + 1, y)] - field[cellIndex(resolution, x - 1, y)]) / 2;
      const dVyDy =
        (field[cellIndex(resolution, x, y + 1) + 1] - field[cellIndex(resolution, x, y - 1) + 1]) /
        2;
      total += Math.abs(dVxDx + dVyDy);
      count += 1;
    }
  }

  return count === 0 ? 0 : total / count;
}

export function traceStreamline(
  field: Float32Array,
  resolution: number,
  startX: number,
  startY: number,
  steps: number,
  stepSize: number
): StreamlinePoint[] {
  const points: StreamlinePoint[] = [{ x: startX, y: startY }];
  let x = startX;
  let y = startY;

  for (let i = 0; i < steps; i++) {
    const gx = Math.round(x);
    const gy = Math.round(y);
    if (!inBounds(resolution, gx, gy)) {
      break;
    }

    const idx = cellIndex(resolution, gx, gy);
    const vx = field[idx];
    const vy = field[idx + 1];

    x += vx * stepSize;
    y += vy * stepSize;

    if (!inBounds(resolution, Math.round(x), Math.round(y))) {
      break;
    }

    points.push({ x, y });
  }

  return points;
}

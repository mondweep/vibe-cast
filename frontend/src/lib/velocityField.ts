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

export function seedDemoField(resolution: number): Float32Array {
  const field = createVelocityField(resolution);
  const center = (resolution - 1) / 2;
  const scale = 1 / resolution;

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const dx = x - center;
      const dy = y - center;
      const idx = cellIndex(resolution, x, y);
      // Solid-body rotation: divergence-free by construction, gives the
      // learner an immediately-visible "this is alive" example field
      // instead of a blank canvas on first load.
      field[idx] = -dy * scale;
      field[idx + 1] = dx * scale;
    }
  }

  return field;
}

function seedAmbientFlow(resolution: number): Float32Array {
  const field = createVelocityField(resolution);
  for (let i = 0; i < resolution * resolution; i++) {
    field[i * 2] = 0.3; // gentle constant left-to-right drift
    field[i * 2 + 1] = 0;
  }
  return field;
}

function seedConvergingForce(resolution: number): Float32Array {
  const field = createVelocityField(resolution);
  const center = (resolution - 1) / 2;
  const scale = 1 / resolution;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const idx = cellIndex(resolution, x, y);
      field[idx] = -(x - center) * scale;
      field[idx + 1] = -(y - center) * scale;
    }
  }
  return field;
}

function seedChannelFlow(resolution: number): Float32Array {
  const field = createVelocityField(resolution);
  const center = (resolution - 1) / 2;
  for (let y = 0; y < resolution; y++) {
    // Poiseuille-like parabolic profile: fastest at center, ~0 at the walls.
    const normalized = (y - center) / center;
    const speed = Math.max(0, 1 - normalized * normalized);
    for (let x = 0; x < resolution; x++) {
      const idx = cellIndex(resolution, x, y);
      field[idx] = speed;
      field[idx + 1] = 0;
    }
  }
  return field;
}

function seedShearFlow(resolution: number): Float32Array {
  const field = createVelocityField(resolution);
  for (let y = 0; y < resolution; y++) {
    // Couette flow: stationary at the bottom wall, fastest at the top.
    const speed = y / (resolution - 1);
    for (let x = 0; x < resolution; x++) {
      const idx = cellIndex(resolution, x, y);
      field[idx] = speed;
      field[idx + 1] = 0;
    }
  }
  return field;
}

function seedCombinedFlow(resolution: number): Float32Array {
  const rotation = seedDemoField(resolution);
  const combined = new Float32Array(rotation);
  for (let i = 0; i < resolution * resolution; i++) {
    combined[i * 2] += 0.15; // superpose a drift, evoking flow past an obstacle
  }
  return combined;
}

export function seedFieldForModule(moduleId: number, resolution: number): Float32Array {
  switch (moduleId) {
    case 0:
      return seedAmbientFlow(resolution);
    case 1:
      return seedDemoField(resolution);
    case 2:
      return seedConvergingForce(resolution);
    case 3:
      return seedChannelFlow(resolution);
    case 4:
      return seedShearFlow(resolution);
    case 5:
      return seedCombinedFlow(resolution);
    default:
      return seedDemoField(resolution);
  }
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

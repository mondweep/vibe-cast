import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/simulation';
import {
  addVelocityVector,
  computeDivergence,
  seedDemoField,
  traceStreamline,
} from '../lib/velocityField';

const CANVAS_DISPLAY_SIZE = 384;
const STREAMLINE_SEED_STEP = 16;
const STREAMLINE_STEPS = 40;
const STREAMLINE_STEP_SIZE = 0.5;

type ViewMode = 'vectors' | 'streamlines';

interface GridPoint {
  x: number;
  y: number;
}

function isFieldEmpty(field: Float32Array | null): boolean {
  if (!field) return true;
  for (let i = 0; i < field.length; i++) {
    if (field[i] !== 0) return false;
  }
  return true;
}

function toGridCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  resolution: number
): GridPoint {
  const cellSize = rect.width / resolution;
  const x = Math.min(resolution - 1, Math.max(0, Math.floor((clientX - rect.left) / cellSize)));
  const y = Math.min(resolution - 1, Math.max(0, Math.floor((clientY - rect.top) / cellSize)));
  return { x, y };
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  field: Float32Array,
  resolution: number,
  cellSize: number
): void {
  ctx.strokeStyle = '#2563eb';
  ctx.fillStyle = '#2563eb';
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const idx = (y * resolution + x) * 2;
      const vx = field[idx];
      const vy = field[idx + 1];
      const magnitude = Math.hypot(vx, vy);
      if (magnitude < 0.05) continue;

      const originX = (x + 0.5) * cellSize;
      const originY = (y + 0.5) * cellSize;
      const scale = Math.min(cellSize * 2, magnitude * cellSize);
      const angle = Math.atan2(vy, vx);
      const tipX = originX + Math.cos(angle) * scale;
      const tipY = originY + Math.sin(angle) * scale;

      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }
  }
}

function drawStreamlines(
  ctx: CanvasRenderingContext2D,
  field: Float32Array,
  resolution: number,
  cellSize: number
): void {
  ctx.strokeStyle = '#7c3aed';
  for (let sy = STREAMLINE_SEED_STEP / 2; sy < resolution; sy += STREAMLINE_SEED_STEP) {
    for (let sx = STREAMLINE_SEED_STEP / 2; sx < resolution; sx += STREAMLINE_SEED_STEP) {
      const points = traceStreamline(
        field,
        resolution,
        sx,
        sy,
        STREAMLINE_STEPS,
        STREAMLINE_STEP_SIZE
      );
      if (points.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(points[0].x * cellSize, points[0].y * cellSize);
      for (const point of points.slice(1)) {
        ctx.lineTo(point.x * cellSize, point.y * cellSize);
      }
      ctx.stroke();
    }
  }
}

export default function VelocityFieldSimulator() {
  const { velocity_field, grid_resolution, divergence, setVelocityField, setDivergence } =
    useSimulationStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef<GridPoint | null>(null);
  const [mode, setMode] = useState<ViewMode>('vectors');

  const cellSize = CANVAS_DISPLAY_SIZE / grid_resolution;

  // Seed a visible demo pattern on first mount so the canvas never looks
  // blank/broken before the learner has drawn anything themselves.
  useEffect(() => {
    if (isFieldEmpty(velocity_field)) {
      const seeded = seedDemoField(grid_resolution);
      setVelocityField(seeded);
      setDivergence(computeDivergence(seeded, grid_resolution));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, CANVAS_DISPLAY_SIZE, CANVAS_DISPLAY_SIZE);
    if (mode === 'vectors') {
      drawVectors(ctx, velocity_field ?? new Float32Array(0), grid_resolution, cellSize);
    } else {
      drawStreamlines(ctx, velocity_field ?? new Float32Array(0), grid_resolution, cellSize);
    }
  }, [velocity_field, grid_resolution, cellSize, mode]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      draggingRef.current = toGridCoords(event.clientX, event.clientY, rect, grid_resolution);
    },
    [grid_resolution]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const start = draggingRef.current;
      if (!start) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const current = toGridCoords(event.clientX, event.clientY, rect, grid_resolution);
      const vx = current.x - start.x;
      const vy = current.y - start.y;
      if (vx === 0 && vy === 0) return;

      const field = velocity_field ?? new Float32Array(grid_resolution * grid_resolution * 2);
      const updated = addVelocityVector(field, grid_resolution, current.x, current.y, vx, vy);
      setVelocityField(updated);
      setDivergence(computeDivergence(updated, grid_resolution));

      draggingRef.current = current;
    },
    [grid_resolution, velocity_field, setVelocityField, setDivergence]
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  return (
    <div className="velocity-field-simulator">
      <div className="velocity-field-controls">
        <button
          type="button"
          className="btn btn-sm"
          aria-pressed={mode === 'streamlines'}
          onClick={() => setMode((m) => (m === 'vectors' ? 'streamlines' : 'vectors'))}
        >
          Streamlines
        </button>
        <span aria-live="polite" className="velocity-field-divergence">
          Divergence: {divergence.toFixed(4)}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        data-testid="velocity-canvas"
        width={CANVAS_DISPLAY_SIZE}
        height={CANVAS_DISPLAY_SIZE}
        className="velocity-field-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <p className="velocity-field-hint">Click and drag on the canvas to draw velocity vectors.</p>
    </div>
  );
}

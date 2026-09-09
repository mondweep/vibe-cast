import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/simulation';
import {
  addVelocityVector,
  computeDivergence,
  computeDivergenceField,
  createVelocityField,
  divergenceToColor,
  interpretDivergence,
  seedFieldForModule,
  traceStreamline,
} from '../lib/velocityField';

interface VelocityFieldSimulatorProps {
  moduleId: number;
}

const CANVAS_DISPLAY_SIZE = 384;
const STREAMLINE_SEED_STEP = 16;
const STREAMLINE_STEPS = 40;
const STREAMLINE_STEP_SIZE = 0.5;

type ViewMode = 'vectors' | 'streamlines';

interface GridPoint {
  x: number;
  y: number;
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

function drawDivergenceHeatmap(
  ctx: CanvasRenderingContext2D,
  field: Float32Array,
  resolution: number,
  cellSize: number
): void {
  const divergenceField = computeDivergenceField(field, resolution);
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const value = divergenceField[y * resolution + x];
      if (value === 0) continue;
      ctx.fillStyle = divergenceToColor(value);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
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

export default function VelocityFieldSimulator({ moduleId }: VelocityFieldSimulatorProps) {
  const { velocity_field, grid_resolution, divergence, setVelocityField, setDivergence } =
    useSimulationStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef<GridPoint | null>(null);
  const seededModuleRef = useRef<number | null>(null);
  const [mode, setMode] = useState<ViewMode>('vectors');
  const [hasInteracted, setHasInteracted] = useState(false);

  const cellSize = CANVAS_DISPLAY_SIZE / grid_resolution;

  const applySeed = useCallback(
    (id: number) => {
      const seeded = seedFieldForModule(id, grid_resolution);
      setVelocityField(seeded);
      setDivergence(computeDivergence(seeded, grid_resolution));
      setHasInteracted(false);
    },
    [grid_resolution, setVelocityField, setDivergence]
  );

  // Seed a topic-appropriate demo pattern whenever the learner arrives at a
  // new module, so every module's canvas is visibly alive from the start
  // instead of blank. Re-renders for the *same* module (e.g. after the
  // learner has drawn on it) are left alone.
  useEffect(() => {
    if (seededModuleRef.current === moduleId) return;
    seededModuleRef.current = moduleId;
    applySeed(moduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const field = velocity_field ?? new Float32Array(0);

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, CANVAS_DISPLAY_SIZE, CANVAS_DISPLAY_SIZE);
    // Divergence heatmap first, as a background layer: it shows *where*
    // mass is being created (red) or destroyed (blue), which a single
    // aggregate number can't convey on its own.
    drawDivergenceHeatmap(ctx, field, grid_resolution, cellSize);
    if (mode === 'vectors') {
      drawVectors(ctx, field, grid_resolution, cellSize);
    } else {
      drawStreamlines(ctx, field, grid_resolution, cellSize);
    }
  }, [velocity_field, grid_resolution, cellSize, mode]);

  // Pointer Events unify mouse, touch and pen into one API, so dragging
  // works the same way on a phone as it does with a mouse. Pointer capture
  // keeps delivering move events to this canvas even if a touch drifts
  // outside its bounds mid-drag.
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHasInteracted(true);
      const rect = event.currentTarget.getBoundingClientRect();
      draggingRef.current = toGridCoords(event.clientX, event.clientY, rect, grid_resolution);
    },
    [grid_resolution]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const start = draggingRef.current;
      if (!start) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const current = toGridCoords(event.clientX, event.clientY, rect, grid_resolution);
      const vx = current.x - start.x;
      const vy = current.y - start.y;
      if (vx === 0 && vy === 0) return;

      const field = velocity_field ?? createVelocityField(grid_resolution);
      const updated = addVelocityVector(field, grid_resolution, current.x, current.y, vx, vy);
      setVelocityField(updated);
      setDivergence(computeDivergence(updated, grid_resolution));

      draggingRef.current = current;
    },
    [grid_resolution, velocity_field, setVelocityField, setDivergence]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = null;
  }, []);

  const interpretation = interpretDivergence(divergence);

  return (
    <div className="velocity-field-simulator">
      <p className="velocity-field-explainer">
        <strong>Divergence</strong> measures whether fluid is being created or destroyed at a
        point. Real fluids conserve mass, so it should stay near zero — the colors on the field
        below show you exactly where that breaks down:{' '}
        <span className="velocity-field-legend-swatch velocity-field-legend-swatch--source" />{' '}
        fluid appearing,{' '}
        <span className="velocity-field-legend-swatch velocity-field-legend-swatch--sink" /> fluid
        disappearing.
      </p>
      <div className="velocity-field-controls">
        <button
          type="button"
          className="btn btn-sm"
          aria-pressed={mode === 'streamlines'}
          onClick={() => setMode((m) => (m === 'vectors' ? 'streamlines' : 'vectors'))}
        >
          Streamlines
        </button>
        <button type="button" className="btn btn-sm" onClick={() => applySeed(moduleId)}>
          Reset
        </button>
      </div>
      <div className="velocity-field-canvas-wrap">
        <canvas
          ref={canvasRef}
          data-testid="velocity-canvas"
          width={CANVAS_DISPLAY_SIZE}
          height={CANVAS_DISPLAY_SIZE}
          className="velocity-field-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {!hasInteracted && (
          <div className="velocity-field-overlay-hint" aria-hidden="true">
            👆 Drag anywhere to add flow
          </div>
        )}
      </div>
      <div aria-live="polite" className={`velocity-field-readout velocity-field-readout--${interpretation.level}`}>
        <span className="velocity-field-divergence">Divergence: {divergence.toFixed(4)}</span>
        <span className="velocity-field-interpretation">{interpretation.label}</span>
      </div>
      <p className="velocity-field-hint">
        Drag anywhere on the field above to add your own velocity — watch the arrows, the colors,
        and the divergence number respond.
      </p>
    </div>
  );
}

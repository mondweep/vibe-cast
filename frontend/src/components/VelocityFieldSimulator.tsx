import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/simulation';
import {
  addVelocityVector,
  clampVector,
  computeDivergence,
  computeDivergenceField,
  createVelocityField,
  divergenceToColor,
  interpretDivergence,
  MAX_DRAWN_SPEED,
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

function drawPreviewArrow(
  ctx: CanvasRenderingContext2D,
  anchor: GridPoint,
  current: GridPoint,
  cellSize: number
): void {
  // Render with the exact same clamp + scale formula drawVectors() uses for
  // the committed field, so the preview can never show a longer arrow than
  // what will actually be saved - dragging far just caps the preview at its
  // final length instead of growing past it and snapping back on release.
  const raw = { vx: current.x - anchor.x, vy: current.y - anchor.y };
  const { vx, vy } = clampVector(raw.vx, raw.vy, MAX_DRAWN_SPEED);
  const magnitude = Math.hypot(vx, vy);

  const originX = (anchor.x + 0.5) * cellSize;
  const originY = (anchor.y + 0.5) * cellSize;
  const scale = Math.min(cellSize * 2, magnitude * cellSize);
  const angle = Math.atan2(vy, vx);
  const tipX = originX + Math.cos(angle) * scale;
  const tipY = originY + Math.sin(angle) * scale;

  ctx.save();
  ctx.strokeStyle = '#ea580c';
  ctx.fillStyle = '#ea580c';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(originX, originY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

// The store's own default (256x256 = 65536 cells) dilutes a single
// hand-drawn edit so much that the aggregate divergence number rounds to
// 0.0000 and never visibly moves - undermining the whole point of showing
// it. 128 is the next coarser value the store's type allows, giving each
// edit ~4x more weight and each heatmap cell 2x the on-screen size.
const INTERACTIVE_GRID_RESOLUTION = 128;

export default function VelocityFieldSimulator({ moduleId }: VelocityFieldSimulatorProps) {
  const {
    velocity_field,
    grid_resolution,
    divergence,
    setVelocityField,
    setDivergence,
    setGridResolution,
  } = useSimulationStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragAnchorRef = useRef<GridPoint | null>(null);
  const seededModuleRef = useRef<number | null>(null);
  const [mode, setMode] = useState<ViewMode>('vectors');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [previewArrow, setPreviewArrow] = useState<{ anchor: GridPoint; current: GridPoint } | null>(
    null
  );

  const cellSize = CANVAS_DISPLAY_SIZE / grid_resolution;

  const applySeed = useCallback(
    (id: number) => {
      // Always seed at the fixed interactive resolution (not whatever
      // grid_resolution happens to be in the store yet) so the field and
      // cellSize/heatmap stay consistent even on the very first render,
      // before setGridResolution's update has committed.
      const seeded = seedFieldForModule(id, INTERACTIVE_GRID_RESOLUTION);
      setVelocityField(seeded);
      setDivergence(computeDivergence(seeded, INTERACTIVE_GRID_RESOLUTION));
      setHasInteracted(false);
    },
    [setVelocityField, setDivergence]
  );

  // Seed a topic-appropriate demo pattern whenever the learner arrives at a
  // new module, so every module's canvas is visibly alive from the start
  // instead of blank. Re-renders for the *same* module (e.g. after the
  // learner has drawn on it) are left alone.
  useEffect(() => {
    if (seededModuleRef.current === moduleId) return;
    seededModuleRef.current = moduleId;
    if (grid_resolution !== INTERACTIVE_GRID_RESOLUTION) {
      setGridResolution(INTERACTIVE_GRID_RESOLUTION);
    }
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
    if (previewArrow) {
      drawPreviewArrow(ctx, previewArrow.anchor, previewArrow.current, cellSize);
    }
  }, [velocity_field, grid_resolution, cellSize, mode, previewArrow]);

  // Pointer Events unify mouse, touch and pen into one API, so dragging
  // works the same way on a phone as it does with a mouse. Pointer capture
  // keeps delivering move events to this canvas even if a touch drifts
  // outside its bounds mid-drag.
  //
  // The whole gesture (down -> move -> up) draws exactly ONE arrow: moving
  // only updates a local preview (dashed orange), never the shared field, so
  // a single drag isn't a trail of many independent single-cell edits (each
  // clashing with its own neighbors) - it's one clear, legible change you
  // can relate directly to the red/blue it creates around it.
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHasInteracted(true);
      const rect = event.currentTarget.getBoundingClientRect();
      const anchor = toGridCoords(event.clientX, event.clientY, rect, grid_resolution);
      dragAnchorRef.current = anchor;
      setPreviewArrow({ anchor, current: anchor });
    },
    [grid_resolution]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const anchor = dragAnchorRef.current;
      if (!anchor) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const current = toGridCoords(event.clientX, event.clientY, rect, grid_resolution);
      setPreviewArrow({ anchor, current });
    },
    [grid_resolution]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const anchor = dragAnchorRef.current;
      dragAnchorRef.current = null;
      setPreviewArrow(null);
      if (!anchor) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const current = toGridCoords(event.clientX, event.clientY, rect, grid_resolution);
      const vx = current.x - anchor.x;
      const vy = current.y - anchor.y;
      if (vx === 0 && vy === 0) return;

      const field = velocity_field ?? createVelocityField(grid_resolution);
      const updated = addVelocityVector(field, grid_resolution, anchor.x, anchor.y, vx, vy);
      setVelocityField(updated);
      setDivergence(computeDivergence(updated, grid_resolution));
    },
    [grid_resolution, velocity_field, setVelocityField, setDivergence]
  );

  const interpretation = interpretDivergence(divergence);

  return (
    <div className="velocity-field-simulator">
      <p className="velocity-field-explainer">
        Drag once to add <strong>one arrow</strong>. A real fluid can't spring from nowhere or
        vanish into nothing — it has to conserve mass, so every arrow has to blend smoothly with
        its neighbors. Wherever yours doesn't, you'll see{' '}
        <span className="velocity-field-legend-swatch velocity-field-legend-swatch--source" />{' '}
        <strong>red</strong>, like a tiny <strong>fountain</strong> — fluid springing up out of
        nowhere — or{' '}
        <span className="velocity-field-legend-swatch velocity-field-legend-swatch--sink" />{' '}
        <strong>blue</strong>, like a tiny <strong>drain</strong> — fluid rushing in and
        disappearing. <strong>Divergence</strong> is just a single number summarizing how much
        fountain/drain mismatch exists across the whole field.
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
            👆 Click, drag to aim, release to add one arrow
          </div>
        )}
      </div>
      <div aria-live="polite" className={`velocity-field-readout velocity-field-readout--${interpretation.level}`}>
        <span className="velocity-field-divergence">Divergence: {divergence.toFixed(4)}</span>
        <span className="velocity-field-interpretation">{interpretation.label}</span>
      </div>
      <p className="velocity-field-hint">
        Each arrow is added on its own, so its mismatch adds to the total — the number rarely goes
        back down on its own. Draw over the same spot again to change just that arrow, or hit{' '}
        <strong>Reset</strong> to start clean.
      </p>
    </div>
  );
}

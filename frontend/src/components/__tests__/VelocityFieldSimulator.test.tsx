import { act, render, screen, fireEvent } from '@testing-library/react';
import VelocityFieldSimulator from '../VelocityFieldSimulator';
import { useSimulationStore } from '../../store/simulation';

// jsdom in this environment does not implement the PointerEvent constructor,
// so @testing-library's fireEvent.pointerDown/Move/Up silently drop every
// init property (clientX, clientY, pointerId all come through undefined).
// Build a MouseEvent instead (which jsdom does support) and graft the
// pointer-specific fields on - React reads them by property name off the
// native event regardless of its concrete class.
function firePointer(
  element: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  { clientX, clientY, pointerId }: { clientX: number; clientY: number; pointerId: number }
) {
  const event = new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerId', { value: pointerId, enumerable: true });
  fireEvent(element, event);
}

// Rather than hand-rolling a fake store (which can't reproduce Zustand's
// real reactivity - a mocked setter doesn't trigger a re-render, so event
// handler closures never see updated state across renders, which is exactly
// what this component's "seed once, then commit on drag release" logic
// depends on), use the real store and spy on its actions by wrapping them.
const realSetVelocityField = useSimulationStore.getState().setVelocityField;
const realSetDivergence = useSimulationStore.getState().setDivergence;

const RESOLUTION = 128;
const CANVAS_SIZE = 384; // 3px per cell

function resetStore(overrides: Record<string, unknown> = {}) {
  useSimulationStore.getState().reset();
  const setVelocityField = jest.fn((field: Float32Array) => realSetVelocityField(field));
  const setDivergence = jest.fn((value: number) => realSetDivergence(value));
  useSimulationStore.setState({
    grid_resolution: RESOLUTION,
    setVelocityField,
    setDivergence,
    ...overrides,
  });
  return { setVelocityField, setDivergence };
}

function stubCanvas() {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: CANVAS_SIZE,
      bottom: CANVAS_SIZE,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      toJSON: () => ({}),
    }),
  });
  const mockContext = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    setLineDash: jest.fn(),
  };
  HTMLCanvasElement.prototype.getContext = jest
    .fn()
    .mockReturnValue(mockContext) as unknown as HTMLCanvasElement['getContext'];
  HTMLCanvasElement.prototype.setPointerCapture = jest.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = jest.fn();
  HTMLCanvasElement.prototype.hasPointerCapture = jest.fn().mockReturnValue(true);
  return mockContext;
}

beforeEach(() => {
  stubCanvas();
});

describe('VelocityFieldSimulator', () => {
  it('renders a canvas for drawing the velocity field', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getByTestId('velocity-canvas')).toBeInTheDocument();
  });

  it('commits exactly one vector on release, after previewing (not committing) during the drag', () => {
    const state = resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 1 });
    firePointer(canvas, 'pointermove', { clientX: 45, clientY: 30, pointerId: 1 });

    // still just the mount-time seed - moving mid-drag must only preview,
    // never write to the shared store (that's what caused a scribbled
    // trail of independent edits instead of one legible arrow)
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);

    firePointer(canvas, 'pointermove', { clientX: 60, clientY: 30, pointerId: 1 });
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);

    firePointer(canvas, 'pointerup', { clientX: 60, clientY: 30, pointerId: 1 });

    // mount seed + exactly one commit for the whole gesture
    expect(state.setVelocityField).toHaveBeenCalledTimes(2);
    const lastCall =
      state.setVelocityField.mock.calls[state.setVelocityField.mock.calls.length - 1];
    const updatedField = lastCall[0] as Float32Array;
    expect(updatedField).toBeInstanceOf(Float32Array);
    expect(updatedField.some((v) => v !== 0)).toBe(true);

    expect(state.setDivergence).toHaveBeenCalledTimes(2);
    expect(typeof state.setDivergence.mock.calls[0][0]).toBe('number');
  });

  it('commits only a single cell even though the pointer crossed several grid cells', () => {
    const state = resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 1 });
    firePointer(canvas, 'pointermove', { clientX: 45, clientY: 30, pointerId: 1 });
    firePointer(canvas, 'pointermove', { clientX: 90, clientY: 60, pointerId: 1 });
    firePointer(canvas, 'pointerup', { clientX: 90, clientY: 60, pointerId: 1 });

    const seedField = state.setVelocityField.mock.calls[0][0] as Float32Array;
    const finalField = state.setVelocityField.mock.calls[1][0] as Float32Array;
    let changedCells = 0;
    for (let i = 0; i < finalField.length; i += 2) {
      if (finalField[i] !== seedField[i] || finalField[i + 1] !== seedField[i + 1]) {
        changedCells++;
      }
    }
    expect(changedCells).toBe(1);
  });

  it('does not commit anything if the pointer is released without moving', () => {
    const state = resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 1 });
    firePointer(canvas, 'pointerup', { clientX: 30, clientY: 30, pointerId: 1 });

    expect(state.setVelocityField).toHaveBeenCalledTimes(1); // mount seed only
  });

  it('caps the live preview at the same length the committed arrow will have, however far the drag goes', () => {
    resetStore();
    const mockContext = stubCanvas();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas');
    // anchor at grid cell (10,10): clientX/Y 30 -> floor(30/3)
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 1 });

    // a drag just past the clamp threshold...
    firePointer(canvas, 'pointermove', { clientX: 30 + 5 * 3, clientY: 30, pointerId: 1 });
    const tipAfterModerateDrag = mockContext.lineTo.mock.calls.at(-1);

    // ...and a drag wildly further in the same direction
    firePointer(canvas, 'pointermove', { clientX: 30 + 1000 * 3, clientY: 30, pointerId: 1 });
    const tipAfterHugeDrag = mockContext.lineTo.mock.calls.at(-1);

    // both must render to the exact same capped tip - the preview should
    // never keep growing past what will actually be committed
    expect(tipAfterHugeDrag).toEqual(tipAfterModerateDrag);
  });

  it('captures the pointer on drag start so touch dragging keeps tracking outside the canvas', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas') as HTMLCanvasElement;
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 7 });

    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('switches the store to a coarser 128-cell grid on mount, regardless of its default', () => {
    useSimulationStore.getState().reset();
    // the store's own default is 256x256 (65536 cells) - too fine for a
    // hand-drawn single edit to move the aggregate divergence number at
    // all (it rounds to 0.0000), which is exactly what made the number
    // look "stuck"/unresponsive. Force the coarser, still-valid 128 grid
    // this tool actually needs.
    expect(useSimulationStore.getState().grid_resolution).toBe(256);

    render(<VelocityFieldSimulator moduleId={1} />);

    expect(useSimulationStore.getState().grid_resolution).toBe(128);
  });

  it('seeds a visible demo field on mount when the store field is empty', () => {
    const state = resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    expect(state.setVelocityField).toHaveBeenCalledTimes(1);
    const seeded = state.setVelocityField.mock.calls[0][0] as Float32Array;
    expect(seeded.some((v) => v !== 0)).toBe(true);
    expect(state.setDivergence).toHaveBeenCalledTimes(1);
  });

  it('seeds a different pattern depending on moduleId', () => {
    const stateA = resetStore();
    const { unmount } = render(<VelocityFieldSimulator moduleId={0} />);
    const seededModule0 = stateA.setVelocityField.mock.calls[0][0] as Float32Array;
    unmount();

    const stateB = resetStore();
    render(<VelocityFieldSimulator moduleId={4} />);
    const seededModule4 = stateB.setVelocityField.mock.calls[0][0] as Float32Array;

    expect(Array.from(seededModule0)).not.toEqual(Array.from(seededModule4));
  });

  it('does not reseed again on a re-render for the same module', () => {
    const state = resetStore();
    const { rerender } = render(<VelocityFieldSimulator moduleId={1} />);
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);

    rerender(<VelocityFieldSimulator moduleId={1} />);
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);
  });

  it('displays the current divergence value from the store', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    // set after mount: the mount effect always seeds (and computes its own
    // divergence) on first render, so an initial override would just be
    // overwritten - this tests that the display reacts to later changes
    act(() => {
      useSimulationStore.setState({ divergence: 0.4321 });
    });
    expect(screen.getByText(/0\.4321|0\.43/)).toBeInTheDocument();
  });

  it('toggles between vector field and streamline view modes', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const toggle = screen.getByRole('button', { name: /streamlines/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not add a second vector when the pointer moves without a drag in progress', () => {
    const state = resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointermove', { clientX: 45, clientY: 30, pointerId: 1 });

    // only the mount-time seed call, no extra call from the stray pointermove
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);
  });

  it('shows an explicit hint that the field is draggable', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getAllByText(/drag/i).length).toBeGreaterThan(0);
  });

  it('hides the overlay hint once the learner has interacted', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getByText(/release to add one arrow/i)).toBeInTheDocument();

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 1 });

    expect(screen.queryByText(/release to add one arrow/i)).not.toBeInTheDocument();
  });

  it('explains what divergence means, not just showing the raw number', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getAllByText(/mass|conserv/i).length).toBeGreaterThan(0);
  });

  it('shows a plain-language interpretation that reacts to the divergence value', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    // module 1's seeded rotation is already divergence-free, so the default
    // post-mount state already exercises the "good" interpretation
    expect(screen.getByText(/nearly conserved/i)).toBeInTheDocument();
  });

  it('shows a warning interpretation for a large divergence', () => {
    resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    act(() => {
      useSimulationStore.setState({ divergence: 1 });
    });
    expect(screen.getByText(/violates conservation/i)).toBeInTheDocument();
  });

  it('resets to a fresh copy of the module pattern when the Reset button is clicked', () => {
    const state = resetStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(state.setVelocityField).toHaveBeenCalledTimes(1); // mount seed

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(state.setVelocityField).toHaveBeenCalledTimes(2);
    const resetField = state.setVelocityField.mock.calls[1][0] as Float32Array;
    expect(resetField.some((v) => v !== 0)).toBe(true);
  });
});

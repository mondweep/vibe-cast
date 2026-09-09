import { render, screen, fireEvent } from '@testing-library/react';
import VelocityFieldSimulator from '../VelocityFieldSimulator';
import { useSimulationStore } from '../../store/simulation';
import { createVelocityField } from '../../lib/velocityField';

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

jest.mock('../../store/simulation');

const mockedUseSimulationStore = useSimulationStore as unknown as jest.Mock;

const RESOLUTION = 128;
const CANVAS_SIZE = 384; // 3px per cell

function mockStore(overrides: Partial<ReturnType<typeof buildStoreState>> = {}) {
  const state = { ...buildStoreState(), ...overrides };
  mockedUseSimulationStore.mockReturnValue(state);
  return state;
}

function buildStoreState() {
  return {
    velocity_field: createVelocityField(RESOLUTION),
    grid_resolution: RESOLUTION,
    divergence: 0,
    setVelocityField: jest.fn(),
    setDivergence: jest.fn(),
  };
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
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
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
  }) as unknown as HTMLCanvasElement['getContext'];
  HTMLCanvasElement.prototype.setPointerCapture = jest.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = jest.fn();
  HTMLCanvasElement.prototype.hasPointerCapture = jest.fn().mockReturnValue(true);
}

beforeEach(() => {
  jest.clearAllMocks();
  stubCanvas();
});

describe('VelocityFieldSimulator', () => {
  it('renders a canvas for drawing the velocity field', () => {
    mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getByTestId('velocity-canvas')).toBeInTheDocument();
  });

  it('adds a velocity vector and updates divergence when the learner drags with a pointer (mouse or touch)', () => {
    const state = mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 1 });
    firePointer(canvas, 'pointermove', { clientX: 45, clientY: 30, pointerId: 1 });
    firePointer(canvas, 'pointerup', { clientX: 45, clientY: 30, pointerId: 1 });

    // mount seeds once with a demo field; the drag above adds a second call
    expect(state.setVelocityField).toHaveBeenCalledTimes(2);
    const lastCall =
      state.setVelocityField.mock.calls[state.setVelocityField.mock.calls.length - 1];
    const updatedField = lastCall[0] as Float32Array;
    expect(updatedField).toBeInstanceOf(Float32Array);
    expect(updatedField.some((v) => v !== 0)).toBe(true);

    expect(state.setDivergence).toHaveBeenCalledTimes(2);
    expect(typeof state.setDivergence.mock.calls[0][0]).toBe('number');
  });

  it('captures the pointer on drag start so touch dragging keeps tracking outside the canvas', () => {
    mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas') as HTMLCanvasElement;
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 7 });

    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('seeds a visible demo field on mount when the store field is empty', () => {
    const state = mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    expect(state.setVelocityField).toHaveBeenCalledTimes(1);
    const seeded = state.setVelocityField.mock.calls[0][0] as Float32Array;
    expect(seeded.some((v) => v !== 0)).toBe(true);
    expect(state.setDivergence).toHaveBeenCalledTimes(1);
  });

  it('seeds a different pattern depending on moduleId', () => {
    const stateA = mockStore();
    const { unmount } = render(<VelocityFieldSimulator moduleId={0} />);
    const seededModule0 = stateA.setVelocityField.mock.calls[0][0] as Float32Array;
    unmount();

    jest.clearAllMocks();
    stubCanvas();
    const stateB = mockStore();
    render(<VelocityFieldSimulator moduleId={4} />);
    const seededModule4 = stateB.setVelocityField.mock.calls[0][0] as Float32Array;

    expect(Array.from(seededModule0)).not.toEqual(Array.from(seededModule4));
  });

  it('does not reseed again on a re-render for the same module', () => {
    const state = mockStore();
    const { rerender } = render(<VelocityFieldSimulator moduleId={1} />);
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);

    rerender(<VelocityFieldSimulator moduleId={1} />);
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);
  });

  it('displays the current divergence value from the store', () => {
    mockStore({ divergence: 0.4321 });
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getByText(/0\.4321|0\.43/)).toBeInTheDocument();
  });

  it('toggles between vector field and streamline view modes', () => {
    mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const toggle = screen.getByRole('button', { name: /streamlines/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not add a second vector when the pointer moves without a drag in progress', () => {
    const state = mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointermove', { clientX: 45, clientY: 30, pointerId: 1 });

    // only the mount-time seed call, no extra call from the stray pointermove
    expect(state.setVelocityField).toHaveBeenCalledTimes(1);
  });

  it('shows an explicit hint that the field is draggable', () => {
    mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getAllByText(/drag/i).length).toBeGreaterThan(0);
  });

  it('hides the overlay hint once the learner has interacted', () => {
    mockStore();
    render(<VelocityFieldSimulator moduleId={1} />);
    expect(screen.getByText(/drag anywhere to add flow/i)).toBeInTheDocument();

    const canvas = screen.getByTestId('velocity-canvas');
    firePointer(canvas, 'pointerdown', { clientX: 30, clientY: 30, pointerId: 1 });

    expect(screen.queryByText(/drag anywhere to add flow/i)).not.toBeInTheDocument();
  });
});

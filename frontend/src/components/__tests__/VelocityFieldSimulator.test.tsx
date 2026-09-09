import { render, screen, fireEvent } from '@testing-library/react';
import VelocityFieldSimulator from '../VelocityFieldSimulator';
import { useSimulationStore } from '../../store/simulation';
import { createVelocityField } from '../../lib/velocityField';

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

function stubCanvasRect() {
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
}

beforeEach(() => {
  jest.clearAllMocks();
  stubCanvasRect();
});

describe('VelocityFieldSimulator', () => {
  it('renders a canvas for drawing the velocity field', () => {
    mockStore();
    render(<VelocityFieldSimulator />);
    expect(screen.getByTestId('velocity-canvas')).toBeInTheDocument();
  });

  it('adds a velocity vector and updates divergence when the learner drags on the canvas', () => {
    const state = mockStore();
    render(<VelocityFieldSimulator />);

    const canvas = screen.getByTestId('velocity-canvas');
    fireEvent.mouseDown(canvas, { clientX: 30, clientY: 30 });
    fireEvent.mouseMove(canvas, { clientX: 45, clientY: 30 });
    fireEvent.mouseUp(canvas);

    expect(state.setVelocityField).toHaveBeenCalledTimes(1);
    const updatedField = state.setVelocityField.mock.calls[0][0] as Float32Array;
    expect(updatedField).toBeInstanceOf(Float32Array);
    expect(updatedField.some((v) => v !== 0)).toBe(true);

    expect(state.setDivergence).toHaveBeenCalledTimes(1);
    expect(typeof state.setDivergence.mock.calls[0][0]).toBe('number');
  });

  it('displays the current divergence value from the store', () => {
    mockStore({ divergence: 0.4321 });
    render(<VelocityFieldSimulator />);
    expect(screen.getByText(/0\.4321|0\.43/)).toBeInTheDocument();
  });

  it('toggles between vector field and streamline view modes', () => {
    mockStore();
    render(<VelocityFieldSimulator />);

    const toggle = screen.getByRole('button', { name: /streamlines/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not call setVelocityField when the pointer moves without a mouse-down drag', () => {
    const state = mockStore();
    render(<VelocityFieldSimulator />);

    const canvas = screen.getByTestId('velocity-canvas');
    fireEvent.mouseMove(canvas, { clientX: 45, clientY: 30 });

    expect(state.setVelocityField).not.toHaveBeenCalled();
  });
});

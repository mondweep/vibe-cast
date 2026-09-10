import { render } from '@testing-library/react';
import Module from '../Module';
import { useSimulationStore } from '../../store/simulation';
import { createVelocityField } from '../../lib/velocityField';

jest.mock('../../store/simulation');
jest.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
}));

const mockedUseSimulationStore = useSimulationStore as unknown as jest.Mock;

beforeEach(() => {
  mockedUseSimulationStore.mockReturnValue({
    velocity_field: createVelocityField(16),
    grid_resolution: 16,
    divergence: 0,
    setVelocityField: jest.fn(),
    setDivergence: jest.fn(),
    setGridResolution: jest.fn(),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 384, bottom: 384, width: 384, height: 384, toJSON: () => ({}) }),
  });
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    clearRect: jest.fn(), beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(),
    stroke: jest.fn(), fillRect: jest.fn(),
  }) as unknown as HTMLCanvasElement['getContext'];
});

describe('Module', () => {
  it('scrolls to the top when the learner arrives at a new module', () => {
    const scrollToSpy = jest.fn();
    window.scrollTo = scrollToSpy;

    const { rerender } = render(<Module moduleId={0} onNext={jest.fn()} />);
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));

    scrollToSpy.mockClear();
    rerender(<Module moduleId={1} onNext={jest.fn()} />);
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});

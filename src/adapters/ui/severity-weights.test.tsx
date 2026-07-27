import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeverityWeightsPanel } from './severity-weights';
import { DEFAULT_SEVERITY_WEIGHTS } from './view-models';

afterEach(cleanup);

describe('SeverityWeightsPanel', () => {
  it('makes clear the weights are this console’s starting point, not an ASDMA figure', () => {
    render(
      <SeverityWeightsPanel
        weights={DEFAULT_SEVERITY_WEIGHTS}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText(/These weights are ours, not ASDMA's\./)).toBeTruthy();
    expect(screen.getByText(/a stated starting point, not an official ASDMA figure/)).toBeTruthy();
    expect(screen.getByText(/min–max normalised within this bulletin only/)).toBeTruthy();
    expect(screen.getByText(/not an absolute score/)).toBeTruthy();
  });

  it('offers a slider per severity component, seeded with the current weights', () => {
    render(
      <SeverityWeightsPanel
        weights={DEFAULT_SEVERITY_WEIGHTS}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('slider')).toHaveLength(5);
    expect((screen.getByLabelText('Affected Population') as HTMLInputElement).value).toBe(
      '0.35',
    );
    expect((screen.getByLabelText('Camp Load') as HTMLInputElement).value).toBe('0.2');
  });

  it('reports a whole new weight set when one slider moves', () => {
    const onChange = vi.fn();
    render(
      <SeverityWeightsPanel
        weights={DEFAULT_SEVERITY_WEIGHTS}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Crop Area Submerged'), { target: { value: '0.5' } });

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SEVERITY_WEIGHTS, cropArea: 0.5 });
  });

  it('shows the running total and flags when it no longer sums to one', () => {
    const { rerender } = render(
      <SeverityWeightsPanel
        weights={DEFAULT_SEVERITY_WEIGHTS}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText('1.00')).toBeTruthy();
    expect(screen.getByText('Starting weights')).toBeTruthy();

    rerender(
      <SeverityWeightsPanel
        weights={{ ...DEFAULT_SEVERITY_WEIGHTS, cropArea: 0.5 }}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText('1.35')).toBeTruthy();
    expect(screen.getByText(/components are rescaled to sum to 1/)).toBeTruthy();
    expect(screen.getByText('Adjusted from the starting weights')).toBeTruthy();
  });

  it('lets a user get back to the starting weights', async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(
      <SeverityWeightsPanel
        weights={{ ...DEFAULT_SEVERITY_WEIGHTS, cropArea: 0.5 }}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Reset to starting weights/ }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

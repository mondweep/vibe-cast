import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ResponseCapacity } from './response-capacity';
import { capacityFixture } from './test-fixtures';
import type { ResponseCapacityViewModel } from './view-models';

afterEach(cleanup);

const RICE_KG = 1191.092 * 100;
const INMATES = 28695;

/**
 * Stands in for the composition root: holds the norm, recomputes coverage days
 * the way the Response Capacity context would, and hands both back as props.
 */
const CapacityHarness = ({ onNormChange }: { onNormChange: (norm: number) => void }) => {
  const [norm, setNorm] = useState(0.6);
  const days = RICE_KG / (INMATES * norm);
  const capacity: ResponseCapacityViewModel = {
    ...capacityFixture,
    rationCoverageDays: {
      ...capacityFixture.rationCoverageDays,
      value: days,
      workings: `(1,191.09 × 100) ÷ (28,695 × ${norm}) = ${days.toFixed(1)} days`,
    },
    districts: capacityFixture.districts.map((district) => ({
      ...district,
      rationCoverageDays:
        district.rationCoverageDays === undefined
          ? undefined
          : (district.rationCoverageDays * 0.6) / norm,
    })),
  };

  return (
    <ResponseCapacity
      capacity={capacity}
      rationNorm={norm}
      onRationNormChange={(next) => {
        onNormChange(next);
        setNorm(next);
      }}
    />
  );
};

describe('ResponseCapacity — derived capacity figures', () => {
  it('leads with ration coverage days and marks every derived figure as derived', () => {
    const { container } = render(
      <ResponseCapacity
        capacity={capacityFixture}
        rationNorm={0.6}
        onRationNormChange={vi.fn()}
      />,
    );

    const coverage = container.querySelector('[data-figure="ration-coverage-days"]');
    expect(within(coverage as HTMLElement).getByText('6.9 days')).toBeTruthy();
    expect(within(coverage as HTMLElement).getByRole('button', { name: /Derived/ })).toBeTruthy();

    expect(screen.getByText('319 per Relief Camp')).toBeTruthy();
    expect(screen.getByText('11.0 %')).toBeTruthy();
    expect(screen.getByText('0.15 boats per 1,000 affected')).toBeTruthy();
  });

  it("keeps ASDMA's camp and centre vocabulary distinct", () => {
    render(
      <ResponseCapacity
        capacity={capacityFixture}
        rationNorm={0.6}
        onRationNormChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: 'Relief Distribution Centres' }),
    ).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Relief Camps' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Non-Camp Inmates' })).toBeTruthy();
  });
});

describe('ResponseCapacity — the ration norm assumption (PRD §5.3)', () => {
  it('surfaces the norm as an editable input, not a buried constant', () => {
    render(
      <ResponseCapacity
        capacity={capacityFixture}
        rationNorm={0.6}
        onRationNormChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Rice per person per day') as HTMLInputElement;
    expect(input.value).toBe('0.6');
    expect(screen.getByText(/SDRF relief-norm convention/)).toBeTruthy();
    expect(screen.getByText(/an assumption of this console, not an ASDMA figure/)).toBeTruthy();
  });

  it('reports every change of the norm to the host', () => {
    const onNormChange = vi.fn();
    render(<CapacityHarness onNormChange={onNormChange} />);

    fireEvent.change(screen.getByLabelText('Rice per person per day'), {
      target: { value: '1.2' },
    });

    expect(onNormChange).toHaveBeenCalledWith(1.2);
  });

  it('visibly moves coverage days when the norm changes', () => {
    const { container } = render(<CapacityHarness onNormChange={vi.fn()} />);
    const coverage = () =>
      container.querySelector('[data-figure="ration-coverage-days"] .figure-cell__value')
        ?.textContent;
    const sivasagarDays = () =>
      container.querySelector('[data-district="Sivasagar"] [data-cell="ration-coverage-days"]')
        ?.textContent;

    expect(coverage()).toBe('6.9 days');
    expect(sivasagarDays()).toBe('5.2 days');

    fireEvent.change(screen.getByLabelText('Rice per person per day'), {
      target: { value: '1.2' },
    });

    // Double the norm, halve the days — statewide and per District.
    expect(coverage()).toBe('3.5 days');
    expect(sivasagarDays()).toBe('2.6 days');
    expect(screen.getByText(/Ration Coverage Days computed at 1.2 kg/)).toBeTruthy();
  });

  it('keeps the derivation in step with the norm', () => {
    const { container } = render(<CapacityHarness onNormChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Rice per person per day'), {
      target: { value: '0.9' },
    });

    const coverage = container.querySelector(
      '[data-figure="ration-coverage-days"]',
    ) as HTMLElement;
    expect(coverage.textContent).toContain('(1,191.09 × 100) ÷ (28,695 × 0.9) = 4.6 days');
  });

  it('ignores a norm of zero rather than dividing by it', () => {
    const onNormChange = vi.fn();
    render(<CapacityHarness onNormChange={onNormChange} />);

    fireEvent.change(screen.getByLabelText('Rice per person per day'), {
      target: { value: '0' },
    });

    expect(onNormChange).not.toHaveBeenCalled();
  });
});

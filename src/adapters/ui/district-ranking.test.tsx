import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { DistrictRanking } from './district-ranking';
import { districtRowsFixture } from './test-fixtures';

afterEach(cleanup);

const renderRanking = (overrides: Partial<ComponentProps<typeof DistrictRanking>> = {}) => {
  const props = {
    rows: districtRowsFixture,
    sortKey: 'severityIndex' as const,
    sortDirection: 'desc' as const,
    onSort: vi.fn(),
    expandedDistrict: null,
    onToggleDistrict: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<DistrictRanking {...props} />) };
};

describe('DistrictRanking — ranking', () => {
  it('renders the Districts in the order the host supplied, with ranks', () => {
    const { container } = renderRanking();

    const names = Array.from(container.querySelectorAll('tbody tr[data-district]')).map(
      (row) => row.getAttribute('data-district'),
    );
    expect(names).toEqual(['Sivasagar', 'Charaideo', 'Golaghat', 'Dhemaji']);
  });

  it('marks the sorted column for assistive technology', () => {
    renderRanking({ sortKey: 'populationAffected', sortDirection: 'desc' });

    expect(
      screen
        .getByRole('columnheader', { name: /Population Affected/ })
        .getAttribute('aria-sort'),
    ).toBe('descending');
    expect(
      screen.getByRole('columnheader', { name: /Villages Affected/ }).getAttribute('aria-sort'),
    ).toBe('none');
  });

  it('reports a sort request rather than reordering behind the caller', async () => {
    const onSort = vi.fn();
    const user = userEvent.setup();
    renderRanking({ onSort });

    await user.click(screen.getByRole('button', { name: /Crop Area Submerged/ }));

    expect(onSort).toHaveBeenCalledWith('cropAreaSubmerged');
  });

  it('keeps a reported-but-quiet District visible instead of dropping it', () => {
    const { container } = renderRanking();

    const dhemaji = container.querySelector('[data-district="Dhemaji"]');
    expect(dhemaji?.textContent).toContain('Reported, no impact');
  });
});

describe('DistrictRanking — severity contribution (FR-3.3)', () => {
  it('always exposes each component contribution, not just a composite score', () => {
    const { container } = renderRanking();

    const sivasagar = container.querySelector('[data-district="Sivasagar"]') as HTMLElement;
    // Score, band word and per-component contributions all present without
    // expanding: severity is never carried by the bar's colour alone.
    expect(within(sivasagar).getByText('0.81')).toBeTruthy();
    expect(within(sivasagar).getByText('Severe')).toBeTruthy();
    expect(sivasagar.textContent).toContain('Affected Population contributes 0.350');
    expect(sivasagar.textContent).toContain('Camp Load contributes 0.172');
  });

  it('writes out the weighted arithmetic when a District is expanded', () => {
    renderRanking({ expandedDistrict: 'Sivasagar' });

    expect(screen.getByText(/Severity contribution breakdown/)).toBeTruthy();
    expect(screen.getAllByText(/0\.35 × 1\.00 =/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.350').length).toBeGreaterThan(0);
  });
});

describe('DistrictRanking — drill-down (FR-2.3)', () => {
  it('asks the host to expand a District', async () => {
    const onToggleDistrict = vi.fn();
    const user = userEvent.setup();
    renderRanking({ onToggleDistrict });

    await user.click(screen.getByRole('button', { name: /Sivasagar/ }));

    expect(onToggleDistrict).toHaveBeenCalledWith('Sivasagar');
  });

  it('shows Revenue Circles without losing the District context', () => {
    const { container } = renderRanking({ expandedDistrict: 'Sivasagar' });

    // Circles appear...
    expect(screen.getByRole('rowheader', { name: 'Nazira' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Mahmora' })).toBeTruthy();
    // ...and ASDMA's term is used, never softened to "sub-district".
    expect(screen.getByText('Revenue Circles in Sivasagar')).toBeTruthy();
    expect(container.textContent).not.toMatch(/sub-district/i);

    // ...while the District's own row and figures are still on screen.
    const district = container.querySelector('[data-district="Sivasagar"]') as HTMLElement;
    expect(within(district).getByText('144,461')).toBeTruthy();
    expect(
      container.querySelectorAll('[data-district]').length,
    ).toBe(districtRowsFixture.length);
  });

  it('says plainly when a District has no Revenue Circle breakdown', () => {
    renderRanking({ expandedDistrict: 'Golaghat' });

    expect(
      screen.getByText('No Revenue Circle breakdown reported for Golaghat.'),
    ).toBeTruthy();
  });
});

describe('DistrictRanking — casualties', () => {
  it('gives Flood Death and General Drowning separate columns so they cannot be summed', () => {
    renderRanking();

    expect(screen.getByRole('columnheader', { name: 'Flood Death' })).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'General Drowning (Non Flood)' }),
    ).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: /casualties/i })).toBeNull();
  });
});

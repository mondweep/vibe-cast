/**
 * The Scenario context's injection points must be the Response Capacity
 * context's real calculations — not a second implementation that agrees with
 * them today and drifts tomorrow. These tests assert the interaction: which
 * domain service is called, and with which typed quantities.
 */

import { describe, expect, it, vi } from 'vitest';
import { count, quintals } from '../domain/shared/quantity';
import { campLoad } from '../domain/response/camp-load';
import { rationCoverageDays } from '../domain/response/ration-coverage';
import { aReport, aDistrictReport } from '../application/services/report.fixture';
import { districtName } from '../domain/shared/administrative-unit';
import {
  RESPONSE_CALCULATIONS,
  createScenarioDependencies,
  distributeAdditionalCamps,
  leversFrom,
} from './scenario-dependencies';

const aRationCoverage = (days: number | undefined) => ({
  days,
  kind: days === undefined ? ('unknown' as const) : ('days' as const),
  norm: { kilogramsPerPersonPerDay: 0.6, label: 'test' },
  derivation: { metric: '', formula: '', substitution: '', note: '' },
  completeness: 'complete' as const,
});

const aCampLoad = (inmatesPerCamp: number | undefined) => ({
  inmatesPerCamp,
  kind: 'load' as const,
  derivation: { metric: '', formula: '', substitution: '', note: '' },
  completeness: 'complete' as const,
});

describe('createScenarioDependencies', () => {
  it('asks Response Capacity for ration coverage, converting kilograms back to Quintals', () => {
    const response = {
      rationCoverageDays: vi.fn().mockReturnValue(aRationCoverage(6.9)),
      campLoad: vi.fn().mockReturnValue(aCampLoad(319)),
    };

    const deps = createScenarioDependencies(response);
    const days = deps.rationCoverageDays({
      riceStockKg: 100_000,
      inmates: 28_695,
      rationNormKgPerPersonPerDay: 0.6,
    });

    expect(response.rationCoverageDays).toHaveBeenCalledTimes(1);
    expect(response.rationCoverageDays).toHaveBeenCalledWith(
      quintals(1000),
      count(28_695),
      expect.objectContaining({ kilogramsPerPersonPerDay: 0.6 }),
    );
    expect(days).toBe(6.9);
  });

  it('asks Response Capacity for camp load, in Counts', () => {
    const response = {
      rationCoverageDays: vi.fn().mockReturnValue(aRationCoverage(6.9)),
      campLoad: vi.fn().mockReturnValue(aCampLoad(1609)),
    };

    const deps = createScenarioDependencies(response);
    const load = deps.campLoad({ inmates: 144_785, reliefCamps: 90 });

    expect(response.campLoad).toHaveBeenCalledWith(count(144_785), count(90));
    expect(load).toBe(1609);
  });

  it('reports an unbounded camp load as unavailable, per the engine contract', () => {
    const response = {
      rationCoverageDays: vi.fn().mockReturnValue(aRationCoverage(undefined)),
      campLoad: vi.fn().mockReturnValue(aCampLoad(Number.POSITIVE_INFINITY)),
    };

    const deps = createScenarioDependencies(response);
    expect(deps.campLoad({ inmates: 1000, reliefCamps: 0 })).toBeUndefined();
  });

  it('defaults to the real Response Capacity implementations', () => {
    expect(RESPONSE_CALCULATIONS.campLoad).toBe(campLoad);
    expect(RESPONSE_CALCULATIONS.rationCoverageDays).toBe(rationCoverageDays);

    const deps = createScenarioDependencies();
    expect(deps.campLoad({ inmates: 28_695, reliefCamps: 90 })).toBeCloseTo(28_695 / 90, 9);
    expect(
      deps.rationCoverageDays({
        riceStockKg: 119_109.2,
        inmates: 28_695,
        rationNormKgPerPersonPerDay: 0.6,
      }),
    ).toBeCloseTo(119_109.2 / (28_695 * 0.6), 9);
  });
});

describe('levers', () => {
  it('turns the console’s percentages into the domain’s factors', () => {
    const levers = leversFrom(
      {
        populationGrowthPercent: 30,
        campUptakePercent: 25,
        durationDays: 5,
        rationNormKgPerPersonPerDay: 0.6,
        additionalCampCapacity: 0,
      },
      aReport(),
    );

    expect(levers.populationGrowthFactor).toBeCloseTo(1.3, 9);
    expect(levers.campUptakeShift).toEqual({ kind: 'to-rate', rate: 0.25 });
    expect(levers.durationDays).toBe(5);
    expect(levers.rationNorm.kgPerPersonPerDay).toBe(0.6);
  });

  it('spreads statewide additional camps across Districts, conserving the total', () => {
    const report = aReport({
      districts: [
        aDistrictReport({ district: districtName('Sivasagar') }),
        aDistrictReport({ district: districtName('Charaideo') }),
        aDistrictReport({ district: districtName('Golaghat') }),
      ],
    });

    const allocation = distributeAdditionalCamps(10, report);
    const total = [...allocation.values()].reduce((a, b) => a + b, 0);

    expect(total).toBe(10);
    expect([...allocation.values()].every(Number.isInteger)).toBe(true);
  });

  it('allocates nothing when no additional camps are opened', () => {
    expect(distributeAdditionalCamps(0, aReport()).size).toBe(0);
  });
});

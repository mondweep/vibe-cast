import { describe, expect, it, vi } from 'vitest';

import { count, quintals, unknownCount, unknownQuintals } from '../shared/quantity';
import { project } from './projection-engine';
import type { ProjectionDependencies } from './projection-engine';
import { scenarioLevers } from './scenario';
import { firstFailurePoint, identifyFailurePoints } from './failure-point';
import { aDistrict, aReport, assamBaseline20260727 } from './__fixtures__/report-builder';

const deps = (): ProjectionDependencies => ({
  rationCoverageDays: vi.fn(({ riceStockKg, inmates, rationNormKgPerPersonPerDay }) => {
    const demand = inmates * rationNormKgPerPersonPerDay;
    return demand > 0 ? riceStockKg / demand : undefined;
  }),
  campLoad: vi.fn(({ inmates, reliefCamps }) =>
    reliefCamps > 0 ? inmates / reliefCamps : undefined,
  ),
});

const heldSteadyForTenDays = () =>
  scenarioLevers({
    populationGrowthFactor: 1,
    campUptakeShift: { kind: 'hold-baseline' },
    durationDays: 10,
    rationNormKgPerPersonPerDay: 0.6,
  });

/**
 * Three districts under identical pressure, differing only in how close they
 * are to breaking:
 *   Jorhat   — camps hold, rice runs out on day 3.3
 *   Majuli   — camps are already over capacity, rice runs out on day 5.6
 *   Dhemaji  — comfortable on both counts for the whole 10 days
 *   Dibrugarh — reported and quiet
 */
const threeDistrictsUnderPressure = () =>
  aReport({
    id: 'sha256:pressure-test',
    districts: [
      aDistrict({
        name: 'Jorhat',
        affected: count(10_000),
        inmates: count(1_000),
        reliefCamps: count(10),
        rice: quintals(20),
      }),
      aDistrict({
        name: 'Majuli',
        affected: count(10_000),
        inmates: count(3_000),
        reliefCamps: count(10),
        rice: quintals(100),
      }),
      aDistrict({
        name: 'Dhemaji',
        affected: count(10_000),
        inmates: count(500),
        reliefCamps: count(10),
        rice: quintals(100),
      }),
      aDistrict({ name: 'Dibrugarh' }),
    ],
    statewide: {
      populationAffected: count(30_000),
      campInmates: count(4_500),
      reliefCamps: count(30),
    },
  });

const analyse = (report = threeDistrictsUnderPressure(), levers = heldSteadyForTenDays()) =>
  identifyFailurePoints(project(report, levers, deps()), { campCapacityPerCamp: 200 });

describe('which district breaks first, and when (FR-4.4)', () => {
  it('names the first failure and the day it happens', () => {
    const first = firstFailurePoint(analyse());

    expect(first?.district).toBe('Majuli');
    expect(first?.mode).toBe('camp-capacity');
    expect(first?.dayOfFailure).toBe(0);
  });

  it('returns the whole ordered sequence, not just the first, so the UI can show it', () => {
    const { failurePoints } = analyse();

    expect(
      failurePoints.map((f) => [f.district, f.mode, Number(f.dayOfFailure.toFixed(1))]),
    ).toEqual([
      ['Majuli', 'camp-capacity', 0],
      ['Jorhat', 'ration-exhaustion', 3.3],
      ['Majuli', 'ration-exhaustion', 5.6],
    ]);
  });

  it('leaves out districts that survive the whole scenario', () => {
    const { failurePoints } = analyse();

    expect(failurePoints.some((f) => f.district === 'Dhemaji')).toBe(false);
  });

  it('says nothing about a district with no projected inmates rather than crying failure', () => {
    const analysis = analyse();

    expect(analysis.failurePoints.some((f) => f.district === 'Dibrugarh')).toBe(false);
    expect(analysis.notAssessable.some((n) => n.district === 'Dibrugarh')).toBe(false);
  });

  it('has no first failure when nothing breaks inside the scenario horizon', () => {
    const analysis = analyse(threeDistrictsUnderPressure(), heldSteadyForTenDays());
    const roomy = identifyFailurePoints(
      project(threeDistrictsUnderPressure(), heldSteadyForTenDays(), deps()),
      { campCapacityPerCamp: 100_000 },
    );

    expect(analysis.failurePoints.length).toBeGreaterThan(0);
    expect(roomy.failurePoints.map((f) => f.mode)).toEqual([
      'ration-exhaustion',
      'ration-exhaustion',
    ]);
  });

  it('finds no failure at all in a scenario short enough to ride out', () => {
    const analysis = identifyFailurePoints(
      project(
        threeDistrictsUnderPressure(),
        scenarioLevers({
          populationGrowthFactor: 1,
          campUptakeShift: { kind: 'hold-baseline' },
          durationDays: 1,
          rationNormKgPerPersonPerDay: 0.6,
        }),
        deps(),
      ),
      { campCapacityPerCamp: 100_000 },
    );

    expect(analysis.failurePoints).toEqual([]);
    expect(firstFailurePoint(analysis)).toBeUndefined();
  });

  it('breaks ties by pressure, then by district name, so the order is never arbitrary', () => {
    // Jorhat and Charaideo run out of rice on exactly the same day.
    const report = aReport({
      districts: [
        aDistrict({
          name: 'Jorhat',
          affected: count(10_000),
          inmates: count(1_000),
          reliefCamps: count(10),
          rice: quintals(20),
        }),
        aDistrict({
          name: 'Charaideo',
          affected: count(20_000),
          inmates: count(2_000),
          reliefCamps: count(20),
          rice: quintals(40),
        }),
      ],
      statewide: {
        populationAffected: count(30_000),
        campInmates: count(3_000),
        reliefCamps: count(30),
      },
    });

    const { failurePoints } = identifyFailurePoints(
      project(report, heldSteadyForTenDays(), deps()),
      { campCapacityPerCamp: 100_000 },
    );

    expect(failurePoints.map((f) => f.district)).toEqual(['Charaideo', 'Jorhat']);
  });
});

describe('failure points explain themselves in words (FR-4.6)', () => {
  it('spells out a camp capacity failure with the shortfall in places', () => {
    const camp = analyse().failurePoints[0];

    expect(camp?.derivation.explanation).toBe(
      'Majuli runs out of relief camp places immediately — 3,000 projected inmates against ' +
        '2,000 places (10 relief camps × 200 people). 1,000 people would have nowhere to shelter.',
    );
    expect(camp?.derivation.inputs).toContainEqual({
      label: 'Camp capacity assumption',
      value: '200 people per relief camp',
      source: 'assumption',
    });
  });

  it('spells out a ration failure with the day and the daily demand', () => {
    const ration = analyse().failurePoints[1];

    expect(ration?.derivation.explanation).toBe(
      'Jorhat runs out of rice on day 3.3 of a 10-day scenario — 2,000 kg in stock against ' +
        '600 kg/day of demand for 1,000 projected inmates. That leaves 6.7 days of the ' +
        'scenario without rice.',
    );
  });
});

describe('a district that cannot be assessed is said to be unassessable, never sound', () => {
  it('cannot judge camp capacity or rations without an inmate projection', () => {
    const report = aReport({
      districts: [
        aDistrict({
          name: 'Sivasagar',
          affected: count(10_000),
          inmates: unknownCount(),
          reliefCamps: count(10),
          rice: quintals(20),
        }),
      ],
      statewide: {
        populationAffected: count(10_000),
        campInmates: unknownCount(),
        reliefCamps: count(10),
      },
    });

    const analysis = identifyFailurePoints(project(report, heldSteadyForTenDays(), deps()), {
      campCapacityPerCamp: 200,
    });

    expect(analysis.failurePoints).toEqual([]);
    expect(analysis.notAssessable).toEqual([
      {
        district: 'Sivasagar',
        mode: 'camp-capacity',
        reason: 'The number of inmates under this scenario is not known.',
      },
      {
        district: 'Sivasagar',
        mode: 'ration-exhaustion',
        reason: 'The number of inmates under this scenario is not known.',
      },
    ]);
  });

  it('judges camp capacity but not rations when the rice stock was never reported', () => {
    const report = aReport({
      districts: [
        aDistrict({
          name: 'Sivasagar',
          affected: count(10_000),
          inmates: count(3_000),
          reliefCamps: count(10),
          rice: unknownQuintals(),
        }),
      ],
      statewide: {
        populationAffected: count(10_000),
        campInmates: count(3_000),
        reliefCamps: count(10),
      },
    });

    const analysis = identifyFailurePoints(project(report, heldSteadyForTenDays(), deps()), {
      campCapacityPerCamp: 200,
    });

    expect(analysis.failurePoints.map((f) => f.mode)).toEqual(['camp-capacity']);
    expect(analysis.notAssessable).toEqual([
      {
        district: 'Sivasagar',
        mode: 'ration-exhaustion',
        reason: 'Rice stock was not reported for this district, and an unreported stock is not an empty one.',
      },
    ]);
  });

  it('refuses a camp capacity assumption that is not a positive number of places', () => {
    const outcome = project(threeDistrictsUnderPressure(), heldSteadyForTenDays(), deps());

    expect(() => identifyFailurePoints(outcome, { campCapacityPerCamp: 0 })).toThrow(
      /camp capacity/i,
    );
  });
});

describe('the flagship question: if affected population grows 30%, who fails first?', () => {
  it('answers with a district and a day, from the 2026-07-27 baseline', () => {
    const outcome = project(
      assamBaseline20260727(),
      scenarioLevers({
        populationGrowthFactor: 1.3,
        campUptakeShift: { kind: 'to-rate', rate: 0.25 },
        durationDays: 5,
        rationNormKgPerPersonPerDay: 0.6,
      }),
      deps(),
    );

    const analysis = identifyFailurePoints(outcome, { campCapacityPerCamp: 500 });
    const first = firstFailurePoint(analysis);

    expect(first?.district).toBe('Dhemaji');
    expect(first?.mode).toBe('camp-capacity');
    expect(first?.dayOfFailure).toBe(0);
    // Every affected district is over camp capacity, and every one of them runs
    // out of rice inside the five days.
    expect(analysis.failurePoints.filter((f) => f.mode === 'camp-capacity')).toHaveLength(6);
    expect(analysis.failurePoints.filter((f) => f.mode === 'ration-exhaustion')).toHaveLength(6);
    expect(analysis.notAssessable).toEqual([]);
  });
});

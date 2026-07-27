import { describe, expect, it, vi } from 'vitest';

import { count } from '../shared/quantity';
import { districtName } from '../shared/administrative-unit';
import type { DistrictName } from '../shared/administrative-unit';
import type { FloodSituationReport } from '../shared/flood-situation-report';
import { ScenarioInvariantError, createScenario, scenarioLevers } from './scenario';
import type { ScenarioLeverSpec } from './scenario';
import type { ProjectionDependencies } from './projection-engine';
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

const levers = () =>
  scenarioLevers({
    populationGrowthFactor: 1.3,
    campUptakeShift: { kind: 'to-rate', rate: 0.25 },
    durationDays: 5,
    rationNormKgPerPersonPerDay: 0.6,
  });

describe('a Scenario is always anchored to a real bulletin (PRD §5.5 invariant 1)', () => {
  it('takes the baseline bulletin itself, so its id cannot be invented', () => {
    const scenario = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    });

    expect(scenario.baselineReportId).toBe('sha256:asdma-2026-07-27');
    expect(scenario.baselineReportDate).toBe('2026-07-27');
  });

  it('refuses to exist without a baseline', () => {
    expect(() =>
      createScenario({
        name: 'Free-floating projection',
        baseline: undefined as unknown as FloodSituationReport,
        levers: levers(),
      }),
    ).toThrow(ScenarioInvariantError);
  });

  it('refuses a baseline whose bulletin id is blank — that is not a real bulletin', () => {
    expect(() =>
      createScenario({
        name: 'Anchored to nothing',
        baseline: aReport({ id: '   ' }),
        levers: levers(),
      }),
    ).toThrow(/baseline bulletin/i);
  });

  it('refuses a baseline with no report date — there is no undated bulletin', () => {
    expect(() =>
      createScenario({
        name: 'Undated',
        baseline: aReport({ date: '' }),
        levers: levers(),
      }),
    ).toThrow(/report date/i);
  });

  it('refuses an unnamed scenario, because scenarios are compared by name (FR-4.5)', () => {
    expect(() =>
      createScenario({ name: '  ', baseline: assamBaseline20260727(), levers: levers() }),
    ).toThrow(/name/i);
  });
});

describe('scenario levers are validated where they are stated', () => {
  const valid = {
    populationGrowthFactor: 1.3,
    campUptakeShift: { kind: 'to-rate', rate: 0.25 },
    durationDays: 5,
    rationNormKgPerPersonPerDay: 0.6,
  } as const;

  it('accepts the flagship lever set', () => {
    expect(scenarioLevers(valid)).toEqual({
      populationGrowthFactor: 1.3,
      campUptakeShift: { kind: 'to-rate', rate: 0.25 },
      durationDays: 5,
      rationNorm: { kgPerPersonPerDay: 0.6 },
      additionalCampCapacity: new Map(),
    });
  });

  const invalid: readonly (readonly [string, Partial<ScenarioLeverSpec>, RegExp])[] = [
    ['a negative growth factor', { populationGrowthFactor: -0.5 }, /growth factor/i],
    ['a non-finite growth factor', { populationGrowthFactor: Number.NaN }, /growth factor/i],
    ['a zero-day duration', { durationDays: 0 }, /duration/i],
    ['a fractional duration', { durationDays: 2.5 }, /duration/i],
    ['a zero ration norm', { rationNormKgPerPersonPerDay: 0 }, /ration norm/i],
    ['a negative ration norm', { rationNormKgPerPersonPerDay: -0.6 }, /ration norm/i],
    ['an uptake above 100%', { campUptakeShift: { kind: 'to-rate', rate: 1.4 } }, /uptake/i],
    ['a negative uptake', { campUptakeShift: { kind: 'to-rate', rate: -0.1 } }, /uptake/i],
  ];

  it.each(invalid)('rejects %s', (_case, override, message) => {
    expect(() => scenarioLevers({ ...valid, ...override })).toThrow(message);
  });

  it('rejects negative or fractional additional relief camps', () => {
    const sivasagar: DistrictName = districtName('Sivasagar');
    expect(() =>
      scenarioLevers({ ...valid, additionalCampCapacity: new Map([[sivasagar, -3]]) }),
    ).toThrow(/additional relief camps/i);
    expect(() =>
      scenarioLevers({ ...valid, additionalCampCapacity: new Map([[sivasagar, 1.5]]) }),
    ).toThrow(/additional relief camps/i);
  });

  it('requires the ration norm to be stated — there is no default (PRD §5.3 invariant 3)', () => {
    // @ts-expect-error the ration norm is deliberately not optional.
    expect(() => scenarioLevers({ ...valid, rationNormKgPerPersonPerDay: undefined })).toThrow(
      /ration norm/i,
    );
  });
});

describe('scenarios are compared by varying levers, not by mutating them (FR-4.5)', () => {
  it('produces a new scenario on the same baseline when a lever moves', () => {
    const original = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    });

    const harsher = original.withLevers({ populationGrowthFactor: 1.6 });

    expect(harsher.levers.populationGrowthFactor).toBe(1.6);
    expect(harsher.baselineReportId).toBe(original.baselineReportId);
    expect(original.levers.populationGrowthFactor).toBe(1.3);
    expect(harsher.levers.durationDays).toBe(5);
  });

  it('validates the changed lever rather than trusting it', () => {
    const scenario = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    });

    expect(() => scenario.withLevers({ durationDays: -1 })).toThrow(ScenarioInvariantError);
  });

  it('can be renamed without losing its anchor', () => {
    const scenario = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    }).renamedTo('Worst case, five days');

    expect(scenario.name).toBe('Worst case, five days');
    expect(scenario.baselineReportId).toBe('sha256:asdma-2026-07-27');
  });

  it('refuses to be renamed to nothing', () => {
    const scenario = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    });

    expect(() => scenario.renamedTo('   ')).toThrow(/name/i);
  });
});

describe('projecting a scenario', () => {
  it('projects against its own baseline and reports what it was computed from', () => {
    const scenario = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    });

    const outcome = scenario.project(assamBaseline20260727(), deps());

    expect(outcome.statewide.projectedAffected.value).toEqual(count(579_143));
    expect(outcome.recomputedBy().baselineBulletinId).toBe('sha256:asdma-2026-07-27');
  });

  it('refuses to project against a different bulletin', () => {
    const scenario = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    });

    expect(() => scenario.project(aReport({ id: 'sha256:some-other-bulletin' }), deps())).toThrow(
      /baseline/i,
    );
  });

  it('picks up a corrected re-parse of the same bulletin, so no projection goes stale', () => {
    const scenario = createScenario({
      name: 'Flood worsens 30%',
      baseline: assamBaseline20260727(),
      levers: levers(),
    });

    const corrected = aReport({
      id: 'sha256:asdma-2026-07-27',
      districts: [aDistrict({ name: 'Sivasagar', affected: count(500_000) })],
      statewide: {
        populationAffected: count(500_000),
        campInmates: count(28_695),
        reliefCamps: count(90),
      },
    });

    expect(scenario.project(corrected, deps()).statewide.projectedAffected.value).toEqual(
      count(650_000),
    );
  });
});

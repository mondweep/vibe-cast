import { beforeEach, describe, expect, it, vi } from 'vitest';

import { count, quintals, unknownCount, unknownQuintals, valueOf } from '../shared/quantity';
import { districtName } from '../shared/administrative-unit';
import type { DistrictName } from '../shared/administrative-unit';
import { formatDecimal } from './derivation';
import { isProjectedOutcome, project } from './projection-engine';
import type { ProjectionDependencies } from './projection-engine';
import { scenarioLevers } from './scenario';
import {
  DHEMAJI,
  SIVASAGAR,
  aDistrict,
  aReport,
  assamBaseline20260727,
} from './__fixtures__/report-builder';

/**
 * London-School doubles for the two calculations owned by the Response Capacity
 * context. The ProjectionEngine's job is to work out *what to ask* — perturbed
 * affected population, perturbed inmate count, rice stock in kilograms — and
 * then delegate. So the interaction is the behaviour, and it is asserted as
 * such. The doubles compute honestly (rather than returning canned values) so
 * the worked example's end-to-end arithmetic is exercised too.
 */
const makeDeps = (): ProjectionDependencies & {
  rationCoverageDays: ReturnType<typeof vi.fn>;
  campLoad: ReturnType<typeof vi.fn>;
} => ({
  rationCoverageDays: vi.fn(
    ({ riceStockKg, inmates, rationNormKgPerPersonPerDay }) => {
      const dailyDemand = inmates * rationNormKgPerPersonPerDay;
      return dailyDemand > 0 ? riceStockKg / dailyDemand : undefined;
    },
  ),
  campLoad: vi.fn(({ inmates, reliefCamps }) =>
    reliefCamps > 0 ? inmates / reliefCamps : undefined,
  ),
});

const noExtraCamps = new Map<DistrictName, number>();

const floodWorsensLevers = () =>
  scenarioLevers({
    populationGrowthFactor: 1.3,
    campUptakeShift: { kind: 'to-rate', rate: 0.25 },
    durationDays: 5,
    rationNormKgPerPersonPerDay: 0.6,
    additionalCampCapacity: noExtraCamps,
  });

describe('PRD §5.5 worked example — the flagship scenario', () => {
  // Baseline 2026-07-27: 445,495 affected, 6.4% uptake, 6.9 days of rice.
  // Apply +30% affected, uptake rises to 25%, sustained 5 days.
  let deps: ReturnType<typeof makeDeps>;
  let outcome: ReturnType<typeof project>;

  beforeEach(() => {
    deps = makeDeps();
    outcome = project(assamBaseline20260727(), floodWorsensLevers(), deps);
  });

  it('shows the reported baseline beside the projection, never the projection alone (FR-4.3)', () => {
    expect(outcome.statewide.baseline).toEqual({
      affected: count(445_495),
      inmates: count(28_695),
      reliefCamps: count(90),
      uptakeRate: { kind: 'known', unit: 'rate', value: 28_695 / 445_495 },
      campLoad: { kind: 'known', unit: 'per-camp', value: 28_695 / 90 },
      riceStockKilograms: { kind: 'known', unit: 'kg', value: 1_191.092 * 100 },
      rationCoverage: { kind: 'known', unit: 'days', value: (1_191.092 * 100) / (28_695 * 0.6) },
    });
    // 6.4% uptake, 319 per camp, 6.9 days of rice — PRD Appendix B derived row.
    expect(formatDecimal(28_695 / 445_495, 3)).toBe('0.064');
    expect(Math.round(28_695 / 90)).toBe(319);
    expect(formatDecimal((1_191.092 * 100) / (28_695 * 0.6), 1)).toBe('6.9');
  });

  it('projects 579,143 affected — 445,495 grown by 30%', () => {
    expect(outcome.statewide.projectedAffected.value).toEqual(count(579_143));
    expect(outcome.statewide.projectedAffected.provenance).toBe('projected');
  });

  it('projects 144,785 inmates — 25% uptake of 579,143', () => {
    expect(outcome.statewide.projectedInmates.value).toEqual(count(144_785));
  });

  it('projects a camp load of 1,609 per camp at the reported 90 camps', () => {
    expect(deps.campLoad).toHaveBeenCalledWith({ inmates: 144_785, reliefCamps: 90 });
    expect(Math.round(valueOf(outcome.statewide.projectedCampLoad.value) ?? 0)).toBe(1_609);
  });

  it('projects rice demand of 86,871 kg/day against 119,109 kg of stock', () => {
    expect(outcome.statewide.projectedDailyRiceDemand.value).toEqual({
      kind: 'known',
      unit: 'kg/day',
      value: 86_871,
    });
    expect(deps.rationCoverageDays).toHaveBeenCalledWith({
      riceStockKg: expect.closeTo(119_109.2, 5),
      inmates: 144_785,
      rationNormKgPerPersonPerDay: 0.6,
    });
  });

  it('collapses ration coverage from 6.9 days to 1.4 days', () => {
    const coverage = outcome.statewide.rationCoverage.value;
    expect(coverage.kind).toBe('known');
    expect(formatDecimal(coverage.kind === 'known' ? coverage.value : undefined, 1)).toBe('1.4');
    expect(coverage.kind === 'known' ? coverage.value : 0).toBeCloseTo(1.3711, 4);
  });

  it('warns that rice is exhausted before the 5-day scenario ends', () => {
    expect(outcome.horizonDays).toBe(5);
    expect(outcome.statewide.rationCoverage.derivation.explanation).toContain(
      'exhausted 3.6 days before it ends',
    );
  });

  it('explains every projected figure in words an officer can argue with (FR-4.6)', () => {
    expect(outcome.statewide.projectedAffected.derivation.explanation).toBe(
      '579,143 people projected affected — the 445,495 reported by ASDMA on 2026-07-27, ' +
        'grown by 30% under this scenario.',
    );
    expect(outcome.statewide.projectedInmates.derivation.explanation).toBe(
      '144,785 inmates projected — camp uptake rises from the reported 6.4% to 25%, ' +
        'applied to 579,143 projected affected people.',
    );
    expect(outcome.statewide.projectedCampLoad.derivation.explanation).toBe(
      '1,609 inmates per relief camp — 144,785 projected inmates across 90 relief camps, ' +
        'against 319 per camp reported.',
    );
    expect(outcome.statewide.rationCoverage.derivation.explanation).toBe(
      'Rice runs out in 1.4 days — camp uptake of 25% gives 144,785 projected inmates, ' +
        'who eat 0.6 kg of rice each per day: 86,871 kg/day of demand against 119,109 kg ' +
        'in stock (1,191.09 quintals × 100 kg). The scenario runs 5 days, so rice is ' +
        'exhausted 3.6 days before it ends.',
    );
  });

  it('labels the ration norm as an assumption, not as something ASDMA reported', () => {
    const inputs = outcome.statewide.rationCoverage.derivation.inputs;
    expect(inputs).toContainEqual({
      label: 'Ration norm',
      value: '0.6 kg per person per day',
      source: 'assumption',
    });
    expect(inputs).toContainEqual({
      label: 'Rice in stock',
      value: '119,109 kg',
      source: 'reported',
    });
  });

  it('projects every district, not only the statewide picture', () => {
    expect(outcome.districts).toHaveLength(8);
    const sivasagar = outcome.districts.find((d) => d.district === SIVASAGAR);
    // 144,461 × 1.3 = 187,799.3 → 187,799 affected; × 25% = 46,949.75 → 46,949.
    expect(sivasagar?.projectedAffected.value).toEqual(count(187_799));
    expect(sivasagar?.projectedInmates.value).toEqual(count(46_949));
    expect(deps.campLoad).toHaveBeenCalledWith({ inmates: 46_949, reliefCamps: 30 });
  });
});

describe('levers', () => {
  it('holds uptake at the reported rate when the lever is not moved', () => {
    const deps = makeDeps();
    const outcome = project(
      assamBaseline20260727(),
      scenarioLevers({
        populationGrowthFactor: 1,
        campUptakeShift: { kind: 'hold-baseline' },
        durationDays: 1,
        rationNormKgPerPersonPerDay: 0.6,
      }),
      deps,
    );

    expect(outcome.statewide.projectedAffected.value).toEqual(count(445_495));
    // 6.4411…% of 445,495 is 28,695 again, floored back to the reported figure.
    expect(outcome.statewide.projectedInmates.value).toEqual(count(28_695));
    expect(outcome.statewide.projectedInmates.derivation.explanation).toContain(
      'camp uptake held at the reported 6.4%',
    );
  });

  it('says "falls" when uptake is dialled down, not "rises"', () => {
    const outcome = project(
      assamBaseline20260727(),
      scenarioLevers({
        populationGrowthFactor: 1,
        campUptakeShift: { kind: 'to-rate', rate: 0.03 },
        durationDays: 1,
        rationNormKgPerPersonPerDay: 0.6,
      }),
      makeDeps(),
    );

    expect(outcome.statewide.projectedInmates.derivation.explanation).toContain(
      'camp uptake falls from the reported 6.4% to 3%',
    );
  });

  it('describes a receding flood as a reduction, not negative growth', () => {
    const outcome = project(
      assamBaseline20260727(),
      scenarioLevers({
        populationGrowthFactor: 0.8,
        campUptakeShift: { kind: 'hold-baseline' },
        durationDays: 2,
        rationNormKgPerPersonPerDay: 0.6,
      }),
      makeDeps(),
    );

    expect(outcome.statewide.projectedAffected.value).toEqual(count(356_396));
    expect(outcome.statewide.projectedAffected.derivation.explanation).toContain('reduced by 20%');
  });

  it('opens additional relief camps in the districts the user names', () => {
    const deps = makeDeps();
    const outcome = project(
      assamBaseline20260727(),
      scenarioLevers({
        populationGrowthFactor: 1.3,
        campUptakeShift: { kind: 'to-rate', rate: 0.25 },
        durationDays: 5,
        rationNormKgPerPersonPerDay: 0.6,
        additionalCampCapacity: new Map([[SIVASAGAR, 20]]),
      }),
      deps,
    );

    expect(deps.campLoad).toHaveBeenCalledWith({ inmates: 46_949, reliefCamps: 50 });
    expect(deps.campLoad).toHaveBeenCalledWith({ inmates: 144_785, reliefCamps: 110 });
    const sivasagar = outcome.districts.find((d) => d.district === SIVASAGAR);
    expect(sivasagar?.reliefCampsAvailable).toEqual(count(50));
  });

  it('surfaces the ration norm as an arguable assumption, changing coverage when moved', () => {
    const outcome = project(
      assamBaseline20260727(),
      scenarioLevers({
        populationGrowthFactor: 1.3,
        campUptakeShift: { kind: 'to-rate', rate: 0.25 },
        durationDays: 5,
        rationNormKgPerPersonPerDay: 0.4,
      }),
      makeDeps(),
    );

    expect(outcome.statewide.projectedDailyRiceDemand.value).toEqual({
      kind: 'known',
      unit: 'kg/day',
      value: 144_785 * 0.4,
    });
  });
});

describe('unknown quantities stay unknown (PRD §3.3)', () => {
  it('cannot project an affected population ASDMA did not report', () => {
    const deps = makeDeps();
    const outcome = project(
      aReport({
        statewide: {
          populationAffected: unknownCount(),
          campInmates: unknownCount(),
          reliefCamps: unknownCount(),
        },
      }),
      floodWorsensLevers(),
      deps,
    );

    expect(outcome.statewide.projectedAffected.value).toEqual({ kind: 'unknown', unit: 'count' });
    expect(outcome.statewide.projectedInmates.value).toEqual({ kind: 'unknown', unit: 'count' });
    expect(outcome.statewide.projectedAffected.derivation.explanation).toContain('not reported');
    expect(deps.campLoad).not.toHaveBeenCalled();
    expect(deps.rationCoverageDays).not.toHaveBeenCalled();
  });

  it('cannot hold uptake at a baseline it does not know', () => {
    const outcome = project(
      aReport({
        statewide: {
          populationAffected: count(100_000),
          campInmates: unknownCount(),
          reliefCamps: count(10),
        },
      }),
      scenarioLevers({
        populationGrowthFactor: 1.3,
        campUptakeShift: { kind: 'hold-baseline' },
        durationDays: 3,
        rationNormKgPerPersonPerDay: 0.6,
      }),
      makeDeps(),
    );

    expect(outcome.statewide.projectedInmates.value).toEqual({ kind: 'unknown', unit: 'count' });
    expect(outcome.statewide.rationCoverage.value).toEqual({ kind: 'unknown', unit: 'days' });
  });

  it('still projects inmates from an explicit uptake target when the baseline is unknown', () => {
    const outcome = project(
      aReport({
        statewide: {
          populationAffected: count(100_000),
          campInmates: unknownCount(),
          reliefCamps: count(10),
        },
      }),
      floodWorsensLevers(),
      makeDeps(),
    );

    expect(outcome.statewide.projectedInmates.value).toEqual(count(32_500));
  });

  it('cannot project ration coverage against an unreported rice stock', () => {
    const deps = makeDeps();
    const outcome = project(
      aReport({
        districts: [aDistrict({ name: 'Dhemaji', affected: count(1_000), rice: unknownQuintals() })],
        statewide: {
          populationAffected: count(1_000),
          campInmates: count(100),
          reliefCamps: count(4),
        },
      }),
      floodWorsensLevers(),
      deps,
    );

    expect(outcome.statewide.rationCoverage.value).toEqual({ kind: 'unknown', unit: 'days' });
    expect(outcome.statewide.rationCoverage.derivation.explanation).toContain('not reported');
    expect(deps.rationCoverageDays).not.toHaveBeenCalled();
  });

  it('cannot project a camp load when the number of relief camps was never reported', () => {
    const deps = makeDeps();
    const outcome = project(
      aReport({
        statewide: {
          populationAffected: count(10_000),
          campInmates: count(1_000),
          reliefCamps: unknownCount(),
        },
      }),
      floodWorsensLevers(),
      deps,
    );

    expect(outcome.statewide.reliefCampsAvailable).toEqual({ kind: 'unknown', unit: 'count' });
    expect(outcome.statewide.projectedCampLoad.derivation.explanation).toContain(
      'the number of relief camps was not reported',
    );
    expect(deps.campLoad).not.toHaveBeenCalled();
  });

  it('reports an unknown camp load where no relief camps are open, never a zero', () => {
    const deps = makeDeps();
    const outcome = project(
      aReport({
        districts: [aDistrict({ name: 'Dhemaji' })],
        statewide: {
          populationAffected: count(0),
          campInmates: count(0),
          reliefCamps: count(0),
        },
      }),
      floodWorsensLevers(),
      deps,
    );

    expect(outcome.statewide.projectedCampLoad.value).toEqual({ kind: 'unknown', unit: 'per-camp' });
    expect(deps.campLoad).toHaveBeenCalledWith({ inmates: 0, reliefCamps: 0 });
    // No inmates means no rice is drawn down; asking for coverage would be noise.
    expect(deps.rationCoverageDays).not.toHaveBeenCalled();
    const dhemaji = outcome.districts.find((d) => d.district === DHEMAJI);
    expect(dhemaji?.rationCoverage.derivation.explanation).toContain('No inmates are projected');
  });
});

describe('ProjectedOutcome is computed, never stored (PRD §5.5 invariant 2)', () => {
  const outcome = () => project(assamBaseline20260727(), floodWorsensLevers(), makeDeps());

  it('is recognisable as a live projection', () => {
    expect(isProjectedOutcome(outcome())).toBe(true);
    expect(isProjectedOutcome({ statewide: {}, districts: [] })).toBe(false);
    expect(isProjectedOutcome(null)).toBe(false);
  });

  it('cannot survive a JSON round trip, so it cannot be persisted and rehydrated', () => {
    const rehydrated: unknown = JSON.parse(JSON.stringify(outcome()));

    expect(isProjectedOutcome(rehydrated)).toBe(false);
  });

  it('cannot be structurally cloned into a store', () => {
    expect(() => structuredClone(outcome())).toThrow();
  });

  it('names the baseline and levers it must be recomputed from', () => {
    const levers = floodWorsensLevers();
    const recipe = project(assamBaseline20260727(), levers, makeDeps()).recomputedBy();

    expect(recipe.baselineBulletinId).toBe('sha256:asdma-2026-07-27');
    expect(recipe.levers).toEqual(levers);
  });

  it('is deterministic — same baseline and levers, same numbers, no clock, no randomness', () => {
    const a = project(assamBaseline20260727(), floodWorsensLevers(), makeDeps());
    const b = project(assamBaseline20260727(), floodWorsensLevers(), makeDeps());

    expect(b.statewide.projectedInmates).toEqual(a.statewide.projectedInmates);
    expect(b.statewide.rationCoverage).toEqual(a.statewide.rationCoverage);
    expect(b.districts).toEqual(a.districts);
  });

  it('moves with a corrected baseline, so a stale projection cannot outlive the correction', () => {
    const corrected = aReport({
      id: 'sha256:asdma-2026-07-27',
      districts: [aDistrict({ name: 'Sivasagar', rice: quintals(1_191.092) })],
      statewide: {
        populationAffected: count(500_000),
        campInmates: count(28_695),
        reliefCamps: count(90),
      },
    });

    const before = project(assamBaseline20260727(), floodWorsensLevers(), makeDeps());
    const after = project(corrected, floodWorsensLevers(), makeDeps());

    expect(before.statewide.projectedAffected.value).toEqual(count(579_143));
    expect(after.statewide.projectedAffected.value).toEqual(count(650_000));
  });

  it('leaves the baseline report untouched', () => {
    const report = assamBaseline20260727();
    const before = JSON.stringify(report);

    project(report, floodWorsensLevers(), makeDeps());

    expect(JSON.stringify(report)).toBe(before);
  });
});

describe('district projections', () => {
  it('projects a district that reports nothing as a district with nothing to project', () => {
    const outcome = project(
      aReport({
        districts: [aDistrict({ name: 'Kamrup Metro' })],
        statewide: { populationAffected: count(0), campInmates: count(0), reliefCamps: count(0) },
      }),
      floodWorsensLevers(),
      makeDeps(),
    );

    const kamrup = outcome.districts[0];
    expect(kamrup?.district).toBe(districtName('Kamrup Metro'));
    expect(kamrup?.projectedAffected.value).toEqual(count(0));
    expect(kamrup?.projectedInmates.value).toEqual(count(0));
  });
});

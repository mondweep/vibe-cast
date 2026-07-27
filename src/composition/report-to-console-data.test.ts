/**
 * The mapper is where the domain's answers become the console's figures, so
 * these tests are the product's arithmetic acceptance tests: the 2026-07-27
 * bulletin in, PRD Appendix B's derived figures out.
 *
 * They also pin the two things that are easiest to lose at a boundary — the
 * derivation that justifies a figure, and the difference between unknown and
 * zero — and assert that the Scenario context is driven by the real Response
 * Capacity calculations rather than by arithmetic reinvented here.
 */

import { describe, expect, it, vi } from 'vitest';
import { districtName } from '../domain/shared/administrative-unit';
import { count, hectares, quintals, unknownCount } from '../domain/shared/quantity';
import { bulletinTimeline } from '../domain/timeline/bulletin-timeline';
import { aDistrictReport, aReport } from '../application/services/report.fixture';
import { formatDerived, formatNumber, type DerivedFigure } from '../adapters/ui/view-models';
import { DEFAULT_ASSUMPTIONS, type ConsoleAssumptions } from './assumptions';
import { createScenarioDependencies } from './scenario-dependencies';
import {
  DEFAULT_MAPPING_DEPENDENCIES,
  reportToConsoleData,
  type MappingDependencies,
} from './report-to-console-data';

const map = (
  report = aReport(),
  assumptions: ConsoleAssumptions = DEFAULT_ASSUMPTIONS,
  deps?: MappingDependencies,
) =>
  reportToConsoleData(
    { report, timeline: bulletinTimeline([report]), assumptions },
    deps ?? DEFAULT_MAPPING_DEPENDENCIES,
  );

const figure = (figures: readonly DerivedFigure[], key: string): DerivedFigure => {
  const found = figures.find((candidate) => candidate.key === key);
  if (found === undefined) throw new Error(`no derived figure "${key}"`);
  return found;
};

describe('PRD Appendix B — the derived figures of the 2026-07-27 bulletin', () => {
  it('computes Unsheltered Affected as 365,023 and shows the sum that produced it', () => {
    const { summary } = map();

    expect(summary.unshelteredAffected.value).toBe(365_023);
    expect(summary.unshelteredAffected.formula).toBe(
      'Affected Population − Inmates − Non-Camp Inmates',
    );
    expect(summary.unshelteredAffected.workings).toBe('445,495 − 28,695 − 51,777 = 365,023');
    expect(summary.unshelteredShare).toBeCloseTo(0.819, 3);
  });

  it('computes a Camp Uptake Rate of 6.4%', () => {
    const uptake = figure(map().summary.derivedMetrics, 'camp-uptake-rate');

    expect(uptake.value).toBeCloseTo(6.44, 2);
    expect(formatDerived(uptake)).toBe('6.4 %');
    expect(uptake.workings).toBe('28,695 ÷ 445,495 = 6.4%');
  });

  it('computes a Camp Load of 319 per Relief Camp', () => {
    const { capacity } = map();

    expect(capacity.campLoad.value).toBeCloseTo(28_695 / 90, 9);
    expect(formatDerived(capacity.campLoad)).toBe('319 per Relief Camp');
    expect(capacity.campLoad.formula).toBe('Inmates ÷ Relief Camps');
    expect(capacity.campLoad.workings).toBe('28,695 ÷ 90 = 319 per Relief Camp');
  });

  it('computes 6.9 days of ration coverage at the SDRF norm', () => {
    const { capacity } = map();

    expect(capacity.rationCoverageDays.value).toBeCloseTo(6.918, 3);
    expect(formatDerived(capacity.rationCoverageDays)).toBe('6.9 days');
    expect(capacity.rationCoverageDays.workings).toBe('119,109.2 ÷ (28,695 × 0.6) = 6.9 days');
  });

  it('computes a Rescue Asset Ratio of 0.15 boats per 1,000 affected', () => {
    const ratio = figure(map().summary.derivedMetrics, 'rescue-asset-ratio');

    expect(formatDerived(ratio)).toBe('0.15 boats per 1,000 affected');
  });

  it('keeps ASDMA’s reported totals as reported, not re-summed', () => {
    const report = aReport({
      provenance: [
        { kind: 'districts-affected', sourcePages: [1], confidence: 'high' },
        {
          kind: 'population-and-crop-area-submerged',
          sourcePages: [1, 2],
          confidence: 'high',
        },
        { kind: 'infrastructure-others', sourcePages: [12], confidence: 'failed' },
      ],
    });
    const { summary } = map(report);
    const affected = summary.affectedPopulation;

    expect(affected.quantity).toEqual(count(445_495));
    expect(affected.provenance).toMatchObject({
      sectionLabel: 'Population and Crop Area Submerged',
      sourcePages: [1, 2],
      confidence: 'high',
    });
    // A section we could not read is named as unreadable, never rendered as 0.
    expect(summary.unreadableSections.map((section) => section.sectionLabel)).toEqual([
      'Infrastructure Damaged — Others',
    ]);
  });
});

describe('the ration norm is an assumption the user can argue with', () => {
  it('moves the coverage days when the norm changes', () => {
    const atSdrf = map().capacity.rationCoverageDays;
    const atOneKilogram = map(aReport(), {
      ...DEFAULT_ASSUMPTIONS,
      rationNormKgPerPersonPerDay: 1,
    }).capacity.rationCoverageDays;

    expect(atSdrf.value).toBeCloseTo(6.918, 3);
    expect(atOneKilogram.value).toBeCloseTo(4.151, 3);
    expect(atOneKilogram.workings).toContain('× 1)');
    expect(atOneKilogram.context).toContain('1 kg/person/day');
  });
});

describe('the Scenario context is driven by the Response Capacity context', () => {
  it('projects the flagship scenario through the real calculations', () => {
    const rows = map().scenarioComparisons;
    const row = (key: string) => rows.find((candidate) => candidate.key === key);

    expect(row('affected')).toMatchObject({ baseline: '445,495', projected: '579,143' });
    expect(row('inmates')).toMatchObject({ baseline: '28,695', projected: '144,785' });
    expect(row('camp-load')).toMatchObject({
      baseline: '319 per Relief Camp',
      projected: '1,609 per Relief Camp',
    });
    expect(row('ration-days')).toMatchObject({ baseline: '6.9 days', projected: '1.4 days' });
    expect(row('ration-days')?.direction).toBe('worse');
  });

  it('asks the injected dependencies rather than computing ratios itself', () => {
    const real = createScenarioDependencies();
    const scenarioDependencies = {
      rationCoverageDays: vi.fn(real.rationCoverageDays),
      campLoad: vi.fn(real.campLoad),
    };

    map(aReport(), DEFAULT_ASSUMPTIONS, {
      ...DEFAULT_MAPPING_DEPENDENCIES,
      scenarioDependencies,
    });

    expect(scenarioDependencies.campLoad).toHaveBeenCalledWith({
      inmates: 28_695,
      reliefCamps: 90,
    });
    expect(scenarioDependencies.campLoad).toHaveBeenCalledWith({
      inmates: 144_785,
      reliefCamps: 90,
    });
    const projectedCoverage = scenarioDependencies.rationCoverageDays.mock.calls.find(
      ([input]) => input.inmates === 144_785,
    );
    expect(projectedCoverage).toBeDefined();
    // 1,191.092 Q × 100 kg, carried at full precision — rounding is display only.
    expect(projectedCoverage?.[0].riceStockKg).toBeCloseTo(119_109.2, 6);
    expect(projectedCoverage?.[0].rationNormKgPerPersonPerDay).toBe(0.6);
  });

  it('names the District that fails first, with the reasoning', () => {
    const { firstFailure } = map();

    expect(firstFailure?.district).toBe('Sivasagar');
    expect(firstFailure?.description).toMatch(/relief camp|rice/i);
  });
});

describe('unknown is not zero', () => {
  const withUnknownInmates = () =>
    aReport({
      statewideTotals: {
        ...aReport().statewideTotals,
        campInmates: unknownCount(),
      },
    });

  it('leaves a derived figure undefined when an input was not reported', () => {
    const { summary, capacity } = map(withUnknownInmates());

    expect(summary.unshelteredAffected.value).toBeUndefined();
    expect(summary.unshelteredAffected.workings).toBe('445,495 − unknown − 51,777 = —');
    expect(capacity.campLoad.value).toBeUndefined();
    expect(capacity.rationCoverageDays.value).toBeUndefined();
  });

  it('never substitutes zero in the shelter split', () => {
    const split = map(withUnknownInmates()).summary.shelterSplit;
    const inmates = split.find((segment) => segment.key === 'camp-inmates');

    expect(inmates?.value).toBeUndefined();
    expect(inmates?.value).not.toBe(0);
  });

  it('keeps a reported zero as a zero', () => {
    const report = aReport({
      districts: [
        aDistrictReport({
          district: districtName('Dhemaji'),
          villagesAffected: count(0),
          population: {
            male: count(0),
            female: count(0),
            children: count(0),
            total: count(0),
          },
          cropAreaSubmerged: hectares(0),
          reliefCamps: count(0),
          campInmates: {
            total: count(0),
            male: count(0),
            female: count(0),
            children: count(0),
            pregnantOrLactating: count(0),
            personsWithDisability: count(0),
          },
          revenueCircles: [],
          relief: { ...aDistrictReport().relief, rice: quintals(0) },
        }),
      ],
    });

    const row = map(report).districts.find((candidate) => candidate.district === 'Dhemaji');

    expect(row?.status).toBe('reported-quiet');
    expect(row?.populationAffected).toEqual(count(0));
  });
});

describe('district ranking', () => {
  it('ranks by the Severity Index and carries the per-component breakdown', () => {
    const report = aReport({
      districts: [
        aDistrictReport({ district: districtName('Charaideo'), villagesAffected: count(80) }),
        aDistrictReport({
          district: districtName('Sivasagar'),
          population: {
            male: count(60_000),
            female: count(58_000),
            children: count(26_461),
            total: count(144_461),
          },
          villagesAffected: count(240),
        }),
      ],
    });

    const rows = map(report).districts;

    expect(rows[0]?.rank).toBe(1);
    expect(rows.map((row) => row.district)).toContain('Sivasagar');
    expect(rows[0]?.contributions.map((contribution) => contribution.component)).toEqual([
      'affectedPopulation',
      'villagesAffected',
      'cropArea',
      'campLoad',
      'casualties',
    ]);
  });

  it('recomputes when the severity weights change', () => {
    const report = aReport({
      districts: [
        aDistrictReport({
          district: districtName('Charaideo'),
          villagesAffected: count(900),
          population: {
            male: count(10),
            female: count(10),
            children: count(10),
            total: count(30),
          },
        }),
        aDistrictReport({ district: districtName('Sivasagar'), villagesAffected: count(1) }),
      ],
    });

    const byPopulation = map(report, {
      ...DEFAULT_ASSUMPTIONS,
      severityWeights: {
        affectedPopulation: 1,
        villagesAffected: 0,
        cropArea: 0,
        campLoad: 0,
        casualties: 0,
      },
    }).districts[0]?.district;

    const byVillages = map(report, {
      ...DEFAULT_ASSUMPTIONS,
      severityWeights: {
        affectedPopulation: 0,
        villagesAffected: 1,
        cropArea: 0,
        campLoad: 0,
        casualties: 0,
      },
    }).districts[0]?.district;

    expect(byPopulation).toBe('Sivasagar');
    expect(byVillages).toBe('Charaideo');
  });
});

describe('the timeline', () => {
  it('reports a single bulletin as a valid timeline with no deltas', () => {
    const { trend } = map();

    expect(trend.bulletinCount).toBe(1);
    expect(trend.deltas).toEqual([]);
    expect(trend.observations).toEqual([{ date: '2026-07-27', value: 445_495 }]);
  });

  it('shows a missing day as a gap and refuses to compare across it', () => {
    const earlier = aReport({
      bulletinId: 'hash-24' as ReturnType<typeof aReport>['bulletinId'],
      reportDate: '2026-07-24' as ReturnType<typeof aReport>['reportDate'],
      statewideTotals: { ...aReport().statewideTotals, populationAffected: count(421_340) },
    });
    const latest = aReport();

    const data = reportToConsoleData({
      report: latest,
      timeline: bulletinTimeline([earlier, latest]),
      assumptions: DEFAULT_ASSUMPTIONS,
    });

    expect(data.trend.bulletinCount).toBe(2);
    expect(data.trend.gaps).toEqual([
      {
        afterDate: '2026-07-24',
        beforeDate: '2026-07-27',
        missingDates: ['2026-07-25', '2026-07-26'],
      },
    ]);
    expect(data.trend.deltas).toEqual([]);
    expect(data.trend.observations.map((observation) => observation.value)).toEqual([
      421_340, 445_495,
    ]);
  });

  it('computes a day-over-day delta between adjacent bulletins', () => {
    const yesterday = aReport({
      bulletinId: 'hash-26' as ReturnType<typeof aReport>['bulletinId'],
      reportDate: '2026-07-26' as ReturnType<typeof aReport>['reportDate'],
      statewideTotals: { ...aReport().statewideTotals, populationAffected: count(421_340) },
    });
    const latest = aReport();

    const { trend } = reportToConsoleData({
      report: latest,
      timeline: bulletinTimeline([yesterday, latest]),
      assumptions: DEFAULT_ASSUMPTIONS,
    });

    const affected = trend.deltas.find((delta) => delta.metricLabel === 'Population Affected');
    expect(affected).toMatchObject({
      fromDate: '2026-07-26',
      toDate: '2026-07-27',
      delta: 445_495 - 421_340,
      direction: 'up',
      derived: false,
    });

    const unsheltered = trend.deltas.find(
      (delta) => delta.metricLabel === 'Unsheltered Affected',
    );
    expect(unsheltered?.derived).toBe(true);
    expect(unsheltered?.to).toBe(365_023);
  });
});

describe('the damage map', () => {
  it('plots only damage that carries a coordinate', () => {
    const report = aReport();
    const { damagePoints } = map(report);

    expect(damagePoints).toHaveLength(1);
    expect(damagePoints[0]).toMatchObject({ damageClass: 'road', district: 'Sivasagar' });
  });

  it('leaves an SNR location off the map rather than guessing at one', () => {
    const report = aReport({
      infrastructureDamage: [
        {
          damageClass: 'bridge',
          district: districtName('Sivasagar'),
          circle: aReport().infrastructureDamage[0]!.circle,
          name: 'Unlocated Bridge',
          department: 'PWD',
          village: '',
          location: 'SNR',
          remarks: '',
        },
      ],
    });

    expect(map(report).damagePoints).toEqual([]);
    expect(formatNumber(0)).toBe('0');
  });
});

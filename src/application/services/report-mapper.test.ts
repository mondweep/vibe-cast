import { describe, expect, it } from 'vitest';

import { districtName, revenueCircleName } from '../../domain/shared/administrative-unit';
import { count, hectares, unknownCount, unknownHectares } from '../../domain/shared/quantity';
import {
  aDistrictReport,
  aReport,
  aRevenueCircleImpact,
  aSectionProvenance,
  anInfrastructureDamage,
  bulletinId,
  reportDate,
} from './report.fixture';
import { toBulletinSummaries, toQuantityView, toReportView } from './report-mapper';

describe('toQuantityView', () => {
  it('shapes a known quantity into value, unit and display text', () => {
    expect(toQuantityView(count(28695))).toEqual({
      known: true,
      value: 28695,
      unit: 'count',
      display: '28695',
    });
  });

  it('shapes an unknown quantity as an em dash with a null value, never a zero', () => {
    expect(toQuantityView(unknownCount())).toEqual({
      known: false,
      value: null,
      unit: 'count',
      display: '—',
    });
  });

  it('keeps a reported zero visibly distinct from an unreported figure', () => {
    const zero = toQuantityView(count(0));
    const unreported = toQuantityView(unknownCount());

    expect(zero.display).toBe('0');
    expect(unreported.display).toBe('—');
    expect(zero.value).toBe(0);
    expect(unreported.value).toBeNull();
  });

  it('rounds DRIMS float noise for display only, leaving the value untouched', () => {
    const view = toQuantityView(hectares(2025.9200000000003));

    expect(view.display).toBe('2025.92');
    expect(view.value).toBe(2025.9200000000003);
    expect(view.unit).toBe('Hect');
  });
});

describe('toReportView', () => {
  it('carries the bulletin identity through for provenance affordances (FR-2.8)', () => {
    const view = toReportView(
      aReport({ bulletinId: bulletinId('hash-27'), reportDate: reportDate('2026-07-27') }),
    );

    expect(view.bulletinId).toBe('hash-27');
    expect(view.reportDate).toBe('2026-07-27');
    expect(view.generatedAt).toBe('2026-07-27T21:49:00+05:30');
  });

  it('shapes the rivers panel, flagging empty lists rather than leaving the UI to test length', () => {
    const view = toReportView(aReport());

    expect(view.rivers.aboveDangerLevel).toEqual(['Dhansiri (S) at Numaligarh']);
    expect(view.rivers.anyAboveDangerLevel).toBe(true);
    expect(view.rivers.aboveHighestFloodLevel).toEqual([]);
    expect(view.rivers.anyAboveHighestFloodLevel).toBe(false);
  });

  it('shapes statewide totals as quantity views', () => {
    const view = toReportView(aReport());

    expect(view.statewideTotals.populationAffected.display).toBe('445495');
    expect(view.statewideTotals.cropAreaSubmerged.display).toBe('37139.52');
    expect(view.statewideTotals.campInmates.value).toBe(28695);
  });

  it('emits one row per district, in the order the bulletin listed them', () => {
    const view = toReportView(
      aReport({
        districts: [
          aDistrictReport({ district: districtName('Sivasagar') }),
          aDistrictReport({ district: districtName('Golaghat') }),
        ],
      }),
    );

    expect(view.districts.map((row) => row.district)).toEqual(['Sivasagar', 'Golaghat']);
  });

  it('keeps flood deaths, general drownings and missing separate, with no total to render (FR-2.9)', () => {
    const view = toReportView(aReport());

    expect(Object.keys(view.districts[0].casualties)).toEqual([
      'floodDeaths',
      'generalDrownings',
      'missing',
    ]);
  });

  it('shapes revenue circles for drill-down without flattening them away (FR-2.3)', () => {
    const view = toReportView(
      aReport({
        districts: [
          aDistrictReport({
            revenueCircles: [
              aRevenueCircleImpact({ circle: revenueCircleName('Nazira') }),
              aRevenueCircleImpact({ circle: revenueCircleName('Demow') }),
            ],
          }),
        ],
      }),
    );

    expect(view.districts[0].revenueCircles.map((circle) => circle.circle)).toEqual([
      'Nazira',
      'Demow',
    ]);
    expect(view.districts[0].revenueCircleCount).toBe(2);
  });

  it('flags whether a district has remarks, so the UI need not test a string', () => {
    const view = toReportView(
      aReport({
        districts: [
          aDistrictReport({ district: districtName('Charaideo'), remarks: 'Under assessment' }),
          aDistrictReport({ district: districtName('Dhemaji'), remarks: '   ' }),
        ],
      }),
    );

    expect(view.districts[0].hasRemarks).toBe(true);
    expect(view.districts[1].hasRemarks).toBe(false);
  });

  it('shapes damage points, marking which can honestly be plotted (PRD §5.4)', () => {
    const view = toReportView(
      aReport({
        infrastructureDamage: [
          anInfrastructureDamage({
            coordinate: { kind: 'precise', longitude: 94.5321, latitude: 26.9812 },
          }),
          anInfrastructureDamage({
            coordinate: {
              kind: 'approximate',
              longitude: 94,
              latitude: 27,
              reason: 'insufficient-precision',
            },
          }),
          anInfrastructureDamage({ coordinate: undefined }),
        ],
      }),
    );

    expect(view.damagePoints.map((point) => point.coordinatePrecision)).toEqual([
      'precise',
      'approximate',
      null,
    ]);
    expect(view.damagePoints.map((point) => point.plottable)).toEqual([true, true, false]);
    expect(view.damagePoints[2].longitude).toBeNull();
  });

  it('shapes section provenance with a page label an officer can read', () => {
    const view = toReportView(
      aReport({
        provenance: [
          aSectionProvenance({ kind: 'houses-damaged', sourcePages: [3, 4], confidence: 'degraded' }),
          aSectionProvenance({ kind: 'relief-distributed', sourcePages: [], confidence: 'failed' }),
          aSectionProvenance({ kind: 'districts-affected', sourcePages: [1], confidence: 'high' }),
        ],
      }),
    );

    expect(view.sections[0]).toEqual({
      section: 'houses-damaged',
      sourcePages: [3, 4],
      sourcePagesLabel: 'pp. 3–4',
      confidence: 'degraded',
      readable: true,
    });
    expect(view.sections[1].sourcePagesLabel).toBe('—');
    expect(view.sections[1].readable).toBe(false);
    expect(view.sections[2].sourcePagesLabel).toBe('p. 1');
  });

  it('surfaces reconciliation failures rather than hiding a degraded section', () => {
    const view = toReportView(
      aReport({
        reconciliationFailures: [
          {
            section: 'population-and-crop-area-submerged',
            column: 'Total',
            statedTotal: 445495,
            computedTotal: 445490,
          },
        ],
      }),
    );

    expect(view.hasReconciliationFailures).toBe(true);
    expect(view.reconciliationFailures[0]).toEqual({
      section: 'population-and-crop-area-submerged',
      column: 'Total',
      statedTotal: 445495,
      computedTotal: 445490,
      difference: 5,
    });
  });

  it('reports a clean bulletin as having no reconciliation failures', () => {
    expect(toReportView(aReport()).hasReconciliationFailures).toBe(false);
  });

  it('is total: an all-unknown, district-less bulletin shapes without throwing', () => {
    const view = toReportView(
      aReport({
        districts: [],
        infrastructureDamage: [],
        provenance: [],
        rivers: { aboveDangerLevel: [], aboveHighestFloodLevel: [] },
        statewideTotals: {
          districtsAffected: unknownCount(),
          revenueCirclesAffected: unknownCount(),
          villagesAffected: unknownCount(),
          populationAffected: unknownCount(),
          cropAreaSubmerged: unknownHectares(),
          reliefCamps: unknownCount(),
          reliefDistributionCentres: unknownCount(),
          campInmates: unknownCount(),
          nonCampInmates: unknownCount(),
        },
      }),
    );

    expect(view.districts).toEqual([]);
    expect(view.statewideTotals.populationAffected.display).toBe('—');
    expect(view.districtCount).toBe(0);
  });

  it('applies no business rules — it derives no uptake, gap or severity figure', () => {
    const view = toReportView(aReport()) as unknown as Record<string, unknown>;

    for (const forbidden of ['severityIndex', 'campUptakeRate', 'unsheltered', 'rationCoverageDays']) {
      expect(forbidden in view).toBe(false);
    }
  });
});

describe('toBulletinSummaries', () => {
  it('shapes a timeline picker row per bulletin', () => {
    const summaries = toBulletinSummaries([
      aReport({ bulletinId: bulletinId('a'), reportDate: reportDate('2026-07-26') }),
      aReport({
        bulletinId: bulletinId('b'),
        reportDate: reportDate('2026-07-27'),
        districts: [aDistrictReport(), aDistrictReport()],
      }),
    ]);

    expect(summaries).toEqual([
      {
        bulletinId: 'a',
        reportDate: '2026-07-26',
        generatedAt: '2026-07-27T21:49:00+05:30',
        districtCount: 1,
        hasReconciliationFailures: false,
      },
      {
        bulletinId: 'b',
        reportDate: '2026-07-27',
        generatedAt: '2026-07-27T21:49:00+05:30',
        districtCount: 2,
        hasReconciliationFailures: false,
      },
    ]);
  });

  it('preserves the order it was given — ordering is the use case’s job, not the mapper’s', () => {
    const summaries = toBulletinSummaries([
      aReport({ bulletinId: bulletinId('z'), reportDate: reportDate('2026-07-27') }),
      aReport({ bulletinId: bulletinId('a'), reportDate: reportDate('2026-07-25') }),
    ]);

    expect(summaries.map((summary) => summary.bulletinId)).toEqual(['z', 'a']);
  });

  it('is total: an empty timeline maps to an empty list', () => {
    expect(toBulletinSummaries([])).toEqual([]);
  });
});

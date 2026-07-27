import { describe, expect, it, vi } from 'vitest';

import { districtName } from '../shared/administrative-unit';
import type {
  AnimalCounts,
  BulletinId,
  CampInmates,
  DistrictReport,
  FloodSituationReport,
  ReportDate,
} from '../shared/flood-situation-report';
import { count, hectares, litres, quintals, unknownCount } from '../shared/quantity';
import { summariseSituation } from './situation-summary';

// --- builders -------------------------------------------------------------

const zeroAnimals: AnimalCounts = { big: count(0), small: count(0), poultry: count(0) };

const inmates = (
  total: number,
  male: number,
  female: number,
  children: number,
  pregnantOrLactating: number,
  personsWithDisability: number,
): CampInmates => ({
  total: count(total),
  male: count(male),
  female: count(female),
  children: count(children),
  pregnantOrLactating: count(pregnantOrLactating),
  personsWithDisability: count(personsWithDisability),
});

const district = (name: string, over: Partial<DistrictReport> = {}): DistrictReport => ({
  district: districtName(name),
  revenueCircles: [],
  villagesAffected: count(0),
  population: { male: count(0), female: count(0), children: count(0), total: count(0) },
  cropAreaSubmerged: hectares(0),
  reliefCamps: count(0),
  reliefDistributionCentres: count(0),
  campInmates: inmates(0, 0, 0, 0, 0, 0),
  nonCampInmates: {
    total: count(0),
    male: count(0),
    female: count(0),
    children: count(0),
    animals: zeroAnimals,
  },
  casualties: { floodDeaths: count(0), generalDrownings: count(0), missing: count(0) },
  animals: { affected: zeroAnimals, washedAway: zeroAnimals },
  houses: {
    fullySeverelyKuccha: count(0),
    fullySeverelyPukka: count(0),
    partiallyKuccha: count(0),
    partiallyPukka: count(0),
    otherHuts: count(0),
    otherCattleSheds: count(0),
  },
  relief: {
    rice: quintals(0),
    dal: quintals(0),
    salt: quintals(0),
    mustardOil: litres(0),
    greenFodder: quintals(0),
    wheatBran: quintals(0),
    riceBran: quintals(0),
  },
  rescue: {
    agencies: [],
    medicalTeams: count(0),
    boats: count(0),
    helicopters: count(0),
    personsEvacuatedByBoat: count(0),
    personsEvacuatedByHelicopter: count(0),
    animalsEvacuated: count(0),
  },
  remarks: '',
  ...over,
});

const rescue = (medicalTeams: number, boats: number) => ({
  rescue: {
    agencies: [],
    medicalTeams: count(medicalTeams),
    boats: count(boats),
    helicopters: count(0),
    personsEvacuatedByBoat: count(0),
    personsEvacuatedByHelicopter: count(0),
    animalsEvacuated: count(0),
  },
});

const rice = (q: number) => ({
  relief: {
    rice: quintals(q),
    dal: quintals(0),
    salt: quintals(0),
    mustardOil: litres(0),
    greenFodder: quintals(0),
    wheatBran: quintals(0),
    riceBran: quintals(0),
  },
});

/** The 2026-07-27 bulletin: Appendix B, district by district. */
const bulletin = (over: Partial<FloodSituationReport> = {}): FloodSituationReport => ({
  bulletinId: 'sha256:2026-07-27' as BulletinId,
  reportDate: '2026-07-27' as ReportDate,
  generatedAt: '27-07-2026 09:49 PM',
  rivers: { aboveDangerLevel: ['Dhansiri (S) (Numaligarh)'], aboveHighestFloodLevel: [] },
  districts: [
    district('Charaideo', {
      campInmates: inmates(1609, 576, 663, 300, 44, 26),
      ...rescue(44, 2),
    }),
    district('Dhemaji'),
    district('Dibrugarh'),
    district('Golaghat', {
      campInmates: inmates(618, 211, 264, 120, 21, 2),
      ...rescue(19, 2),
      ...rice(102.936),
    }),
    district('Jorhat', {
      campInmates: inmates(1773, 723, 726, 303, 17, 4),
      ...rescue(2, 2),
      ...rice(8.532),
    }),
    district('Kamrup (M)'),
    district('Nagaon'),
    district('Sivasagar', {
      campInmates: inmates(24695, 11892, 10497, 2281, 15, 10),
      ...rescue(114, 61),
      ...rice(1079.624),
    }),
  ],
  infrastructureDamage: [],
  statewideTotals: {
    districtsAffected: count(6),
    revenueCirclesAffected: count(21),
    villagesAffected: count(631),
    populationAffected: count(445495),
    cropAreaSubmerged: hectares(37139.52),
    reliefCamps: count(90),
    reliefDistributionCentres: count(94),
    campInmates: count(28695),
    nonCampInmates: count(51777),
  },
  provenance: [],
  reconciliationFailures: [],
  ...over,
});

// --- Appendix B ----------------------------------------------------------

describe('summariseSituation — reported figures stay ASDMA’s', () => {
  const summary = summariseSituation(bulletin());

  it('carries the bulletin date', () => {
    expect(summary.reportDate).toBe('2026-07-27');
  });

  it('reports ASDMA’s own statewide totals unchanged', () => {
    expect(summary.reported.populationAffected).toEqual(count(445495));
    expect(summary.reported.campInmates).toEqual(count(28695));
    expect(summary.reported.nonCampInmates).toEqual(count(51777));
    expect(summary.reported.reliefCamps).toEqual(count(90));
    expect(summary.reported.reliefDistributionCentres).toEqual(count(94));
    expect(summary.reported.villagesAffected).toEqual(count(631));
    expect(summary.reported.revenueCirclesAffected).toEqual(count(21));
    expect(summary.reported.districtsAffected).toEqual(count(6));
    expect(summary.reported.cropAreaSubmerged).toEqual(hectares(37139.52));
  });

  it('keeps Relief Camps and Relief Distribution Centres separable', () => {
    expect(summary.reported.reliefCamps).not.toEqual(summary.reported.reliefDistributionCentres);
    expect(Object.keys(summary.reported)).not.toContain('campsAndCentres');
  });

  it('sums the figures ASDMA prints only per district', () => {
    expect(summary.reported.boatsDeployed).toEqual(count(67));
    expect(summary.reported.medicalTeams).toEqual(count(179));
    expect(summary.reported.riceDistributed.kind).toBe('known');
    expect(summary.reported.riceDistributed.unit).toBe('Q');
    if (summary.reported.riceDistributed.kind === 'known') {
      expect(summary.reported.riceDistributed.value).toBeCloseTo(1191.092, 6);
    }
  });

  it('derives Vulnerable Inmates as 3004 children + 97 pregnant/lactating + 42 with disability', () => {
    expect(summary.reported.vulnerableInmates).toEqual(count(3143));
  });

  it('attributes rivers to CWC without restating them', () => {
    expect(summary.rivers.aboveDangerLevel).toEqual(['Dhansiri (S) (Numaligarh)']);
    expect(summary.rivers.aboveHighestFloodLevel).toEqual([]);
  });

  it('keeps flood deaths, general drownings and missing separate', () => {
    expect(summary.casualties.floodDeaths).toEqual(count(0));
    expect(summary.casualties.generalDrownings).toEqual(count(0));
    expect(summary.casualties.missing).toEqual(count(0));
    expect('total' in summary.casualties).toBe(false);
  });
});

describe('derived metrics — verified against PRD Appendix B', () => {
  const summary = summariseSituation(bulletin());

  it('Unsheltered Affected = 445495 − 28695 − 51777 = 365023', () => {
    const metric = summary.derived.unshelteredAffected;

    expect(metric.value).toBe(365023);
    expect(metric.unit).toBe('people');
    expect(metric.completeness).toBe('complete');
    expect(metric.derivation.formula).toBe(
      'Affected Population − Inmates − Non-Camp Inmates',
    );
    expect(metric.derivation.substitution).toBe('445495 − 28695 − 51777');
  });

  it('Camp Uptake Rate = 28695 ÷ 445495 = 6.4%', () => {
    const metric = summary.derived.campUptakeRate;

    expect(metric.value).toBeCloseTo(0.0644115, 7);
    expect(((metric.value ?? 0) * 100).toFixed(1)).toBe('6.4');
    expect(metric.unit).toBe('fraction');
    expect(metric.derivation.formula).toBe('Inmates ÷ Affected Population');
    expect(metric.derivation.substitution).toBe('28695 ÷ 445495');
  });

  it('Camp Load = 28695 ÷ 90 = 319 per camp', () => {
    const metric = summary.derived.campLoad;

    expect(metric.value).toBeCloseTo(318.8333, 4);
    expect(Math.round(metric.value ?? 0)).toBe(319);
    expect(metric.unit).toBe('inmates per Relief Camp');
    expect(metric.derivation.substitution).toBe('28695 ÷ 90');
  });

  it('Vulnerable Load = 3143 ÷ 28695 = 11.0%', () => {
    const metric = summary.derived.vulnerableLoad;

    expect(metric.value).toBeCloseTo(0.1095313, 7);
    expect(((metric.value ?? 0) * 100).toFixed(1)).toBe('11.0');
    expect(metric.derivation.substitution).toBe('3143 ÷ 28695');
    expect(metric.derivation.note).toContain('derived');
  });

  it('Rescue Asset Ratio = 67 ÷ 445.495 = 0.15 boats per 1,000', () => {
    const metric = summary.derived.rescueAssetRatio;

    expect(metric.value).toBeCloseTo(0.1503945, 7);
    expect((metric.value ?? 0).toFixed(2)).toBe('0.15');
    expect(metric.unit).toBe('boats per 1,000 affected');
    expect(metric.derivation.formula).toBe('Boats Deployed ÷ (Affected Population ÷ 1,000)');
  });

  it('labels every derived metric as derived so no officer mistakes it for ASDMA’s', () => {
    for (const metric of Object.values(summary.derived)) {
      expect(metric.derivation.note).toMatch(/derived/i);
      expect(metric.derivation.metric.length).toBeGreaterThan(0);
      expect(metric.derivation.formula.length).toBeGreaterThan(0);
    }
  });

  it('does not compute Ration Coverage Days — that needs a RationNorm stated at the call site', () => {
    expect(Object.keys(summary.derived)).not.toContain('rationCoverageDays');
  });
});

describe('unknown-ness', () => {
  it('marks a derived metric unavailable rather than treating an unknown as zero', () => {
    const partial = bulletin({
      statewideTotals: {
        ...bulletin().statewideTotals,
        nonCampInmates: unknownCount(),
      },
    });

    const summary = summariseSituation(partial);

    expect(summary.derived.unshelteredAffected.value).toBeUndefined();
    expect(summary.derived.unshelteredAffected.completeness).toBe('unavailable');
    expect(summary.derived.unshelteredAffected.derivation.substitution).toContain('unknown');
    // The metrics that do not depend on the missing figure are still computed.
    expect(summary.derived.campUptakeRate.value).toBeCloseTo(0.0644115, 7);
  });

  it('propagates unknown-ness out of a per-district sum instead of dropping the row', () => {
    const base = bulletin();
    const partial = bulletin({
      districts: [
        ...base.districts.slice(0, 7),
        district('Sivasagar', {
          rescue: {
            agencies: [],
            medicalTeams: count(114),
            boats: unknownCount(),
            helicopters: count(0),
            personsEvacuatedByBoat: count(0),
            personsEvacuatedByHelicopter: count(0),
            animalsEvacuated: count(0),
          },
        }),
      ],
    });

    const summary = summariseSituation(partial);

    expect(summary.reported.boatsDeployed).toEqual(unknownCount());
    expect(summary.derived.rescueAssetRatio.completeness).toBe('unavailable');
  });

  it('reports zero camps with inmates as unbounded rather than dividing by zero', () => {
    const noCamps = bulletin({
      statewideTotals: { ...bulletin().statewideTotals, reliefCamps: count(0) },
    });

    expect(summariseSituation(noCamps).derived.campLoad.value).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('injected vulnerability policy', () => {
  it('reads Vulnerable Inmates through the injected function', () => {
    const vulnerableInmatesOf = vi.fn(() => count(1));

    const summary = summariseSituation(bulletin(), { vulnerableInmatesOf });

    expect(vulnerableInmatesOf).toHaveBeenCalledTimes(8);
    expect(summary.reported.vulnerableInmates).toEqual(count(8));
  });
});

describe('an empty bulletin', () => {
  it('summarises without throwing', () => {
    const empty = bulletin({ districts: [] });

    const summary = summariseSituation(empty);

    expect(summary.reported.boatsDeployed).toEqual(count(0));
    expect(summary.reported.vulnerableInmates).toEqual(count(0));
  });
});

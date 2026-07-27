import { describe, expect, it } from 'vitest';

import { districtName, revenueCircleName } from '../shared/administrative-unit';
import type {
  AnimalCounts,
  DistrictReport,
  RevenueCircleImpact,
} from '../shared/flood-situation-report';
import {
  count,
  hectares,
  litres,
  quintals,
  unknownCount,
  unknownQuintals,
} from '../shared/quantity';
import {
  normaliseAgencies,
  reliefOperationFrom,
  reliefOperationsFrom,
} from './relief-operation';

const zeroAnimals: AnimalCounts = { big: count(0), small: count(0), poultry: count(0) };

const circle = (name: string, over: Partial<RevenueCircleImpact> = {}): RevenueCircleImpact => ({
  circle: revenueCircleName(name),
  villagesAffected: count(0),
  populationAffected: count(0),
  cropAreaSubmerged: hectares(0),
  reliefCamps: count(0),
  reliefDistributionCentres: count(0),
  campInmates: count(0),
  nonCampInmates: count(0),
  ...over,
});

const report = (name: string, over: Partial<DistrictReport> = {}): DistrictReport => ({
  district: districtName(name),
  revenueCircles: [],
  villagesAffected: count(0),
  population: { male: count(0), female: count(0), children: count(0), total: count(0) },
  cropAreaSubmerged: hectares(0),
  reliefCamps: count(0),
  reliefDistributionCentres: count(0),
  campInmates: {
    total: count(0),
    male: count(0),
    female: count(0),
    children: count(0),
    pregnantOrLactating: count(0),
    personsWithDisability: count(0),
  },
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

/** Sivasagar's Rescue Operation row, exactly as DRIMS prints it. */
const SIVASAGAR_AGENCIES = [
  'NDRF',
  'Local People',
  'Army/Paramilitary force',
  'Local People',
  'NDRF',
  'DDRF',
  'Civil Defence/Trained Volunteers',
  'SDRF',
  'Local People',
  'DDRF',
  'Circle Office/Local Administration',
  'SDRF',
  'DDRF',
  'Local People',
  'Civil Defence/Trained Volunteers',
];

const sivasagar = report('Sivasagar', {
  reliefCamps: count(58),
  reliefDistributionCentres: count(59),
  campInmates: {
    total: count(24695),
    male: count(11892),
    female: count(10497),
    children: count(2281),
    pregnantOrLactating: count(15),
    personsWithDisability: count(10),
  },
  nonCampInmates: {
    total: count(45462),
    male: count(19797),
    female: count(18603),
    children: count(7062),
    animals: { big: count(125), small: count(45), poultry: count(326) },
  },
  revenueCircles: [
    circle('Nazira', { reliefCamps: count(18), campInmates: count(4050) }),
    circle('Demow', { reliefCamps: count(6), campInmates: count(567) }),
    circle('Sivsagar', { reliefCamps: count(11), campInmates: count(6098) }),
    circle('Amguri', { reliefCamps: count(23), campInmates: count(13980) }),
    circle('Sonari RC part', { reliefCamps: count(0), campInmates: count(0) }),
  ],
  relief: {
    rice: quintals(1079.624),
    dal: quintals(188.96),
    salt: quintals(43.76),
    mustardOil: litres(2918),
    greenFodder: quintals(0),
    wheatBran: quintals(5.2),
    riceBran: quintals(0),
  },
  rescue: {
    agencies: SIVASAGAR_AGENCIES,
    medicalTeams: count(114),
    boats: count(61),
    helicopters: count(0),
    personsEvacuatedByBoat: count(59),
    personsEvacuatedByHelicopter: count(0),
    animalsEvacuated: count(0),
  },
});

describe('normaliseAgencies (PRD §5.3 invariant 4)', () => {
  it('collapses the four repeated "Local People" entries to one', () => {
    const agencies = normaliseAgencies(SIVASAGAR_AGENCIES);

    expect(agencies.size).toBe(7);
    expect([...agencies]).toEqual([
      'NDRF',
      'Local People',
      'Army/Paramilitary force',
      'DDRF',
      'Civil Defence/Trained Volunteers',
      'SDRF',
      'Circle Office/Local Administration',
    ]);
  });

  it('is a Set, not a list', () => {
    expect(normaliseAgencies(SIVASAGAR_AGENCIES)).toBeInstanceOf(Set);
  });

  it('deduplicates on whitespace and case while preserving the first spelling ASDMA used', () => {
    const agencies = normaliseAgencies(['SDRF', '  sdrf ', 'S D R F']);

    expect([...agencies]).toEqual(['SDRF', 'S D R F']);
  });

  it('drops blank and "Nil" entries rather than creating an agency called Nil', () => {
    expect([...normaliseAgencies(['', '   ', 'Nil', 'nil', 'SDRF'])]).toEqual(['SDRF']);
  });

  it('handles a district that deployed nobody', () => {
    expect(normaliseAgencies([]).size).toBe(0);
  });
});

describe('ReliefOperation — construction', () => {
  const operation = reliefOperationFrom(sivasagar);

  it('is built per district and keeps ASDMA’s district name', () => {
    expect(operation.district).toBe('Sivasagar');
  });

  it('keeps Relief Camps and Relief Distribution Centres separable', () => {
    expect(operation.campNetwork.reliefCamps).toEqual(count(58));
    expect(operation.campNetwork.reliefDistributionCentres).toEqual(count(59));
  });

  it('retains the per-Revenue-Circle camp breakdown', () => {
    expect(operation.campNetwork.perCircle.map((c) => c.circle)).toEqual([
      'Nazira',
      'Demow',
      'Sivsagar',
      'Amguri',
      'Sonari RC part',
    ]);
    expect(operation.campNetwork.perCircle[3]!.campInmates).toEqual(count(13980));
  });

  it('keeps Inmates and Non-Camp Inmates as separate populations', () => {
    expect(operation.campNetwork.inmates.total).toEqual(count(24695));
    expect(operation.campNetwork.nonCampInmates.total).toEqual(count(45462));
  });

  it('normalises the rescue agencies to a Set', () => {
    expect(operation.rescue.agencies.size).toBe(7);
    expect(operation.rescue.boats).toEqual(count(61));
    expect(operation.rescue.medicalTeams).toEqual(count(114));
  });

  it('is high-confidence for a coherent district', () => {
    expect(operation.confidence).toBe('high');
    expect(operation.degradations).toEqual([]);
  });
});

describe('Invariant 1 — quantities are typed by unit', () => {
  it('keeps rice in Quintals and mustard oil in Litres', () => {
    const operation = reliefOperationFrom(sivasagar);

    expect(operation.relief.rice.unit).toBe('Q');
    expect(operation.relief.mustardOil.unit).toBe('L');
  });

  it('preserves DRIMS float values unrounded at storage', () => {
    const operation = reliefOperationFrom(sivasagar);

    expect(operation.relief.rice).toEqual(quintals(1079.624));
  });

  it('preserves unknown relief quantities as unknown', () => {
    const operation = reliefOperationFrom(
      report('Nagaon', {
        relief: { ...sivasagar.relief, rice: unknownQuintals() },
      }),
    );

    expect(operation.relief.rice).toEqual(unknownQuintals());
  });
});

describe('Invariant 2 — Inmates.total ≥ pregnantLactating + personsWithDisability', () => {
  it('accepts the Sivasagar row, where the subsets are a small part of the whole', () => {
    expect(reliefOperationFrom(sivasagar).confidence).toBe('high');
  });

  it('degrades — never throws — when the overlapping subsets exceed the total', () => {
    const broken = report('Golaghat', {
      campInmates: {
        total: count(10),
        male: count(4),
        female: count(4),
        children: count(2),
        pregnantOrLactating: count(9),
        personsWithDisability: count(6),
      },
    });

    const operation = reliefOperationFrom(broken);

    expect(operation.confidence).toBe('degraded');
    expect(operation.degradations.map((d) => d.reason)).toContain(
      'vulnerable-subsets-exceed-inmate-total',
    );
    expect(operation.degradations[0]!.detail).toContain('15');
    expect(operation.degradations[0]!.detail).toContain('10');
  });

  it('degrades as unverifiable when a subset is unknown, rather than assuming zero', () => {
    const partial = report('Golaghat', {
      campInmates: {
        total: count(10),
        male: count(4),
        female: count(4),
        children: count(2),
        pregnantOrLactating: unknownCount(),
        personsWithDisability: count(1),
      },
    });

    expect(reliefOperationFrom(partial).degradations.map((d) => d.reason)).toContain(
      'inmate-subset-check-unverifiable',
    );
  });

  it('does NOT require male + female + children to equal the total — DRIMS does not', () => {
    // Sivasagar: 11892 + 10497 + 2281 = 24670 against a stated total of 24695.
    expect(reliefOperationFrom(sivasagar).degradations).toEqual([]);
  });
});

describe('a whole bulletin', () => {
  it('builds one ReliefOperation per district, order preserved', () => {
    expect(reliefOperationsFrom([report('Dhemaji'), sivasagar]).map((o) => o.district)).toEqual([
      'Dhemaji',
      'Sivasagar',
    ]);
  });
});

describe('Relief Camps vs Revenue Circle breakdown', () => {
  it('degrades when the circle camp counts exceed the district count', () => {
    const broken = report('Jorhat', {
      reliefCamps: count(1),
      revenueCircles: [circle('Teok', { reliefCamps: count(9) })],
    });

    expect(reliefOperationFrom(broken).degradations.map((d) => d.reason)).toContain(
      'circle-camps-exceed-district-total',
    );
  });

  it('accepts a district whose circles account for it exactly', () => {
    expect(reliefOperationFrom(sivasagar).degradations).toEqual([]);
  });

  it('does not attempt the check when a circle figure is unknown', () => {
    const partial = report('Jorhat', {
      reliefCamps: count(1),
      revenueCircles: [circle('Teok', { reliefCamps: unknownCount() })],
    });

    expect(reliefOperationFrom(partial).degradations.map((d) => d.reason)).not.toContain(
      'circle-camps-exceed-district-total',
    );
  });
});

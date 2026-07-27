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
  unknownHectares,
} from '../shared/quantity';
import { districtSituationFrom, districtSituationsFrom } from './district-situation';

// --- builders -------------------------------------------------------------
// Kept local to the test file: production code carries no test scaffolding.

const zeroAnimals: AnimalCounts = { big: count(0), small: count(0), poultry: count(0) };

const circle = (
  name: string,
  over: Partial<RevenueCircleImpact> = {},
): RevenueCircleImpact => ({
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
  population: {
    male: count(0),
    female: count(0),
    children: count(0),
    total: count(0),
  },
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

// --- the 2026-07-27 Sivasagar row, verbatim -------------------------------

const sivasagar = report('Sivasagar', {
  villagesAffected: count(232),
  population: {
    male: count(67831),
    female: count(61163),
    children: count(15467),
    total: count(144461),
  },
  cropAreaSubmerged: hectares(13413.5),
  reliefCamps: count(58),
  campInmates: {
    total: count(24695),
    male: count(11892),
    female: count(10497),
    children: count(2281),
    pregnantOrLactating: count(15),
    personsWithDisability: count(10),
  },
  revenueCircles: [
    circle('Nazira', { villagesAffected: count(41), populationAffected: count(17885) }),
    circle('Demow', { villagesAffected: count(24), populationAffected: count(9465) }),
    circle('Sivsagar', { villagesAffected: count(114), populationAffected: count(71452) }),
    circle('Amguri', { villagesAffected: count(46), populationAffected: count(39152) }),
    circle('Sonari RC part', { villagesAffected: count(7), populationAffected: count(6507) }),
  ],
});

describe('DistrictSituation — construction', () => {
  it('adopts ASDMA’s district name unchanged', () => {
    expect(districtSituationFrom(sivasagar).district).toBe('Sivasagar');
  });

  it('retains every Revenue Circle rather than flattening it away', () => {
    const situation = districtSituationFrom(sivasagar);

    expect(situation.circles.map((c) => c.circle)).toEqual([
      'Nazira',
      'Demow',
      'Sivsagar',
      'Amguri',
      'Sonari RC part',
    ]);
  });

  it('is high-confidence for the coherent 2026-07-27 Sivasagar row', () => {
    const situation = districtSituationFrom(sivasagar);

    expect(situation.confidence).toBe('high');
    expect(situation.degradations).toEqual([]);
  });
});

describe('Invariant 1 — male + female + children must equal total', () => {
  it('accepts the statewide-coherent Sivasagar split (67831 + 61163 + 15467 = 144461)', () => {
    expect(districtSituationFrom(sivasagar).confidence).toBe('high');
  });

  it('degrades rather than throwing when the components do not sum to the total', () => {
    const broken = report('Jorhat', {
      population: {
        male: count(30824),
        female: count(30364),
        children: count(13270),
        total: count(99999),
      },
    });

    const situation = districtSituationFrom(broken);

    expect(situation.confidence).toBe('degraded');
    expect(situation.degradations.map((d) => d.reason)).toContain(
      'population-components-do-not-sum-to-total',
    );
    expect(situation.degradations[0]?.detail).toContain('74458');
    expect(situation.degradations[0]?.detail).toContain('99999');
  });

  it('does not throw — the district is still fully constructed and readable', () => {
    const broken = report('Jorhat', {
      villagesAffected: count(108),
      population: {
        male: count(1),
        female: count(1),
        children: count(1),
        total: count(9),
      },
    });

    expect(() => districtSituationFrom(broken)).not.toThrow();
    expect(districtSituationFrom(broken).villagesAffected).toEqual(count(108));
  });

  it('degrades as unverifiable when a component is unknown — never assumes zero', () => {
    const partial = report('Nagaon', {
      population: {
        male: unknownCount(),
        female: count(1),
        children: count(1),
        total: count(2),
      },
    });

    const situation = districtSituationFrom(partial);

    expect(situation.confidence).toBe('degraded');
    expect(situation.degradations.map((d) => d.reason)).toContain(
      'population-coherence-unverifiable',
    );
  });

  it('degrades as unverifiable when the stated total itself is unknown', () => {
    const partial = report('Nagaon', {
      population: {
        male: count(1),
        female: count(1),
        children: count(1),
        total: unknownCount(),
      },
    });

    expect(districtSituationFrom(partial).degradations.map((d) => d.reason)).toContain(
      'population-coherence-unverifiable',
    );
  });
});

describe('Invariant 2 — district figures ≥ the sum of their Revenue Circles', () => {
  it('retains zero unattributed when the circles account for the district exactly', () => {
    const situation = districtSituationFrom(sivasagar);

    expect(situation.unattributedToCircle.populationAffected).toEqual(count(0));
    expect(situation.unattributedToCircle.villagesAffected).toEqual(count(0));
    expect(situation.confidence).toBe('high');
  });

  it('retains the excess as unattributedToCircle rather than discarding it', () => {
    const withExcess = report('Golaghat', {
      villagesAffected: count(111),
      population: {
        male: count(17657),
        female: count(14920),
        children: count(5595),
        total: count(38172),
      },
      cropAreaSubmerged: hectares(2411.5),
      revenueCircles: [
        circle('Golaghat', {
          villagesAffected: count(28),
          populationAffected: count(13386),
          cropAreaSubmerged: hectares(923),
        }),
        circle('Khumtai', {
          villagesAffected: count(16),
          populationAffected: count(5004),
          cropAreaSubmerged: hectares(880.55),
        }),
      ],
    });

    const situation = districtSituationFrom(withExcess);

    expect(situation.unattributedToCircle.villagesAffected).toEqual(count(111 - 44));
    expect(situation.unattributedToCircle.populationAffected).toEqual(count(38172 - 18390));
    expect(situation.unattributedToCircle.cropAreaSubmerged).toEqual(hectares(2411.5 - 1803.55));
    expect(situation.confidence).toBe('high');
  });

  it('degrades when the circles sum above the district figure, and never goes negative', () => {
    const impossible = report('Charaideo', {
      villagesAffected: count(10),
      revenueCircles: [circle('Mahmora', { villagesAffected: count(67) })],
    });

    const situation = districtSituationFrom(impossible);

    expect(situation.confidence).toBe('degraded');
    expect(situation.degradations.map((d) => d.reason)).toContain(
      'circle-sum-exceeds-district-total',
    );
    expect(situation.unattributedToCircle.villagesAffected).toEqual(count(0));
  });

  it('treats a district with no reported circles as wholly unattributed, without degrading', () => {
    const noCircles = report('Kamrup (M)', { villagesAffected: count(1), revenueCircles: [] });

    const situation = districtSituationFrom(noCircles);

    expect(situation.unattributedToCircle.villagesAffected).toEqual(count(1));
    expect(situation.confidence).toBe('high');
  });

  it('propagates unknown-ness instead of scoring an unknown circle figure as zero', () => {
    const partial = report('Nagaon', {
      villagesAffected: count(30),
      revenueCircles: [
        circle('Nagaon', { villagesAffected: unknownCount() }),
        circle('Kampur', { villagesAffected: count(8) }),
      ],
    });

    const situation = districtSituationFrom(partial);

    expect(situation.unattributedToCircle.villagesAffected).toEqual(unknownCount());
    expect(situation.degradations.map((d) => d.reason)).toContain(
      'circle-reconciliation-unverifiable',
    );
  });

  it('propagates unknown-ness when the district figure itself is unknown', () => {
    const partial = report('Nagaon', {
      cropAreaSubmerged: unknownHectares(),
      revenueCircles: [circle('Nagaon', { cropAreaSubmerged: hectares(1) })],
    });

    const situation = districtSituationFrom(partial);

    expect(situation.unattributedToCircle.cropAreaSubmerged).toEqual(unknownHectares());
  });
});

describe('Invariant 4 — Casualties expose no total', () => {
  it('keeps flood deaths and general drownings structurally separate', () => {
    const withDeaths = report('Sivasagar', {
      casualties: { floodDeaths: count(2), generalDrownings: count(3), missing: count(1) },
    });

    const { casualties } = districtSituationFrom(withDeaths);

    expect(casualties.floodDeaths).toEqual(count(2));
    expect(casualties.generalDrownings).toEqual(count(3));
    expect(casualties.missing).toEqual(count(1));
    expect(Object.keys(casualties)).not.toContain('total');
    expect('total' in casualties).toBe(false);
  });
});

describe('reported-and-quiet districts', () => {
  it('marks an all-zero reporting district as reported-and-quiet, not absent', () => {
    const situation = districtSituationFrom(report('Dhemaji'));

    expect(situation.activity).toBe('reported-and-quiet');
    expect(situation.district).toBe('Dhemaji');
  });

  it('marks a district with impact as affected', () => {
    expect(districtSituationFrom(sivasagar).activity).toBe('affected');
  });

  it('marks a district whose headline figures are all unknown as unreported', () => {
    const silent = report('Dibrugarh', {
      villagesAffected: unknownCount(),
      cropAreaSubmerged: unknownHectares(),
      population: {
        male: unknownCount(),
        female: unknownCount(),
        children: unknownCount(),
        total: unknownCount(),
      },
      campInmates: {
        total: unknownCount(),
        male: unknownCount(),
        female: unknownCount(),
        children: unknownCount(),
        pregnantOrLactating: unknownCount(),
        personsWithDisability: unknownCount(),
      },
    });

    expect(districtSituationFrom(silent).activity).toBe('unreported');
  });
});

describe('a whole bulletin', () => {
  it('builds one DistrictSituation per reporting district, order preserved', () => {
    const situations = districtSituationsFrom([report('Dhemaji'), sivasagar]);

    expect(situations.map((s) => s.district)).toEqual(['Dhemaji', 'Sivasagar']);
  });
});

describe('pass-through of impact figures', () => {
  it('carries houses, animals, camps and inmates through unchanged', () => {
    const situation = districtSituationFrom(sivasagar);

    expect(situation.reliefCamps).toEqual(count(58));
    expect(situation.campInmates).toEqual(count(24695));
    expect(situation.cropAreaSubmerged).toEqual(hectares(13413.5));
    expect(situation.houses.fullySeverelyKuccha).toEqual(count(0));
    expect(situation.animals.affected.big).toEqual(count(0));
  });
});

import { describe, expect, it, vi } from 'vitest';

import { districtName } from '../shared/administrative-unit';
import { count, hectares, unknownCount } from '../shared/quantity';
import type { DistrictSituation } from './district-situation';
import { DEFAULT_IMPACT_DIMENSIONS, rankDistrictSeverities, rankDistricts } from './ranking';
import type { DistrictSeverity } from './severity-index';

const stub = (name: string, over: Partial<DistrictSituation> = {}): DistrictSituation =>
  ({
    district: districtName(name),
    circles: [],
    villagesAffected: count(0),
    population: { male: count(0), female: count(0), children: count(0), total: count(0) },
    cropAreaSubmerged: hectares(0),
    reliefCamps: count(0),
    campInmates: count(0),
    nonCampInmates: count(0),
    casualties: { floodDeaths: count(0), generalDrownings: count(0), missing: count(0) },
    animals: {
      affected: { big: count(0), small: count(0), poultry: count(0) },
      washedAway: { big: count(0), small: count(0), poultry: count(0) },
    },
    houses: {
      fullySeverelyKuccha: count(0),
      fullySeverelyPukka: count(0),
      partiallyKuccha: count(0),
      partiallyPukka: count(0),
      otherHuts: count(0),
      otherCattleSheds: count(0),
    },
    ...over,
  }) as DistrictSituation;

const pop = (n: number) => ({
  population: { male: count(0), female: count(0), children: count(0), total: count(n) },
});

describe('rankDistricts — the acceptance question "which three districts are worst affected?"', () => {
  const bulletin = [
    stub('Charaideo', pop(188404)),
    stub('Golaghat', pop(38172)),
    stub('Jorhat', pop(74458)),
    stub('Kamrup (M)', pop(0)),
    stub('Sivasagar', pop(144461)),
  ];

  it('ranks by affected population, worst first', () => {
    const ranked = rankDistricts(bulletin, 'affectedPopulation');

    expect(ranked.slice(0, 3).map((r) => r.district)).toEqual([
      'Charaideo',
      'Sivasagar',
      'Jorhat',
    ]);
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[0]!.value).toBe(188404);
    expect(ranked[0]!.dimension).toBe('affectedPopulation');
  });

  it('ranks ascending when asked', () => {
    const ranked = rankDistricts(bulletin, 'affectedPopulation', { order: 'asc' });

    expect(ranked[0]!.district).toBe('Kamrup (M)');
    expect(ranked.at(-1)!.district).toBe('Charaideo');
  });

  it('ranks by any other impact dimension', () => {
    const districts = [
      stub('Sivasagar', { cropAreaSubmerged: hectares(13413.5) }),
      stub('Charaideo', { cropAreaSubmerged: hectares(17649) }),
    ];

    expect(rankDistricts(districts, 'cropAreaSubmerged')[0]!.district).toBe('Charaideo');
  });
});

describe('rankDistricts — injected dimension readers', () => {
  it('reads the dimension through the injected reader', () => {
    const reader = vi.fn((d: DistrictSituation) => (d.district === 'A' ? 2 : 1));
    const districts = [stub('A'), stub('B')];

    const ranked = rankDistricts(districts, 'boatsPerCapita', {
      readers: { boatsPerCapita: reader },
    });

    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenCalledWith(districts[0]);
    expect(ranked[0]!.district).toBe('A');
  });

  it('rejects a dimension with no reader rather than silently ranking by nothing', () => {
    expect(() => rankDistricts([stub('A')], 'nonsense', { readers: {} })).toThrow(
      /nonsense/,
    );
  });
});

describe('ties', () => {
  it('gives tied districts the same rank, and skips the next (competition ranking)', () => {
    const districts = [stub('B', pop(10)), stub('A', pop(10)), stub('C', pop(1))];

    const ranked = rankDistricts(districts, 'affectedPopulation');

    expect(ranked.map((r) => [r.district, r.rank])).toEqual([
      ['A', 1],
      ['B', 1],
      ['C', 3],
    ]);
  });

  it('breaks ties deterministically by district name, whatever the input order', () => {
    const forwards = rankDistricts(
      [stub('Nagaon', pop(5)), stub('Jorhat', pop(5)), stub('Dhemaji', pop(5))],
      'affectedPopulation',
    );
    const backwards = rankDistricts(
      [stub('Dhemaji', pop(5)), stub('Jorhat', pop(5)), stub('Nagaon', pop(5))],
      'affectedPopulation',
    );

    expect(forwards.map((r) => r.district)).toEqual(['Dhemaji', 'Jorhat', 'Nagaon']);
    expect(forwards).toEqual(backwards);
  });

  it('breaks ties by name in ascending order too', () => {
    const ranked = rankDistricts(
      [stub('Nagaon', pop(5)), stub('Dhemaji', pop(5))],
      'affectedPopulation',
      { order: 'asc' },
    );

    expect(ranked.map((r) => r.district)).toEqual(['Dhemaji', 'Nagaon']);
  });
});

describe('unknown figures', () => {
  it('sorts unknowns last and never scores them as zero', () => {
    const districts = [
      stub('Nagaon', { villagesAffected: unknownCount() }),
      stub('Sivasagar', { villagesAffected: count(232) }),
      stub('Kamrup (M)', { villagesAffected: count(0) }),
    ];

    const ranked = rankDistricts(districts, 'villagesAffected');

    expect(ranked.map((r) => r.district)).toEqual(['Sivasagar', 'Kamrup (M)', 'Nagaon']);
    expect(ranked.at(-1)!.value).toBeUndefined();
  });

  it('keeps unknowns last even when ranking ascending', () => {
    const districts = [
      stub('Nagaon', { villagesAffected: unknownCount() }),
      stub('Kamrup (M)', { villagesAffected: count(0) }),
    ];

    expect(rankDistricts(districts, 'villagesAffected', { order: 'asc' }).at(-1)!.district).toBe(
      'Nagaon',
    );
  });

  it('gives all unknowns the same rank', () => {
    const districts = [
      stub('A', { villagesAffected: unknownCount() }),
      stub('B', { villagesAffected: unknownCount() }),
      stub('C', { villagesAffected: count(1) }),
    ];

    const ranked = rankDistricts(districts, 'villagesAffected');
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2]);
  });
});

describe('default impact dimensions', () => {
  const district = stub('Sivasagar', {
    ...pop(144461),
    villagesAffected: count(232),
    cropAreaSubmerged: hectares(13413.5),
    reliefCamps: count(58),
    campInmates: count(24695),
    nonCampInmates: count(45462),
    casualties: { floodDeaths: count(1), generalDrownings: count(9), missing: count(2) },
    animals: {
      affected: { big: count(39278), small: count(27198), poultry: count(139251) },
      washedAway: { big: count(200), small: count(600), poultry: count(22000) },
    },
    houses: {
      fullySeverelyKuccha: count(82),
      fullySeverelyPukka: count(5),
      partiallyKuccha: count(250),
      partiallyPukka: count(98),
      otherHuts: count(21),
      otherCattleSheds: count(281),
    },
  });

  it('cover the dimensions an officer sorts by', () => {
    expect(Object.keys(DEFAULT_IMPACT_DIMENSIONS).sort()).toEqual(
      [
        'affectedPopulation',
        'animalsAffected',
        'animalsWashedAway',
        'campInmates',
        'cropAreaSubmerged',
        'floodDeaths',
        'housesFullySeverelyDamaged',
        'housesPartiallyDamaged',
        'missing',
        'nonCampInmates',
        'reliefCamps',
        'villagesAffected',
      ].sort(),
    );
  });

  it('read each dimension off the district', () => {
    expect(DEFAULT_IMPACT_DIMENSIONS.affectedPopulation(district)).toBe(144461);
    expect(DEFAULT_IMPACT_DIMENSIONS.villagesAffected(district)).toBe(232);
    expect(DEFAULT_IMPACT_DIMENSIONS.cropAreaSubmerged(district)).toBe(13413.5);
    expect(DEFAULT_IMPACT_DIMENSIONS.reliefCamps(district)).toBe(58);
    expect(DEFAULT_IMPACT_DIMENSIONS.campInmates(district)).toBe(24695);
    expect(DEFAULT_IMPACT_DIMENSIONS.nonCampInmates(district)).toBe(45462);
    expect(DEFAULT_IMPACT_DIMENSIONS.animalsAffected(district)).toBe(39278 + 27198 + 139251);
    expect(DEFAULT_IMPACT_DIMENSIONS.animalsWashedAway(district)).toBe(200 + 600 + 22000);
    expect(DEFAULT_IMPACT_DIMENSIONS.housesFullySeverelyDamaged(district)).toBe(87);
    expect(DEFAULT_IMPACT_DIMENSIONS.housesPartiallyDamaged(district)).toBe(348);
  });

  it('never sums flood deaths with general drownings', () => {
    expect(DEFAULT_IMPACT_DIMENSIONS.floodDeaths(district)).toBe(1);
    expect(DEFAULT_IMPACT_DIMENSIONS.missing(district)).toBe(2);
    expect(Object.keys(DEFAULT_IMPACT_DIMENSIONS)).not.toContain('casualties');
    expect(Object.keys(DEFAULT_IMPACT_DIMENSIONS)).not.toContain('deaths');
  });

  it('propagate unknown-ness from a partly reported animal count', () => {
    const partial = stub('Nagaon', {
      animals: {
        affected: { big: unknownCount(), small: count(1), poultry: count(1) },
        washedAway: { big: count(0), small: count(0), poultry: count(0) },
      },
    });

    expect(DEFAULT_IMPACT_DIMENSIONS.animalsAffected(partial)).toBeUndefined();
  });

  it('propagate unknown-ness from a partly reported house-damage split', () => {
    const partial = stub('Nagaon', {
      houses: {
        fullySeverelyKuccha: unknownCount(),
        fullySeverelyPukka: count(1),
        partiallyKuccha: count(0),
        partiallyPukka: unknownCount(),
        otherHuts: count(0),
        otherCattleSheds: count(0),
      },
    });

    expect(DEFAULT_IMPACT_DIMENSIONS.housesFullySeverelyDamaged(partial)).toBeUndefined();
    expect(DEFAULT_IMPACT_DIMENSIONS.housesPartiallyDamaged(partial)).toBeUndefined();
  });
});

describe('rankDistrictSeverities', () => {
  const severity = (district: string, score: number): DistrictSeverity =>
    ({ district: districtName(district), score, contributions: [] }) as unknown as DistrictSeverity;

  it('ranks by severity score, worst first', () => {
    const ranked = rankDistrictSeverities([
      severity('Golaghat', 0.2),
      severity('Sivasagar', 0.9),
      severity('Jorhat', 0.5),
    ]);

    expect(ranked.map((r) => r.district)).toEqual(['Sivasagar', 'Jorhat', 'Golaghat']);
    expect(ranked[0]!.dimension).toBe('severityIndex');
  });

  it('breaks severity ties by district name', () => {
    const ranked = rankDistrictSeverities([severity('Nagaon', 0.5), severity('Dhemaji', 0.5)]);

    expect(ranked.map((r) => [r.district, r.rank])).toEqual([
      ['Dhemaji', 1],
      ['Nagaon', 1],
    ]);
  });

  it('ranks ascending when asked', () => {
    const ranked = rankDistrictSeverities([severity('A', 0.9), severity('B', 0.1)], 'asc');
    expect(ranked[0]!.district).toBe('B');
  });

  it('returns nothing for an empty bulletin', () => {
    expect(rankDistrictSeverities([])).toEqual([]);
  });
});

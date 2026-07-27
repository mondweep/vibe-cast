import { describe, expect, it, vi } from 'vitest';

import { districtName } from '../shared/administrative-unit';
import { count, hectares, unknownCount } from '../shared/quantity';
import type { DistrictSituation } from './district-situation';
import type { SeverityComponentReaders } from './severity-index';
import {
  DEFAULT_SEVERITY_READERS,
  DEFAULT_SEVERITY_WEIGHTS,
  computeSeverityIndex,
} from './severity-index';

/** A DistrictSituation stub carrying only what the readers under test read. */
const stub = (name: string, over: Partial<DistrictSituation> = {}): DistrictSituation =>
  ({
    district: districtName(name),
    circles: [],
    villagesAffected: count(0),
    population: {
      male: count(0),
      female: count(0),
      children: count(0),
      total: count(0),
    },
    cropAreaSubmerged: hectares(0),
    reliefCamps: count(0),
    campInmates: count(0),
    nonCampInmates: count(0),
    casualties: { floodDeaths: count(0), generalDrownings: count(0), missing: count(0) },
    ...over,
  }) as DistrictSituation;

const flatWeights = {
  affectedPopulation: 1,
  villagesAffected: 1,
  cropArea: 1,
  campLoad: 1,
  casualties: 1,
};

describe('default weights (PRD §6.3)', () => {
  it('are the stated starting point 0.35 / 0.15 / 0.15 / 0.20 / 0.15', () => {
    expect(DEFAULT_SEVERITY_WEIGHTS).toEqual({
      affectedPopulation: 0.35,
      villagesAffected: 0.15,
      cropArea: 0.15,
      campLoad: 0.2,
      casualties: 0.15,
    });
  });

  it('sum to 1', () => {
    const total = Object.values(DEFAULT_SEVERITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe('computeSeverityIndex — injected collaborators', () => {
  it('reads every component through the injected readers, once per district', () => {
    const readers = {
      affectedPopulation: vi.fn(() => 1),
      villagesAffected: vi.fn(() => 1),
      cropArea: vi.fn(() => 1),
      campLoad: vi.fn(() => 1),
      casualties: vi.fn(() => 1),
    };
    const districts = [stub('Sivasagar'), stub('Golaghat')];

    computeSeverityIndex(districts, DEFAULT_SEVERITY_WEIGHTS, readers);

    expect(readers.affectedPopulation).toHaveBeenCalledTimes(2);
    expect(readers.affectedPopulation).toHaveBeenCalledWith(districts[0]);
    expect(readers.affectedPopulation).toHaveBeenCalledWith(districts[1]);
    expect(readers.casualties).toHaveBeenCalledTimes(2);
  });

  it('lets a substituted policy change the ranking — weights are not baked in', () => {
    const readers = {
      ...DEFAULT_SEVERITY_READERS,
      affectedPopulation: (d: DistrictSituation) => (d.district === 'A' ? 100 : 0),
      cropArea: (d: DistrictSituation) => (d.district === 'B' ? 100 : 0),
    };
    const districts = [stub('A'), stub('B')];

    const populationFirst = computeSeverityIndex(
      districts,
      { ...flatWeights, affectedPopulation: 10, cropArea: 1 },
      readers,
    );
    const cropFirst = computeSeverityIndex(
      districts,
      { ...flatWeights, affectedPopulation: 1, cropArea: 10 },
      readers,
    );

    expect(populationFirst[0]!.score).toBeGreaterThan(populationFirst[1]!.score);
    expect(cropFirst[1]!.score).toBeGreaterThan(cropFirst[0]!.score);
  });
});

describe('min–max normalisation within the loaded bulletin (FR-3.4)', () => {
  const scale = (table: Record<string, number>) => (d: DistrictSituation) => table[d.district];
  const readers = {
    ...DEFAULT_SEVERITY_READERS,
    affectedPopulation: scale({ Low: 0, Mid: 50, High: 100 }),
  };

  it('maps the minimum to 0 and the maximum to 1', () => {
    const result = computeSeverityIndex(
      [stub('Low'), stub('Mid'), stub('High')],
      { ...flatWeights, villagesAffected: 0, cropArea: 0, campLoad: 0, casualties: 0 },
      readers,
    );

    const by = Object.fromEntries(result.map((r) => [r.district, r.score]));
    expect(by['Low']).toBeCloseTo(0, 10);
    expect(by['Mid']).toBeCloseTo(0.5, 10);
    expect(by['High']).toBeCloseTo(1, 10);
  });

  it('is relative: doubling every district’s figures leaves the scores unchanged', () => {
    const doubled = { ...readers, affectedPopulation: scale({ Low: 0, Mid: 100, High: 200 }) };
    const weights = { ...flatWeights, villagesAffected: 0, cropArea: 0, campLoad: 0, casualties: 0 };

    const scoresOf = (r: SeverityComponentReaders) =>
      computeSeverityIndex([stub('Low'), stub('Mid'), stub('High')], weights, r).map(
        (d) => d.score,
      );

    expect(scoresOf(doubled)).toEqual(scoresOf(readers));
  });
});

describe('degenerate components (min === max)', () => {
  it('does not divide by zero when every district shares a non-zero value', () => {
    const readers = { ...DEFAULT_SEVERITY_READERS, cropArea: () => 500 };

    const result = computeSeverityIndex([stub('A'), stub('B')], flatWeights, readers);

    const crop = result[0]!.contributions.find((c) => c.component === 'cropArea')!;
    expect(Number.isFinite(result[0]!.score)).toBe(true);
    expect(crop.basis).toBe('degenerate-uniform');
    expect(crop.normalised).toBe(1);
  });

  it('treats a uniformly zero component as contributing nothing', () => {
    const readers = { ...DEFAULT_SEVERITY_READERS, casualties: () => 0 };

    const result = computeSeverityIndex([stub('A'), stub('B')], flatWeights, readers);

    const casualties = result[0]!.contributions.find((c) => c.component === 'casualties')!;
    expect(casualties.normalised).toBe(0);
    expect(casualties.contribution).toBe(0);
    expect(casualties.basis).toBe('degenerate-uniform');
  });

  it('scores a single-district bulletin without NaN', () => {
    const result = computeSeverityIndex(
      [stub('Sivasagar', { population: { ...stub('x').population, total: count(144461) } })],
      DEFAULT_SEVERITY_WEIGHTS,
    );

    expect(Number.isNaN(result[0]!.score)).toBe(false);
    expect(result[0]!.score).toBeGreaterThanOrEqual(0);
    expect(result[0]!.score).toBeLessThanOrEqual(1);
  });
});

describe('contribution breakdown (FR-3.3)', () => {
  it('returns one contribution per component, not just a score', () => {
    const result = computeSeverityIndex([stub('A'), stub('B')], DEFAULT_SEVERITY_WEIGHTS);

    expect(result[0]!.contributions.map((c) => c.component)).toEqual([
      'affectedPopulation',
      'villagesAffected',
      'cropArea',
      'campLoad',
      'casualties',
    ]);
  });

  it('makes the contributions sum to the score', () => {
    const readers = {
      ...DEFAULT_SEVERITY_READERS,
      affectedPopulation: (d: DistrictSituation) => (d.district === 'A' ? 10 : 2),
      villagesAffected: (d: DistrictSituation) => (d.district === 'A' ? 3 : 9),
    };
    const result = computeSeverityIndex([stub('A'), stub('B')], DEFAULT_SEVERITY_WEIGHTS, readers);

    for (const district of result) {
      const summed = district.contributions.reduce((a, c) => a + c.contribution, 0);
      expect(summed).toBeCloseTo(district.score, 10);
    }
  });

  it('records the raw value and the weight behind every contribution', () => {
    const readers = { ...DEFAULT_SEVERITY_READERS, villagesAffected: () => 232 };
    const result = computeSeverityIndex([stub('A'), stub('B')], DEFAULT_SEVERITY_WEIGHTS, readers);

    const villages = result[0]!.contributions.find((c) => c.component === 'villagesAffected')!;
    expect(villages.raw).toBe(232);
    expect(villages.weight).toBe(0.15);
  });

  it('carries a machine-readable derivation for the UI to show on hover', () => {
    const result = computeSeverityIndex([stub('A'), stub('B')], DEFAULT_SEVERITY_WEIGHTS);

    expect(result[0]!.derivation.metric).toBe('Severity Index');
    expect(result[0]!.derivation.formula).toContain('min–max');
    expect(result[0]!.derivation.substitution).toContain('affectedPopulation');
    expect(result[0]!.derivation.note).toContain('relative');
  });
});

describe('unknown-ness', () => {
  it('excludes an unknown component rather than scoring it as zero', () => {
    const readers = {
      ...DEFAULT_SEVERITY_READERS,
      cropArea: () => undefined,
    };

    const result = computeSeverityIndex([stub('A'), stub('B')], DEFAULT_SEVERITY_WEIGHTS, readers);
    const crop = result[0]!.contributions.find((c) => c.component === 'cropArea')!;

    expect(crop.raw).toBeUndefined();
    expect(crop.contribution).toBe(0);
    expect(crop.basis).toBe('unknown-excluded');
    expect(result[0]!.completeness).toBe('partial');
  });

  it('renormalises the surviving weights so a partial score is still 0–1', () => {
    const readers = {
      ...DEFAULT_SEVERITY_READERS,
      affectedPopulation: (d: DistrictSituation) => (d.district === 'A' ? 100 : 0),
      villagesAffected: () => undefined,
      cropArea: () => undefined,
      campLoad: () => undefined,
      casualties: () => undefined,
    };

    const result = computeSeverityIndex([stub('A'), stub('B')], DEFAULT_SEVERITY_WEIGHTS, readers);

    expect(result[0]!.score).toBeCloseTo(1, 10);
    expect(result[0]!.completeness).toBe('partial');
  });

  it('is unavailable, not zero-scored, when nothing at all is known', () => {
    const readers = {
      affectedPopulation: () => undefined,
      villagesAffected: () => undefined,
      cropArea: () => undefined,
      campLoad: () => undefined,
      casualties: () => undefined,
    };

    const result = computeSeverityIndex([stub('A')], DEFAULT_SEVERITY_WEIGHTS, readers);

    expect(result[0]!.completeness).toBe('unavailable');
    expect(result[0]!.score).toBe(0);
  });

  it('reads an unknown affected population as unknown, never as zero', () => {
    const district = stub('Nagaon', {
      population: {
        male: count(0),
        female: count(0),
        children: count(0),
        total: unknownCount(),
      },
    });

    expect(DEFAULT_SEVERITY_READERS.affectedPopulation(district)).toBeUndefined();
  });
});

describe('default readers', () => {
  it('use flood deaths alone — general drownings are never added in', () => {
    const district = stub('Sivasagar', {
      casualties: { floodDeaths: count(2), generalDrownings: count(40), missing: count(7) },
    });

    expect(DEFAULT_SEVERITY_READERS.casualties(district)).toBe(2);
  });

  it('compute camp load as Inmates ÷ Relief Camps', () => {
    const district = stub('Sivasagar', { campInmates: count(24695), reliefCamps: count(58) });

    expect(DEFAULT_SEVERITY_READERS.campLoad(district)).toBeCloseTo(425.7759, 4);
  });

  it('treat inmates with zero Relief Camps as an unbounded load', () => {
    const district = stub('Nagaon', { campInmates: count(500), reliefCamps: count(0) });

    expect(DEFAULT_SEVERITY_READERS.campLoad(district)).toBe(Number.POSITIVE_INFINITY);
  });

  it('treat no camps and no inmates as no load at all', () => {
    expect(DEFAULT_SEVERITY_READERS.campLoad(stub('Dhemaji'))).toBe(0);
  });

  it('return undefined when either side of the camp-load ratio is unknown', () => {
    expect(
      DEFAULT_SEVERITY_READERS.campLoad(stub('Nagaon', { reliefCamps: unknownCount() })),
    ).toBeUndefined();
    expect(
      DEFAULT_SEVERITY_READERS.campLoad(stub('Nagaon', { campInmates: unknownCount() })),
    ).toBeUndefined();
  });

  it('read villages and crop area straight off the district', () => {
    const district = stub('Sivasagar', {
      villagesAffected: count(232),
      cropAreaSubmerged: hectares(13413.5),
    });

    expect(DEFAULT_SEVERITY_READERS.villagesAffected(district)).toBe(232);
    expect(DEFAULT_SEVERITY_READERS.cropArea(district)).toBe(13413.5);
  });
});

describe('unbounded components', () => {
  it('scores an unbounded camp load at the top of the range without producing NaN', () => {
    const districts = [
      stub('Nagaon', { campInmates: count(500), reliefCamps: count(0) }),
      stub('Jorhat', { campInmates: count(1773), reliefCamps: count(14) }),
    ];

    const result = computeSeverityIndex(districts, DEFAULT_SEVERITY_WEIGHTS);
    const nagaon = result.find((r) => r.district === 'Nagaon')!;
    const load = nagaon.contributions.find((c) => c.component === 'campLoad')!;

    expect(load.normalised).toBe(1);
    expect(load.basis).toBe('unbounded');
    expect(Number.isFinite(nagaon.score)).toBe(true);
  });
});

describe('guard rails', () => {
  it('returns nothing for an empty bulletin rather than throwing', () => {
    expect(computeSeverityIndex([], DEFAULT_SEVERITY_WEIGHTS)).toEqual([]);
  });

  it('rejects weights that sum to zero — the index would be meaningless', () => {
    expect(() =>
      computeSeverityIndex([stub('A')], {
        affectedPopulation: 0,
        villagesAffected: 0,
        cropArea: 0,
        campLoad: 0,
        casualties: 0,
      }),
    ).toThrow(RangeError);
  });

  it('rejects negative weights', () => {
    expect(() =>
      computeSeverityIndex([stub('A')], { ...DEFAULT_SEVERITY_WEIGHTS, cropArea: -1 }),
    ).toThrow(RangeError);
  });

  it('normalises weights that do not sum to 1, so arbitrary user weights still yield 0–1', () => {
    const readers = {
      ...DEFAULT_SEVERITY_READERS,
      affectedPopulation: (d: DistrictSituation) => (d.district === 'A' ? 1 : 0),
    };

    const asFractions = computeSeverityIndex(
      [stub('A'), stub('B')],
      { ...flatWeights, affectedPopulation: 0.2, villagesAffected: 0.2, cropArea: 0.2, campLoad: 0.2, casualties: 0.2 },
      readers,
    );
    const asIntegers = computeSeverityIndex([stub('A'), stub('B')], flatWeights, readers);

    expect(asIntegers[0]!.score).toBeCloseTo(asFractions[0]!.score, 10);
  });
});

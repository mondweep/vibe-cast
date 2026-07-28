/**
 * The choropleth's arithmetic and its four-state vocabulary.
 *
 * These are the tests that stop the map telling a comfortable lie: that a
 * District nobody has heard from looks like a District that is fine.
 */

import { describe, expect, it } from 'vitest';
import { count, hectares, unknownCount, unknownHectares } from '../../domain/shared/quantity';
import {
  BAND_COUNT,
  DISTRICT_ALIASES,
  bandFor,
  boundaryFor,
  buildChoropleth,
  choroplethBands,
  describeDistrict,
  districtKey,
  niceCeiling,
} from './choropleth-scale';
import { districtRowsFixture } from './test-fixtures';
import type { DistrictRowViewModel } from './view-models';

const row = (
  district: string,
  overrides: Partial<DistrictRowViewModel> = {},
): DistrictRowViewModel => ({
  district,
  rank: 1,
  severityIndex: 0,
  contributions: [],
  populationAffected: count(1000),
  villagesAffected: count(1),
  cropAreaSubmerged: hectares(10),
  campInmates: count(10),
  reliefCamps: count(1),
  campLoad: 10,
  casualties: { floodDeaths: count(0), generalDrownings: count(0), missing: count(0) },
  revenueCircles: [],
  status: 'affected',
  ...overrides,
});

describe('districtKey', () => {
  it('folds the punctuation the two sources disagree about', () => {
    expect(districtKey('Kamrup (M)')).toBe('kamrup m');
    expect(districtKey('South Salmara-Mankachar')).toBe('south salmara mankachar');
    expect(districtKey('  Dima   Hasao ')).toBe('dima hasao');
  });
});

describe('matching bulletin Districts to boundary Districts', () => {
  it('matches the seven Districts the two sources spell identically', () => {
    for (const name of [
      'Charaideo',
      'Dhemaji',
      'Dibrugarh',
      'Golaghat',
      'Jorhat',
      'Nagaon',
      'Sivasagar',
    ]) {
      expect(boundaryFor(name)?.district).toBe(name);
    }
  });

  it('maps the one name the 2026-07-27 bulletin spells differently', () => {
    // ASDMA writes `Kamrup (M)`; the Census 2011 data says
    // `Kamrup Metropolitan`. Left unhandled this is a District silently
    // missing from the map.
    expect(boundaryFor('Kamrup (M)')?.district).toBe('Kamrup Metropolitan');
  });

  it('never lets Kamrup (M) collapse onto rural Kamrup', () => {
    expect(boundaryFor('Kamrup (M)')?.district).not.toBe('Kamrup');
    expect(boundaryFor('Kamrup (R)')?.district).toBe('Kamrup');
  });

  it('carries the renames and spelling variants ASDMA has used', () => {
    expect(boundaryFor('Sribhumi')?.district).toBe('Karimganj');
    expect(boundaryFor('North Cachar Hills')?.district).toBe('Dima Hasao');
    expect(boundaryFor('Marigaon')?.district).toBe('Morigaon');
    expect(boundaryFor('Karbi Anglong West')?.district).toBe('West Karbi Anglong');
  });

  it('every alias points at a District that actually exists in the data', () => {
    for (const [from, to] of Object.entries(DISTRICT_ALIASES)) {
      expect(boundaryFor(to), `alias ${from} -> ${to}`).toBeDefined();
    }
  });

  it('returns nothing for a District created after Census 2011', () => {
    // Bajali (2021) and Tamulpur (2022) are real Districts with no polygon in
    // this vintage of the data. They must come back undefined so the UI can
    // name them, not be quietly folded into their parent District.
    expect(boundaryFor('Bajali')).toBeUndefined();
    expect(boundaryFor('Tamulpur')).toBeUndefined();
  });
});

describe('bands', () => {
  it('rounds the top of the scale to a legible number', () => {
    expect(niceCeiling(144461)).toBe(150000);
    expect(niceCeiling(37139.52)).toBe(40000);
    expect(niceCeiling(0)).toBe(0);
  });

  it('cuts five equal intervals from just above zero', () => {
    const bands = choroplethBands([144461, 98320, 76540, 0]);

    expect(bands).toHaveLength(BAND_COUNT);
    expect(bands[0].from).toBe(0);
    expect(bands[0].to).toBe(30000);
    expect(bands[4].to).toBe(150000);
    expect(bands[0].label).toBe('above 0 – 30,000');
    expect(bands[4].label).toBe('120,000 – 150,000');
  });

  it('bands nothing when every reported figure is nil', () => {
    // Zero is not a magnitude, so there is no scale to draw. The legend says
    // so in words rather than printing five meaningless swatches.
    expect(choroplethBands([0, 0])).toEqual([]);
  });

  it('places a value in the band whose upper edge it does not exceed', () => {
    const bands = choroplethBands([150000]);

    expect(bandFor(1, bands)?.rank).toBe(1);
    expect(bandFor(30000, bands)?.rank).toBe(1);
    expect(bandFor(30001, bands)?.rank).toBe(2);
    expect(bandFor(150000, bands)?.rank).toBe(5);
  });
});

describe('buildChoropleth', () => {
  it('shades a reporting District by its figure', () => {
    const model = buildChoropleth(districtRowsFixture, 'populationAffected');
    const sivasagar = model.districts.find((d) => d.district === 'Sivasagar');

    expect(sivasagar?.shading).toEqual({
      kind: 'reported',
      value: 144461,
      band: expect.objectContaining({ rank: 5 }),
    });
  });

  it('distinguishes a District that reported nil from one that is absent', () => {
    // The whole point. Dhemaji reported zero — it is accounted for and quiet.
    // Barpeta has no row at all — nobody has heard from it. These must not be
    // the same shade (ADR-0005).
    const model = buildChoropleth(districtRowsFixture, 'populationAffected');

    expect(model.districts.find((d) => d.district === 'Dhemaji')?.shading).toEqual({
      kind: 'reported-nil',
    });
    expect(model.districts.find((d) => d.district === 'Barpeta')?.shading).toEqual({
      kind: 'absent',
    });
  });

  it('distinguishes both of those from a District whose figure is unknown', () => {
    const rows = [
      row('Nagaon', { populationAffected: unknownCount() }),
      row('Dhemaji', { populationAffected: count(0) }),
    ];
    const model = buildChoropleth(rows, 'populationAffected');

    const kinds = new Map(model.districts.map((d) => [d.district, d.shading.kind]));
    expect(kinds.get('Nagaon')).toBe('unknown');
    expect(kinds.get('Dhemaji')).toBe('reported-nil');
    expect(kinds.get('Barpeta')).toBe('absent');
    expect(new Set(['unknown', 'reported-nil', 'absent']).size).toBe(3);
  });

  it('counts every District exactly once, into exactly one state', () => {
    const model = buildChoropleth(districtRowsFixture, 'populationAffected');
    const total =
      model.counts.reported +
      model.counts['reported-nil'] +
      model.counts.unknown +
      model.counts.absent;

    expect(model.districts).toHaveLength(33);
    expect(total).toBe(33);
    expect(model.counts.reported).toBe(3);
    expect(model.counts['reported-nil']).toBe(1);
    expect(model.counts.absent).toBe(29);
  });

  it('names a reporting District it cannot place rather than dropping it', () => {
    const model = buildChoropleth([row('Bajali'), row('Nagaon')], 'populationAffected');

    expect(model.withoutBoundary).toEqual(['Bajali']);
    // And its figures do not silently land on some other District.
    expect(model.districts.filter((d) => d.shading.kind === 'reported')).toHaveLength(1);
  });

  it('re-bands when the measure changes', () => {
    const crop = buildChoropleth(districtRowsFixture, 'cropAreaSubmerged');

    expect(crop.measure.label).toBe('Crop Area Submerged');
    expect(crop.districts.find((d) => d.district === 'Sivasagar')?.shading).toMatchObject({
      kind: 'reported',
      value: 12340.5,
    });
  });

  it('treats an unreported measure as unknown even where others are reported', () => {
    const rows = [row('Nagaon', { cropAreaSubmerged: unknownHectares() })];

    expect(buildChoropleth(rows, 'populationAffected').counts.reported).toBe(1);
    expect(buildChoropleth(rows, 'cropAreaSubmerged').counts.unknown).toBe(1);
  });
});

describe('describeDistrict', () => {
  const model = buildChoropleth(districtRowsFixture, 'populationAffected');
  const described = (district: string): string => {
    const shaded = model.districts.find((d) => d.district === district);
    if (!shaded) throw new Error(`no District ${district}`);
    return describeDistrict(shaded, model.measure);
  };

  it('states the figure and its band in words', () => {
    expect(described('Sivasagar')).toBe(
      'Sivasagar District: Population Affected 144,461 people (band 5 of 5, 120,000 – 150,000).',
    );
  });

  it('says "nil" for a reported zero and "no report" for an absence', () => {
    expect(described('Dhemaji')).toBe('Dhemaji District: Population Affected reported as nil.');
    expect(described('Barpeta')).toBe('Barpeta District: no report in this bulletin.');
  });

  it('carries the bulletin spelling when it differs from the boundary data', () => {
    const kamrup = buildChoropleth([row('Kamrup (M)')], 'populationAffected');
    const shaded = kamrup.districts.find((d) => d.district === 'Kamrup Metropolitan');

    expect(describeDistrict(shaded!, kamrup.measure)).toContain(
      'Kamrup Metropolitan District (reported as Kamrup (M))',
    );
  });
});

/**
 * The flow/stock classification, and the readings it produces.
 *
 * These tests are mostly about a distinction rather than a calculation: they
 * exist so that reclassifying Population Affected as a flow — the single most
 * dangerous edit anyone could make to this product — cannot happen quietly.
 */

import { describe, expect, it } from 'vitest';
import { count, hectares, unknownCount } from '../shared/quantity';
import type {
  AnimalCounts,
  Casualties,
  DistrictReport,
  HouseDamage,
  InfrastructureDamage,
} from '../shared/flood-situation-report';
import { aDistrict, aReport, unknown } from '../scenario/__fixtures__/report-builder';
import {
  CUMULATIVE_MEASURES,
  FLOOD_DEATHS,
  MEASURES,
  PEAK_ONLY_MEASURES,
  POPULATION_AFFECTED,
  isSummableAcrossBulletins,
  type Measure,
} from './measure';

// ---------------------------------------------------------------------------
// Local builders
//
// The shared builder defaults every casualty, house and animal figure to a
// reported zero, which is exactly right for the contexts that do not read them
// and exactly wrong here. These helpers override the one section under test.
// ---------------------------------------------------------------------------

const withCasualties = (name: string, casualties: Casualties): DistrictReport => ({
  ...aDistrict({ name }),
  casualties,
});

const withHouses = (name: string, houses: Partial<HouseDamage>): DistrictReport => {
  const district = aDistrict({ name });
  return { ...district, houses: { ...district.houses, ...houses } };
};

const withAnimalsWashedAway = (name: string, washedAway: AnimalCounts): DistrictReport => {
  const district = aDistrict({ name });
  return { ...district, animals: { ...district.animals, washedAway } };
};

const deaths = (floodDeaths: Casualties['floodDeaths']): Casualties => ({
  floodDeaths,
  generalDrownings: count(0),
  missing: count(0),
});

const allUnreported: Casualties = {
  floodDeaths: unknown.count(),
  generalDrownings: unknown.count(),
  missing: unknown.count(),
};

const aDamagedRoad = (name: string): InfrastructureDamage => ({
  damageClass: 'road',
  district: aDistrict({ name: 'Sivasagar' }).district,
  circle: aDistrict({ name: 'Sivasagar', circles: ['Nazira'] }).revenueCircles[0]!.circle,
  name,
  department: 'PWD',
  village: 'Borbil',
  location: 'Ch. 3.20 km',
  remarks: '',
});

// ---------------------------------------------------------------------------

describe('MeasureKind — what may be added across days', () => {
  it('classifies every point-in-time level as a stock', () => {
    const stocks = [
      'population-affected',
      'camp-inmates',
      'non-camp-inmates',
      'relief-camps',
      'relief-distribution-centres',
      'crop-area-submerged',
      'districts-affected',
      'revenue-circles-affected',
      'villages-affected',
    ] as const;

    for (const key of stocks) {
      // Adding these across bulletins counts the same person, camp or hectare
      // once per day. There is no world in which that total means anything.
      expect(MEASURES[key].kind).toBe('stock');
    }
  });

  it('classifies per-bulletin events as flows', () => {
    const flows = [
      'flood-deaths',
      'general-drownings',
      'houses-fully-severely-damaged',
      'houses-partially-damaged',
      'huts-and-cattle-sheds-damaged',
      'big-animals-washed-away',
      'small-animals-washed-away',
      'poultry-washed-away',
      'persons-evacuated-by-boat',
    ] as const;

    for (const key of flows) expect(MEASURES[key].kind).toBe('flow');
  });

  it('treats missing persons as a stock, not as a flow', () => {
    // The trap: "missing" sits beside "lives lost" in the bulletin and looks
    // like the same kind of figure. It is not. Somebody missing on Monday and
    // still missing on Tuesday is one person, and the figure falls when they
    // are found — which a running total could never do.
    expect(MEASURES['persons-missing'].kind).toBe('stock');
  });

  it('treats itemised infrastructure damage as a stock, because the reading is not certain', () => {
    // The rule for an uncertain classification is to offer no cumulative at
    // all, rather than a plausible-looking one.
    expect(MEASURES['infrastructure-items-damaged'].kind).toBe('stock');
    expect(MEASURES['infrastructure-items-damaged'].rationale).toMatch(/never totalled/);
  });

  it('offers no measure that combines flood deaths with general drownings', () => {
    // PRD §4.2. There is nothing to add, so the sum cannot be written.
    const keys = Object.keys(MEASURES);
    expect(keys).toContain('flood-deaths');
    expect(keys).toContain('general-drownings');
    expect(keys.some((key) => /deaths.*drown|drown.*deaths|total-casualt/.test(key))).toBe(false);
  });

  it('gives every measure a rationale an officer can argue with', () => {
    for (const measure of Object.values(MEASURES)) {
      expect(measure.rationale.length).toBeGreaterThan(40);
      expect(measure.label.length).toBeGreaterThan(0);
    }
  });

  it('lists only flows as cumulative and only stocks as peak-only', () => {
    for (const measure of CUMULATIVE_MEASURES) expect(measure.kind).toBe('flow');
    for (const measure of PEAK_ONLY_MEASURES) expect(measure.kind).toBe('stock');
  });
});

describe('isSummableAcrossBulletins', () => {
  it('admits a flow and refuses a stock', () => {
    expect(isSummableAcrossBulletins(FLOOD_DEATHS)).toBe(true);
    expect(isSummableAcrossBulletins(POPULATION_AFFECTED)).toBe(false);
  });

  it('narrows a measure of unknown kind to a flow', () => {
    const measure: Measure = MEASURES['flood-deaths'];
    if (!isSummableAcrossBulletins(measure)) throw new Error('flood deaths must be summable');
    // Type-level: `measure` is a FlowMeasure inside this branch, which is the
    // only route a caller has to `cumulativeOf`.
    expect(measure.kind).toBe('flow');
  });
});

describe('reading a measure off a bulletin', () => {
  it('takes a stock from the Total row ASDMA printed, not from our own sum', () => {
    const report = aReport({
      districts: [aDistrict({ name: 'Sivasagar', affected: count(1) })],
      statewide: { populationAffected: count(445_495) },
    });

    const reading = POPULATION_AFFECTED.read(report);

    // ASDMA's number stays ASDMA's number: 445,495, not the district row's 1.
    expect(reading.value).toBe(445_495);
    expect(reading.source).toBe('asdma-state-total');
    expect(reading.districtRowsNotReporting).toBe(0);
  });

  it('sums the District rows where ASDMA prints no state total, and says so', () => {
    const report = aReport({
      districts: [
        withCasualties('Jorhat', deaths(count(4))),
        withCasualties('Karbi Anglong', deaths(count(1))),
      ],
    });

    const reading = FLOOD_DEATHS.read(report);

    expect(reading.value).toBe(5);
    expect(reading.source).toBe('district-rows');
  });

  it('skips a District row that reported nothing and counts the skip', () => {
    const report = aReport({
      districts: [
        withCasualties('Jorhat', deaths(count(4))),
        withCasualties('Karbi Anglong', allUnreported),
      ],
    });

    const reading = FLOOD_DEATHS.read(report);

    // 4 is a floor, not a count — and the caller is told exactly why, so it
    // cannot be presented as a complete figure (ADR-0005).
    expect(reading.value).toBe(4);
    expect(reading.districtRowsNotReporting).toBe(1);
  });

  it('reports unknown, never zero, when no District row carried the figure', () => {
    const report = aReport({ districts: [withCasualties('Karbi Anglong', allUnreported)] });

    expect(FLOOD_DEATHS.read(report).value).toBeUndefined();
  });

  it('treats a partly-read District row as unreported rather than as a smaller row', () => {
    // Houses Damaged (Fully/Severely) is Kuccha + Pukka. A row with one column
    // missing is not a row with a lower total (ADR-0005).
    const report = aReport({
      districts: [
        withHouses('Sivasagar', {
          fullySeverelyKuccha: count(20),
          fullySeverelyPukka: unknownCount(),
        }),
      ],
    });

    const reading = MEASURES['houses-fully-severely-damaged'].read(report);

    expect(reading.value).toBeUndefined();
    expect(reading.districtRowsNotReporting).toBe(1);
  });

  it('adds the columns within a District row that did report both', () => {
    const report = aReport({
      districts: [
        withHouses('Sivasagar', { fullySeverelyKuccha: count(171), fullySeverelyPukka: count(5) }),
      ],
    });

    expect(MEASURES['houses-fully-severely-damaged'].read(report).value).toBe(176);
  });

  it('reads animals washed away, which is loss, not the exposure figure beside it', () => {
    const report = aReport({
      districts: [
        withAnimalsWashedAway('Sivasagar', {
          big: count(270),
          small: count(4_162),
          poultry: count(22_247),
        }),
      ],
    });

    expect(MEASURES['big-animals-washed-away'].read(report).value).toBe(270);
    expect(MEASURES['small-animals-washed-away'].read(report).value).toBe(4_162);
    expect(MEASURES['poultry-washed-away'].read(report).value).toBe(22_247);
  });

  it('counts infrastructure damage from the bulletin’s own listing', () => {
    const report = {
      ...aReport(),
      infrastructureDamage: [aDamagedRoad('Nazira Road'), aDamagedRoad('Demow Dyke Road')],
    };

    const reading = MEASURES['infrastructure-items-damaged'].read(report);

    expect(reading.value).toBe(2);
    expect(reading.source).toBe('bulletin-listing');
  });

  it('keeps the unit and precision of a fractional measure', () => {
    const report = aReport({ statewide: { cropAreaSubmerged: hectares(48_742.09) } });

    const reading = MEASURES['crop-area-submerged'].read(report);

    expect(reading.value).toBeCloseTo(48_742.09, 2);
    expect(reading.unit).toBe('Hect');
    expect(MEASURES['crop-area-submerged'].precision).toBe(2);
  });
});

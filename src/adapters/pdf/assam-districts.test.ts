/**
 * The vocabulary is evidence, never a gate. These tests hold it to that.
 */

import { describe, expect, it } from 'vitest';

import { ASSAM_DISTRICT_BOUNDARIES } from '../../generated/assam-districts';
import {
  ASSAM_DISTRICT_VOCABULARY,
  districtNameKey,
  knownDistrictName,
} from './assam-districts';

describe('the parser’s District-name vocabulary', () => {
  it('knows every District the boundary dataset draws', () => {
    // The boundary data is Census 2011 and is generated from the GeoJSON
    // fixture; this list is hand-held and parser-owned. They are allowed to
    // differ in *spelling policy* but not in coverage: a District the map can
    // draw and the parser has never heard of is a District whose wrapped name
    // we would silently refuse to repair. Read at test time only — the parser
    // itself never imports 500 kB of polygons.
    const missing = ASSAM_DISTRICT_BOUNDARIES.map((b) => b.district).filter(
      (name) => !knownDistrictName(name),
    );
    expect(missing).toEqual([]);
  });

  it('knows the two Districts Assam created after Census 2011', () => {
    // Bajali (2020) and Tamulpur (2022) are why the boundary set cannot be the
    // vocabulary. 1 August 2026 names Bajali; on a Census-2011 list it would be
    // an unknown word standing next to a wrapped name, and a repair that
    // *required* membership would have had to guess about it.
    expect(knownDistrictName('Bajali')).toBe(true);
    expect(knownDistrictName('Tamulpur')).toBe(true);
    expect(ASSAM_DISTRICT_VOCABULARY.length).toBeGreaterThanOrEqual(35);
  });

  it('knows ASDMA’s own spellings, which are not the boundary dataset’s', () => {
    expect(knownDistrictName('Kamrup (M)')).toBe(true);
    expect(knownDistrictName('Sribhumi')).toBe(true);
    expect(knownDistrictName('Sibsagar')).toBe(true);
  });

  it('keeps Kamrup and Kamrup (M) apart, because they are two Districts', () => {
    // The single most consequential entry. A repair that folded these together
    // would shade rural Kamrup with Guwahati's flood — a wrong answer rather
    // than a missing one.
    expect(districtNameKey('Kamrup')).not.toBe(districtNameKey('Kamrup (M)'));
    expect(districtNameKey('Kamrup (M)')).toBe(districtNameKey('Kamrup M'));
  });

  it('does not know a Revenue Circle, however district-like it reads', () => {
    // Sonari, Mahmora, Nazira and Sivsagar are Circles inside Sivasagar and
    // Charaideo. If the vocabulary knew them, a glued `Cachar Sonai` could be
    // "repaired" into a District that does not exist.
    for (const circle of ['Sonari', 'Mahmora', 'Nazira', 'Sivsagar', 'Dispur', 'Khumtai']) {
      expect(knownDistrictName(circle)).toBe(false);
    }
  });

  it('does not know a fragment of a name', () => {
    for (const fragment of ['Charaid', 'eo', 'Karbi', 'Anglong', 'Bongaigao', 'n', '(M)']) {
      expect(knownDistrictName(fragment)).toBe(false);
    }
  });

  it('folds case, punctuation and stray whitespace, and nothing else', () => {
    expect(districtNameKey('  KAMRUP   (M) ')).toBe('kamrup m');
    expect(districtNameKey('South Salmara-Mankachar')).toBe('south salmara mankachar');
    expect(knownDistrictName('south salmara mankachar')).toBe(true);
    expect(knownDistrictName('')).toBe(false);
  });

  it('has a distinct key for every entry, so no two Districts collide', () => {
    const keys = ASSAM_DISTRICT_VOCABULARY.map(districtNameKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

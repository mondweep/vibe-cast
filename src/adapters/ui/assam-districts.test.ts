/**
 * The guarantee that makes shipping generated boundary data safe.
 *
 * `src/generated/assam-districts.ts` is committed source: it is what draws
 * Assam on the map, and nothing at build time re-reads the GeoJSON to check
 * it. That is deliberate — the fixture's 67 kB of envelope and properties has
 * no business in the bundle — but it means the artefact could drift from the
 * boundary data it claims to be. Drift in a flood console is a District
 * outline on a screen that no source supports.
 *
 * So the check moves here. This test re-derives the boundaries from
 * `fixtures/assam-districts.geojson` on every run, through the same transform
 * the generator used, and asserts the result is the committed constant. It
 * fails if anyone hand-edits the generated file, and it fails if the fixture is
 * replaced without the artefact being regenerated. Either way the fix is:
 *
 *     npm run generate:assam-districts
 *
 * The same shape as `src/adapters/pdf/bundled-bulletins.test.ts` does for the
 * bundled bulletin archive, for the same reason.
 */

import { describe, expect, it } from 'vitest';

import { readBoundaryFixture } from '../../../scripts/assam-districts-source';
import { ASSAM_DISTRICT_BOUNDARIES } from '../../generated/assam-districts';
import { ARCHIVED_BULLETINS } from '../../generated/bulletin-archive';
import { NEWEST_BUNDLED_BULLETIN } from '../../generated/bundled-bulletins';
import { boundaryFor, districtKey } from './choropleth-scale';

describe('the bundled Assam District boundaries', () => {
  it('are exactly what the generator reads from the GeoJSON fixture', async () => {
    // The single assertion this file exists for. If it fails, do not edit the
    // generated file to make it pass — run `npm run generate:assam-districts`
    // and read the diff, because the source data changed.
    expect(ASSAM_DISTRICT_BOUNDARIES).toEqual(await readBoundaryFixture());
  });

  it('covers all 33 Districts of the Census 2011 boundary set', () => {
    expect(ASSAM_DISTRICT_BOUNDARIES).toHaveLength(33);
    expect(new Set(ASSAM_DISTRICT_BOUNDARIES.map((b) => b.district)).size).toBe(33);
  });

  it('keeps Kamrup Metropolitan and Kamrup as separate Districts', () => {
    // The whole reason the name mapping is explicit rather than fuzzy: these
    // are two real, adjacent, differently-affected Districts, and a substring
    // match would shade rural Kamrup with Guwahati's figures.
    const names = ASSAM_DISTRICT_BOUNDARIES.map((b) => b.district);
    expect(names).toContain('Kamrup');
    expect(names).toContain('Kamrup Metropolitan');
    expect(boundaryFor('Kamrup (M)')?.district).toBe('Kamrup Metropolitan');
    expect(boundaryFor('Kamrup')?.district).toBe('Kamrup');
  });

  it('carries closed rings of real coordinates inside Assam', () => {
    for (const boundary of ASSAM_DISTRICT_BOUNDARIES) {
      expect(boundary.rings.length).toBeGreaterThan(0);
      for (const ring of boundary.rings) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
        expect(ring[0]).toEqual(ring[ring.length - 1]);
        for (const [longitude, latitude] of ring) {
          // A shade wider than the shared kernel's bounding box, because the
          // box is a validation rule for reported points, not a survey.
          expect(longitude).toBeGreaterThan(89.5);
          expect(longitude).toBeLessThan(96.2);
          expect(latitude).toBeGreaterThan(24.0);
          expect(latitude).toBeLessThan(28.2);
        }
      }
    }
  });

  it('is sorted by District name, so a regeneration diffs cleanly', () => {
    const names = ASSAM_DISTRICT_BOUNDARIES.map((b) => b.district);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('places every District of the real bundled 27 July bulletin', () => {
    // The reconciliation that matters, run against the shipped 2026-07-27
    // bulletin rather than a fixture: all eight reported Districts must find a
    // polygon. Seven match by name; `Kamrup (M)` needs the alias table. If a
    // future bulletin names a District this cannot place, this fails loudly
    // here rather than losing it quietly on the map.
    const reported = NEWEST_BUNDLED_BULLETIN.districts.map((d) => String(d.district));
    expect(reported).toHaveLength(8);
    expect(reported).toContain('Kamrup (M)');

    const unplaced = reported.filter((name) => boundaryFor(name) === undefined);
    expect(unplaced).toEqual([]);

    // And each lands on a different polygon — no two bulletin rows collapse
    // onto one District.
    const placed = reported.map((name) => boundaryFor(name)?.district);
    expect(new Set(placed).size).toBe(reported.length);
    expect(placed).toContain('Kamrup Metropolitan');
  });

  it('places every District of the archive that the parser reads as a District', () => {
    // The archive is seven more days of real bulletins, and 20 July alone names
    // 23 Districts — nearly three times the newest day's eight. A name the
    // alias table cannot place would vanish from the choropleth, so all eight
    // days are checked, not just the one the console anchors on.
    //
    // KNOWN DEFECT, pre-existing and outside this change: on four of the eight
    // bulletins the column reader splits a District name that ASDMA wrapped
    // across two lines in the PDF. "Karbi Anglong" arrives as "Karbi" and
    // "Anglong"; "Bongaigaon" as "Bongaigao" and "n"; "Kamrup (M)" loses its
    // stem and leaves "(M)". Those fragments are not Districts and no polygon
    // exists for them.
    //
    // It is pinned here rather than hidden, so it cannot quietly get worse and
    // so the next person to open `section-assembler` knows what to fix. It does
    // not reach the screen today: the choropleth and the District ranking are
    // drawn from the anchoring bulletin alone — the newest bulletin held — and
    // the archive contributes only statewide totals to Trend and Cumulative &
    // Peak. An officer who loads one of these PDFs by hand meets the same
    // defect, and always has.
    const WRAPPED_FRAGMENTS = ['Karbi', 'Anglong', 'Bongaigao n', 'Bongaigao', 'n', '(M)'];

    const unplaced = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].flatMap((report) =>
      report.districts
        .map((d) => String(d.district))
        .filter((name) => boundaryFor(name) === undefined)
        .map((name) => `${String(report.reportDate)}: ${name}`),
    );

    const unexpected = unplaced.filter(
      (entry) => !WRAPPED_FRAGMENTS.includes(entry.split(': ')[1] as string),
    );
    expect(unexpected).toEqual([]);

    // And the pin itself: exactly these fragments, on exactly these days.
    expect(unplaced).toEqual([
      '2026-07-20: Karbi',
      '2026-07-20: Anglong',
      '2026-07-20: Bongaigao n',
      '2026-07-20: Bongaigao',
      '2026-07-20: n',
      '2026-07-20: (M)',
      '2026-07-21: Karbi',
      '2026-07-21: Anglong',
      '2026-07-21: Bongaigao n',
      '2026-07-21: (M)',
      '2026-07-23: Karbi',
      '2026-07-23: Anglong',
      '2026-07-23: (M)',
      '2026-07-24: Karbi',
      '2026-07-24: Anglong',
    ]);
  });

  it('places every District of the three archived bulletins the parser reads cleanly', () => {
    // 22, 25 and 26 July have no wrapped names at all, so on those days the
    // map is complete. Asserting it keeps the pin above from being read as
    // "the archive is unmappable" — most of it is fine.
    const clean = ARCHIVED_BULLETINS.filter((report) =>
      ['2026-07-22', '2026-07-25', '2026-07-26'].includes(String(report.reportDate)),
    );
    expect(clean).toHaveLength(3);

    const unplaced = clean.flatMap((report) =>
      report.districts
        .map((d) => String(d.district))
        .filter((name) => boundaryFor(name) === undefined),
    );
    expect(unplaced).toEqual([]);
  });

  it('has a distinct comparison key for every District', () => {
    // An alias table is only safe if the keys it maps onto are unambiguous.
    const keys = ASSAM_DISTRICT_BOUNDARIES.map((b) => districtKey(b.district));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

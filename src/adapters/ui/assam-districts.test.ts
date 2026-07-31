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

  it('places every District of the real bundled 30 July bulletin bar the wrapped one', () => {
    // The reconciliation that matters, run against the shipped 2026-07-30
    // bulletin — the newest the console holds, and therefore the one the
    // choropleth is actually drawn from — rather than a fixture.
    //
    // Twelve Districts are named: the eight ASDMA lists as affected (page 1:
    // "8 Golaghat, Sivasagar, Biswanath, Charaideo, Kamrup (M), Jorhat,
    // Dhemaji, Nagaon") plus four more that appear in the later tables
    // reporting explicit zeros. Eleven find a polygon — ten match by name and
    // `Kamrup (M)` needs the alias table.
    //
    // The twelfth is `Bongaigao n`, and it is not a District: it is the known
    // name-wrapping defect described at length below, reaching the newest
    // bundled bulletin for the first time. It is pinned by name here so that a
    // *different* unplaceable name — a real District the alias table has never
    // seen — still fails this test loudly rather than vanishing from the map.
    const reported = NEWEST_BUNDLED_BULLETIN.districts.map((d) => String(d.district));
    expect(reported).toHaveLength(12);
    expect(reported).toContain('Kamrup (M)');

    const unplaced = reported.filter((name) => boundaryFor(name) === undefined);
    expect(unplaced).toEqual(['Bongaigao n']);

    // And each of the eleven real ones lands on a different polygon — no two
    // bulletin rows collapse onto one District.
    const placed = reported
      .filter((name) => boundaryFor(name) !== undefined)
      .map((name) => boundaryFor(name)?.district);
    expect(placed).toHaveLength(11);
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed).toContain('Kamrup Metropolitan');
  });

  it('places every District of the archive that the parser reads as a District', () => {
    // The archive is ten more days of real bulletins, and 20 July alone names
    // 23 Districts — nearly twice the newest day's twelve. A name the alias
    // table cannot place would vanish from the choropleth, so all eleven days
    // are checked, not just the one the console anchors on.
    //
    // KNOWN DEFECT, pre-existing and outside this change: on five of the eleven
    // bulletins the column reader splits a District name that ASDMA wrapped
    // across two lines in the PDF. "Karbi Anglong" arrives as "Karbi" and
    // "Anglong"; "Bongaigaon" as "Bongaigao n", or as "Bongaigao" and "n";
    // "Kamrup (M)" loses its stem and leaves "(M)". Those fragments are not
    // Districts and no polygon exists for them.
    //
    // 30 July adds exactly one entry to that list — `Bongaigao n` — and it is
    // the *same* defect, not a new one: ASDMA wrapped "Bongaigaon" across two
    // printed lines in the Population table just as it did on 20 and 21 July.
    // The obvious geometric fix demonstrably corrupts other bulletins, so it is
    // pinned rather than attempted here.
    //
    // It is pinned rather than hidden, so it cannot quietly get worse and so the
    // next person to open `section-assembler` knows what to fix. It does not
    // reach the screen for the archived days: the choropleth and the District
    // ranking are drawn from the anchoring bulletin alone, and the archive
    // contributes only statewide totals to Trend and Cumulative & Peak. On
    // 30 July it *is* the anchoring bulletin, so `Bongaigao n` is one row the
    // choropleth cannot shade — a real, visible consequence, and the reason
    // this pin is worth keeping honest.
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
      '2026-07-30: Bongaigao n',
    ]);
  });

  it('places every District of the six archived bulletins the parser reads cleanly', () => {
    // 22, 25, 26, 27, 28 and 29 July have no wrapped names at all, so on those
    // days the map is complete. Asserting it keeps the pin above from being
    // read as "the archive is unmappable" — most of it is fine. 28 and 29 July
    // join the list on their own merit, and 28 July especially: it is the
    // bulletin that once produced eighteen unplaceable prose fragments, and it
    // now names ten Districts of which every one places.
    const clean = ARCHIVED_BULLETINS.filter((report) =>
      [
        '2026-07-22',
        '2026-07-25',
        '2026-07-26',
        '2026-07-27',
        '2026-07-28',
        '2026-07-29',
      ].includes(String(report.reportDate)),
    );
    expect(clean).toHaveLength(6);

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

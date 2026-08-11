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

  it('places every District of the real bundled 10 August bulletin', () => {
    // The reconciliation that matters, run against the shipped 2026-08-10
    // bulletin — the newest the console holds, and therefore the one the
    // choropleth is actually drawn from — rather than a fixture.
    //
    // Twelve names are reported and all twelve find a polygon. Which Districts
    // a bulletin happens to name changes daily, so this is a fact about
    // 10 August and not a guarantee about the alias table — hence the
    // archive-wide test below.
    //
    // `Bajali` is the standing counterexample and it has simply moved: it is
    // reported on 1 August, which is now archived rather than newest. It is a
    // real District created in 2020 that the Census-2011 boundary set predates,
    // and it is deliberately NOT aliased onto Barpeta — Bajali sits inside the
    // old Barpeta polygon, so shading Barpeta would claim a flood across an
    // area several times the one that reported it, under the name of a District
    // that reported nothing, and two rows would collide on one polygon if
    // Barpeta ever reports the same day. That is the `Kamrup`/`Kamrup (M)` trap
    // in another costume: a wrong answer where a missing one was available.
    const reported = NEWEST_BUNDLED_BULLETIN.districts.map((d) => String(d.district));
    expect(reported).toHaveLength(12);

    const unplaced = reported.filter((name) => boundaryFor(name) === undefined);
    expect(unplaced).toEqual([]);

    // The name-LIST cell corrupts in two shapes, and both were found by real
    // bulletins: 5 August wrapped (`... Darrang, Karbi\nUdalguri`, the printed
    // `Anglong,` lost between the lines) and 7 August truncated (`... Jorhat,
    // Ch`). Each had manufactured a District that reported nothing. The
    // archive-wide test below is what holds both repairs down.
    expect(reported).not.toContain('Ch');

    // And each lands on a different polygon — no two bulletin rows collapse
    // onto one District.
    const placed = reported.map((name) => boundaryFor(name)?.district);
    expect(new Set(placed).size).toBe(placed.length);

    // `Kamrup (M)` is the name that needs the alias table and rural `Kamrup`
    // must never be what it resolves to — but only WHEN the day reports it.
    // This used to assert it unconditionally, which pinned a fact about one
    // bulletin's roster rather than a property of the mapping, and 10 August
    // broke it simply by not flooding in Guwahati. The invariant itself is
    // asserted properly, and day-independently, above.
    if (reported.includes('Kamrup (M)')) {
      expect(placed).toContain('Kamrup Metropolitan');
    }
  });

  it('places every District of the archive that the parser reads as a District', () => {
    // The archive is twenty-one more days of real bulletins, and 20 July alone
    // names 18 Districts. A name the alias table cannot place vanishes from the
    // choropleth, so all twenty-two days are checked, not just the one the
    // console anchors on.
    //
    // This list used to hold sixteen entries across five days, and every one of
    // them was half a District. DRIMS wraps a name inside the word when the
    // column is narrow, and the parser published each half separately: "Karbi
    // Anglong" as `Karbi` and `Anglong`, "Bongaigaon" as `Bongaigao n` or as
    // `Bongaigao` and `n`, "Kamrup (M)" as a stemless `(M)`. It was pinned here
    // for three iterations as cosmetic, on the reasoning that the archived days
    // only contribute statewide totals. That reasoning expired on 31 July, when
    // the same defect fragmented nine names at once, produced 47 Districts in a
    // state that has 35, and the integrity check refused the bulletin whole.
    // The names are put back together in `src/adapters/pdf/wrapped-district-name.ts`
    // now, on evidence rather than geometry, so none of the sixteen survives.
    //
    // One entry remains and it is not a fragment: `Bajali`, a District created
    // in 2020 that the Census-2011 boundary set predates. See above for why it
    // is not aliased onto Barpeta.
    //
    // Two more have appeared and both were repaired at source rather than
    // listed here: `Karbi Udalguri` on 5 August (a wrapped name list collapsed
    // into one name) and `Ch` on 7 August (the same cell truncated mid-name).
    // Neither was a District; see `resolveWrappedNameList`.
    const unplaced = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].flatMap((report) =>
      report.districts
        .map((d) => String(d.district))
        .filter((name) => boundaryFor(name) === undefined)
        .map((name) => `${String(report.reportDate)}: ${name}`),
    );

    expect(unplaced).toEqual(['2026-08-01: Bajali']);
  });

  it('places every District of every archived bulletin but the one with Bajali in it', () => {
    // The same fact stated as a per-day outcome, because "one unplaced name in
    // thirteen days" and "twelve days that are completely mappable" are not the
    // same claim, and it is the second one an officer relies on. 28 July
    // especially: it is the bulletin that once produced eighteen unplaceable
    // prose fragments, and every District it names now places.
    const incomplete = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN]
      .filter((report) =>
        report.districts.some((d) => boundaryFor(String(d.district)) === undefined),
      )
      .map((report) => String(report.reportDate));

    expect(incomplete).toEqual(['2026-08-01']);
  });

  it('has a distinct comparison key for every District', () => {
    // An alias table is only safe if the keys it maps onto are unambiguous.
    const keys = ASSAM_DISTRICT_BOUNDARIES.map((b) => districtKey(b.district));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

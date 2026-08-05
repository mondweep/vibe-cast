/**
 * The guarantee that makes shipping generated data safe.
 *
 * `src/generated/newest-bulletin.ts` and `src/generated/bulletin-archive.ts`
 * are committed source: between them they are the seventeen-bulletin archive the
 * console opens on, and nothing at build time or run time reparses the PDFs to
 * check them. That is the whole point — the default path costs no pdf.js
 * (NFR-3) — but it means the artefacts could drift from the bulletins they
 * claim to be, and drift in a flood console is figures on a screen that no
 * document supports.
 *
 * So the check moves here. This test parses all seventeen real fixture PDFs,
 * fresh, on every run, and asserts the results are the committed constants. It
 * fails if anyone hand-edits a generated file, and it fails if the parser
 * changes without the artefacts being regenerated. Either way the fix is the
 * same:
 *
 *     npm run generate:bundled-bulletins
 *
 * It covers **every bundled bulletin**, not just the eager one. An archive
 * verified only at its newest day would be sixteen-seventeenths unchecked, and the
 * sixteen unchecked days are precisely the ones the Trend view draws.
 *
 * Where `golden.test.ts` asserts the parser reads Appendix B correctly, this
 * asserts that what we *ship* is what the parser reads.
 *
 * PROVENANCE OF THE EXPECTED FIGURES. Nothing below was copied from parser
 * output. Every statewide figure was read out of the PDF's own `Total` row via
 * the text layer, WITHOUT this parser, by clustering pdf.js runs into visual
 * lines and printing the lines beginning `Total` — the method `golden.test.ts`
 * documents at length. A pin taken from the received value would be a
 * tautology, and a tautology could not have caught the parser defect that has
 * already bitten this project twice.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { FloodSituationReport } from '../../domain/shared/flood-situation-report';
import { ARCHIVED_BULLETINS } from '../../generated/bulletin-archive';
import {
  ARCHIVE_DATES,
  BUNDLED_DATES,
  BUNDLED_RANGE,
  NEWEST_BUNDLED_BULLETIN,
  loadArchivedBulletins,
} from '../../generated/bundled-bulletins';
import { createPdfBulletinSource } from './pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from './pdfjs-loader';

/**
 * Oldest first — the order the generator emits, and the order the archive
 * holds.
 *
 * Seventeen now, not eight. The generator used to hold a hard-coded list of dates
 * and therefore silently ignored any fixture the Drive sync added; it now
 * discovers `fixtures/Daily_Flood_Report_YYYYMMDD.pdf` from disk, so this list
 * is the one remaining place where "what is on disk" is restated by hand. It is
 * kept deliberately: if the two disagree, `covers every day the fixtures hold`
 * below says so.
 */
const STAMPS = [
  '20260720',
  '20260721',
  '20260722',
  '20260723',
  '20260724',
  '20260725',
  '20260726',
  '20260727',
  '20260728',
  '20260729',
  '20260730',
  '20260731',
  '20260801',
  '20260802',
  '20260803',
  '20260804',
  '20260805',
] as const;

const fixture = (stamp: string): string =>
  path.resolve(import.meta.dirname, `../../../fixtures/Daily_Flood_Report_${stamp}.pdf`);

/** Every bundled bulletin as the parser reads it today, keyed by fixture stamp. */
const freshlyParsed = new Map<string, FloodSituationReport>();

describe('the bundled bulletin archive', () => {
  beforeAll(async () => {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
    const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });
    for (const stamp of STAMPS) {
      const bytes = await readFile(fixture(stamp));
      freshlyParsed.set(
        stamp,
        await source.parse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })),
      );
    }
  }, 300_000);

  it('has a freshly parsed bulletin for every fixture, so nothing below passes vacuously', () => {
    expect(freshlyParsed.size).toBe(STAMPS.length);
  });

  it.each(STAMPS)('ships the %s bulletin exactly as the parser reads its fixture', (stamp) => {
    const index = STAMPS.indexOf(stamp);
    const shipped = index === STAMPS.length - 1 ? NEWEST_BUNDLED_BULLETIN : ARCHIVED_BULLETINS[index];

    expect(shipped).toEqual(freshlyParsed.get(stamp));
  });

  it('carries no half of a wrapped District name', () => {
    // Ten of the first eleven days once shipped at least one: DRIMS wraps a
    // District name inside the word when the column is narrow, and the parser
    // published each half as a District of its own. `Karbi Anglong` was two
    // Districts on four days; `Bongaigao n` was one on two more.
    //
    // This is not a restatement of the equality above. That one says the
    // artefact matches the parser, and it said so just as contentedly when both
    // were wrong. This says what the answer has to look like, so a regression
    // that re-broke the names AND regenerated the archive would still fail.
    const names = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].flatMap((r) =>
      r.districts.map((d) => String(d.district)),
    );

    expect(names.filter((n) => ['Karbi', 'Anglong', '(M)', 'Bongaigao', 'n'].includes(n))).toEqual(
      [],
    );
    expect(names.filter((n) => /\b(Bongaigao|Charaide|Dibruga|Golagha|Sivasaga|Dhemaj)\s/.test(n))).toEqual(
      [],
    );
    // And every name is a name, not a fragment or a sentence.
    for (const name of names) expect(name).toMatch(/^[A-Z][A-Za-z]+(?:[ ()][A-Za-z()]+)*$/);
  });

  it('holds sixteen archived bulletins and one eager one — seventeen in all', () => {
    // Seventeen because `fixtures/` holds seventeen Daily Flood Report PDFs, one
    // per day from 20 July to 4 August 2026 inclusive. The eager/archive split
    // is always "the newest one, and all the rest", so sixteen archived follows.
    expect(ARCHIVED_BULLETINS).toHaveLength(16);
    expect(BUNDLED_DATES).toHaveLength(17);
    expect(BUNDLED_RANGE).toEqual({ from: '2026-07-20', to: '2026-08-05', count: 17 });
  });

  it('covers seventeen consecutive days, so the console opens on a trend with no gaps', () => {
    // The Trend view draws a break wherever a day is missing, and it is right
    // to. That break must never come from the bundle itself.
    //
    // 28 July is present. An earlier upload under that name was a 9 kB HTML
    // page from the ASDMA website rather than a PDF; the sync correctly refused
    // it, and for a while the bundle genuinely did have a one-day hole here.
    // The real bulletin has since been uploaded, so the range is contiguous
    // again — and this assertion is what stops anyone assuming otherwise.
    //
    // The range now crosses a month boundary, which is the other way a
    // contiguous run can appear broken: 31 July to 1 August is one day, and a
    // date arithmetic that works in day-of-month would call it a gap.
    expect(BUNDLED_DATES.map(String)).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
    ]);
  });

  it('announces exactly the days the archive actually holds', () => {
    // The dates are generated, not typed, precisely so the console cannot
    // promise a range the data does not cover.
    expect(ARCHIVE_DATES.map(String)).toEqual(ARCHIVED_BULLETINS.map((r) => String(r.reportDate)));
    expect(BUNDLED_DATES.map(String)).toEqual([
      ...ARCHIVED_BULLETINS.map((r) => String(r.reportDate)),
      String(NEWEST_BUNDLED_BULLETIN.reportDate),
    ]);
  });

  it('resolves the archive through the lazy loader, memoised', async () => {
    // The console reaches the archive only through this function; a second
    // caller must not start a second fetch.
    const first = loadArchivedBulletins();
    const second = loadArchivedBulletins();
    expect(first).toBe(second);
    expect(await first).toEqual(ARCHIVED_BULLETINS);
  });

  it('carries the content hash of each PDF, so the timeline dedupes them', () => {
    // The bulletin id is a content hash (PRD §5.6). Because a bundled bulletin
    // and a user-loaded copy of the same file hash identically, dropping one of
    // these PDFs onto the console is idempotent rather than duplicating the day.
    for (const stamp of STAMPS) {
      expect(freshlyParsed.get(stamp)?.bulletinId).toMatch(/^[0-9a-f]{64}$/);
    }
    const bundled = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN];
    expect(bundled.map((r) => r.bulletinId)).toEqual(
      STAMPS.map((stamp) => freshlyParsed.get(stamp)?.bulletinId),
    );
    expect(new Set(bundled.map((r) => r.bulletinId)).size).toBe(17);
  });

  it('is dated and reconciled throughout, so the console never opens on a broken archive', () => {
    // 23 sections read cleanly on every one of the seventeen. A degraded section
    // in bundled history would be a permanent asterisk on the first screen an
    // officer ever sees.
    //
    // 28 July is the reason this assertion earns its keep. It arrived parsing
    // to a husk — channel detection failed to find the Particulars gutter,
    // silently fell back to `FALLBACK_BODY_START` (74pt), landed right of the
    // District column, and produced 23 of 23 sections demoted to `failed` with
    // "districts" carved out of Remarks prose. This test is what refused to let
    // that ship. The fix belongs in the parser and was made there; do NOT
    // weaken this check to accommodate a future one.
    //
    // 31 July is the second reason. It arrived yielding 47 Districts in a state
    // that has 35 — every Revenue Circle in the bulletin promoted to a District
    // because an unnamed Wildlife block was measured together with the table
    // above it and collapsed two columns into one. `checkDocumentIntegrity`
    // refused it, and this is where that refusal would have been felt.
    for (const report of [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN]) {
      expect(report.reconciliationFailures).toEqual([]);
      expect(report.provenance.every((p) => p.confidence === 'high')).toBe(true);
      expect(report.provenance).toHaveLength(23);
    }
    // Printed in the page footer: "Report Generated On: 05-08-2026 07:50 PM".
    expect(NEWEST_BUNDLED_BULLETIN.generatedAt).toBe('05-08-2026 07:50 PM');
  });

  it('reports the verified statewide affected population for each of the seventeen days', () => {
    // Independently verified against the printed bulletins — each figure is the
    // `Total Population` cell of the PDF's own `Total` row in the Population
    // And Crop Area Submerged section, read through the text layer without this
    // parser. If the parser ever starts reading a different total, that is a
    // data defect and it stops here rather than on an officer's screen.
    const affected = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].map((report) => [
      String(report.reportDate),
      report.statewideTotals.populationAffected,
    ]);

    expect(affected).toEqual([
      ['2026-07-20', { kind: 'known', unit: 'count', value: 362933 }],
      ['2026-07-21', { kind: 'known', unit: 'count', value: 564660 }],
      ['2026-07-22', { kind: 'known', unit: 'count', value: 653164 }],
      ['2026-07-23', { kind: 'known', unit: 'count', value: 721024 }],
      ['2026-07-24', { kind: 'known', unit: 'count', value: 705148 }],
      ['2026-07-25', { kind: 'known', unit: 'count', value: 654838 }],
      ['2026-07-26', { kind: 'known', unit: 'count', value: 524733 }],
      ['2026-07-27', { kind: 'known', unit: 'count', value: 445495 }],
      // "Total 140672 143687 48280 332639 45341.98", page 2.
      ['2026-07-28', { kind: 'known', unit: 'count', value: 332639 }],
      ['2026-07-29', { kind: 'known', unit: 'count', value: 300031 }],
      ['2026-07-30', { kind: 'known', unit: 'count', value: 212441 }],
      // "Total 80686 82409 29704 192799 15430", page 1. The bulletin that
      // yielded 47 Districts before the wrapped names were put back together;
      // its statewide row was always legible, which is exactly why a statewide
      // figure alone is not evidence that a bulletin was read.
      ['2026-07-31', { kind: 'known', unit: 'count', value: 192799 }],
      // "Total 75388 76104 27345 178837 15060", page 1.
      ['2026-08-01', { kind: 'known', unit: 'count', value: 178837 }],
      // "Total 60387 56605 19211 136203 15422", page 1.
      ['2026-08-02', { kind: 'known', unit: 'count', value: 136203 }],
      // "Total 56261 53224 18587 128072 14230.148", page 2.
      ['2026-08-03', { kind: 'known', unit: 'count', value: 128072 }],
      // "Total 53770 51434 16933 122137 15342.92", page 2.
      ['2026-08-04', { kind: 'known', unit: 'count', value: 122137 }],
      ['2026-08-05', { kind: 'known', unit: 'count', value: 160653 }],
    ]);
  });

  it('reports the verified relief posture for each of the seventeen days', () => {
    // The three figures the response views are built on, pinned for the same
    // reason and read the same way. Relief Camps and Relief Distribution
    // Centres share one `Total` row in the Relief Camps / Centres Opened
    // section — "Total <both> <camps> <centres>" — so on 30 July the printed
    // row is "Total 112 62 50": 62 camps and 50 centres, never 112 of either.
    // Camp Inmates is the leading cell of the Inmates In Relief Camps `Total`
    // row ("Total 13294 5826 5735 1686 38 9").
    const posture = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].map((report) => ({
      date: String(report.reportDate),
      camps: report.statewideTotals.reliefCamps,
      inmates: report.statewideTotals.campInmates,
      nonCamp: report.statewideTotals.nonCampInmates,
    }));

    const known = (value: number) => ({ kind: 'known', unit: 'count', value });

    expect(posture).toEqual([
      { date: '2026-07-20', camps: known(50), inmates: known(9697), nonCamp: known(34905) },
      { date: '2026-07-21', camps: known(72), inmates: known(12375), nonCamp: known(100318) },
      { date: '2026-07-22', camps: known(106), inmates: known(24418), nonCamp: known(290826) },
      { date: '2026-07-23', camps: known(103), inmates: known(24124), nonCamp: known(239864) },
      { date: '2026-07-24', camps: known(96), inmates: known(25205), nonCamp: known(200056) },
      { date: '2026-07-25', camps: known(90), inmates: known(18902), nonCamp: known(123114) },
      { date: '2026-07-26', camps: known(109), inmates: known(37724), nonCamp: known(153833) },
      { date: '2026-07-27', camps: known(90), inmates: known(28695), nonCamp: known(51777) },
      // "Total 115 81 34" / "Total 32477 16116 13840 2445 56 20" /
      // "Total 16314 7667 6433 2214 42743 30145 141032", pages 2 and 3.
      { date: '2026-07-28', camps: known(81), inmates: known(32477), nonCamp: known(16314) },
      { date: '2026-07-29', camps: known(71), inmates: known(16567), nonCamp: known(72210) },
      { date: '2026-07-30', camps: known(62), inmates: known(13294), nonCamp: known(62289) },
      // "Total 80 54 26" / "Total 12994 5710 5628 1620 27 9" /
      // "Total 5384 2644 2350 390 10773 10410 0", pages 2 and 3. 54 camps and
      // 26 centres, never 80 of either.
      { date: '2026-07-31', camps: known(54), inmates: known(12994), nonCamp: known(5384) },
      // "Total 61 44 17" / "Total 11489 5053 4915 1485 27 9" /
      // "Total 5569 2581 1743 1245 682 1054 5200", page 2.
      { date: '2026-08-01', camps: known(44), inmates: known(11489), nonCamp: known(5569) },
      // "Total 54 39 15" / "Total 10844 4780 4634 1399 24 7" /
      // "Total 2927 1294 1094 539 7553 6984 8800", pages 1 and 2.
      { date: '2026-08-02', camps: known(39), inmates: known(10844), nonCamp: known(2927) },
      // "Total 55 38 17" / "Total 11066 4835 4738 1462 24 7" /
      // "Total 184 81 70 33 11674 6506 939", page 2. Non-camp inmates really
      // does fall from 2,927 to 184 in a day while camp inmates rise — the
      // three components sum to their leading cell in both, so it is what the
      // bulletin says rather than a column read one place over.
      { date: '2026-08-03', camps: known(38), inmates: known(11066), nonCamp: known(184) },
      // "Total 55 39 16" / "Total 12382 5018 4926 2402 29 7" /
      // "Total 5475 2127 2006 1342 4959 3607 0", pages 2 and 3.
      { date: '2026-08-04', camps: known(39), inmates: known(12382), nonCamp: known(5475) },
      { date: '2026-08-05', camps: known(45), inmates: known(12356), nonCamp: known(32048) },
    ]);
  });

  it('reads 28 July in full — the bulletin that once parsed to a husk', () => {
    // The regression pin for the worst failure this archive has had. 28 July
    // arrived yielding 23 of 23 sections `failed`, no statewide totals at all,
    // and eighteen "districts" carved out of Remarks prose — a husk that only
    // the integrity check stopped from shipping. Every figure below comes from
    // the PDF's own printed rows, read through the text layer without this
    // parser, so a parser that agrees is evidence rather than a tautology:
    //
    //   p1 "7 Sivasagar, Charaideo, Golaghat, Jorhat, Nagaon, Sonitpur,
    //       Kamrup (M)"                                 -> districts affected
    //   p1 "Total 21"                                   -> revenue circles
    //   p1 "Total 622"                                  -> villages
    //   p2 "Total 140672 143687 48280 332639 45341.98"  -> male female children
    //                                                      POPULATION crop area
    //   p2 "Total 115 81 34"                            -> both CAMPS centres
    //   p2 "Total 32477 16116 13840 2445 56 20"         -> CAMP INMATES ...
    //   p3 "Total 16314 7667 6433 2214 42743 30145 ..." -> NON-CAMP INMATES ...
    //   p3 "Total 7 7 0 3 4 0 0 0"                      -> both FLOOD DEATHS
    const byDate = new Map(
      [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].map((r) => [String(r.reportDate), r]),
    );
    const twentyEighth = byDate.get('2026-07-28');

    expect(twentyEighth?.generatedAt).toBe('28-07-2026 09:14 PM');
    expect(twentyEighth?.statewideTotals).toMatchObject({
      districtsAffected: { kind: 'known', unit: 'count', value: 7 },
      revenueCirclesAffected: { kind: 'known', unit: 'count', value: 21 },
      villagesAffected: { kind: 'known', unit: 'count', value: 622 },
      populationAffected: { kind: 'known', unit: 'count', value: 332639 },
      cropAreaSubmerged: { kind: 'known', unit: 'Hect', value: 45341.98 },
      reliefCamps: { kind: 'known', unit: 'count', value: 81 },
      reliefDistributionCentres: { kind: 'known', unit: 'count', value: 34 },
      campInmates: { kind: 'known', unit: 'count', value: 32477 },
      nonCampInmates: { kind: 'known', unit: 'count', value: 16314 },
    });

    // Ten real District names, not eighteen fragments of prose. The husk's
    // "districts" ran to hundreds of characters each; these are Districts.
    expect(twentyEighth?.districts.map((d) => String(d.district))).toEqual([
      'Sivasagar',
      'Charaideo',
      'Golaghat',
      'Jorhat',
      'Nagaon',
      'Sonitpur',
      'Kamrup (M)',
      'Cachar',
      'Dibrugarh',
      'Hojai',
    ]);
    expect(twentyEighth?.provenance.every((p) => p.confidence === 'high')).toBe(true);
  });

  it('reads the two newest days in full, section for section', () => {
    // 29 and 30 July are the days this archive most recently gained, so they
    // get the same scrutiny the older ones received when they arrived. Every
    // figure below is from that PDF's own `Total` row, read without the parser:
    //
    //   29 Jul p1 "Total 21"                                  -> revenue circles
    //          p1 "Total 551"                                 -> villages
    //          p2 "Total 124621 129134 46276 300031 21523.08" -> male female
    //                                                            children
    //                                                            POPULATION crop
    //          p2 "Total 101 71 30"                           -> both camps CENTRES
    //          p2 "Total 16567 7363 7136 2012 45 11"          -> CAMP INMATES ...
    //          p3 "Total 72210 29256 29420 13534 2324 ..."    -> NON-CAMP INMATES
    //          p3 "Total 3 3 0 2 1 0 0 0"                     -> both FLOOD DEATHS
    //   and `districtsAffected` from the page-1 cell: "7 Charaideo, Golaghat,
    //   Sivasagar, Nagaon, Biswanath, Jorhat, Kamrup (M)".
    //
    //   30 Jul p1 "Total 21" / p1 "Total 437"
    //          p2 "Total 89197 90941 32303 212441 17198.09"
    //          p2 "Total 112 62 50" / p2 "Total 13294 5826 5735 1686 38 9"
    //          p3 "Total 62289 27061 25495 9733 13971 17903 0"
    //          p3 "Total 2 2 0 0 1 1 0 0"
    //   and page 1: "8 Golaghat, Sivasagar, Biswanath, Charaideo, Kamrup (M),
    //   Jorhat, Dhemaji, Nagaon".
    //
    // Note that `districtsAffected` (7 and 8) is a smaller number than the
    // districts the bulletin *names* (12 on both days): the later sections also
    // list quiet districts reporting explicit zeros. Conflating the two is an
    // easy and consequential mistake, so both are asserted.
    const byDate = new Map(
      [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].map((r) => [String(r.reportDate), r]),
    );

    const twentyNinth = byDate.get('2026-07-29');
    expect(twentyNinth?.generatedAt).toBe('29-07-2026 09:44 PM');
    expect(twentyNinth?.statewideTotals).toMatchObject({
      districtsAffected: { kind: 'known', unit: 'count', value: 7 },
      revenueCirclesAffected: { kind: 'known', unit: 'count', value: 21 },
      villagesAffected: { kind: 'known', unit: 'count', value: 551 },
      populationAffected: { kind: 'known', unit: 'count', value: 300031 },
      cropAreaSubmerged: { kind: 'known', unit: 'Hect', value: 21523.08 },
      reliefCamps: { kind: 'known', unit: 'count', value: 71 },
      reliefDistributionCentres: { kind: 'known', unit: 'count', value: 30 },
      campInmates: { kind: 'known', unit: 'count', value: 16567 },
      nonCampInmates: { kind: 'known', unit: 'count', value: 72210 },
    });
    expect(twentyNinth?.districts).toHaveLength(12);

    const thirtieth = byDate.get('2026-07-30');
    expect(thirtieth?.generatedAt).toBe('30-07-2026 08:38 PM');
    expect(thirtieth?.statewideTotals).toMatchObject({
      districtsAffected: { kind: 'known', unit: 'count', value: 8 },
      revenueCirclesAffected: { kind: 'known', unit: 'count', value: 21 },
      villagesAffected: { kind: 'known', unit: 'count', value: 437 },
      populationAffected: { kind: 'known', unit: 'count', value: 212441 },
      cropAreaSubmerged: { kind: 'known', unit: 'Hect', value: 17198.09 },
      reliefCamps: { kind: 'known', unit: 'count', value: 62 },
      reliefDistributionCentres: { kind: 'known', unit: 'count', value: 50 },
      campInmates: { kind: 'known', unit: 'count', value: 13294 },
      nonCampInmates: { kind: 'known', unit: 'count', value: 62289 },
    });
    expect(thirtieth?.districts).toHaveLength(12);
  });

  it('sums the district flood deaths of the three newest days to the printed totals', () => {
    // Never added to general drownings — the type has no `total` (PRD §4.2).
    // 28 July prints "Total 7 7 0 3 4 0 0 0", 29 July "Total 3 3 0 2 1 0 0 0"
    // and 30 July "Total 2 2 0 0 1 1 0 0"; the second cell is the Flood Death
    // column in all three.
    const sumDeaths = (report: FloodSituationReport | undefined): number =>
      (report?.districts ?? [])
        .map((d) => d.casualties.floodDeaths)
        .filter((q) => q.kind === 'known')
        .reduce((acc, q) => acc + q.value, 0);

    const byDate = new Map(
      [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].map((r) => [String(r.reportDate), r]),
    );

    expect(sumDeaths(byDate.get('2026-07-28'))).toBe(7);
    expect(sumDeaths(byDate.get('2026-07-29'))).toBe(3);
    expect(sumDeaths(byDate.get('2026-07-30'))).toBe(2);
  });

  it('preserves unknown as unknown, not as zero (ADR-0005)', () => {
    // The shape that matters: a District the Population And Crop Area Submerged
    // table gives an explicit reported zero, and the Villages Affected table
    // does not list at all. Those two are different facts — "reported nothing
    // happened" and "did not report" — and serialising through TypeScript
    // source must not flatten the second into the first.
    //
    // ANCHORED ON AN ARCHIVED DAY, ON PURPOSE. This test used to read
    // `NEWEST_BUNDLED_BULLETIN`, which meant its subject changed every time a
    // bulletin was uploaded: the example was Dhemaji, then Dibrugarh, and on
    // 4 August it was nobody at all — every District that day reports both
    // figures, so the newest bulletin cannot demonstrate the distinction and
    // the test failed for a reason that said nothing about ADR-0005. 27 July is
    // a fixed day in the archive and stays a fixed day.
    //
    // Dhemaji on 27 July: the Population table reports 0, and the Villages
    // Affected table names only the affected districts, of which it is not one.
    const dhemaji = ARCHIVED_BULLETINS.find((r) => String(r.reportDate) === '2026-07-27')
      ?.districts.find((d) => String(d.district) === 'Dhemaji');

    expect(dhemaji).toBeDefined();
    expect(dhemaji?.population.total).toEqual({ kind: 'known', unit: 'count', value: 0 });
    expect(dhemaji?.villagesAffected).toEqual({ kind: 'unknown', unit: 'count' });

    // And the distinction is not a curiosity of one row: it must survive across
    // the archive. Without this, a change that coerced every unknown to zero
    // would leave the pin above as the only thing standing, and a single pin is
    // one careless "fix" away from being deleted as an outlier.
    const preserved = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN].flatMap((report) =>
      report.districts.filter(
        (d) =>
          d.population.total.kind === 'known' &&
          d.population.total.value === 0 &&
          d.villagesAffected.kind === 'unknown',
      ),
    );
    expect(preserved.length).toBeGreaterThan(20);
  });
});

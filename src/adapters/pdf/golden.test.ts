/**
 * Golden-file test against the real 2026-07-27 ASDMA bulletin (PRD §9, §10.2).
 *
 * This is the test that makes the rest of the adapter credible: everything
 * else runs on geometry we invented, and invented geometry cannot tell you
 * that DRIMS right-aligns one animal column and left-aligns the one beside it.
 *
 * The expected figures are Appendix B of the PRD, which was written from the
 * PDF by hand. If DRIMS changes its layout, this fails — loudly, which is the
 * whole mitigation for the top risk in §9.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { isKnown, valueOf, type Quantity } from '../../domain/shared/quantity';
import type { FloodSituationReport } from '../../domain/shared/flood-situation-report';
import {
  ASSAM_DISTRICT_COUNT,
  DRIMS_SECTION_CATALOGUE,
  MAX_DISTRICT_NAME_LENGTH,
} from './document-integrity';
import { createPdfBulletinSource } from './pdf-bulletin-source';
import { createSectionAssembler } from './section-assembler';
import { createPdfJsLoader, type PdfJsModule } from './pdfjs-loader';

const fixturePath = (stamp: string): string =>
  path.resolve(import.meta.dirname, `../../../fixtures/Daily_Flood_Report_${stamp}.pdf`);

const parseFixture = async (
  stamp: string,
  assembler?: ReturnType<typeof createSectionAssembler>,
): Promise<FloodSituationReport> => {
  // The legacy build is the one that runs outside a browser.
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  const bytes = await readFile(fixturePath(stamp));
  const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs), assembler });
  return source.parse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
};

const loadReport = async (): Promise<FloodSituationReport> => parseFixture('20260727');

const numberOf = <U extends string>(q: Quantity<U>): number | undefined => valueOf(q);

const sumKnown = <U extends string>(quantities: readonly Quantity<U>[]): number =>
  quantities.filter(isKnown).reduce((acc, q) => acc + q.value, 0);

describe('golden file — Daily_Flood_Report_20260727.pdf', () => {
  let report: FloodSituationReport;

  beforeAll(async () => {
    report = await loadReport();
  }, 60_000);

  it('identifies the bulletin and its date', () => {
    expect(report.reportDate).toBe('2026-07-27');
    expect(report.generatedAt).toBe('27-07-2026 09:49 PM');
    // Content hash: the same file always yields the same id (PRD §5.6).
    expect(report.bulletinId).toMatch(/^[0-9a-f]{64}$/);
  });

  describe('Appendix B — statewide baseline', () => {
    it('population affected: 445,495', () => {
      expect(numberOf(report.statewideTotals.populationAffected)).toBe(445495);
    });

    it('villages affected: 631', () => {
      expect(numberOf(report.statewideTotals.villagesAffected)).toBe(631);
    });

    it('revenue circles affected: 21', () => {
      expect(numberOf(report.statewideTotals.revenueCirclesAffected)).toBe(21);
    });

    it('districts affected: 6', () => {
      expect(numberOf(report.statewideTotals.districtsAffected)).toBe(6);
    });

    it('camp inmates: 28,695', () => {
      expect(numberOf(report.statewideTotals.campInmates)).toBe(28695);
    });

    it('non-camp inmates: 51,777', () => {
      expect(numberOf(report.statewideTotals.nonCampInmates)).toBe(51777);
    });

    it('relief camps: 90 — and distribution centres are NOT folded into them', () => {
      expect(numberOf(report.statewideTotals.reliefCamps)).toBe(90);
    });

    it('relief distribution centres: 94', () => {
      expect(numberOf(report.statewideTotals.reliefDistributionCentres)).toBe(94);
    });

    it('crop area submerged: 37,139.52 Hect., stored unrounded', () => {
      expect(numberOf(report.statewideTotals.cropAreaSubmerged)).toBe(37139.52);
      expect(report.statewideTotals.cropAreaSubmerged).toMatchObject({ unit: 'Hect' });
    });

    it('rice distributed: 1,191.092 Q', () => {
      expect(sumKnown(report.districts.map((d) => d.relief.rice))).toBeCloseTo(1191.092, 6);
      for (const district of report.districts) {
        expect(district.relief.rice.unit).toBe('Q');
      }
    });

    it('boats deployed: 67', () => {
      expect(sumKnown(report.districts.map((d) => d.rescue.boats))).toBe(67);
    });

    it('animals affected: 256,334', () => {
      const total = report.districts.flatMap((d) => [
        d.animals.affected.big,
        d.animals.affected.small,
        d.animals.affected.poultry,
      ]);
      expect(sumKnown(total)).toBe(256334);
    });

    it('animals washed away: 26,679 — a different event from affected', () => {
      const total = report.districts.flatMap((d) => [
        d.animals.washedAway.big,
        d.animals.washedAway.small,
        d.animals.washedAway.poultry,
      ]);
      expect(sumKnown(total)).toBe(26679);
    });

    it('medical teams: 179', () => {
      expect(sumKnown(report.districts.map((d) => d.rescue.medicalTeams))).toBe(179);
    });

    it('houses fully/severely damaged: 176, partially: 4,765', () => {
      const fully = report.districts.flatMap((d) => [
        d.houses.fullySeverelyKuccha,
        d.houses.fullySeverelyPukka,
      ]);
      const partially = report.districts.flatMap((d) => [
        d.houses.partiallyKuccha,
        d.houses.partiallyPukka,
      ]);
      expect(sumKnown(fully)).toBe(176);
      expect(sumKnown(partially)).toBe(4765);
    });

    it('confirmed flood deaths: 0, missing: 0 — reported as zero, not unknown', () => {
      for (const district of report.districts) {
        expect(district.casualties.floodDeaths).toEqual({ kind: 'known', unit: 'count', value: 0 });
        expect(district.casualties.missing).toEqual({ kind: 'known', unit: 'count', value: 0 });
      }
      // The type carries no `total`: flood deaths and drownings cannot be summed.
      expect(report.districts[0]!.casualties).not.toHaveProperty('total');
    });

    it('rivers above DL: Dhansiri (S); above HFL: none, because ASDMA printed Nil', () => {
      expect(report.rivers.aboveDangerLevel).toEqual(['Dhansiri (S) (Numaligarh)']);
      expect(report.rivers.aboveHighestFloodLevel).toEqual([]);
    });
  });

  describe('the districts', () => {
    it('has all eight reporting districts, including the two that are quiet', () => {
      expect(report.districts.map((d) => d.district).sort()).toEqual([
        'Charaideo',
        'Dhemaji',
        'Dibrugarh',
        'Golaghat',
        'Jorhat',
        'Kamrup (M)',
        'Nagaon',
        'Sivasagar',
      ]);
    });

    it('reads Sivasagar, the worst affected, in full', () => {
      const sivasagar = report.districts.find((d) => d.district === 'Sivasagar')!;
      expect(numberOf(sivasagar.population.total)).toBe(144461);
      expect(numberOf(sivasagar.population.male)).toBe(67831);
      expect(numberOf(sivasagar.population.female)).toBe(61163);
      expect(numberOf(sivasagar.population.children)).toBe(15467);
      expect(numberOf(sivasagar.villagesAffected)).toBe(232);
      expect(numberOf(sivasagar.reliefCamps)).toBe(58);
      expect(numberOf(sivasagar.reliefDistributionCentres)).toBe(59);
      expect(numberOf(sivasagar.campInmates.total)).toBe(24695);
      expect(numberOf(sivasagar.nonCampInmates.total)).toBe(45462);
      expect(numberOf(sivasagar.cropAreaSubmerged)).toBe(13413.5);
    });

    it('tells reported-zero apart from not-reported within a single district', () => {
      // Dhemaji is the sharpest illustration of the distinction the whole ACL
      // exists to protect (PRD §3.3). It appears in the Population section with
      // an explicit 0 — reported and quiet. It does NOT appear in the Villages
      // Affected section at all, which lists only the six affected districts
      // (Sivasagar 232, Golaghat 111, Charaideo 149, Jorhat 108, Nagaon 30,
      // Kamrup (M) 1, Total 631). Manufacturing a zero from that absent row
      // would be inventing a fact ASDMA did not report.
      const dhemaji = report.districts.find((d) => d.district === 'Dhemaji')!;
      expect(dhemaji.population.total).toEqual({ kind: 'known', unit: 'count', value: 0 });
      expect(dhemaji.villagesAffected).toEqual({ kind: 'unknown', unit: 'count' });
    });

    it('reassembles the district name that wraps across two printed lines', () => {
      const kamrup = report.districts.find((d) => d.district === 'Kamrup (M)')!;
      expect(numberOf(kamrup.cropAreaSubmerged)).toBe(0.9);
      expect(kamrup.revenueCircles.map((c) => c.circle)).toEqual(['Dispur']);
    });

    it('collapses the repeated rescue agencies of Sivasagar to a set', () => {
      const sivasagar = report.districts.find((d) => d.district === 'Sivasagar')!;
      // The source lists "Local People" four times and "SDRF" three times.
      expect(new Set(sivasagar.rescue.agencies).size).toBe(sivasagar.rescue.agencies.length);
      expect(sivasagar.rescue.agencies).toContain('Local People');
      expect(sivasagar.rescue.agencies).toContain('NDRF');
      expect(sivasagar.rescue.agencies).toContain('Civil Defence/Trained Volunteers');
    });
  });

  describe('revenue circles — the unit of operational decision-making', () => {
    it('finds all 21 affected circles across the eight districts', () => {
      const circles = report.districts.flatMap((d) =>
        d.revenueCircles.map((c) => `${d.district}/${c.circle}`),
      );
      // Every circle named anywhere in the bulletin, including the quiet ones.
      expect(circles.length).toBeGreaterThanOrEqual(21);
      expect(circles).toContain('Sivasagar/Sonari RC part');
      expect(circles).toContain('Charaideo/Sonari');
    });

    it('reads the inline breakdown of villages for Sivasagar', () => {
      const sivasagar = report.districts.find((d) => d.district === 'Sivasagar')!;
      const byName = new Map(sivasagar.revenueCircles.map((c) => [c.circle as string, c]));
      expect(numberOf(byName.get('Nazira')!.villagesAffected)).toBe(41);
      expect(numberOf(byName.get('Demow')!.villagesAffected)).toBe(24);
      expect(numberOf(byName.get('Sivsagar')!.villagesAffected)).toBe(114);
      expect(numberOf(byName.get('Amguri')!.villagesAffected)).toBe(46);
      expect(numberOf(byName.get('Sonari RC part')!.villagesAffected)).toBe(7);
    });

    it('reads the compound breakdown, float noise and all', () => {
      const jorhat = report.districts.find((d) => d.district === 'Jorhat')!;
      const west = jorhat.revenueCircles.find((c) => c.circle === 'Jorhat West')!;
      expect(numberOf(west.populationAffected)).toBe(41931);
      // Unrounded, exactly as DRIMS published it.
      expect(numberOf(west.cropAreaSubmerged)).toBe(2025.9200000000003);
    });
  });

  describe('infrastructure damage', () => {
    it('produces no entity for a district whose row reads Nil', () => {
      const names = report.infrastructureDamage.map((d) => d.name.toLowerCase());
      expect(names).not.toContain('nil');
      expect(report.infrastructureDamage.length).toBeGreaterThan(0);
    });

    it('records no embankment damage at all, because both sections are entirely Nil', () => {
      // On 2026-07-27 ASDMA prints a stated total of 0 and a `Nil` row for
      // every circle in BOTH the Embankment Breached and the Embankment
      // Affected tables. `Nil` in a name column means "no such item"
      // (PRD §5.4 invariant 3), so neither class produces an entity. The two
      // remain separate `DamageClass` values in the published language
      // precisely so that a bulletin which breaches an embankment can never be
      // rendered alongside one that merely damages it.
      const classes = new Set(report.infrastructureDamage.map((d) => d.damageClass));
      expect(classes.has('embankment-breached')).toBe(false);
      expect(classes.has('embankment-affected')).toBe(false);
      expect([...classes].sort()).toEqual(['other', 'road']);
      // Both sections were nonetheless read, and read cleanly.
      const byKind = new Map(report.provenance.map((p) => [p.kind, p.confidence]));
      expect(byKind.get('infrastructure-embankment-breached')).toBe('high');
      expect(byKind.get('infrastructure-embankment-affected')).toBe('high');
    });

    it('reads a road damage item with its coordinate rejoined across the line break', () => {
      const road = report.infrastructureDamage.find((d) => d.name === 'Thukubill Satra Road');
      expect(road).toBeDefined();
      expect(road!.damageClass).toBe('road');
      expect(road!.district).toBe('Charaideo');
      expect(road!.department).toBe('PWD (Roads)');
      expect(road!.coordinate).toEqual({
        kind: 'precise',
        longitude: 95.032543,
        latitude: 27.015787,
      });
    });
  });

  describe('provenance and confidence', () => {
    it('recognises all 22 sections plus Remarks', () => {
      expect(report.provenance.map((p) => p.kind)).toEqual([
        'rivers-above-danger-level',
        'districts-affected',
        'revenue-circles-affected',
        'villages-affected',
        'population-and-crop-area-submerged',
        'relief-camps-opened',
        'inmates-in-relief-camps',
        'non-camp-inmates',
        'lives-lost-confirmed',
        'lives-lost-missing',
        'animals-affected',
        'animals-washed-away',
        'houses-damaged',
        'houses-damaged-others',
        'rescue-operation',
        'relief-distributed',
        'relief-distributed-others',
        'infrastructure-road',
        'infrastructure-bridge',
        'infrastructure-embankment-breached',
        'infrastructure-embankment-affected',
        'infrastructure-others',
        'remarks',
      ]);
    });

    it('records the source pages of every section — provenance is not optional', () => {
      for (const section of report.provenance) {
        expect(section.sourcePages.length).toBeGreaterThan(0);
      }
      const byKind = new Map(report.provenance.map((p) => [p.kind, p.sourcePages]));
      // Appendix A: the road section spans pages 5-10.
      expect(byKind.get('infrastructure-road')).toEqual([5, 6, 7, 8, 9]);
      expect(byKind.get('houses-damaged')).toEqual([3, 4]);
      expect(byKind.get('remarks')).toEqual([30, 31]);
    });

    it('reconciles every stated Total against our own sum, with nothing left over', () => {
      expect(report.reconciliationFailures).toEqual([]);
      expect(report.provenance.every((p) => p.confidence === 'high')).toBe(true);
    });
  });

  describe('the derived figures the PRD promises (§4.5)', () => {
    it('supports the headline gap: 445,495 - 28,695 - 51,777 = 365,023 unsheltered', () => {
      const affected = numberOf(report.statewideTotals.populationAffected)!;
      const camp = numberOf(report.statewideTotals.campInmates)!;
      const nonCamp = numberOf(report.statewideTotals.nonCampInmates)!;
      expect(affected - camp - nonCamp).toBe(365023);
    });

    it('supports camp load: 28,695 / 90 = 319 per camp', () => {
      const camp = numberOf(report.statewideTotals.campInmates)!;
      const camps = numberOf(report.statewideTotals.reliefCamps)!;
      expect(Math.round(camp / camps)).toBe(319);
    });

    it('supports ration coverage: 1,191.09 Q at 0.6 kg/person/day = 6.9 days', () => {
      const rice = sumKnown(report.districts.map((d) => d.relief.rice));
      const inmates = numberOf(report.statewideTotals.campInmates)!;
      expect((rice * 100) / (inmates * 0.6)).toBeCloseTo(6.9, 1);
    });
  });
});

// ---------------------------------------------------------------------------
// The cross-bulletin suite
// ---------------------------------------------------------------------------

/**
 * Six real bulletins, not one.
 *
 * Pinning a single golden file proved to be pinning a single *layout*. DRIMS
 * sizes the Particulars gutter to its widest label, so the channel between the
 * gutter and the District column is 1.6pt on 27 July and 0.3pt on the 20th; a
 * parser tuned to the first silently read the District column as a section
 * label on the 25th and 26th, found 2 of 23 sections, invented districts out
 * of Remarks prose — and reported `confidence: high` throughout. One fixture
 * could not have caught that, and no amount of care within one fixture would
 * have.
 *
 * So every bulletin we have is parsed here, and each is held to the same five
 * questions the completeness invariant asks. The detailed 27 July assertions
 * above (PRD Appendix B) stay exactly as they were.
 *
 * PROVENANCE OF THE EXPECTED FIGURES. Every number below was read out of the
 * PDF's own `Total` row via the text layer, WITHOUT this parser — the rows were
 * dumped by clustering pdf.js runs into visual lines and printing the lines
 * beginning `Total`, then transcribed here. So, for 2026-07-25:
 *
 *   p1  "Total 28"                                    -> revenue circles
 *   p1  "Total 810"                                   -> villages
 *   p2  "Total 297010 267803 90025 654838 34970.8"    -> male female children
 *                                                        POPULATION crop area
 *   p2  "Total 274 90 184"                            -> total camps CENTRES
 *   p3  "Total 18902 8626 7884 2157 187 48"           -> CAMP INMATES ...
 *   p3  "Total 123114 56021 48509 18584 3383 ..."     -> NON-CAMP INMATES ...
 *   p3  "Total 4 4 0 3 1 0 0 0"                       -> total FLOOD DEATHS
 *                                                        general drownings ...
 *
 * and `districtsAffected` from the `No. of Districts Affected` cell on page 1
 * ("10 Golaghat, Charaideo, Kamrup, Hojai, ..."). Nothing here was taken from
 * parser output, so a parser that agrees is evidence and not a tautology.
 */
type ExpectedBulletin = {
  readonly stamp: string;
  readonly reportDate: string;
  readonly generatedAt: string;
  readonly districtsAffected: number;
  readonly revenueCirclesAffected: number;
  readonly villagesAffected: number;
  readonly populationAffected: number;
  readonly cropAreaSubmerged: number;
  readonly reliefCamps: number;
  readonly reliefDistributionCentres: number;
  readonly campInmates: number;
  readonly nonCampInmates: number;
  readonly floodDeaths: number;
  /**
   * Districts named ANYWHERE in the bulletin, which is always at least
   * `districtsAffected`: the later sections also list quiet districts that
   * report explicit zeros. See the note on 20 and 21 July below.
   */
  readonly districtsNamed: number;
};

const BULLETINS: readonly ExpectedBulletin[] = [
  {
    stamp: '20260720',
    reportDate: '2026-07-20',
    generatedAt: '27-07-2026 03:37 PM',
    districtsAffected: 16,
    revenueCirclesAffected: 45,
    villagesAffected: 794,
    populationAffected: 362933,
    cropAreaSubmerged: 19099.5944,
    reliefCamps: 50,
    reliefDistributionCentres: 52,
    campInmates: 9697,
    nonCampInmates: 34905,
    floodDeaths: 5,
    // 16 affected + Sribhumi and Bongaigaon reporting zeros, + 5 fragments of
    // two district names that wrap in the narrow District column. See
    // "the wrapped district name" below: a KNOWN and pre-existing defect,
    // pinned here rather than hidden.
    districtsNamed: 23,
  },
  {
    stamp: '20260721',
    reportDate: '2026-07-21',
    generatedAt: '27-07-2026 03:40 PM',
    districtsAffected: 16,
    revenueCirclesAffected: 44,
    villagesAffected: 872,
    populationAffected: 564660,
    cropAreaSubmerged: 24210.35,
    reliefCamps: 72,
    reliefDistributionCentres: 202,
    campInmates: 12375,
    nonCampInmates: 100318,
    floodDeaths: 21,
    districtsNamed: 20,
  },
  {
    stamp: '20260722',
    reportDate: '2026-07-22',
    generatedAt: '27-07-2026 01:59 PM',
    districtsAffected: 11,
    revenueCirclesAffected: 40,
    villagesAffected: 939,
    populationAffected: 653164,
    cropAreaSubmerged: 24897.27,
    reliefCamps: 106,
    reliefDistributionCentres: 381,
    campInmates: 24418,
    nonCampInmates: 290826,
    floodDeaths: 9,
    districtsNamed: 13,
  },
  {
    stamp: '20260725',
    reportDate: '2026-07-25',
    generatedAt: '27-07-2026 02:14 PM',
    districtsAffected: 10,
    revenueCirclesAffected: 28,
    villagesAffected: 810,
    populationAffected: 654838,
    cropAreaSubmerged: 34970.8,
    reliefCamps: 90,
    reliefDistributionCentres: 184,
    campInmates: 18902,
    nonCampInmates: 123114,
    floodDeaths: 4,
    districtsNamed: 12,
  },
  {
    stamp: '20260726',
    reportDate: '2026-07-26',
    generatedAt: '26-07-2026 11:53 PM',
    districtsAffected: 9,
    revenueCirclesAffected: 24,
    villagesAffected: 763,
    populationAffected: 524733,
    cropAreaSubmerged: 48742.09,
    reliefCamps: 109,
    reliefDistributionCentres: 245,
    campInmates: 37724,
    nonCampInmates: 153833,
    floodDeaths: 2,
    districtsNamed: 9,
  },
  {
    stamp: '20260727',
    reportDate: '2026-07-27',
    generatedAt: '27-07-2026 09:49 PM',
    districtsAffected: 6,
    revenueCirclesAffected: 21,
    villagesAffected: 631,
    populationAffected: 445495,
    cropAreaSubmerged: 37139.52,
    reliefCamps: 90,
    reliefDistributionCentres: 94,
    campInmates: 28695,
    nonCampInmates: 51777,
    floodDeaths: 0,
    districtsNamed: 8,
  },
];

describe.each(BULLETINS)('bulletin $reportDate', (expected) => {
  let report: FloodSituationReport;

  beforeAll(async () => {
    report = await parseFixture(expected.stamp);
  }, 60_000);

  it('is dated from its own masthead', () => {
    expect(report.reportDate).toBe(expected.reportDate);
    expect(report.generatedAt).toBe(expected.generatedAt);
    expect(report.bulletinId).toMatch(/^[0-9a-f]{64}$/);
  });

  it('recognises every one of the 23 DRIMS sections', () => {
    // The invariant that 25 and 26 July broke, and broke silently: they yielded
    // `districts-affected` and `remarks` and nothing else.
    expect(report.provenance.map((p) => p.kind).sort()).toEqual([...DRIMS_SECTION_CATALOGUE].sort());
    for (const section of report.provenance) {
      expect(section.sourcePages.length).toBeGreaterThan(0);
    }
  });

  it('is healthy: every section high, and nothing left to reconcile', () => {
    expect(report.reconciliationFailures).toEqual([]);
    expect(report.provenance.every((p) => p.confidence === 'high')).toBe(true);
  });

  it('names a possible number of districts, with names that are names', () => {
    expect(report.districts.length).toBeGreaterThan(0);
    expect(report.districts.length).toBeLessThanOrEqual(ASSAM_DISTRICT_COUNT);
    expect(report.districts).toHaveLength(expected.districtsNamed);
    for (const district of report.districts) {
      // 26 July produced a "district" of 453 characters made of Remarks prose.
      expect(district.district.length).toBeLessThanOrEqual(MAX_DISTRICT_NAME_LENGTH);
      expect(district.district).not.toMatch(/[.;:!?]/);
    }
  });

  it('states the statewide totals ASDMA printed in its Total rows', () => {
    const totals = report.statewideTotals;
    expect(numberOf(totals.populationAffected)).toBe(expected.populationAffected);
    expect(numberOf(totals.districtsAffected)).toBe(expected.districtsAffected);
    expect(numberOf(totals.revenueCirclesAffected)).toBe(expected.revenueCirclesAffected);
    expect(numberOf(totals.villagesAffected)).toBe(expected.villagesAffected);
    expect(numberOf(totals.cropAreaSubmerged)).toBe(expected.cropAreaSubmerged);
    expect(numberOf(totals.reliefCamps)).toBe(expected.reliefCamps);
    expect(numberOf(totals.reliefDistributionCentres)).toBe(expected.reliefDistributionCentres);
    expect(numberOf(totals.campInmates)).toBe(expected.campInmates);
    expect(numberOf(totals.nonCampInmates)).toBe(expected.nonCampInmates);
  });

  it('sums the district flood deaths to the figure ASDMA totals', () => {
    // Never added to general drownings — the type has no `total` (PRD §4.2).
    expect(sumKnown(report.districts.map((d) => d.casualties.floodDeaths))).toBe(
      expected.floodDeaths,
    );
  });

  it('never states a headline figure it did not read', () => {
    // ADR-0005 at the top level: the one number every DRIMS bulletin carries
    // must be present and must have come from the page, not from a default.
    expect(report.statewideTotals.populationAffected.kind).toBe('known');
    expect(numberOf(report.statewideTotals.populationAffected)).toBeGreaterThan(0);
  });
});

/**
 * The regression test for the failure itself, and the one that must survive the
 * fix.
 *
 * The bug was not "25 July parses wrongly" — it was "a bulletin can yield 2 of
 * 23 sections and still present as a healthy report". Fixing the geometry stops
 * these two files from triggering it and proves nothing about the next layout
 * DRIMS ships. So the fault is reproduced deliberately, by handing the real
 * PDFs the gutter the parser used to derive (`FALLBACK_BODY_START`, 74pt, which
 * on these two bulletins sits RIGHT of the District column), and the assertion
 * is that the parse is now refused rather than published.
 *
 * If someone weakens the completeness invariant, this fails.
 */
describe('a bulletin read with a mislocated Particulars gutter', () => {
  const MISLOCATED_GUTTER = 74;

  describe.each(['20260725', '20260726'])('%s', (stamp) => {
    let husk: FloodSituationReport;

    beforeAll(async () => {
      husk = await parseFixture(
        stamp,
        createSectionAssembler({ bodyStart: MISLOCATED_GUTTER }),
      );
    }, 60_000);

    it('still finds only 2 of the 23 sections — the fault is genuinely reproduced', () => {
      const read = husk.provenance.filter((p) => p.sourcePages.length > 0);
      expect(read.map((p) => p.kind).sort()).toEqual(['districts-affected', 'remarks']);
    });

    it('reconciliation is STILL silent about it — this is the design gap', () => {
      // Reconciliation validates within the sections it found. It has, and can
      // have, no opinion about the twenty-one it did not. This assertion is
      // here so that the reason the completeness invariant exists cannot be
      // quietly forgotten.
      expect(husk.reconciliationFailures).toEqual([]);
    });

    it('is nonetheless refused: no section is high, and none is silently absent', () => {
      // The check a UI already makes is now a document-level one.
      expect(husk.provenance.every((p) => p.confidence === 'high')).toBe(false);
      expect(husk.provenance.some((p) => p.confidence === 'high')).toBe(false);
      // Provenance is exhaustive: a section we never found says so, rather than
      // being missing and therefore invisible.
      expect(husk.provenance).toHaveLength(DRIMS_SECTION_CATALOGUE.length);
      expect(husk.provenance.filter((p) => p.confidence === 'failed')).toHaveLength(
        DRIMS_SECTION_CATALOGUE.length,
      );
    });

    it('keeps the garbage rather than deleting it — unknown is never zero (ADR-0005)', () => {
      // The husk is not repaired and not emptied. It is published, marked
      // untrustworthy, so an operator can see exactly what went wrong.
      expect(husk.districts.length).toBeGreaterThan(0);
      expect(husk.statewideTotals.populationAffected).toEqual({ kind: 'unknown', unit: 'count' });
      expect(husk.districts.some((d) => d.district.length > MAX_DISTRICT_NAME_LENGTH)).toBe(true);
    });
  });
});

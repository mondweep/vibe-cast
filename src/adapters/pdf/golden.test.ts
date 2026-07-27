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
import { createPdfBulletinSource } from './pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from './pdfjs-loader';

const FIXTURE = path.resolve(
  import.meta.dirname,
  '../../../fixtures/Daily_Flood_Report_20260727.pdf',
);

const loadReport = async (): Promise<FloodSituationReport> => {
  // The legacy build is the one that runs outside a browser.
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  const bytes = await readFile(FIXTURE);
  const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });
  return source.parse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
};

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

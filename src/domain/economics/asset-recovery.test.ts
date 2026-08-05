/**
 * Land, homestead and public infrastructure recovery.
 *
 * The arithmetic is multiplication. What is under test is the discipline: that
 * submerged area is never treated as silted area, that the two tiers cannot be
 * summed into one figure, and that the railway gap is declared rather than
 * quietly excluded.
 */

import { describe, expect, it } from 'vitest';
import {
  BRIDGES_NOT_COSTED,
  MACRO_NOT_COVERED,
  macroRecoveryLines,
  microRecoveryLines,
  sumLines,
} from './asset-recovery';

const micro = microRecoveryLines({ submergedHectares: 56_606.777, householdsAffected: 147_148 });
const macro = macroRecoveryLines({
  roads: 649,
  bridges: 9,
  embankmentsBreached: 57,
  embankmentsAffected: 134,
  other: 3931,
});

describe('micro — land and homestead restoration', () => {
  it('costs clearance, de-silting and land loss as three separate things', () => {
    expect(micro.map((l) => l.label)).toEqual([
      'Homestead silt clearance',
      'Agricultural land de-silting',
      'Land lost to sand casting or channel change',
    ]);
    for (const l of micro) expect(l.tier).toBe('micro');
  });

  it('never treats submerged area as silted area', () => {
    // The easiest mistake on this view, and the most expensive. If the share
    // assumption were ever removed, de-silting would cost 5x what it should.
    const desilting = micro.find((l) => l.label.includes('de-silting'))!;
    const share = desilting.derivation.inputs.find((i) => i.label.includes('clearable deposit'));

    expect(share?.kind).toBe('assumed');
    expect(share?.kind === 'assumed' && share.value).toBeLessThan(0.5);
    expect(share?.kind === 'assumed' && share.reason).toMatch(/SUBMERGED IS NOT SILTED/);
    // 56,607 Ha at 20% and Rs 18,000/Ha is about Rs 20 crore, not Rs 102 crore.
    expect(desilting.interval.central).toBeLessThan(56_606.777 * 18_000 * 0.5);
  });

  it('prices land loss well above de-silting, as the schedule does', () => {
    // The SDRF pays Rs 47,000/Ha for land lost against Rs 18,000/Ha for
    // de-silting. Land that cannot be cleared back into use is a different and
    // worse event, and the rates say so.
    const desilt = micro.find((l) => l.label.includes('de-silting'))!;
    const lost = micro.find((l) => l.label.includes('sand casting'))!;
    const rateOf = (l: typeof desilt) =>
      l.derivation.inputs.find((i) => i.kind === 'published')!.value;

    expect(rateOf(lost)).toBeGreaterThan(rateOf(desilt) * 2);
  });

  it('cites the SDRF rate for de-silting rather than constructing one', () => {
    // The one part of the model where the rate needs no assumption at all.
    const desilting = micro.find((l) => l.label.includes('de-silting'))!;
    const published = desilting.derivation.inputs.find((i) => i.kind === 'published');

    expect(published?.kind === 'published' && published.citation.reference).toMatch(
      /33-03\/2020-NDM-I/,
    );
    expect(published?.value).toBe(18_000);
  });
});

describe('macro — public infrastructure', () => {
  it('costs each asset class the bulletin distinguishes AND a rate exists for', () => {
    // Bridges and culverts are absent by design, not by oversight. See below.
    expect(macro.map((l) => l.label)).toEqual([
      'Roads',
      'Embankments breached and affected',
      'Schools, anganwadi, water supply, power and other assets',
    ]);
    for (const l of macro) expect(l.tier).toBe('macro');
  });

  it('refuses to price bridges and culverts rather than reusing the road rate', () => {
    // This line existed and produced ₹3.24 lakh for every damaged bridge and
    // culvert in Assam, because the ceiling applied per bridge was ₹60,000 —
    // the identical constant the road line uses, where the SDRF states it per
    // KILOMETRE. Under it a bridge whose remark reads "Washed away" cost
    // ₹36,000. There is no per-bridge ceiling to substitute: the SDRF folds the
    // work into the road item, so a separate figure would either invent a rate
    // or charge twice. ADR-0011 settles it.
    expect(macro.some((l) => /bridge|culvert/i.test(l.label))).toBe(false);

    expect(BRIDGES_NOT_COSTED).toMatch(/deliberately NOT costed/);
    expect(BRIDGES_NOT_COSTED).toMatch(/no .*per-bridge ceiling/);
    // The reader must be told what the missing number is worth, not just that
    // it is missing — "crores" against a tier subtotal of tens of crores.
    expect(BRIDGES_NOT_COSTED).toMatch(/crores/);
  });

  it('never lets the road per-kilometre rate be reused as a per-unit ceiling', () => {
    // The defect in general form. A per-km rate and a per-unit ceiling are
    // different quantities, and the way this went wrong was one constant used
    // as both. Nothing costed per unit may carry the road rate's value.
    const roads = macro.find((l) => l.label === 'Roads')!;
    const perKm = roads.derivation.inputs.find((i) => i.unit === '₹/km');
    expect(perKm?.value).toBeDefined();

    for (const l of macro) {
      if (l.label === 'Roads') continue;
      const perUnit = l.derivation.inputs.filter((i) => i.unit === '₹/unit');
      for (const rate of perUnit) expect(rate.value).not.toBe(perKm!.value);
    }
  });

  it('treats the SDRF per-unit figure as a ceiling, not a flat payment', () => {
    // "as per actual, subject to a ceiling of Rs 2.00 lakh". Applying the
    // ceiling to every damaged item would overstate the whole tier.
    const other = macro.find((l) => l.label.startsWith('Schools'))!;
    const share = other.derivation.inputs.find((i) => i.label.includes('ceiling actually needed'));

    expect(share?.kind === 'assumed' && share.value).toBeLessThan(1);
    expect(share?.kind === 'assumed' && share.reason).toMatch(/CEILING/);
  });

  it('prices road length from what the archive states, not from judgement', () => {
    const roads = macro.find((l) => l.label === 'Roads')!;
    const km = roads.derivation.inputs.find((i) => i.label.includes('damaged length'));

    expect(km?.kind === 'assumed' && km.reason).toMatch(/MEASURED FROM THE ARCHIVE/);

    // The measured median of the 200 road records that state a length is
    // 1.15 km. The central value must sit below it — the discount for the
    // stated subset skewing towards serious failures — but inside the bounds,
    // which are the measured quartiles.
    const MEASURED_MEDIAN = 1.15;
    expect(km?.kind === 'assumed' && km.value).toBeLessThan(MEASURED_MEDIAN);
    expect(km?.kind === 'assumed' && km.low).toBeLessThan(MEASURED_MEDIAN);
    expect(km?.kind === 'assumed' && km.high).toBeGreaterThan(MEASURED_MEDIAN);
    // The reason must show its working, or the reader cannot check the discount.
    expect(km?.kind === 'assumed' && km.reason).toMatch(/median 1\.15 km/);
    expect(km?.kind === 'assumed' && km.reason).toMatch(/200 of the 645 road records/);
  });

  it('declares the railway gap rather than quietly excluding it', () => {
    // A public-infrastructure figure that silently omits the railway is not a
    // public-infrastructure figure.
    expect(MACRO_NOT_COVERED).toMatch(/four mention a railway/);
    expect(MACRO_NOT_COVERED).toMatch(/absent from the source rather than small/);
    expect(MACRO_NOT_COVERED).toMatch(/National Highways/);
  });

  it('omits a class entirely when the bulletin did not report it', () => {
    const none = macroRecoveryLines({
      roads: undefined,
      bridges: undefined,
      embankmentsBreached: undefined,
      embankmentsAffected: undefined,
      other: undefined,
    });

    expect(none).toEqual([]);
  });
});

describe('the two tiers', () => {
  it('sum within a tier and are never combined into one figure', () => {
    // There is no `sumAll`. An appeal that adds a road to a family's home
    // produces a figure where the two are interchangeable.
    const m = sumLines(micro);
    const M = sumLines(macro);

    expect(m.central).toBeGreaterThan(0);
    expect(M.central).toBeGreaterThan(0);
    expect(m.low).toBeLessThan(m.central);
    expect(M.high).toBeGreaterThan(M.central);
  });

  it('sums to nothing for no lines, rather than throwing', () => {
    expect(sumLines([])).toEqual({ low: 0, central: 0, high: 0 });
  });
});

describe('what the macro rates actually buy', () => {
  it('says plainly that they are restoration, not reconstruction', async () => {
    // The SDRF chapter is headed "Repair/Restoration (Immediate Nature)" and
    // its items are diversions and temporary approach repair. Calling the
    // subtotal reconstruction would overstate what is funded and understate
    // what is still needed.
    const { MACRO_IS_RESTORATION_NOT_RECONSTRUCTION } = await import('./asset-recovery');

    expect(MACRO_IS_RESTORATION_NOT_RECONSTRUCTION).toMatch(/RESTORATION figures, not reconstruction/);
    expect(MACRO_IS_RESTORATION_NOT_RECONSTRUCTION).toMatch(/Immediate Nature/);
    expect(MACRO_IS_RESTORATION_NOT_RECONSTRUCTION).toMatch(/would cost considerably more/);
  });
});

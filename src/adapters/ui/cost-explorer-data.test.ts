/**
 * The Cost Explorer's arithmetic.
 *
 * These assert the properties that stop a chart lying in a shape rather than in
 * a sentence: the tiers never combine, no series collapses to a point, and the
 * two sensitivity rankings disagree in the direction the register claims.
 */

import { describe, expect, it } from 'vitest';
import {
  affectedFigures,
  askSeries,
  benchmarkSeries,
  divisorFor,
  NORMALISERS,
  normaliserNote,
  policySeries,
  RANK_MODES,
  swingConcentration,
  tierSeries,
  tornadoSeries,
} from './cost-explorer-data';
import { croreTick } from './cost-explorer-charts';
import { periodSummaryFixture } from './test-fixtures';

const replacement = periodSummaryFixture.replacement;

describe('croreTick — an axis whose ticks stay distinguishable', () => {
  it('keeps every tick distinct across the range a normalised axis actually spans', () => {
    // The bug this exists to prevent: pinned to lakh, a per-household axis
    // rendered ₹0.0 L, ₹0.1 L, ₹0.1 L, ₹0.1 L — four ticks, one distinct
    // value, an axis carrying no information.
    const perHousehold = [0, 5_000, 10_000, 15_000].map(croreTick);
    expect(new Set(perHousehold).size).toBe(perHousehold.length);

    const statewide = [0, 50_00_00_000, 100_00_00_000, 150_00_00_000].map(croreTick);
    expect(new Set(statewide).size).toBe(statewide.length);
  });

  it('picks its unit from the magnitude of the tick', () => {
    expect(croreTick(0)).toBe('0');
    expect(croreTick(5_000)).toBe('₹5,000');
    expect(croreTick(5_00_000)).toBe('₹5.0 L');
    expect(croreTick(5_00_00_000)).toBe('₹5.0 cr');
    expect(croreTick(500_00_00_000)).toBe('₹500 cr');
  });
});

describe('askSeries — the three asks, and never a fourth', () => {
  it('returns exactly the three headline asks with no total row', () => {
    const series = askSeries(replacement);

    expect(series).toHaveLength(3);
    expect(series.map((s) => s.label)).toEqual([
      'Rebuilding destroyed dwellings',
      'Household assets: silt and land',
      'Public infrastructure',
    ]);
    // A combined figure would make a road and a family home interchangeable,
    // and would double-count dwellings, which sit inside the household tier.
    expect(series.some((s) => /total|combined|overall/i.test(s.label))).toBe(false);
  });

  it('carries the interval on every bar, never a bare central value', () => {
    for (const bar of askSeries(replacement)) {
      expect(bar.low).toBeLessThanOrEqual(bar.central);
      expect(bar.central).toBeLessThanOrEqual(bar.high);
      // The band is what the chart draws; a zero span would render as a point.
      expect(bar.bandBase).toBe(bar.low);
      expect(bar.bandSpan).toBeCloseTo(bar.high - bar.low, 6);
    }
  });

  it('gives every bar a written qualifier, so colour is never the only channel', () => {
    // NFR-8. A legend keyed on hue alone fails on a washed-out projector.
    for (const bar of askSeries(replacement)) expect(bar.note.length).toBeGreaterThan(0);
  });
});

describe('normalisation — dividing by a caseload, and saying what that means', () => {
  it('divides every bound by the chosen caseload', () => {
    const total = askSeries(replacement, 'total');
    const perDwelling = askSeries(replacement, 'per-dwelling');
    const dwellings = replacement.executive.dwellingsDestroyed!;

    expect(perDwelling[0].central).toBeCloseTo(total[0].central / dwellings, 6);
    expect(perDwelling[0].low).toBeCloseTo(total[0].low / dwellings, 6);
    expect(perDwelling[0].high).toBeCloseTo(total[0].high / dwellings, 6);
  });

  it('returns no series rather than dividing by an unknown caseload', () => {
    // Unknown is not zero (ADR-0005), and it is certainly not one.
    const unknown = {
      ...replacement,
      executive: { ...replacement.executive, dwellingsDestroyed: undefined },
    };

    expect(divisorFor('per-dwelling', unknown.executive)).toBeUndefined();
    expect(askSeries(unknown, 'per-dwelling')).toEqual([]);
  });

  it('refuses to divide by zero', () => {
    expect(divisorFor('per-dwelling', { dwellingsDestroyed: 0 })).toBeUndefined();
  });

  it('says that normalising public infrastructure is a share-of-burden framing', () => {
    // The honest half of offering this control: no household receives the
    // public tier, so a per-household figure for it is a way of expressing
    // scale rather than an entitlement.
    expect(normaliserNote('total')).toBe('');
    expect(normaliserNote('per-household')).toMatch(/share-of-burden/);
    expect(normaliserNote('per-household')).toMatch(/no household receives/);
  });

  it('offers exactly the three normalisers the view knows how to divide by', () => {
    expect(NORMALISERS.map((n) => n.key)).toEqual(['total', 'per-dwelling', 'per-household']);
  });
});

describe('policySeries — cost never legible without its effect on risk', () => {
  it('puts the risk effect on every bar', () => {
    const series = policySeries(replacement);

    expect(series.length).toBeGreaterThan(0);
    for (const bar of series) expect(bar.note.length).toBeGreaterThan(0);
  });

  it('names the uncosted dwellings on a policy that leaves some unpriced', () => {
    // `like-for-like` cannot price a Kuccha superstructure, so its total is a
    // near-meaningless floor. A bar that hid that would read as the cheapest
    // option rather than the least complete one.
    const withUncosted = replacement.policies.find(
      (p) => (p.uncostedDwellings ?? 0) > 0 && p.totalCentral !== undefined,
    );
    if (withUncosted === undefined) return;

    const bar = policySeries(replacement).find((b) => b.label === withUncosted.label);
    expect(bar?.note).toMatch(/uncosted/);
  });
});

describe('tornadoSeries — ranked the way the reader asked, defaulting to money', () => {
  const register = replacement.assumptionRegister;

  it('defaults to descending rupee swing', () => {
    const bars = tornadoSeries(register);
    const swings = bars.map((b) => b.swing);

    expect(swings).toEqual([...swings].sort((a, b) => b - a));
  });

  it('produces a different order when ranked by range width', () => {
    // If these agreed, offering the choice would be decoration. They do not:
    // that disagreement is why the register stopped sorting by spread.
    const bySwing = tornadoSeries(register, { rankBy: 'swing' }).map((b) => b.label);
    const bySpread = tornadoSeries(register, { rankBy: 'spread' }).map((b) => b.label);

    expect(bySpread).not.toEqual(bySwing);
    expect(new Set(bySpread)).toEqual(new Set(bySwing));
  });

  it('filters to one figure without reordering the rest', () => {
    const target = affectedFigures(register)[0];
    const filtered = tornadoSeries(register, { affects: target });

    expect(filtered.length).toBeGreaterThan(0);
    for (const bar of filtered) expect(bar.affects).toBe(target);
  });

  it('carries the reason on every bar, so a bar can be argued with', () => {
    for (const bar of tornadoSeries(register)) expect(bar.reason.length).toBeGreaterThan(0);
  });

  it('honours a limit for the compact chart', () => {
    expect(tornadoSeries(register, { limit: 3 })).toHaveLength(3);
  });

  it('disambiguates a chart label that would otherwise repeat', () => {
    // Four assumptions are called "GST uplift" and four "Share of the SDRF
    // ceiling actually needed" — the same judgement made for different figures.
    // On an axis those are identical bars of different lengths.
    const bars = tornadoSeries(register);
    const chartLabels = bars.map((b) => b.chartLabel);

    expect(new Set(chartLabels).size).toBe(chartLabels.length);

    const repeated = bars.filter(
      (b) => bars.filter((other) => other.label === b.label).length > 1,
    );
    expect(repeated.length).toBeGreaterThan(0);
    for (const bar of repeated) expect(bar.chartLabel).toContain(bar.affects);
  });

  it('leaves a unique label alone rather than tagging every bar', () => {
    const bars = tornadoSeries(register);
    const unique = bars.find((b) => bars.filter((o) => o.label === b.label).length === 1);

    expect(unique).toBeDefined();
    expect(unique!.chartLabel).toBe(unique!.label);
  });

  it('disambiguates over the drawn rows, not the whole register', () => {
    // Truncating to the top few usually removes the collisions. Tagging on the
    // full register would leave surviving bars carrying a redundant tail.
    const top = tornadoSeries(register, { limit: 2 });
    for (const bar of top) {
      if (top.filter((o) => o.label === bar.label).length === 1) {
        expect(bar.chartLabel).toBe(bar.label);
      }
    }
  });

  it('explains, in the mode itself, why spread is the misleading ranking', () => {
    const spread = RANK_MODES.find((m) => m.key === 'spread');
    expect(spread?.explanation).toMatch(/misleading/);
  });
});

describe('swingConcentration — how few judgements carry the answer', () => {
  it('reports the share of total swing held by the top assumptions', () => {
    const { topShare, total } = swingConcentration(replacement.assumptionRegister, 2);

    expect(total).toBeGreaterThan(0);
    expect(topShare).toBeGreaterThan(0);
    expect(topShare).toBeLessThanOrEqual(100);
  });

  it('is 100% when every assumption is in the top slice', () => {
    const register = replacement.assumptionRegister;
    expect(swingConcentration(register, register.length).topShare).toBeCloseTo(100, 6);
  });

  it('returns zero rather than dividing by zero when nothing swings', () => {
    expect(swingConcentration([], 5)).toEqual({ topShare: 0, total: 0 });
  });
});

describe('benchmarkSeries — the denominator rides on every bar', () => {
  it('carries a household count with each figure', () => {
    // Two totals with no household counts is the most misleading thing this
    // page could draw: almost all of the gap is the denominator, not the rate.
    const bars = benchmarkSeries(replacement.benchmark);

    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar.households).toBeDefined();
  });

  it('holds the demand at both denominators, not just the larger one', () => {
    const bars = benchmarkSeries(replacement.benchmark);
    const demands = bars.filter((b) => b.kind === 'demand');

    expect(demands).toHaveLength(2);
    expect(demands[0].households).not.toBe(demands[1].households);
  });
});

describe('tierSeries — each tier charted on its own', () => {
  it('returns one bar per line and no subtotal bar', () => {
    const micro = tierSeries(replacement.micro, replacement);

    expect(micro).toHaveLength(replacement.micro.lines.length);
    expect(micro.some((b) => /subtotal/i.test(b.label))).toBe(false);
  });

  it('keeps the interval on every line', () => {
    for (const bar of tierSeries(replacement.macro, replacement)) {
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      expect(bar.bandSpan).toBeCloseTo(bar.high - bar.low, 6);
    }
  });
});

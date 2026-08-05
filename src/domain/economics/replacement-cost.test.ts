/**
 * The constructed replacement cost, and the discipline that makes it arguable.
 *
 * The arithmetic is a product of ten numbers. What is under test is ADR-0014:
 * that an assumption without a reason cannot exist, that the interval is
 * computed from the assumption bounds rather than chosen, and that the figure
 * cannot be rendered without saying it was constructed.
 */

import { describe, expect, it } from 'vitest';
import { derivation, evaluate, relativeWidth } from './derivation';
import { KUCCHA_NOT_COSTED, pukkaDwellingReplacement } from './replacement-cost';

const aCitation = {
  publisher: 'PWD', document: 'SOR', reference: 'undated',
  clause: 'Ch-1', source: 'docs/reference/x.pdf', retrievedOn: '2026-08-06',
};

describe('derivation — an assumption a reviewer cannot argue with is not documented', () => {
  it('refuses an assumption with no reason', () => {
    expect(() =>
      derivation({
        formula: 'a',
        inputs: [{ kind: 'assumed', label: 'Floor area', value: 30, unit: 'm²', low: 20, high: 45, reason: '  ' }],
        combine: ([a = 0]) => a,
      }),
    ).toThrow(/no reason/);
  });

  it('refuses an assumption whose value falls outside its own range', () => {
    expect(() =>
      derivation({
        formula: 'a',
        inputs: [{ kind: 'assumed', label: 'Floor area', value: 99, unit: 'm²', low: 20, high: 45, reason: 'x' }],
        combine: ([a = 0]) => a,
      }),
    ).toThrow(/outside its range/);
  });

  it('refuses a derivation with no inputs at all', () => {
    expect(() => derivation({ formula: 'a', inputs: [], combine: () => 1 })).toThrow(/must name its inputs/);
  });
});

describe('evaluate', () => {
  it('holds published inputs fixed and varies only the assumptions', () => {
    // The interval must measure OUR judgement, not general uncertainty. A
    // published rate is not ours to widen.
    const spec = derivation({
      formula: 'quantity × rate',
      inputs: [
        { kind: 'assumed', label: 'Quantity', value: 10, unit: 'ea', low: 5, high: 20, reason: 'r' },
        { kind: 'published', label: 'Rate', value: 100, unit: '₹/ea', citation: aCitation },
      ],
      combine: ([q = 0, r = 0]) => q * r,
    });

    expect(evaluate(spec)).toEqual({ low: 500, central: 1000, high: 2000 });
  });

  it('finds the true bounds even when the formula is not monotonic', () => {
    // a - b is decreasing in b. Assuming monotonicity per input and taking the
    // "low" corner would report a low that is not the lowest.
    const spec = derivation({
      formula: 'a − b',
      inputs: [
        { kind: 'assumed', label: 'a', value: 10, unit: 'x', low: 5, high: 15, reason: 'r' },
        { kind: 'assumed', label: 'b', value: 3, unit: 'x', low: 1, high: 8, reason: 'r' },
      ],
      combine: ([a = 0, b = 0]) => a - b,
    });

    expect(evaluate(spec)).toEqual({ low: -3, central: 7, high: 14 });
  });

  it('is a point when nothing is assumed', () => {
    const spec = derivation({
      formula: 'rate',
      inputs: [{ kind: 'published', label: 'Rate', value: 100, unit: '₹', citation: aCitation }],
      combine: ([r = 0]) => r,
    });

    expect(evaluate(spec)).toEqual({ low: 100, central: 100, high: 100 });
  });
});

describe('the Pukka dwelling replacement cost', () => {
  const cost = pukkaDwellingReplacement();

  it('lands in a plausible range for a modest rural dwelling', () => {
    // Not a tautology check: these bounds were chosen from what a 25-46.6 m²
    // permanent house plausibly costs, and a derivation that fell outside them
    // would mean an input is wrong by an order of magnitude.
    expect(cost.interval.central).toBeGreaterThan(80_000);
    expect(cost.interval.central).toBeLessThan(400_000);
    expect(cost.interval.low).toBeLessThan(cost.interval.central);
    expect(cost.interval.high).toBeGreaterThan(cost.interval.central);
  });

  it('names every assumption with a reason and a range', () => {
    const assumed = cost.derivation.inputs.filter((i) => i.kind === 'assumed');

    expect(assumed.length).toBeGreaterThanOrEqual(5);
    for (const input of assumed) {
      expect(input.kind === 'assumed' && input.reason.length).toBeGreaterThan(30);
      expect(input.kind === 'assumed' && input.low).toBeLessThanOrEqual(input.value);
    }
  });

  it('cites an SOR item number for every published input', () => {
    const published = cost.derivation.inputs.filter((i) => i.kind === 'published');

    expect(published.length).toBeGreaterThanOrEqual(4);
    for (const input of published) {
      expect(input.kind === 'published' && input.citation.clause).toMatch(/Ch-\d/);
      expect(input.kind === 'published' && input.citation.publisher).toMatch(/Assam/);
    }
  });

  it('records that the SOR edition is undated rather than guessing a year', () => {
    // The document states no year anywhere. A citation that overstates what is
    // known is worse than one that admits the gap.
    const published = cost.derivation.inputs.find((i) => i.kind === 'published');

    expect(published?.kind === 'published' && published.citation.reference).toMatch(/undated/i);
  });

  it('cannot be mistaken for a published figure', () => {
    expect(cost.constructed).toBe(true);
    expect(cost.caveat).toMatch(/Constructed here, not published/);
    expect(cost.caveat).toMatch(/never as an entitlement/);
    expect(cost.caveat).toMatch(/undated/);
  });

  it('carries an interval wide enough to show the assumptions are doing work', () => {
    // If this ever gets narrow, it is because someone tightened a bound rather
    // than sourced a better input. The width is the honest signal.
    expect(relativeWidth(cost.interval)).toBeGreaterThan(0.5);
  });

  it('declines to cost a Kuccha dwelling, and says why', () => {
    expect(KUCCHA_NOT_COSTED).toMatch(/bamboo, timber and thatch/);
    expect(KUCCHA_NOT_COSTED).toMatch(/different building/);
    expect(KUCCHA_NOT_COSTED).toMatch(/build-back-better/);
  });
});

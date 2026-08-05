/**
 * What to rebuild, and what that costs.
 *
 * 91% of the dwellings destroyed in this archive were Kuccha, so the policy
 * choice moves the answer more than any other input in the model. These assert
 * that each policy costs what it claims to, and — more importantly — that the
 * one policy this schedule can price in full is not thereby made to look like
 * the cheap option.
 */

import { describe, expect, it } from 'vitest';
import {
  costPolicy,
  raisedPlinthResilience,
  RECONSTRUCTION_POLICIES,
  type ReconstructionPolicyKey,
} from './reconstruction-policy';
import { pukkaDwellingReplacement } from './replacement-cost';

const policy = (key: ReconstructionPolicyKey) =>
  RECONSTRUCTION_POLICIES.find((p) => p.key === key)!;

const dwelling = { low: 100, central: 200, high: 300 };
const plinth = { low: 10, central: 20, high: 30 };
const caseload = { kuccha: 90, pukka: 10 };

describe('reconstruction policies', () => {
  it('offers three, each stating its effect on future risk', () => {
    expect(RECONSTRUCTION_POLICIES.map((p) => p.key)).toEqual([
      'like-for-like',
      'protect-in-place',
      'build-back-better',
    ]);
    for (const p of RECONSTRUCTION_POLICIES) {
      // The risk effect is the reason the lever exists. A policy that only
      // described its cost would let the cheapest look like the best.
      expect(p.riskEffect.length).toBeGreaterThan(60);
    }
  });

  it('says plainly that like-for-like reproduces the exposure', () => {
    expect(policy('like-for-like').riskEffect).toMatch(/destroy them again/);
  });
});

describe('costPolicy', () => {
  it('like-for-like prices only the Pukka dwellings, and names the rest as uncosted', () => {
    const result = costPolicy(policy('like-for-like'), caseload, dwelling, plinth);

    expect(result.totalCentral).toBe(10 * 200);
    expect(result.costedDwellings).toBe(10);
    expect(result.uncostedDwellings).toBe(90);
    expect(result.isFloor).toBe(true);
    expect(result.caveat).toMatch(/Nothing at all is included for them/);
  });

  it('protect-in-place prices the plinths under the Kuccha houses it cannot price', () => {
    // The useful middle case: the defence is costable even when the dwelling is
    // not, which is the direct answer to "at least build suitable defences".
    const result = costPolicy(policy('protect-in-place'), caseload, dwelling, plinth);

    expect(result.totalCentral).toBe(10 * (200 + 20) + 90 * 20);
    expect(result.isFloor).toBe(true);
    expect(result.caveat).toMatch(/raised plinths beneath them ARE priced/);
  });

  it('build-back-better prices every dwelling, and says why that is not a virtue', () => {
    const result = costPolicy(policy('build-back-better'), caseload, dwelling, plinth);

    expect(result.totalCentral).toBe(100 * (200 + 20));
    expect(result.uncostedDwellings).toBe(0);
    expect(result.isFloor).toBe(false);
    // The trap this guards: the only fully-costable policy must not read as the
    // best-evidenced one just because the arithmetic completes.
    expect(result.caveat).toMatch(/a fact about the schedule, not a reason to choose it/);
  });

  it('costs more as the policy removes more risk', () => {
    const totals = RECONSTRUCTION_POLICIES.map(
      (p) => costPolicy(p, caseload, dwelling, plinth).totalCentral ?? 0,
    );

    expect(totals[0]).toBeLessThan(totals[1]!);
    expect(totals[1]).toBeLessThan(totals[2]!);
  });

  it('is unknown, not zero, when the caseload was not reported', () => {
    const result = costPolicy(
      policy('build-back-better'),
      { kuccha: undefined, pukka: undefined },
      dwelling,
      plinth,
    );

    expect(result.totalCentral).toBeUndefined();
    expect(result.caveat).toMatch(/not a quantity of zero/);
  });

  it('keeps the interval, so a policy total is never a point estimate', () => {
    const result = costPolicy(policy('build-back-better'), caseload, dwelling, plinth);

    expect(result.totalLow).toBeLessThan(result.totalCentral!);
    expect(result.totalHigh).toBeGreaterThan(result.totalCentral!);
  });
});

describe('the raised plinth', () => {
  const plinthCost = raisedPlinthResilience();

  it('costs a meaningful fraction of a dwelling, not a rounding error', () => {
    // If a plinth came out at 2% of a house, protect-in-place would be
    // indistinguishable from doing nothing and the lever would be theatre.
    const house = pukkaDwellingReplacement().interval.central;
    const share = plinthCost.interval.central / house;

    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.6);
  });

  it('is built only from priceable civil works, with every rate cited', () => {
    const published = plinthCost.derivation.inputs.filter((i) => i.kind === 'published');

    expect(published).toHaveLength(3);
    for (const input of published) {
      expect(input.kind === 'published' && input.citation.clause).toMatch(/Ch-\d/);
    }
  });

  it('admits that the right raise height is a site fact the bulletin never reports', () => {
    const raise = plinthCost.derivation.inputs.find((i) => i.label.includes('raise'));

    expect(raise?.kind === 'assumed' && raise.reason).toMatch(/does not report/);
  });
});

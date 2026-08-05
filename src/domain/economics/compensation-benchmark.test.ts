/**
 * Comparing a compensation demand against reconstruction.
 *
 * The arithmetic is division. What is under test is the honesty: that the
 * denominator gap is surfaced rather than buried, that the household-size range
 * is applied the right way round, and that nothing here nets the two figures off
 * against each other.
 */

import { describe, expect, it } from 'vitest';
import {
  ASSAM_HOUSEHOLD_SIZE,
  compareWithBenchmark,
  TEN_LAKH_DEMAND,
} from './compensation-benchmark';

const reconstruction = { low: 100_000, central: 200_000, high: 400_000 };

const compare = (affectedPeople: number | undefined, dwellingsDestroyed: number | undefined) =>
  compareWithBenchmark(TEN_LAKH_DEMAND, {
    affectedPeople,
    dwellingsDestroyed,
    householdSize: ASSAM_HOUSEHOLD_SIZE,
    reconstructionPerDwelling: reconstruction,
  });

describe('the benchmark itself', () => {
  it('is recorded as a demand, never as a norm or an entitlement', () => {
    // If this ever reads as a schedule, the model has endorsed a figure it has
    // not assessed.
    expect(TEN_LAKH_DEMAND.source).toMatch(/publicly stated demand/);
    expect(TEN_LAKH_DEMAND.source).toMatch(/not an entitlement/);
    expect(TEN_LAKH_DEMAND.amountPerHousehold.amount).toBe(1_000_000);
  });
});

describe('compareWithBenchmark', () => {
  it('surfaces the denominator gap, which is where the difference lives', () => {
    const result = compare(490_000, 1000);

    // 490,000 / 4.9 = 100,000 households affected, against 1,000 destroyed.
    expect(result.householdsAffected).toBeCloseTo(100_000, 6);
    expect(result.denominatorRatio).toBeCloseTo(100, 6);
    expect(result.notDestroyedSharePercent).toBeCloseTo(99, 6);
  });

  it('applies the household-size range the right way round', () => {
    // A LARGER household means FEWER households and therefore a SMALLER demand.
    // Getting this backwards inverts the interval, and the inversion would be
    // invisible in a rendered range.
    const result = compare(490_000, 1000);

    expect(result.demandAcrossAffected?.low).toBeLessThan(
      result.demandAcrossAffected!.central,
    );
    expect(result.demandAcrossAffected?.high).toBeGreaterThan(
      result.demandAcrossAffected!.central,
    );
    // low bound uses the HIGH household size (5.4): 490000/5.4 × 1e6
    expect(result.demandAcrossAffected?.low).toBeCloseTo((490_000 / 5.4) * 1_000_000, 0);
  });

  it('offers the demand at a common denominator, so the comparison is like for like', () => {
    const result = compare(490_000, 1000);

    // Paid only to those who lost a dwelling: 1,000 × ₹10 lakh.
    expect(result.demandAcrossDestroyed).toBe(1_000_000_000);
    // Against reconstruction of those same 1,000 dwellings.
    expect(result.reconstructionOfDestroyed?.central).toBe(200_000_000);
  });

  it('states the per-household multiple, which is the only fair single number', () => {
    const result = compare(490_000, 1000);

    // ₹10 lakh against ₹2 lakh to rebuild one dwelling.
    expect(result.perHouseholdMultiple).toBeCloseTo(5, 6);
  });

  it('refuses to net the two figures off, and says why', () => {
    const result = compare(490_000, 1000);

    expect(result.caveat).toMatch(/must not be netted off/);
    expect(result.caveat).toMatch(/denominator, not the rate/);
    // The household count rests entirely on an assumption, and says so.
    expect(result.caveat).toMatch(/reports people and never households/);
  });

  it('is undefined, never zero, when the quantities were not reported', () => {
    const result = compare(undefined, undefined);

    expect(result.householdsAffected).toBeUndefined();
    expect(result.demandAcrossAffected).toBeUndefined();
    expect(result.reconstructionOfDestroyed).toBeUndefined();
    expect(result.denominatorRatio).toBeUndefined();
  });

  it('does not divide by zero when no dwelling was destroyed', () => {
    const result = compare(490_000, 0);

    expect(result.denominatorRatio).toBeUndefined();
  });
});

/**
 * Applying a rate to a quantity, and refusing to when it would mislead.
 *
 * The arithmetic is one multiplication. Everything under test is what surrounds
 * it: that an uncited rate cannot exist, that unknown propagates into money,
 * that a missing rate is named rather than dropped from a total, and that an
 * expired schedule says so.
 */

import { describe, expect, it } from 'vitest';
import { count, hectares, unknownCount } from '../shared/quantity';
import { unitRate } from './money';
import { appliesOn, SDRF_ASSAM_2022 } from './norm-schedule';
import { costOf, totalOf } from './costing';

const aCitation = {
  publisher: 'Ministry of Home Affairs, Government of India',
  document: 'Revised list of items and norms of assistance',
  reference: 'F. No. 33-03/2020-NDM-I (Vol-II)',
  clause: 'Housing',
  source: 'https://example.gov.in/norms.pdf',
  retrievedOn: '2026-08-06',
};

const aRate = (amount: number, unit: Parameters<typeof unitRate>[0]['unit'] = 'per-house') =>
  unitRate({
    amount: { amount, currency: 'INR', asOf: '2022-10-10' },
    unit,
    effectiveFrom: '2022-10-10',
    citation: aCitation,
  });

describe('unitRate — a rate that cannot cite its source cannot exist', () => {
  it('refuses a citation with any field left blank', () => {
    for (const field of ['publisher', 'document', 'reference', 'clause', 'source', 'retrievedOn']) {
      expect(() =>
        unitRate({
          amount: { amount: 120_000, currency: 'INR', asOf: '2022-10-10' },
          unit: 'per-house',
          effectiveFrom: '2022-10-10',
          citation: { ...aCitation, [field]: '   ' },
        }),
      ).toThrow(/must cite its source/);
    }
  });

  it('refuses a negative or non-finite amount', () => {
    expect(() =>
      unitRate({
        amount: { amount: -1, currency: 'INR', asOf: '2022-10-10' },
        unit: 'per-house',
        effectiveFrom: '2022-10-10',
        citation: aCitation,
      }),
    ).toThrow(/non-negative/);
  });
});

describe('costOf', () => {
  it('multiplies the quantity by the rate and keeps both', () => {
    const line = costOf('Houses fully damaged', count(10), aRate(120_000));

    expect(line.amount?.amount).toBe(1_200_000);
    expect(line.amount?.currency).toBe('INR');
    expect(line.workings).toBe('10 × ₹1,20,000 = ₹12,00,000');
  });

  it('is unknown, never zero, when the quantity was not reported', () => {
    // ADR-0005 carried into money, where it matters more: a ₹0 in a funding
    // table reads as "nothing needed here".
    const line = costOf('Houses fully damaged', unknownCount(), aRate(120_000));

    expect(line.amount).toBeUndefined();
    expect(line.costed).toBe(false);
    expect(line.reasonNotCosted).toMatch(/not reported/i);
  });

  it('is unknown, and says which category, when the schedule has no rate', () => {
    const line = costOf('Roads damaged', count(48), undefined);

    expect(line.amount).toBeUndefined();
    expect(line.costed).toBe(false);
    expect(line.reasonNotCosted).toMatch(/no rate/i);
    expect(line.reasonNotCosted).toContain('Roads damaged');
  });

  it('carries the citation through to the line, so a figure can be traced', () => {
    const line = costOf('Houses fully damaged', count(10), aRate(120_000));

    expect(line.citation?.reference).toBe('F. No. 33-03/2020-NDM-I (Vol-II)');
    expect(line.citation?.publisher).toMatch(/Ministry of Home Affairs/);
  });
});

describe('totalOf', () => {
  it('adds the costed lines and counts the ones it could not cost', () => {
    const total = totalOf([
      costOf('Houses fully damaged', count(10), aRate(120_000)),
      costOf('Houses partially damaged', count(100), aRate(4_000)),
      costOf('Roads damaged', count(48), undefined),
    ]);

    expect(total.amount?.amount).toBe(1_600_000);
    expect(total.uncostedLines).toEqual(['Roads damaged']);
  });

  it('reads as a floor whenever anything went uncosted', () => {
    // The failure this prevents is invisible: a total that silently excludes
    // the largest category understates an appeal and looks complete.
    const total = totalOf([
      costOf('Houses fully damaged', count(10), aRate(120_000)),
      costOf('Roads damaged', count(48), undefined),
    ]);

    expect(total.isFloor).toBe(true);
    expect(total.caveat).toMatch(/at least/i);
    expect(total.caveat).toContain('Roads damaged');
  });

  it('is not a floor when everything was costed', () => {
    const total = totalOf([costOf('Houses fully damaged', count(10), aRate(120_000))]);

    expect(total.isFloor).toBe(false);
  });

  it('is unknown, not zero, when nothing could be costed at all', () => {
    const total = totalOf([costOf('Roads damaged', count(48), undefined)]);

    expect(total.amount).toBeUndefined();
  });
});

describe('the shipped SDRF schedule', () => {
  it('carries a real citation on every rate', () => {
    const rates = Object.values(SDRF_ASSAM_2022.rates);
    expect(rates.length).toBeGreaterThan(0);

    for (const rate of rates) {
      expect(rate?.citation.reference).toMatch(/33-03\/2020-NDM-I/);
      expect(rate?.citation.clause.trim()).not.toBe('');
    }
  });

  it('has no rate for infrastructure, because the bulletin has no dimensions', () => {
    // The norms pay per kilometre of road and per culvert; the bulletin names
    // hundreds of damaged assets and dimensions none of them. There is no
    // honest multiplication, so there is no rate.
    expect(Object.keys(SDRF_ASSAM_2022.rates)).not.toContain('infrastructure');
    expect(SDRF_ASSAM_2022.rates['gratuitous-relief-per-person-day']).toBeUndefined();
  });

  it('says it does not apply to the 2026 flood, because it expired first', () => {
    // The whole reason ADR-0011 insists on effective dates. The circular runs
    // "till the financial year 2025-26"; these bulletins are FY 2026-27.
    const check = appliesOn(SDRF_ASSAM_2022, '2026-08-04');

    expect(check.applies).toBe(false);
    expect(check.applies === false && check.reason).toMatch(/ceased to apply on 2026-03-31/);
    expect(check.applies === false && check.reason).toMatch(/not as an entitlement/);
  });

  it('applies to a date inside its period', () => {
    expect(appliesOn(SDRF_ASSAM_2022, '2025-07-04').applies).toBe(true);
  });

  it('does not apply before it was issued', () => {
    const check = appliesOn(SDRF_ASSAM_2022, '2021-07-04');

    expect(check.applies).toBe(false);
    expect(check.applies === false && check.reason).toMatch(/takes effect on 2022-10-10/);
  });

  it('prices a hectare, so crop area has a rate to meet', () => {
    const rate = SDRF_ASSAM_2022.rates['crop-area-lost'];

    expect(rate?.unit).toBe('per-hectare');
    expect(costOf('Crop area', hectares(100), rate).amount?.amount).toBe(850_000);
  });
});

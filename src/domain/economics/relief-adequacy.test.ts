/**
 * Back-testing the exposure model against relief that was actually handed out.
 *
 * The one check in this whole feature that costs nothing and proves something:
 * the bulletins report relief *distributed* in quintals and litres, which is
 * real expenditure in physical units. Divide it by the person-days the exposure
 * integral produced and you get the ration rate that was actually delivered —
 * no rates, no rupees, no assumptions.
 *
 * London School: exposure bases arrive as data, so these assert the arithmetic
 * and the honesty around it rather than reaching into a timeline.
 */

import { describe, expect, it } from 'vitest';
import { personDays, quintals, unknownPersonDays, unknownQuintals } from '../shared/quantity';
import { impliedRation } from './relief-adequacy';

const basis = (label: string, days: number) => ({ label, personDays: personDays(days) });

describe('impliedRation', () => {
  it('converts quintals to kilograms before dividing', () => {
    // A quintal is 100 kg, and the conversion is the shared kernel's
    // `quintalsToKilograms` rather than a second copy of the factor. Getting it
    // wrong would understate the delivered ration by two orders of magnitude
    // and make every norm look generous.
    const [result] = impliedRation(quintals(10), [basis('Camp inmates', 1000)]);

    // 10 quintals = 1,000 kg over 1,000 person-days = 1 kg per person per day.
    expect(result?.kgPerPersonPerDay).toBe(1);
  });

  it('reports one rate per basis, because who was fed is the open question', () => {
    // The denominator is the uncertainty, not the numerator. Relief reaches
    // camp inmates, people outside camps, and sometimes the wider affected
    // population — and the bulletin does not say which. Picking one silently
    // would manufacture precision.
    const results = impliedRation(quintals(1000), [
      basis('Camp inmates', 100_000),
      basis('Camp and non-camp inmates', 500_000),
      basis('All affected', 1_000_000),
    ]);

    expect(results.map((r) => r.basis)).toEqual([
      'Camp inmates',
      'Camp and non-camp inmates',
      'All affected',
    ]);
    expect(results.map((r) => r.kgPerPersonPerDay)).toEqual([1, 0.2, 0.1]);
  });

  it('is unknown, never zero, when the distributed quantity was not reported', () => {
    const [result] = impliedRation(unknownQuintals(), [basis('Camp inmates', 1000)]);

    expect(result?.kgPerPersonPerDay).toBeUndefined();
  });

  it('is unknown when the exposure is unknown, rather than dividing by nothing', () => {
    const [result] = impliedRation(quintals(10), [
      { label: 'Camp inmates', personDays: unknownPersonDays() },
    ]);

    expect(result?.kgPerPersonPerDay).toBeUndefined();
  });

  it('refuses to divide by zero person-days', () => {
    // An empty timeline yields zero person-days. Infinity is not a ration.
    const [result] = impliedRation(quintals(10), [basis('Camp inmates', 0)]);

    expect(result?.kgPerPersonPerDay).toBeUndefined();
  });

  it('shows the division, so it can be checked by hand', () => {
    const [result] = impliedRation(quintals(10), [basis('Camp inmates', 1000)]);

    expect(result?.workings).toBe('10 quintals = 1,000 kg ÷ 1,000 person-days = 1.000 kg');
  });

  it('says the rate is delivered, not entitled', () => {
    // The distinction that stops this being read as a compliance finding: what
    // was handed out is not the same fact as what people were owed, and this
    // module knows nothing about entitlement.
    const [result] = impliedRation(quintals(10), [basis('Camp inmates', 1000)]);

    expect(result?.caveat).toMatch(/what was distributed.*not.*entitle/i);
  });

  it('returns nothing at all when given no bases', () => {
    expect(impliedRation(quintals(10), [])).toEqual([]);
  });
});

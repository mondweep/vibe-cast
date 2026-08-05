/**
 * Shared kernel — quantity types.
 *
 * Ubiquitous language note (PRD §4.3): DRIMS reports rice, dal and salt in
 * QUINTALS and mustard oil in LITRES. 1 quintal = 100 kg. Confusing the two is
 * a two-orders-of-magnitude error in ration planning, so units are part of the
 * type and mixing them is a compile error rather than a runtime surprise.
 */

/** A measurement whose value is known. */
export type Known<U extends string> = {
  readonly kind: 'known';
  readonly unit: U;
  readonly value: number;
};

/**
 * The source reported nothing usable — a blank cell, or the DRIMS sentinel
 * `SNR` ("Status Not Reported").
 *
 * This is NOT zero. The distinction is the central guarantee of the
 * anti-corruption layer (PRD §3.3): a district that did not report its
 * casualties has not reported zero casualties.
 */
export type Unknown<U extends string> = {
  readonly kind: 'unknown';
  readonly unit: U;
};

export type Quantity<U extends string> = Known<U> | Unknown<U>;

export type Quintals = Quantity<'Q'>;
export type Litres = Quantity<'L'>;
export type Hectares = Quantity<'Hect'>;
/**
 * One person in one condition for one day, summed over a period (ADR-0012).
 *
 * A separate unit from `Count` on purpose, and the separation is the whole
 * point. `Population Affected` is a stock: the same person appears in sixteen
 * consecutive bulletins because they are still affected, not because sixteen
 * people are. Summing that stock to get *people* is meaningless and the type
 * system refuses it. Integrating it over time to get *person-days* is
 * meaningful, and it is the unit relief costs are actually denominated in —
 * feeding somebody costs per person per day.
 *
 * The arithmetic of the two is identical; only the unit of the answer differs.
 * That is exactly the case a unit-typed quantity exists to catch, so
 * `PersonDays` cannot be passed where a headcount is expected: 302,253
 * camp-inmate-days must never be read as 302,253 people.
 */
export type PersonDays = Quantity<'person-days'>;
export type Kilograms = Quantity<'kg'>;
/** A dimensionless count of people, camps, boats, houses, animals. */
export type Count = Quantity<'count'>;

const known =
  <U extends string>(unit: U) =>
  (value: number): Quantity<U> => ({ kind: 'known', unit, value });

const unknown = <U extends string>(unit: U): Quantity<U> => ({ kind: 'unknown', unit });

export const quintals = known('Q');
export const litres = known('L');
export const hectares = known('Hect');
export const kilograms = known('kg');
export const count = known('count');
export const personDays = known('person-days');

export const unknownQuintals = (): Quintals => unknown('Q');
export const unknownLitres = (): Litres => unknown('L');
export const unknownHectares = (): Hectares => unknown('Hect');
export const unknownCount = (): Count => unknown('count');
export const unknownPersonDays = (): PersonDays => unknown('person-days');

export const isKnown = <U extends string>(q: Quantity<U>): q is Known<U> => q.kind === 'known';

/**
 * The numeric value, or `undefined` when unknown.
 *
 * Deliberately not `valueOr(0)`. Callers must decide what an unknown means in
 * their context, and that decision should be visible at the call site.
 */
export const valueOf = <U extends string>(q: Quantity<U>): number | undefined =>
  isKnown(q) ? q.value : undefined;

/**
 * Sum quantities of the same unit.
 *
 * Unknowns are skipped but recorded: a sum containing unknowns is itself
 * flagged, so a partial total is never presented as a complete one.
 */
export const sumQuantities = <U extends string>(
  unit: U,
  quantities: readonly Quantity<U>[],
): { total: Quantity<U>; hadUnknowns: boolean } => {
  const knowns = quantities.filter(isKnown);
  const hadUnknowns = knowns.length !== quantities.length;
  if (knowns.length === 0) return { total: unknown(unit), hadUnknowns };
  const value = knowns.reduce((acc, q) => acc + q.value, 0);
  return { total: { kind: 'known', unit, value }, hadUnknowns };
};

/** 1 quintal = 100 kg. */
export const quintalsToKilograms = (q: Quintals): Kilograms =>
  isKnown(q) ? kilograms(q.value * 100) : unknown('kg');

/**
 * DRIMS emits float artefacts such as `2025.9200000000003`. Round for display
 * only — never at storage, so reconciliation compares like with like.
 */
export const forDisplay = <U extends string>(q: Quantity<U>, dp = 2): string =>
  isKnown(q) ? String(Number(q.value.toFixed(dp))) : '—';

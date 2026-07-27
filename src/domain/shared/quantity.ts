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

export const unknownQuintals = (): Quintals => unknown('Q');
export const unknownLitres = (): Litres => unknown('L');
export const unknownHectares = (): Hectares => unknown('Hect');
export const unknownCount = (): Count => unknown('count');

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

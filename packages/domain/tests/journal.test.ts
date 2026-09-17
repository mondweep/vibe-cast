import {
  UNKNOWN,
  isKnown,
  canAmend,
  emptyFactors,
  validateFactors,
  AMENDMENT_WINDOW_MS,
  type JournalEntry,
} from '../src/journal/factors';
import { projectFactors, toAlcoholUnits, toNumericFactor } from '../src/journal/anti-corruption';

describe('Journal factors', () => {
  it('distinguishes an unanswered factor from a zero (I-J3)', () => {
    const unanswered = emptyFactors().alcoholUnits;
    expect(isKnown(unanswered)).toBe(false);
    expect(unanswered).not.toBe(0);
    expect(toNumericFactor(unanswered)).toBeNull();
    expect(toNumericFactor(0)).toBe(0);
  });

  it('rejects values outside their declared range (I-J2)', () => {
    const errors = validateFactors({ ...emptyFactors(), alcoholUnits: 45 });
    expect(errors).toEqual([{ factor: 'alcoholUnits', reason: 'out_of_range' }]);
  });

  it('accepts values at the range boundaries', () => {
    expect(validateFactors({ ...emptyFactors(), alcoholUnits: 0 })).toEqual([]);
    expect(validateFactors({ ...emptyFactors(), alcoholUnits: 30 })).toEqual([]);
  });

  it('does not validate unanswered factors', () => {
    expect(validateFactors(emptyFactors())).toEqual([]);
  });

  it('allows amendment for 48 hours (FR-J4)', () => {
    const entry: JournalEntry = {
      userId: 'u1',
      date: '2026-09-16',
      factors: emptyFactors(),
      recordedAt: 1_000_000,
    };
    expect(canAmend(entry, 1_000_000 + AMENDMENT_WINDOW_MS - 1)).toBe(true);
    expect(canAmend(entry, 1_000_000 + AMENDMENT_WINDOW_MS + 1)).toBe(false);
  });
});

describe('anti-corruption layer', () => {
  it('translates a drink tally into UK alcohol units', () => {
    expect(toAlcoholUnits({ wineGlasses: 2 })).toBeCloseTo(4.2, 2);
    expect(toAlcoholUnits({ beerPints: 1, spiritMeasures: 2 })).toBeCloseTo(4.3, 2);
  });

  // The distinction the whole layer exists to preserve.
  it('treats an absent tally as unknown but an explicit zero as a real zero', () => {
    expect(toAlcoholUnits(undefined)).toBe(UNKNOWN);
    expect(toAlcoholUnits({})).toBe(UNKNOWN);
    expect(toAlcoholUnits({ wineGlasses: 0 })).toBe(0);
  });

  it('encodes back-sleeping as the position of interest', () => {
    expect(toNumericFactor('back')).toBe(1);
    expect(toNumericFactor('side')).toBe(0);
  });

  it('projects unknown factors as null rather than zero', () => {
    const projected = projectFactors({ ...emptyFactors(), alcoholUnits: 3 });
    expect(projected.alcoholUnits).toBe(3);
    expect(projected.nasalCongestion).toBeNull();
  });
});

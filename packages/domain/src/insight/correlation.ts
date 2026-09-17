import type { NightAnalysis } from '../analysis/night-analysis';
import type { JournalEntry } from '../journal/factors';
import { MODIFIABLE_FACTORS, projectFactors, type FactorName } from '../journal/anti-corruption';
import { mean, stdDev } from '../shared/types';

/** FR-I1: below this, we report nothing rather than something misleading. */
export const MIN_NIGHTS_FOR_ASSOCIATION = 7;

export interface Association {
  readonly factor: FactorName;
  /** Pearson r between the factor and Snore Index. */
  readonly r: number;
  /** Absolute r — the ranking key. */
  readonly effectSize: number;
  readonly direction: 'increases' | 'decreases' | 'none';
  /**
   * Nights contributing to *this factor*. Nights where the factor was
   * unknown are excluded here, not counted as zero (I-J3).
   */
  readonly n: number;
  /**
   * FR-I2. Always true. Present in the data, not just the copy, so that no
   * renderer can drop it.
   */
  readonly associationNotCausation: true;
}

export interface AssociationReport {
  readonly associations: readonly Association[];
  readonly nightsConsidered: number;
  readonly sufficient: boolean;
}

function pearson(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 3) return NaN;
  const mx = mean(xs);
  const my = mean(ys);
  const sx = stdDev(xs);
  const sy = stdDev(ys);
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx === 0 || sy === 0) return NaN;
  let acc = 0;
  for (let i = 0; i < xs.length; i += 1) acc += (xs[i] - mx) * (ys[i] - my);
  return acc / ((xs.length - 1) * sx * sy);
}

/**
 * Rank each Factor by its association with the Snore Index (FR-I1).
 *
 * Deliberately conservative about what it will say: nights without a usable
 * Snore Index are dropped entirely, unknown factor values are dropped per
 * factor, and nothing is reported at all below the minimum night count. The
 * failure mode this guards against is a confident ranking built on four
 * nights and a coincidence.
 */
export function rankAssociations(
  nights: readonly NightAnalysis[],
  journal: readonly JournalEntry[],
): AssociationReport {
  const journalByDate = new Map(journal.map((j) => [j.date, j]));

  // I-I4 and FR-A3: only nights with a real Snore Index can contribute.
  const usable = nights.filter(
    (n) => n.status === 'analysed' && n.snoreIndex !== null && journalByDate.has(n.date),
  );

  if (usable.length < MIN_NIGHTS_FOR_ASSOCIATION) {
    return { associations: [], nightsConsidered: usable.length, sufficient: false };
  }

  const associations: Association[] = [];
  for (const factor of MODIFIABLE_FACTORS) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const night of usable) {
      const entry = journalByDate.get(night.date);
      if (entry === undefined) continue;
      const value = projectFactors(entry.factors)[factor];
      if (value === null) continue; // unknown — excluded, not zeroed
      xs.push(value);
      ys.push(night.snoreIndex as number);
    }
    const r = pearson(xs, ys);
    if (Number.isNaN(r)) continue;
    associations.push({
      factor,
      r,
      effectSize: Math.abs(r),
      direction: r > 0.05 ? 'increases' : r < -0.05 ? 'decreases' : 'none',
      n: xs.length,
      associationNotCausation: true,
    });
  }

  associations.sort((a, b) => b.effectSize - a.effectSize);
  return { associations, nightsConsidered: usable.length, sufficient: true };
}

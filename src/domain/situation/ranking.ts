/**
 * SITUATION ASSESSMENT (Core) — district ranking.
 *
 * FR-2.2 and acceptance question §2.1.1: "Which three districts are worst
 * affected, and by what measure?" The bulletin renders Sivasagar (144,461
 * affected) and Kamrup Metro (0 affected) as visually identical rows; this is
 * the service that makes them orderable.
 *
 * Ranking is deterministic: districts with equal figures come back in the same
 * order however the bulletin happened to list them, so two officers reading the
 * same PDF never see two different "top three".
 *
 * Pure. No I/O, no clock.
 */

import type { DistrictName } from '../shared/administrative-unit';
import type { Count } from '../shared/quantity';
import { sumQuantities, valueOf } from '../shared/quantity';
import type { DistrictSituation } from './district-situation';
import type { DistrictSeverity } from './severity-index';

export type RankOrder = 'desc' | 'asc';

export type RankedDistrict = {
  /** 1-based competition rank: tied districts share a rank and the next is skipped. */
  readonly rank: number;
  readonly district: DistrictName;
  /** `undefined` when the district did not report this figure — never a stand-in 0. */
  readonly value: number | undefined;
  readonly dimension: string;
};

export type ImpactDimensionReader = (district: DistrictSituation) => number | undefined;

/**
 * Sum a group of counts, propagating unknown-ness.
 *
 * A partially reported animal split is not a smaller number of animals; it is
 * an unknown number, and ranking on it would be a lie.
 */
const totalOf = (parts: readonly Count[]): number | undefined => {
  const { total, hadUnknowns } = sumQuantities('count', parts);
  return hadUnknowns ? undefined : valueOf(total);
};

/**
 * The dimensions an officer sorts by.
 *
 * There is deliberately no combined "casualties" dimension: flood deaths and
 * general drownings are separate figures (PRD §4.2) and offering one control
 * that ranks by their sum would encode exactly the error the ubiquitous
 * language forbids.
 */
export const DEFAULT_IMPACT_DIMENSIONS: Readonly<Record<string, ImpactDimensionReader>> = {
  affectedPopulation: (d) => valueOf(d.population.total),
  villagesAffected: (d) => valueOf(d.villagesAffected),
  cropAreaSubmerged: (d) => valueOf(d.cropAreaSubmerged),
  reliefCamps: (d) => valueOf(d.reliefCamps),
  campInmates: (d) => valueOf(d.campInmates),
  nonCampInmates: (d) => valueOf(d.nonCampInmates),
  animalsAffected: (d) =>
    totalOf([d.animals.affected.big, d.animals.affected.small, d.animals.affected.poultry]),
  animalsWashedAway: (d) =>
    totalOf([d.animals.washedAway.big, d.animals.washedAway.small, d.animals.washedAway.poultry]),
  housesFullySeverelyDamaged: (d) =>
    totalOf([d.houses.fullySeverelyKuccha, d.houses.fullySeverelyPukka]),
  housesPartiallyDamaged: (d) => totalOf([d.houses.partiallyKuccha, d.houses.partiallyPukka]),
  floodDeaths: (d) => valueOf(d.casualties.floodDeaths),
  missing: (d) => valueOf(d.casualties.missing),
};

type Scored = { readonly district: DistrictName; readonly value: number | undefined };

/**
 * Order by value, then by District name.
 *
 * The name tie-break is what makes the ranking independent of the bulletin's
 * row order. Unknowns always sort last, in both directions: "not reported" is
 * not a small number, so it belongs at the bottom of a worst-first list and at
 * the bottom of a best-first list alike.
 */
const compare = (order: RankOrder) => (a: Scored, b: Scored): number => {
  if (a.value === undefined && b.value === undefined) return a.district.localeCompare(b.district);
  if (a.value === undefined) return 1;
  if (b.value === undefined) return -1;
  if (a.value !== b.value) return order === 'desc' ? b.value - a.value : a.value - b.value;
  return a.district.localeCompare(b.district);
};

const withCompetitionRanks = (sorted: readonly Scored[], dimension: string): RankedDistrict[] => {
  const ranked: RankedDistrict[] = [];
  let rank = 0;
  let previous: number | undefined | symbol = Symbol('none');

  sorted.forEach((entry, index) => {
    const tiedWithPrevious = index > 0 && entry.value === previous;
    if (!tiedWithPrevious) rank = index + 1;
    previous = entry.value;
    ranked.push({ rank, district: entry.district, value: entry.value, dimension });
  });

  return ranked;
};

export type RankOptions = {
  readonly readers?: Readonly<Record<string, ImpactDimensionReader>>;
  readonly order?: RankOrder;
};

/**
 * Rank districts by any impact dimension.
 *
 * The reader for the dimension is injected, so a caller can rank by something
 * this module has never heard of — rescue assets per capita, say — without the
 * ranking rules being reimplemented alongside it.
 */
export const rankDistricts = (
  districts: readonly DistrictSituation[],
  dimension: string,
  options: RankOptions = {},
): readonly RankedDistrict[] => {
  const readers = options.readers ?? DEFAULT_IMPACT_DIMENSIONS;
  const read = readers[dimension];
  if (read === undefined) {
    throw new RangeError(
      `No reader for impact dimension "${dimension}". Known dimensions: ${Object.keys(readers).join(', ')}`,
    );
  }

  const scored: Scored[] = districts.map((d) => ({ district: d.district, value: read(d) }));
  return withCompetitionRanks([...scored].sort(compare(options.order ?? 'desc')), dimension);
};

/** Rank by the composite Severity Index — the single triage ordering (PRD §4.5). */
export const rankDistrictSeverities = (
  severities: readonly DistrictSeverity[],
  order: RankOrder = 'desc',
): readonly RankedDistrict[] => {
  const scored: Scored[] = severities.map((s) => ({ district: s.district, value: s.score }));
  return withCompetitionRanks([...scored].sort(compare(order)), 'severityIndex');
};

/**
 * RESPONSE CAPACITY (Core) — the `ReliefOperation` aggregate root, per District.
 *
 * PRD §5.3. Relates relief supply to relief demand: camps, inmates, rations and
 * rescue assets, all in ASDMA's vocabulary.
 *
 * Invariants (§5.3):
 *  1. Quantities are typed by unit. `Quintals` and `Litres` are different types
 *     and mixing them is a compile error — the guard against the
 *     two-orders-of-magnitude ration error. Enforced by the shared kernel; this
 *     aggregate simply never launders a quantity through `number`.
 *  2. `Inmates.total` ≥ pregnant/lactating + persons with disability. These are
 *     overlapping subsets of the sheltered population, not additional people.
 *  3. Ration Coverage Days requires an explicit `RationNorm` — see
 *     `ration-coverage.ts`. It is deliberately not a property of this aggregate.
 *  4. Rescue agency lists are Sets. The source repeats "Local People" four
 *     times for Sivasagar.
 *
 * A violated invariant *degrades* the operation; it never throws. An officer
 * must see both what ASDMA printed and the fact that it does not hold together.
 *
 * Pure. No I/O, no clock.
 */

import type { DistrictName } from '../shared/administrative-unit';
import { normaliseName } from '../shared/administrative-unit';
import type {
  CampInmates,
  DistrictReport,
  ExtractionConfidence,
  NonCampInmates,
  ReliefDistributed,
  RevenueCircleImpact,
} from '../shared/flood-situation-report';
import type { Count } from '../shared/quantity';
import { isKnown, sumQuantities, valueOf } from '../shared/quantity';

export type ReliefDegradationReason =
  /** Pregnant/lactating + persons with disability exceed the Inmate total. */
  | 'vulnerable-subsets-exceed-inmate-total'
  /** A subset or the total is unknown, so the check could not be made. */
  | 'inmate-subset-check-unverifiable'
  /** The Revenue Circles' Relief Camps sum above the District's own figure. */
  | 'circle-camps-exceed-district-total';

export type ReliefDegradation = {
  readonly reason: ReliefDegradationReason;
  readonly field: string;
  readonly detail: string;
};

/** Relief Camps and Relief Distribution Centres, kept structurally separate. */
export type CampNetwork = {
  readonly reliefCamps: Count;
  readonly reliefDistributionCentres: Count;
  /** People sheltering in Relief Camps. ASDMA's word; retained (PRD §4.3). */
  readonly inmates: CampInmates;
  /** People served by Distribution Centres without sheltering. A different population. */
  readonly nonCampInmates: NonCampInmates;
  readonly perCircle: readonly RevenueCircleImpact[];
};

export type NormalisedRescueDeployment = {
  /** A Set: the source's repeated entries collapse to one member each. */
  readonly agencies: ReadonlySet<string>;
  readonly medicalTeams: Count;
  readonly boats: Count;
  readonly helicopters: Count;
  readonly personsEvacuatedByBoat: Count;
  readonly personsEvacuatedByHelicopter: Count;
  readonly animalsEvacuated: Count;
};

export type ReliefOperation = {
  readonly district: DistrictName;
  readonly campNetwork: CampNetwork;
  readonly relief: ReliefDistributed;
  readonly rescue: NormalisedRescueDeployment;
  readonly confidence: Extract<ExtractionConfidence, 'high' | 'degraded'>;
  readonly degradations: readonly ReliefDegradation[];
};

/**
 * Collapse a DRIMS agency list to a Set.
 *
 * Sivasagar's Rescue Operation cell reads "NDRF, Local People,
 * Army/Paramilitary force, Local People, NDRF, DDRF, ..." — fifteen entries
 * naming seven agencies. Comparison is on the normalised name so that spacing
 * and case do not create phantom agencies, but the spelling ASDMA used first is
 * what we show, because that is the spelling an officer will search for.
 *
 * `"Nil"` is ASDMA's nothing-marker in a name column (PRD §4.4) and produces no
 * member — a district that deployed nobody has an empty set, not an agency
 * called Nil.
 */
export const normaliseAgencies = (raw: readonly string[]): ReadonlySet<string> => {
  const seen = new Set<string>();
  const agencies = new Set<string>();

  for (const entry of raw) {
    const display = entry.trim().replace(/\s+/g, ' ');
    if (display === '') continue;
    const key = normaliseName(display);
    if (key === 'nil') continue;
    if (seen.has(key)) continue;
    seen.add(key);
    agencies.add(display);
  }

  return agencies;
};

/** PRD §5.3 invariant 2. */
const checkVulnerableSubsets = (inmates: CampInmates): readonly ReliefDegradation[] => {
  const subsets = sumQuantities('count', [
    inmates.pregnantOrLactating,
    inmates.personsWithDisability,
  ]);

  if (subsets.hadUnknowns || !isKnown(subsets.total) || !isKnown(inmates.total)) {
    return [
      {
        reason: 'inmate-subset-check-unverifiable',
        field: 'Inmates',
        detail:
          'Pregnant/Lactating Mothers and Persons with Disability could not be checked ' +
          'against the Inmate total because at least one figure was not reported.',
      },
    ];
  }

  if (subsets.total.value <= inmates.total.value) return [];

  return [
    {
      reason: 'vulnerable-subsets-exceed-inmate-total',
      field: 'Inmates',
      detail:
        `Pregnant/Lactating Mothers + Persons with Disability = ${subsets.total.value}, ` +
        `above the stated Inmate total of ${inmates.total.value}. These are overlapping ` +
        'subsets of the sheltered population, not additional people.',
    },
  ];
};

/**
 * Relief Camps must be at least the sum of their Revenue Circles'.
 *
 * Note what is deliberately *not* checked: male + female + children against the
 * Inmate total. DRIMS itself does not balance there — Sivasagar states 24,695
 * Inmates against a 24,670 gender split — and inventing a failure for a
 * discrepancy ASDMA prints routinely would bury the failures that matter.
 */
const checkCircleCamps = (
  reliefCamps: Count,
  circles: readonly RevenueCircleImpact[],
): readonly ReliefDegradation[] => {
  if (circles.length === 0) return [];

  const circleCamps = sumQuantities(
    'count',
    circles.map((c) => c.reliefCamps),
  );
  const district = valueOf(reliefCamps);
  const summed = valueOf(circleCamps.total);

  if (circleCamps.hadUnknowns || district === undefined || summed === undefined) return [];
  if (summed <= district) return [];

  return [
    {
      reason: 'circle-camps-exceed-district-total',
      field: 'Relief Camps',
      detail:
        `Revenue Circles report ${summed} Relief Camps against a District figure of ` +
        `${district}. The District figure is retained as ASDMA printed it.`,
    },
  ];
};

export const reliefOperationFrom = (report: DistrictReport): ReliefOperation => {
  const degradations: ReliefDegradation[] = [
    ...checkVulnerableSubsets(report.campInmates),
    ...checkCircleCamps(report.reliefCamps, report.revenueCircles),
  ];

  return {
    district: report.district,
    campNetwork: {
      reliefCamps: report.reliefCamps,
      reliefDistributionCentres: report.reliefDistributionCentres,
      inmates: report.campInmates,
      nonCampInmates: report.nonCampInmates,
      perCircle: report.revenueCircles,
    },
    relief: report.relief,
    rescue: {
      agencies: normaliseAgencies(report.rescue.agencies),
      medicalTeams: report.rescue.medicalTeams,
      boats: report.rescue.boats,
      helicopters: report.rescue.helicopters,
      personsEvacuatedByBoat: report.rescue.personsEvacuatedByBoat,
      personsEvacuatedByHelicopter: report.rescue.personsEvacuatedByHelicopter,
      animalsEvacuated: report.rescue.animalsEvacuated,
    },
    confidence: degradations.length === 0 ? 'high' : 'degraded',
    degradations,
  };
};

/** Convenience for a whole bulletin. */
export const reliefOperationsFrom = (
  reports: readonly DistrictReport[],
): readonly ReliefOperation[] => reports.map(reliefOperationFrom);

/**
 * Scenario Planning ← Response Capacity, wired.
 *
 * The projection engine deliberately does not reimplement camp load or ration
 * coverage: those belong to the Response Capacity context, and the engine takes
 * them as injected collaborators (`ProjectionDependencies`) precisely so the two
 * contexts cannot drift apart on what a "day of rice" means. Bounded contexts
 * never reach into one another (ADR-0001), so the join is made here, in the
 * composition root, and nowhere else.
 *
 * The adapter is thin on purpose. It converts the engine's plain numbers into
 * the Response context's typed quantities — kilograms back into Quintals, a
 * bare norm into a stated `RationNorm` — calls the real calculation, and hands
 * back the number the engine asked for. An unbounded result (inmates with no
 * camps open) comes back as `undefined`, which is what the engine's contract
 * asks for and what makes it say "no relief camps are open" rather than
 * printing an infinity.
 */

import { count, quintals } from '../domain/shared/quantity';
import type { Count, Quintals } from '../domain/shared/quantity';
import type { DistrictName } from '../domain/shared/administrative-unit';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import { campLoad, type CampLoad } from '../domain/response/camp-load';
import {
  rationCoverageDays,
  rationNorm,
  type RationCoverage,
  type RationNorm,
} from '../domain/response/ration-coverage';
import { scenarioLevers, type ScenarioLevers } from '../domain/scenario/scenario';
import type { ProjectionDependencies } from '../domain/scenario/projection-engine';
import type { ScenarioLeversViewModel } from '../adapters/ui/view-models';

/** 1 quintal = 100 kg (PRD §4.3). */
const KG_PER_QUINTAL = 100;

const SCENARIO_NORM_LABEL = 'scenario assumption, set by the user';

/**
 * The Response Capacity calculations, as collaborators.
 *
 * Named as a type so a test can substitute doubles and assert *which* domain
 * service was asked, with which quantities — the point of the injection.
 */
export type ResponseCalculations = {
  readonly rationCoverageDays: (rice: Quintals, inmates: Count, norm: RationNorm) => RationCoverage;
  readonly campLoad: (inmates: Count, reliefCamps: Count) => CampLoad;
};

/** The real implementations from `domain/response`. */
export const RESPONSE_CALCULATIONS: ResponseCalculations = {
  rationCoverageDays,
  campLoad,
};

const finiteOrUndefined = (value: number | undefined): number | undefined =>
  value === undefined || !Number.isFinite(value) ? undefined : value;

export const createScenarioDependencies = (
  response: ResponseCalculations = RESPONSE_CALCULATIONS,
): ProjectionDependencies => ({
  rationCoverageDays: (input) =>
    finiteOrUndefined(
      response.rationCoverageDays(
        quintals(input.riceStockKg / KG_PER_QUINTAL),
        count(input.inmates),
        rationNorm(input.rationNormKgPerPersonPerDay, SCENARIO_NORM_LABEL),
      ).days,
    ),

  campLoad: (input) =>
    finiteOrUndefined(response.campLoad(count(input.inmates), count(input.reliefCamps)).inmatesPerCamp),
});

// ---------------------------------------------------------------------------
// Levers
// ---------------------------------------------------------------------------

/**
 * Spread statewide "additional Relief Camps opened" across the districts.
 *
 * The console offers one statewide number; the domain wants a figure per
 * District, because that is where a capacity failure actually happens. An even
 * split is an assumption and is stated as one wherever the projection is shown —
 * it is not a claim about where ASDMA would put the camps. The remainder goes to
 * the districts in name order so the same lever always yields the same
 * projection.
 */
export const distributeAdditionalCamps = (
  additional: number,
  report: FloodSituationReport,
): ReadonlyMap<DistrictName, number> => {
  const districts = [...report.districts]
    .map((district) => district.district)
    .sort((a, b) => a.localeCompare(b));

  const allocation = new Map<DistrictName, number>();
  if (additional <= 0 || districts.length === 0) return allocation;

  const whole = Math.floor(additional / districts.length);
  let remainder = additional - whole * districts.length;
  for (const district of districts) {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    allocation.set(district, whole + extra);
  }
  return allocation;
};

export const leversFrom = (
  levers: ScenarioLeversViewModel,
  report: FloodSituationReport,
): ScenarioLevers =>
  scenarioLevers({
    populationGrowthFactor: 1 + levers.populationGrowthPercent / 100,
    campUptakeShift: { kind: 'to-rate', rate: levers.campUptakePercent / 100 },
    durationDays: levers.durationDays,
    rationNormKgPerPersonPerDay: levers.rationNormKgPerPersonPerDay,
    additionalCampCapacity: distributeAdditionalCamps(levers.additionalCampCapacity, report),
  });

/**
 * The user's assumptions, in one place.
 *
 * Everything here is arguable by design (PRD §4.5): the ration norm, the
 * severity weights, the scenario levers and the camp capacity are *not* ASDMA
 * figures, and the product's credibility depends on an officer being able to
 * change each of them and watch the derived figures move. They therefore live
 * as state in the composition root and travel into the mapper as data, rather
 * than being buried as constants inside a domain service.
 */

import {
  DEFAULT_SEVERITY_WEIGHTS,
  type ScenarioLeversViewModel,
  type SeverityWeights,
} from '../adapters/ui/view-models';

/**
 * People per Relief Camp, for the scenario's capacity failure analysis.
 *
 * ASDMA reports camps and inmates but never a capacity, so this is our
 * assumption and is stated rather than hidden. 200 is the order of magnitude
 * implied by the reported 319 inmates per camp already being described as
 * overcrowding.
 */
export const DEFAULT_CAMP_CAPACITY_PER_CAMP = 200;

/** SDRF relief-norm convention. An assumption, not a fact. */
export const DEFAULT_RATION_NORM_KG = 0.6;

export const DEFAULT_SCENARIO_LEVERS: ScenarioLeversViewModel = {
  populationGrowthPercent: 30,
  campUptakePercent: 25,
  durationDays: 5,
  rationNormKgPerPersonPerDay: DEFAULT_RATION_NORM_KG,
  additionalCampCapacity: 0,
};

export type ConsoleAssumptions = {
  readonly severityWeights: SeverityWeights;
  /** Kilograms of rice per person per day, for Ration Coverage Days. */
  readonly rationNormKgPerPersonPerDay: number;
  readonly levers: ScenarioLeversViewModel;
  readonly campCapacityPerCamp: number;
};

export const DEFAULT_ASSUMPTIONS: ConsoleAssumptions = {
  severityWeights: DEFAULT_SEVERITY_WEIGHTS,
  rationNormKgPerPersonPerDay: DEFAULT_RATION_NORM_KG,
  levers: DEFAULT_SCENARIO_LEVERS,
  campCapacityPerCamp: DEFAULT_CAMP_CAPACITY_PER_CAMP,
};

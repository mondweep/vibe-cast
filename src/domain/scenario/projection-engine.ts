/**
 * Scenario Planning — the `ProjectionEngine` domain service (PRD §5.5).
 *
 * `project(report, levers, deps)` is a pure function: no I/O, no clock, no
 * randomness. Given the same bulletin and the same levers it returns the same
 * numbers, for ever. That is not an aesthetic preference — it is what makes the
 * flagship screen defensible, because any officer can rerun it and get the same
 * answer.
 *
 * The two ratio calculations the engine needs — camp load and ration coverage —
 * belong to the Response Capacity context, so they arrive as injected
 * collaborators rather than being reimplemented here. The engine's own job is
 * to work out *what to ask*: the perturbed affected population, the perturbed
 * inmate count, and the rice stock converted out of quintals.
 *
 * Rounding convention: head-counts are floored, because a fraction of a person
 * is not a person and rounding displaced people *up* invents them. Ratios
 * (camp load, coverage days) keep full precision and are rounded only for
 * display.
 */

import {
  count,
  quintalsToKilograms,
  sumQuantities,
  unknownCount,
  valueOf,
} from '../shared/quantity';
import type { Count, Kilograms, Quintals } from '../shared/quantity';
import type { DistrictName } from '../shared/administrative-unit';
import type {
  BulletinId,
  DistrictReport,
  FloodSituationReport,
  ReportDate,
} from '../shared/flood-situation-report';
import {
  days,
  formatDecimal,
  formatInteger,
  formatPercent,
  kilogramsPerDay,
  personsPerCamp,
  projected,
  rate as asRate,
  statedDerivation,
  unknownDays,
  unknownKilogramsPerDay,
  unknownPersonsPerCamp,
  unknownRate,
} from './derivation';
import type {
  Days,
  Derivation,
  DerivationInput,
  KilogramsPerDay,
  PersonsPerCamp,
  ProjectedFigure,
  Rate,
} from './derivation';
import type { CampUptakeShift, ScenarioLevers } from './scenario';

// ---------------------------------------------------------------------------
// Injected collaborators (Response Capacity context)
// ---------------------------------------------------------------------------

export type RationCoverageInput = {
  readonly riceStockKg: number;
  readonly inmates: number;
  readonly rationNormKgPerPersonPerDay: number;
};

export type CampLoadInput = {
  readonly inmates: number;
  readonly reliefCamps: number;
};

export type ProjectionDependencies = {
  /** (Rice Q × 100 kg) ÷ (Inmates × norm). `undefined` where it cannot be computed. */
  readonly rationCoverageDays: (input: RationCoverageInput) => number | undefined;
  /** Inmates ÷ Relief Camps. `undefined` where there are no camps to divide across. */
  readonly campLoad: (input: CampLoadInput) => number | undefined;
};

// ---------------------------------------------------------------------------
// Outcome shape
// ---------------------------------------------------------------------------

/** The reported figures, kept alongside the projection so FR-4.3 is structural. */
export type BaselineSnapshot = {
  readonly affected: Count;
  readonly inmates: Count;
  readonly reliefCamps: Count;
  readonly uptakeRate: Rate;
  readonly campLoad: PersonsPerCamp;
  readonly riceStockKilograms: Kilograms;
  readonly rationCoverage: Days;
};

export type ProjectedUnit = {
  readonly baseline: BaselineSnapshot;
  /** Reported camps plus any the scenario opens. */
  readonly reliefCampsAvailable: Count;
  readonly projectedAffected: ProjectedFigure<Count>;
  readonly projectedInmates: ProjectedFigure<Count>;
  readonly projectedCampLoad: ProjectedFigure<PersonsPerCamp>;
  readonly projectedDailyRiceDemand: ProjectedFigure<KilogramsPerDay>;
  readonly rationCoverage: ProjectedFigure<Days>;
};

export type ProjectedDistrictOutcome = ProjectedUnit & { readonly district: DistrictName };

export type ProjectionRecipe = {
  readonly baselineBulletinId: BulletinId;
  readonly levers: ScenarioLevers;
};

/**
 * Marks an outcome as live rather than restored.
 *
 * PRD §5.5 invariant 2: a `ProjectedOutcome` is never persisted, so that a
 * stale projection cannot survive a data correction. The symbol key and the
 * `recomputedBy` function together make that structural: neither survives
 * `JSON.stringify`, and `structuredClone` refuses the function outright. An
 * outcome that came out of a store therefore fails `isProjectedOutcome` and
 * cannot be mistaken for one that was just computed.
 */
export const PROJECTION_IS_COMPUTED_ONLY: unique symbol = Symbol(
  'ProjectedOutcome.computedOnly',
);

export type ProjectedOutcome = {
  readonly [PROJECTION_IS_COMPUTED_ONLY]: true;
  readonly baselineBulletinId: BulletinId;
  readonly baselineReportDate: ReportDate;
  /** The scenario's `durationDays`, restated where the failure analysis needs it. */
  readonly horizonDays: number;
  readonly statewide: ProjectedUnit;
  readonly districts: readonly ProjectedDistrictOutcome[];
  readonly recomputedBy: () => ProjectionRecipe;
};

export const isProjectedOutcome = (candidate: unknown): candidate is ProjectedOutcome =>
  typeof candidate === 'object' &&
  candidate !== null &&
  (candidate as Record<symbol, unknown>)[PROJECTION_IS_COMPUTED_ONLY] === true &&
  typeof (candidate as { recomputedBy?: unknown }).recomputedBy === 'function';

// ---------------------------------------------------------------------------
// Plain-language phrasing
// ---------------------------------------------------------------------------

const STATEWIDE = 'Assam (statewide)';

const growthPhrase = (factor: number): string => {
  if (factor > 1) return `grown by ${formatPercent(factor - 1)}`;
  if (factor < 1) return `reduced by ${formatPercent(1 - factor)}`;
  return 'held at the reported level';
};

const uptakePhrase = (shift: CampUptakeShift, baselineUptake: number | undefined): string => {
  if (shift.kind === 'hold-baseline') {
    return `held at the reported ${formatPercent(baselineUptake)}`;
  }
  if (baselineUptake === undefined) return `set to ${formatPercent(shift.rate)}`;
  if (shift.rate > baselineUptake) {
    return `rises from the reported ${formatPercent(baselineUptake)} to ${formatPercent(shift.rate)}`;
  }
  if (shift.rate < baselineUptake) {
    return `falls from the reported ${formatPercent(baselineUptake)} to ${formatPercent(shift.rate)}`;
  }
  return `held at the reported ${formatPercent(baselineUptake)}`;
};

const horizonSentence = (coverage: number, durationDays: number): string =>
  coverage < durationDays
    ? `The scenario runs ${formatDecimal(durationDays, 0)} days, so rice is exhausted ` +
      `${formatDecimal(durationDays - coverage, 1)} days before it ends.`
    : `The scenario runs ${formatDecimal(durationDays, 0)} days, and the stock lasts the ` +
      `whole period.`;

// ---------------------------------------------------------------------------
// Projection of one reporting unit (a District, or the state as a whole)
// ---------------------------------------------------------------------------

type UnitBaseline = {
  readonly scope: string;
  readonly reportDate: ReportDate;
  readonly affected: Count;
  readonly inmates: Count;
  readonly reliefCamps: Count;
  readonly rice: Quintals;
  readonly additionalCamps: number;
};

const projectUnit = (
  unit: UnitBaseline,
  levers: ScenarioLevers,
  deps: ProjectionDependencies,
): ProjectedUnit => {
  const { scope, reportDate } = unit;
  const norm = levers.rationNorm.kgPerPersonPerDay;

  const baseAffected = valueOf(unit.affected);
  const baseInmates = valueOf(unit.inmates);
  const baseCamps = valueOf(unit.reliefCamps);
  const riceKilograms = quintalsToKilograms(unit.rice);
  const stockKg = valueOf(riceKilograms);
  const stockQuintals = valueOf(unit.rice);

  const baseUptake =
    baseAffected !== undefined && baseInmates !== undefined && baseAffected > 0
      ? baseInmates / baseAffected
      : undefined;
  const baseCampLoad =
    baseInmates !== undefined && baseCamps !== undefined
      ? deps.campLoad({ inmates: baseInmates, reliefCamps: baseCamps })
      : undefined;
  const baseCoverage =
    stockKg !== undefined && baseInmates !== undefined && baseInmates > 0
      ? deps.rationCoverageDays({
          riceStockKg: stockKg,
          inmates: baseInmates,
          rationNormKgPerPersonPerDay: norm,
        })
      : undefined;

  const baseline: BaselineSnapshot = {
    affected: unit.affected,
    inmates: unit.inmates,
    reliefCamps: unit.reliefCamps,
    uptakeRate: baseUptake === undefined ? unknownRate() : asRate(baseUptake),
    campLoad: baseCampLoad === undefined ? unknownPersonsPerCamp() : personsPerCamp(baseCampLoad),
    riceStockKilograms: riceKilograms,
    rationCoverage: baseCoverage === undefined ? unknownDays() : days(baseCoverage),
  };

  const campsAvailable =
    baseCamps === undefined ? undefined : baseCamps + unit.additionalCamps;

  // --- affected -----------------------------------------------------------
  const projAffected =
    baseAffected === undefined
      ? undefined
      : Math.floor(baseAffected * levers.populationGrowthFactor);

  const affectedInputs: readonly DerivationInput[] = [
    { label: 'Reported affected population', value: formatInteger(baseAffected), source: 'reported' },
    {
      label: 'Population growth',
      value: `× ${formatDecimal(levers.populationGrowthFactor, 3)}`,
      source: 'lever',
    },
  ];
  const affectedDerivation: Derivation = statedDerivation(
    'projected affected population',
    projAffected === undefined
      ? `Affected population cannot be projected — it was not reported for ${scope} in the ` +
          `${reportDate} bulletin, and a figure that was not reported is not a zero.`
      : `${formatInteger(projAffected)} people projected affected — the ` +
          `${formatInteger(baseAffected)} reported by ASDMA on ${reportDate}, ` +
          `${growthPhrase(levers.populationGrowthFactor)} under this scenario.`,
    affectedInputs,
  );

  // --- inmates ------------------------------------------------------------
  const projUptake =
    levers.campUptakeShift.kind === 'to-rate' ? levers.campUptakeShift.rate : baseUptake;
  // Nobody affected means nobody sheltering, whatever the uptake rate is —
  // 0 × anything is 0, and calling that "unknown" would be false modesty.
  const projInmates =
    projAffected === undefined
      ? undefined
      : projAffected === 0
        ? 0
        : projUptake === undefined
          ? undefined
          : Math.floor(projAffected * projUptake);

  const inmatesUnavailableReason =
    projAffected === undefined
      ? 'the affected population it would be applied to is not known'
      : 'camp uptake was not reported in the baseline bulletin, so it cannot be held';
  const inmatesDerivation: Derivation = statedDerivation(
    'projected relief camp inmates',
    projInmates === undefined
      ? `Camp inmates cannot be projected for ${scope} — ${inmatesUnavailableReason}.`
      : projAffected === 0
        ? `No inmates projected — no affected population is projected for ${scope}, so nobody ` +
          `needs sheltering.`
        : `${formatInteger(projInmates)} inmates projected — camp uptake ` +
          `${uptakePhrase(levers.campUptakeShift, baseUptake)}, applied to ` +
          `${formatInteger(projAffected)} projected affected people.`,
    [
      { label: 'Reported camp uptake', value: formatPercent(baseUptake), source: 'reported' },
      { label: 'Scenario camp uptake', value: formatPercent(projUptake), source: 'lever' },
      {
        label: 'Projected affected population',
        value: formatInteger(projAffected),
        source: 'derived',
      },
    ],
  );

  // --- camp load ----------------------------------------------------------
  const projCampLoad =
    projInmates === undefined || campsAvailable === undefined
      ? undefined
      : deps.campLoad({ inmates: projInmates, reliefCamps: campsAvailable });

  const campLoadComparison =
    baseCampLoad === undefined
      ? '. The reported camp load is not available for comparison.'
      : `, against ${formatInteger(baseCampLoad)} per camp reported.`;
  const campLoadUnavailableReason =
    projInmates === undefined
      ? 'projected inmate numbers are not known'
      : campsAvailable === undefined
        ? 'the number of relief camps was not reported'
        : 'no relief camps are open, so there is nothing to divide the inmates across';
  const campLoadDerivation: Derivation = statedDerivation(
    'projected camp load',
    projCampLoad === undefined
      ? `Camp load cannot be projected for ${scope} — ${campLoadUnavailableReason}.`
      : `${formatInteger(projCampLoad)} inmates per relief camp — ${formatInteger(projInmates)} ` +
          `projected inmates across ${formatInteger(campsAvailable)} relief camps` +
          campLoadComparison,
    [
      { label: 'Projected inmates', value: formatInteger(projInmates), source: 'derived' },
      { label: 'Reported relief camps', value: formatInteger(baseCamps), source: 'reported' },
      {
        label: 'Additional relief camps',
        value: formatInteger(unit.additionalCamps),
        source: 'lever',
      },
    ],
  );

  // --- daily rice demand --------------------------------------------------
  const dailyDemand = projInmates === undefined ? undefined : projInmates * norm;
  const demandDerivation: Derivation = statedDerivation(
    'projected daily rice demand',
    dailyDemand === undefined
      ? `Daily rice demand cannot be projected for ${scope} — projected inmate numbers are not known.`
      : `${formatInteger(dailyDemand)} kg of rice per day — ${formatInteger(projInmates)} ` +
          `projected inmates, each eating ${formatDecimal(norm, 2)} kg a day.`,
    [
      { label: 'Projected inmates', value: formatInteger(projInmates), source: 'derived' },
      {
        label: 'Ration norm',
        value: `${formatDecimal(norm, 2)} kg per person per day`,
        source: 'assumption',
      },
    ],
  );

  // --- ration coverage ----------------------------------------------------
  const coverage =
    projInmates !== undefined && projInmates > 0 && stockKg !== undefined
      ? deps.rationCoverageDays({
          riceStockKg: stockKg,
          inmates: projInmates,
          rationNormKgPerPersonPerDay: norm,
        })
      : undefined;

  const coverageUnavailableExplanation =
    projInmates === undefined
      ? `Ration coverage cannot be projected for ${scope} — projected inmate numbers are not known.`
      : projInmates === 0
        ? `No inmates are projected for ${scope}, so no rice is drawn down and there is no ` +
          `coverage period to report.`
        : stockKg === undefined
          ? `Ration coverage cannot be projected for ${scope} — the rice stock was not reported ` +
            `in the ${reportDate} bulletin, and an unreported stock is not an empty one.`
          : `Ration coverage cannot be projected for ${scope}.`;

  const coverageDerivation: Derivation = statedDerivation(
    'projected ration coverage',
    coverage === undefined
      ? coverageUnavailableExplanation
      : `Rice runs out in ${formatDecimal(coverage, 1)} days — camp uptake of ` +
          `${formatPercent(projUptake)} gives ${formatInteger(projInmates)} projected inmates, ` +
          `who eat ${formatDecimal(norm, 2)} kg of rice each per day: ` +
          `${formatInteger(dailyDemand)} kg/day of demand against ${formatInteger(stockKg)} kg ` +
          `in stock (${formatDecimal(stockQuintals, 2)} quintals × 100 kg). ` +
          horizonSentence(coverage, levers.durationDays),
    [
      { label: 'Rice in stock', value: `${formatInteger(stockKg)} kg`, source: 'reported' },
      {
        label: 'Ration norm',
        value: `${formatDecimal(norm, 2)} kg per person per day`,
        source: 'assumption',
      },
      { label: 'Scenario camp uptake', value: formatPercent(projUptake), source: 'lever' },
      { label: 'Scenario duration', value: `${formatDecimal(levers.durationDays, 0)} days`, source: 'lever' },
      { label: 'Projected inmates', value: formatInteger(projInmates), source: 'derived' },
      {
        label: 'Projected daily demand',
        value: `${formatInteger(dailyDemand)} kg/day`,
        source: 'derived',
      },
    ],
  );

  return {
    baseline,
    reliefCampsAvailable: campsAvailable === undefined ? unknownCount() : count(campsAvailable),
    projectedAffected: projected(
      projAffected === undefined ? unknownCount() : count(projAffected),
      affectedDerivation,
    ),
    projectedInmates: projected(
      projInmates === undefined ? unknownCount() : count(projInmates),
      inmatesDerivation,
    ),
    projectedCampLoad: projected(
      projCampLoad === undefined ? unknownPersonsPerCamp() : personsPerCamp(projCampLoad),
      campLoadDerivation,
    ),
    projectedDailyRiceDemand: projected(
      dailyDemand === undefined ? unknownKilogramsPerDay() : kilogramsPerDay(dailyDemand),
      demandDerivation,
    ),
    rationCoverage: projected(coverage === undefined ? unknownDays() : days(coverage), coverageDerivation),
  };
};

// ---------------------------------------------------------------------------
// The domain service
// ---------------------------------------------------------------------------

const districtBaseline = (
  district: DistrictReport,
  report: FloodSituationReport,
  levers: ScenarioLevers,
): UnitBaseline => ({
  scope: district.district,
  reportDate: report.reportDate,
  affected: district.population.total,
  inmates: district.campInmates.total,
  reliefCamps: district.reliefCamps,
  rice: district.relief.rice,
  additionalCamps: levers.additionalCampCapacity.get(district.district) ?? 0,
});

const totalAdditionalCamps = (levers: ScenarioLevers): number => {
  let total = 0;
  for (const extra of levers.additionalCampCapacity.values()) total += extra;
  return total;
};

/**
 * Project a bulletin forward under a set of scenario levers.
 *
 * Statewide figures come from ASDMA's own Total rows rather than from re-summing
 * the districts: the bulletin's stated total is ASDMA's number and stays ASDMA's
 * number (PRD §5.1 invariant 3). The one exception is rice, which the summary
 * does not break out statewide, so it is summed from the district rows — and an
 * unknown anywhere in that sum keeps the total unknown.
 */
export const project = (
  report: FloodSituationReport,
  levers: ScenarioLevers,
  deps: ProjectionDependencies,
): ProjectedOutcome => {
  const statewideRice = sumQuantities(
    'Q',
    report.districts.map((d) => d.relief.rice),
  ).total;

  const statewide = projectUnit(
    {
      scope: STATEWIDE,
      reportDate: report.reportDate,
      affected: report.statewideTotals.populationAffected,
      inmates: report.statewideTotals.campInmates,
      reliefCamps: report.statewideTotals.reliefCamps,
      rice: statewideRice,
      additionalCamps: totalAdditionalCamps(levers),
    },
    levers,
    deps,
  );

  const districts: readonly ProjectedDistrictOutcome[] = report.districts.map((district) => ({
    district: district.district,
    ...projectUnit(districtBaseline(district, report, levers), levers, deps),
  }));

  return {
    [PROJECTION_IS_COMPUTED_ONLY]: true,
    baselineBulletinId: report.bulletinId,
    baselineReportDate: report.reportDate,
    horizonDays: levers.durationDays,
    statewide,
    districts,
    recomputedBy: () => ({ baselineBulletinId: report.bulletinId, levers }),
  };
};

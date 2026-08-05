/**
 * UI view models — the driving adapter's own contract.
 *
 * The console is a driving adapter (ADR-0001): it receives everything it draws
 * as props. These types are derived from the published language in
 * `src/domain/shared`, but they are *ours*, so the composition root can map
 * domain → view model without the UI ever reaching into another context.
 *
 * Two rules run through every type here:
 *
 * 1. **Unknown is not zero.** Reported figures keep their `Quantity` shape, so
 *    a section that could not be read renders as "not reported", never as 0
 *    (PRD §5.1 invariant 4).
 * 2. **Derived is not reported.** Anything this product computed is a
 *    `DerivedFigure` carrying its formula and workings, so no officer mistakes
 *    our arithmetic for ASDMA's reporting (PRD §4.5).
 */

import type { Count, Hectares, Quantity, Quintals } from '../../domain/shared/quantity';
import { isKnown } from '../../domain/shared/quantity';
import type {
  DamageClass,
  ExtractionConfidence,
  SectionKind,
} from '../../domain/shared/flood-situation-report';
import type { GeoCoordinate } from '../../domain/shared/administrative-unit';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export type ConsoleViewKey =
  | 'situation'
  | 'ranking'
  | 'capacity'
  | 'map'
  | 'scenario'
  | 'trend'
  | 'period'
  | 'reconstruction';

export type ConsoleView = {
  readonly key: ConsoleViewKey;
  readonly label: string;
  /** The decision question (PRD §2.1) this view exists to answer. */
  readonly question: string;
};

export const CONSOLE_VIEWS: readonly ConsoleView[] = [
  {
    key: 'situation',
    label: 'Situation Summary',
    question: 'How many affected people are not in Relief Camps?',
  },
  {
    key: 'ranking',
    label: 'District Ranking',
    question: 'Which Districts are worst affected, and by what measure?',
  },
  {
    key: 'capacity',
    label: 'Response Capacity',
    question: 'How many days of rice remain at current Inmate counts?',
  },
  {
    key: 'map',
    label: 'Damage Map',
    question: 'Where is infrastructure damage concentrated?',
  },
  {
    key: 'scenario',
    label: 'Scenario Planner',
    question: "If the affected population grows, whose capacity fails first?",
  },
  {
    key: 'trend',
    label: 'Trend',
    question: "What changed since yesterday's bulletin?",
  },
  {
    key: 'period',
    label: 'Cumulative & Peak',
    question: 'Across every bulletin loaded, what has accumulated and what peaked when?',
  },
  {
    key: 'reconstruction',
    label: 'Reconstruction Cost',
    question: 'What would rebuilding cost, and does it remove the risk or repeat it?',
  },
];

// ---------------------------------------------------------------------------
// Provenance and data quality
// ---------------------------------------------------------------------------

export type ProvenanceRef = {
  readonly section: SectionKind;
  /** ASDMA's own section heading, e.g. "Inmates in Relief Camps". */
  readonly sectionLabel: string;
  readonly sourcePages: readonly number[];
  readonly confidence: ExtractionConfidence;
};

export const CONFIDENCE_LABELS: Record<ExtractionConfidence, string> = {
  high: 'High confidence',
  degraded: 'Degraded — reconciliation failed',
  failed: 'Could not read',
};

export type ReconciliationWarningViewModel = {
  readonly sectionLabel: string;
  readonly column: string;
  /** The Total row as printed by ASDMA. */
  readonly statedTotal: number;
  /** Our independent sum of the District rows. */
  readonly computedTotal: number;
};

export type SectionConfidenceViewModel = ProvenanceRef;

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

/** A figure exactly as ASDMA reported it. */
export type ReportedFigure = {
  readonly key: string;
  readonly label: string;
  readonly quantity: Quantity<string>;
  readonly precision?: number;
  readonly provenance?: ProvenanceRef;
  readonly note?: string;
};

/**
 * A figure this console computed. Never rendered without its formula.
 * `value === undefined` means the inputs were not reported — not zero.
 */
export type DerivedFigure = {
  readonly key: string;
  readonly label: string;
  readonly value: number | undefined;
  readonly precision?: number;
  readonly unit?: string;
  /** Symbolic form, e.g. "Affected Population − Inmates − Non-Camp Inmates". */
  readonly formula: string;
  /** Arithmetic with real numbers, e.g. "445,495 − 28,695 − 51,777 = 365,023". */
  readonly workings: string;
  /** One-line reading of what the number means for a decision. */
  readonly context?: string;
};

// ---------------------------------------------------------------------------
// Situation Summary
// ---------------------------------------------------------------------------

/**
 * One band of the shelter split. Patterns, not colours, carry the meaning —
 * colour is never the only channel (NFR-8).
 */
export type ShelterSegment = {
  readonly key: 'camp-inmates' | 'non-camp-inmates' | 'unsheltered';
  readonly label: string;
  readonly value: number | undefined;
  readonly share: number;
  readonly derived: boolean;
};

export type RiverPanelViewModel = {
  readonly aboveDangerLevel: readonly string[];
  readonly aboveHighestFloodLevel: readonly string[];
  /** e.g. "CWC bulletin issued 08:00". Attributed, never restated as ours. */
  readonly attribution: string;
};

export type CasualtiesViewModel = {
  readonly floodDeaths: Count;
  readonly generalDrownings: Count;
  readonly missing: Count;
  readonly confirmedProvenance?: ProvenanceRef;
  readonly missingProvenance?: ProvenanceRef;
};

export type SituationSummaryViewModel = {
  readonly reportDate: string;
  readonly generatedAt: string;
  readonly affectedPopulation: ReportedFigure;
  /** The headline gap. Given the same visual weight as the reported total. */
  readonly unshelteredAffected: DerivedFigure;
  /** Unsheltered ÷ Affected Population, as a fraction. 0.819 on 2026-07-27. */
  readonly unshelteredShare: number;
  readonly shelterSplit: readonly ShelterSegment[];
  readonly reportedFigures: readonly ReportedFigure[];
  readonly derivedMetrics: readonly DerivedFigure[];
  readonly rivers: RiverPanelViewModel;
  readonly casualties: CasualtiesViewModel;
  readonly reconciliationWarnings: readonly ReconciliationWarningViewModel[];
  readonly unreadableSections: readonly SectionConfidenceViewModel[];
};

// ---------------------------------------------------------------------------
// Severity index
// ---------------------------------------------------------------------------

export type SeverityComponentKey =
  | 'affectedPopulation'
  | 'villagesAffected'
  | 'cropArea'
  | 'campLoad'
  | 'casualties';

export type SeverityWeights = Record<SeverityComponentKey, number>;

/** PRD §6.3 — a stated starting point, not a claim of objectivity. */
export const DEFAULT_SEVERITY_WEIGHTS: SeverityWeights = {
  affectedPopulation: 0.35,
  villagesAffected: 0.15,
  cropArea: 0.15,
  campLoad: 0.2,
  casualties: 0.15,
};

export const SEVERITY_COMPONENT_LABELS: Record<SeverityComponentKey, string> = {
  affectedPopulation: 'Affected Population',
  villagesAffected: 'Villages Affected',
  cropArea: 'Crop Area Submerged',
  campLoad: 'Camp Load',
  casualties: 'Casualties',
};

export type SeverityContribution = {
  readonly component: SeverityComponentKey;
  readonly weight: number;
  /** Min–max normalised within this bulletin (FR-3.4). */
  readonly normalised: number;
  readonly contribution: number;
};

export type SeverityBand = {
  readonly label: 'Severe' | 'High' | 'Moderate' | 'Low';
  readonly rank: 1 | 2 | 3 | 4;
};

/** Severity is carried by text and bar length as well as colour (NFR-8). */
export const severityBand = (index: number): SeverityBand => {
  if (index >= 0.75) return { label: 'Severe', rank: 1 };
  if (index >= 0.5) return { label: 'High', rank: 2 };
  if (index >= 0.25) return { label: 'Moderate', rank: 3 };
  return { label: 'Low', rank: 4 };
};

// ---------------------------------------------------------------------------
// District ranking
// ---------------------------------------------------------------------------

export type DistrictSortKey =
  | 'severityIndex'
  | 'populationAffected'
  | 'villagesAffected'
  | 'cropAreaSubmerged'
  | 'campInmates'
  | 'campLoad';

export type SortDirection = 'asc' | 'desc';

export type RevenueCircleRowViewModel = {
  readonly circle: string;
  readonly villagesAffected: Count;
  readonly populationAffected: Count;
  readonly cropAreaSubmerged: Hectares;
  readonly reliefCamps: Count;
  readonly reliefDistributionCentres: Count;
  readonly campInmates: Count;
  readonly nonCampInmates: Count;
  /** Inmates ÷ Relief Camps. Derived. */
  readonly campLoad: number | undefined;
};

export type DistrictRowViewModel = {
  readonly district: string;
  readonly rank: number;
  readonly severityIndex: number;
  readonly contributions: readonly SeverityContribution[];
  readonly populationAffected: Count;
  readonly villagesAffected: Count;
  readonly cropAreaSubmerged: Hectares;
  readonly campInmates: Count;
  readonly reliefCamps: Count;
  readonly campLoad: number | undefined;
  readonly casualties: CasualtiesViewModel;
  readonly revenueCircles: readonly RevenueCircleRowViewModel[];
  /**
   * Dhemaji and Dibrugarh report all-zero rows: reported and quiet, not
   * absent. The distinction is preserved (PRD §4.1).
   */
  readonly status: 'affected' | 'reported-quiet';
  readonly provenance?: ProvenanceRef;
};

// ---------------------------------------------------------------------------
// Response capacity
// ---------------------------------------------------------------------------

export type ResponseRowViewModel = {
  readonly district: string;
  readonly reliefCamps: Count;
  readonly reliefDistributionCentres: Count;
  readonly campInmates: Count;
  readonly nonCampInmates: Count;
  readonly campLoad: number | undefined;
  readonly rationCoverageDays: number | undefined;
  readonly vulnerableLoad: number | undefined;
};

export type ResponseCapacityViewModel = {
  readonly riceStock: Quintals;
  readonly campInmates: Count;
  readonly reliefCamps: Count;
  readonly reliefDistributionCentres: Count;
  readonly nonCampInmates: Count;
  readonly campLoad: DerivedFigure;
  readonly rationCoverageDays: DerivedFigure;
  readonly vulnerableLoad: DerivedFigure;
  readonly rescueAssetRatio: DerivedFigure;
  readonly districts: readonly ResponseRowViewModel[];
};

// ---------------------------------------------------------------------------
// Damage map
// ---------------------------------------------------------------------------

export const DAMAGE_CLASS_LABELS: Record<DamageClass, string> = {
  road: 'Road',
  bridge: 'Bridge',
  'embankment-breached': 'Embankment Breached',
  'embankment-affected': 'Embankment Affected',
  'school-elementary': 'School — Elementary',
  'school-secondary': 'School — Secondary',
  anganwadi: 'Anganwadi Centre',
  other: 'Other',
};

export type DamagePointViewModel = {
  readonly id: string;
  readonly damageClass: DamageClass;
  readonly district: string;
  readonly circle: string;
  readonly name: string;
  readonly coordinate: GeoCoordinate;
};

// ---------------------------------------------------------------------------
// Scenario planning
// ---------------------------------------------------------------------------

export type ScenarioLeversViewModel = {
  /** Percentage growth applied to Affected Population, e.g. 30. */
  readonly populationGrowthPercent: number;
  /** Target Camp Uptake Rate as a percentage, e.g. 25. */
  readonly campUptakePercent: number;
  readonly durationDays: number;
  readonly rationNormKgPerPersonPerDay: number;
  readonly additionalCampCapacity: number;
};

export type ScenarioComparisonRow = {
  readonly key: string;
  readonly metric: string;
  /** Baseline as reported/derived from the anchoring bulletin. */
  readonly baseline: string;
  readonly projected: string;
  /** Plain-language provenance of the projected figure (FR-4.6). */
  readonly derivation: string;
  readonly direction: 'worse' | 'better' | 'unchanged';
};

export type FirstFailurePointViewModel = {
  readonly district: string;
  readonly description: string;
  readonly dayIndex: number | undefined;
};

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------

export type TrendMetricKey =
  | 'affectedPopulation'
  | 'campInmates'
  | 'unshelteredAffected'
  | 'reliefCamps'
  | 'cropAreaSubmerged'
  | 'floodDeaths';

export type TrendMetric = {
  readonly key: TrendMetricKey;
  readonly label: string;
  readonly derived: boolean;
  /** Decimal places. Crop Area Submerged is the only fractional series. */
  readonly precision?: number;
  /** Present only on a derived series; shown in its badge. */
  readonly formula?: string;
  readonly workings?: string;
};

export const TREND_METRICS: readonly TrendMetric[] = [
  { key: 'affectedPopulation', label: 'Population Affected', derived: false },
  { key: 'campInmates', label: 'Inmates in Relief Camps', derived: false },
  {
    key: 'unshelteredAffected',
    label: 'Unsheltered Affected',
    derived: true,
    formula: 'Affected Population − Inmates − Non-Camp Inmates',
    workings: 'Computed per bulletin, then plotted.',
  },
  { key: 'reliefCamps', label: 'Relief Camps', derived: false },
  { key: 'cropAreaSubmerged', label: 'Crop Area Submerged', derived: false, precision: 2 },
  { key: 'floodDeaths', label: 'Human Lives Lost — Flood', derived: false },
];

export type TrendObservation = {
  readonly date: string;
  readonly value: number | undefined;
};

export type TimelineGapViewModel = {
  /** Last bulletin before the gap. */
  readonly afterDate: string;
  /** First bulletin after the gap. */
  readonly beforeDate: string;
  readonly missingDates: readonly string[];
};

export type DeltaViewModel = {
  readonly metricLabel: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly from: number | undefined;
  readonly to: number | undefined;
  readonly delta: number | undefined;
  readonly direction: 'up' | 'down' | 'unchanged' | 'unknown';
  readonly derived: boolean;
};

// ---------------------------------------------------------------------------
// Cumulative and peak, across every loaded bulletin
// ---------------------------------------------------------------------------

/**
 * Whether a figure may legally be totalled across bulletins.
 *
 * Mirrors `MeasureKind` in the Temporal Comparison context, restated as the
 * UI's own type (ADR-0001). It is carried into the view model rather than
 * inferred from which table a row happens to sit in, so the console can *say*
 * why a stock has no total instead of leaving a blank cell.
 */
export type PeriodFigureKind = 'flow' | 'stock';

export type PeriodCompleteness = 'complete' | 'partial' | 'unavailable';

export type PeriodCoverageViewModel = {
  readonly bulletinCount: number;
  readonly fromDate: string | undefined;
  readonly toDate: string | undefined;
  readonly missingDates: readonly string[];
  /** "11 bulletins, 2026-07-20 to 2026-07-30, no days missing". */
  readonly description: string;
};

export type PeriodFigureViewModel = {
  readonly key: string;
  /** ASDMA's own heading for the measure. */
  readonly label: string;
  readonly kind: PeriodFigureKind;
  readonly precision: number;
  /** Why the measure is a flow or a stock, in words. */
  readonly rationale: string;
  /** The highest single bulletin, and the day it was reported. */
  readonly peak: number | undefined;
  readonly peakDate: string | undefined;
  readonly latest: number | undefined;
  readonly latestDate: string | undefined;
  /**
   * Present only on a flow. A stock has no cumulative — not because the number
   * is unavailable, but because it would be meaningless.
   */
  readonly cumulative?: number | undefined;
  /** The sum with real numbers in it: "5 + 21 + 9 + 4 + 2 + 0 = 41". */
  readonly cumulativeWorkings?: string;
  readonly completeness: PeriodCompleteness;
  /** The sentence that must travel with the figure. Never empty. */
  readonly caveat: string;
};

export type PeriodSummaryViewModel = {
  readonly coverage: PeriodCoverageViewModel;
  /** Flows: totalled across the period. */
  readonly cumulative: readonly PeriodFigureViewModel[];
  /** Stocks: peak and latest only. */
  readonly peaks: readonly PeriodFigureViewModel[];
  /** Stocks integrated over the period, in person-days (ADR-0012). */
  readonly exposure: readonly PeriodExposureViewModel[];
  /** Distributed relief against that exposure — the model's one real check. */
  readonly backTest: readonly PeriodBackTestViewModel[];
  /** Constructed replacement cost (ADR-0014). Never a point estimate. */
  readonly replacement: PeriodReplacementViewModel;
};

/**
 * A constructed cost, with the whole argument attached.
 *
 * Structurally different from every other figure view model here, and
 * deliberately so. It has `low`/`central`/`high` instead of a single value,
 * because ADR-0014 bans point estimates for constructed figures — a template
 * cannot render this compactly by accident. It also carries its inputs, so the
 * derivation cannot be dropped on the way to the screen.
 */
export type PeriodReplacementViewModel = {
  readonly label: string;
  /** How many units the cost is applied to, e.g. houses fully damaged. */
  readonly quantity: number | undefined;
  readonly quantityLabel: string;
  /** Per unit. */
  readonly unitLow: number;
  readonly unitCentral: number;
  readonly unitHigh: number;
  /** Quantity × the above. `undefined` when the quantity is unknown. */
  readonly totalLow: number | undefined;
  readonly totalCentral: number | undefined;
  readonly totalHigh: number | undefined;
  readonly formula: string;
  readonly inputs: readonly PeriodDerivationInputViewModel[];
  /** Interval width over centre, as a percentage — how much is judgement. */
  readonly judgementSharePercent: number;
  readonly caveat: string;
  /** Why a Kuccha dwelling has no figure. Rendered, not hidden. */
  readonly notCosted: string;
  /** The share of destroyed dwellings that were Kuccha — why policy dominates. */
  readonly kucchaSharePercent: number | undefined;
  /** Per-dwelling cost of the raised plinth, central. */
  readonly plinthCentral: number;
  /** All three policies, shown together. Never one, never a default that hides the rest. */
  readonly policies: readonly PeriodPolicyViewModel[];
  /** How reconstruction compares with a publicly demanded compensation figure. */
  readonly benchmark: PeriodBenchmarkViewModel;
};

/**
 * A stated compensation demand, set beside reconstruction.
 *
 * Carries both denominators as first-class fields rather than only the totals,
 * because the denominators are the finding: a reader given two totals and no
 * household counts will conclude the demand is extravagant, when almost all of
 * the difference is that it reaches far more households.
 */
export type PeriodBenchmarkViewModel = {
  readonly label: string;
  readonly source: string;
  readonly amountPerHousehold: number;
  readonly dwellingsDestroyed: number | undefined;
  readonly householdsAffected: number | undefined;
  readonly householdSize: number;
  readonly notDestroyedSharePercent: number | undefined;
  readonly demandAcrossAffectedLow: number | undefined;
  readonly demandAcrossAffectedCentral: number | undefined;
  readonly demandAcrossAffectedHigh: number | undefined;
  readonly demandAcrossDestroyed: number | undefined;
  readonly reconstructionLow: number | undefined;
  readonly reconstructionCentral: number | undefined;
  readonly reconstructionHigh: number | undefined;
  readonly perHouseholdMultiple: number | undefined;
  readonly caveat: string;
};

/**
 * One reconstruction policy, costed.
 *
 * `riskEffect` sits alongside the cost and is never optional. A table of
 * policies showing only money would make the cheapest look like the best, when
 * the cheapest is precisely the one that rebuilds the vulnerability.
 */
export type PeriodPolicyViewModel = {
  readonly key: string;
  readonly label: string;
  readonly summary: string;
  readonly riskEffect: string;
  readonly totalLow: number | undefined;
  readonly totalCentral: number | undefined;
  readonly totalHigh: number | undefined;
  readonly uncostedDwellings: number | undefined;
  readonly isFloor: boolean;
  readonly caveat: string;
};

export type PeriodDerivationInputViewModel = {
  readonly kind: 'published' | 'assumed';
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  /** Assumed inputs only. */
  readonly low?: number;
  readonly high?: number;
  readonly reason?: string;
  /** Published inputs only — the SOR item it came from. */
  readonly citation?: string;
};

/**
 * One implied ration rate, from relief actually distributed.
 *
 * Deliberately has no "expected" or "shortfall" field. What was handed out and
 * what people were owed are different facts, and putting them in one row would
 * turn a sanity check into a compliance finding it has no standing to make.
 */
export type PeriodBackTestViewModel = {
  /** Which population the rate assumes was fed, e.g. "Camp inmates". */
  readonly basis: string;
  /** `undefined`, never 0, when the quantity or the exposure is unknown. */
  readonly kgPerPersonPerDay: number | undefined;
  /** The division with real numbers in it. */
  readonly workings: string;
  readonly caveat: string;
};

/**
 * A stock integrated across the period — camp-inmate-days and the like.
 *
 * A separate view-model type from `PeriodFigureViewModel`, on purpose. Person-
 * days and headcounts must not share a row shape, because sharing one is how a
 * template ends up rendering 302,253 person-days under a column heading that
 * says people. `unit` is required and carried through to the markup so the
 * figure cannot be printed bare.
 */
export type PeriodExposureViewModel = {
  readonly key: string;
  /** ASDMA's heading for the underlying stock, e.g. "Inmates in Relief Camps". */
  readonly label: string;
  /** Always `'person-days'`. Present so a renderer cannot omit it by default. */
  readonly unit: string;
  /** `undefined`, never 0, when no loaded bulletin reported the stock. */
  readonly personDays: number | undefined;
  /** How many bulletins contributed a level to the integral. */
  readonly daysCounted: number;
  /** The sum with real numbers in it: "100 + 150 = 250". */
  readonly workings: string;
  readonly completeness: PeriodCompleteness;
  readonly caveat: string;
};

export const PERIOD_COMPLETENESS_LABELS: Record<PeriodCompleteness, string> = {
  complete: 'Every loaded bulletin reported this',
  partial: 'Incomplete — see the note',
  unavailable: 'Not reported by any loaded bulletin',
};

// ---------------------------------------------------------------------------
// The bundled archive
// ---------------------------------------------------------------------------

/**
 * How much of the console's own bulletin archive has arrived.
 *
 * The console ships with eleven consecutive real ASDMA bulletins. Only the
 * newest is in the entry chunk; the other ten are fetched immediately after
 * first paint, so there is a short window in which the console holds one
 * bulletin and is about to hold eleven (NFR-4).
 *
 * That window has to be *said*, not papered over. Rendering "1 bulletin loaded
 * — load an earlier PDF to compare" and then silently replacing it a moment
 * later teaches an officer that the console's own account of what it holds is
 * unreliable. So `loading` is a state the views draw, in words.
 *
 *  - `loading`     the archive chunk is in flight
 *  - `ready`       all eleven are in the timeline
 *  - `unavailable` the fetch failed; the console says so and carries on with
 *                  the one bulletin it has, rather than pretending to history
 *  - `cleared`     the officer asked for their own bulletins only
 */
export type BundledArchiveStatus = 'loading' | 'ready' | 'unavailable' | 'cleared';

export type BundledArchiveViewModel = {
  readonly status: BundledArchiveStatus;
  /** First and last day the bundle covers. Known before the archive arrives. */
  readonly fromDate: string;
  readonly toDate: string;
  /** Bulletins the console ships with in total, archive and eager together. */
  readonly bundledCount: number;
  /** Still in flight. 7 while loading, 0 afterwards. */
  readonly pendingCount: number;
  /**
   * How many bundled bulletins are actually in the timeline right now — after
   * any the officer has superseded with their own copy, and 0 once cleared.
   */
  readonly contributingCount: number;
  /**
   * Drops the bundled archive, leaving the officer's own bulletins alone.
   * `undefined` when they hold nothing of their own, because an empty console
   * is not an improvement on real history.
   */
  readonly onClear?: () => void;
};

// ---------------------------------------------------------------------------
// Bulletin loading
// ---------------------------------------------------------------------------

export type BulletinLoaderState =
  | { readonly status: 'idle' }
  | { readonly status: 'parsing'; readonly fileName: string }
  | { readonly status: 'error'; readonly message: string; readonly fileName?: string }
  | {
      readonly status: 'loaded';
      readonly fileName: string;
      readonly reportDate: string;
      readonly sections: readonly SectionConfidenceViewModel[];
      readonly reconciliationWarnings: readonly ReconciliationWarningViewModel[];
    };

// ---------------------------------------------------------------------------
// Bulletin age
// ---------------------------------------------------------------------------

/**
 * Mirrors `StalenessLevel` in the Temporal Comparison context, restated as the
 * UI's own type so the console never reaches into a bounded context (ADR-0001).
 * The composition root maps one to the other, exhaustively, so a new band in
 * the domain is a compile error here rather than a level that silently renders
 * as nothing.
 */
export type BulletinAgeLevel = 'current' | 'ageing' | 'stale' | 'obsolete' | 'unknown';

/**
 * Where the bulletin on screen came from.
 *
 * A bulletin the officer loaded that happens to be old is a different situation
 * from one out of the archive the console ships with, and the two must not read
 * the same: one means "your source is out of date", the other means "this is
 * the history that came with the console, and nothing newer has been loaded".
 */
export type BulletinOrigin = 'bundled-archive' | 'loaded';

export type BulletinAgeViewModel = {
  readonly level: BulletinAgeLevel;
  /** Whole days. `undefined`, never 0, when the age is not knowable. */
  readonly ageDays: number | undefined;
  /** ISO date of the bulletin, or `undefined` if it carries none. */
  readonly reportDate: string | undefined;
  /** ISO date the age was judged against. */
  readonly asOf: string | undefined;
  readonly datedInFuture: boolean;
  /** False once the figures must not drive a decision taken today. */
  readonly safeForCurrentDecisions: boolean;
  readonly origin: BulletinOrigin;
};

/** The level in words. Colour is never the only channel (NFR-8). */
export const BULLETIN_AGE_LABELS: Record<BulletinAgeLevel, string> = {
  current: 'Current',
  ageing: 'Ageing',
  stale: 'Stale',
  obsolete: 'Out of date',
  unknown: 'Age not known',
};

/**
 * A distinct shape per level, so the banner survives a washed-out projector and
 * a greyscale print. Shapes, not colour swatches: a filled disc, a half disc, a
 * triangle, a square, a question mark are all told apart by outline alone.
 */
export const BULLETIN_AGE_MARKS: Record<BulletinAgeLevel, string> = {
  current: '●',
  ageing: '◐',
  stale: '▲',
  obsolete: '■',
  unknown: '?',
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** What we print when the source did not report a value. Never "0". */
export const NOT_REPORTED = '—';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * `2026-07-27` → `27 July 2026`.
 *
 * Written out rather than passed to `toLocaleDateString` so the console reads
 * identically on every machine in the control room, and so a test asserting the
 * copy is not asserting the test runner's locale. Day-first matches how ASDMA
 * prints the date on the bulletin itself (`27-07-2026`).
 */
export const formatReportDateLong = (iso: string | undefined): string | undefined => {
  if (iso === undefined) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) return undefined;
  const month = MONTH_NAMES[Number(match[2]) - 1];
  if (month === undefined) return undefined;
  return `${String(Number(match[3]))} ${month} ${match[1]}`;
};

const UNIT_SUFFIX: Record<string, string> = {
  count: '',
  Hect: ' Hect.',
  Q: ' Q',
  L: ' L',
  kg: ' kg',
};

/**
 * Grouped to three digits, matching the bulletin's own presentation
 * (445,495) so a figure can be found by eye in the PDF.
 */
export const formatNumber = (value: number, dp = 0): string => {
  if (!Number.isFinite(value)) return NOT_REPORTED;
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(dp);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = fraction ? `${grouped}.${fraction}` : grouped;
  return negative ? `-${body}` : body;
};

export const formatQuantity = (quantity: Quantity<string>, dp = 0): string =>
  isKnown(quantity)
    ? `${formatNumber(quantity.value, dp)}${UNIT_SUFFIX[quantity.unit] ?? ` ${quantity.unit}`}`
    : NOT_REPORTED;

export const formatReported = (figure: ReportedFigure): string =>
  formatQuantity(figure.quantity, figure.precision ?? 0);

export const formatDerived = (figure: DerivedFigure): string => {
  if (figure.value === undefined) return NOT_REPORTED;
  const body = formatNumber(figure.value, figure.precision ?? 0);
  return figure.unit ? `${body} ${figure.unit}` : body;
};

export const formatPercent = (fraction: number | undefined, dp = 1): string =>
  fraction === undefined || !Number.isFinite(fraction)
    ? NOT_REPORTED
    : `${formatNumber(fraction * 100, dp)}%`;

export const isReported = (quantity: Quantity<string>): boolean => isKnown(quantity);

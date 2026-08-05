/**
 * Fixtures for the UI tests.
 *
 * The statewide figures are the real 2026-07-27 bulletin (PRD Appendix B) —
 * 445,495 affected, 28,695 Inmates, 51,777 Non-Camp Inmates, 365,023
 * unsheltered. The per-District breakdowns are illustrative apart from
 * Sivasagar's 144,461, which is also real; the tests care about behaviour, not
 * about reproducing every row of the PDF.
 *
 * Not a test file (no `.test.` in the name), so the `ui` vitest project does
 * not try to run it.
 */

import { count, hectares, quintals } from '../../domain/shared/quantity';
import { geoCoordinate, type GeoCoordinate } from '../../domain/shared/administrative-unit';
import type {
  CasualtiesViewModel,
  DamagePointViewModel,
  DeltaViewModel,
  DerivedFigure,
  DistrictRowViewModel,
  PeriodCoverageViewModel,
  PeriodSummaryViewModel,
  ProvenanceRef,
  ResponseCapacityViewModel,
  ScenarioComparisonRow,
  ScenarioLeversViewModel,
  SituationSummaryViewModel,
  TimelineGapViewModel,
  TrendObservation,
} from './view-models';

const coord = (longitude: number, latitude: number): GeoCoordinate => {
  const built = geoCoordinate(longitude, latitude);
  if (!built) throw new Error(`fixture coordinate outside Assam: ${longitude},${latitude}`);
  return built;
};

export const populationProvenance: ProvenanceRef = {
  section: 'population-and-crop-area-submerged',
  sectionLabel: 'Population and Crop Area Submerged',
  sourcePages: [1, 2],
  confidence: 'high',
};

export const inmatesProvenance: ProvenanceRef = {
  section: 'inmates-in-relief-camps',
  sectionLabel: 'Inmates in Relief Camps',
  sourcePages: [2],
  confidence: 'high',
};

export const degradedProvenance: ProvenanceRef = {
  section: 'animals-affected',
  sectionLabel: 'Animals Affected',
  sourcePages: [3],
  confidence: 'degraded',
};

export const failedProvenance: ProvenanceRef = {
  section: 'infrastructure-others',
  sectionLabel: 'Infrastructure Damaged — Others',
  sourcePages: [12, 13],
  confidence: 'failed',
};

export const unshelteredFigure: DerivedFigure = {
  key: 'unsheltered-affected',
  label: 'Unsheltered Affected',
  value: 365023,
  formula: 'Affected Population − Inmates − Non-Camp Inmates',
  workings: '445,495 − 28,695 − 51,777 = 365,023',
  context: 'The population with no recorded relief touchpoint.',
};

export const campUptakeFigure: DerivedFigure = {
  key: 'camp-uptake-rate',
  label: 'Camp Uptake Rate',
  value: 6.4,
  precision: 1,
  unit: '%',
  formula: 'Inmates ÷ Affected Population',
  workings: '28,695 ÷ 445,495 = 6.4%',
};

export const campLoadFigure: DerivedFigure = {
  key: 'camp-load',
  label: 'Camp Load',
  value: 319,
  unit: 'per Relief Camp',
  formula: 'Inmates ÷ Relief Camps',
  workings: '28,695 ÷ 90 = 319 per Relief Camp',
};

export const rationCoverageFigure: DerivedFigure = {
  key: 'ration-coverage-days',
  label: 'Ration Coverage Days',
  value: 6.9,
  precision: 1,
  unit: 'days',
  formula: '(Rice Q × 100 kg) ÷ (Inmates × ration norm)',
  workings: '(1,191.09 × 100) ÷ (28,695 × 0.6) = 6.9 days',
};

export const vulnerableLoadFigure: DerivedFigure = {
  key: 'vulnerable-load',
  label: 'Vulnerable Load',
  value: 11.0,
  precision: 1,
  unit: '%',
  formula: 'Vulnerable Inmates ÷ Inmates',
  workings: '(3,004 + 97 + 42) ÷ 28,695 = 11.0%',
};

export const rescueAssetFigure: DerivedFigure = {
  key: 'rescue-asset-ratio',
  label: 'Rescue Asset Ratio',
  value: 0.15,
  precision: 2,
  unit: 'boats per 1,000 affected',
  formula: 'Boats Deployed ÷ (Affected Population ÷ 1,000)',
  workings: '67 ÷ 445.5 = 0.15 boats per 1,000',
};

/** All zero in the real bulletin, so the tests use non-zero, distinct values. */
export const casualtiesFixture: CasualtiesViewModel = {
  floodDeaths: count(3),
  generalDrownings: count(2),
  missing: count(1),
  confirmedProvenance: {
    section: 'lives-lost-confirmed',
    sectionLabel: 'Human Lives Lost — Confirmed',
    sourcePages: [3],
    confidence: 'high',
  },
};

export const zeroCasualties: CasualtiesViewModel = {
  floodDeaths: count(0),
  generalDrownings: count(0),
  missing: count(0),
};

export const summaryFixture: SituationSummaryViewModel = {
  reportDate: '2026-07-27',
  generatedAt: '27-07-2026 09:49 PM',
  affectedPopulation: {
    key: 'population-affected',
    label: 'Population Affected',
    quantity: count(445495),
    provenance: populationProvenance,
    note: 'M 187,890 / F 183,461 / C 74,144',
  },
  unshelteredAffected: unshelteredFigure,
  unshelteredShare: 365023 / 445495,
  shelterSplit: [
    {
      key: 'camp-inmates',
      label: 'Inmates in Relief Camps',
      value: 28695,
      share: 28695 / 445495,
      derived: false,
    },
    {
      key: 'non-camp-inmates',
      label: 'Non-Camp Inmates',
      value: 51777,
      share: 51777 / 445495,
      derived: false,
    },
    {
      key: 'unsheltered',
      label: 'Unsheltered Affected',
      value: 365023,
      share: 365023 / 445495,
      derived: true,
    },
  ],
  reportedFigures: [
    { key: 'districts', label: 'Districts Affected', quantity: count(6) },
    { key: 'circles', label: 'Revenue Circles Affected', quantity: count(21) },
    { key: 'villages', label: 'Villages Affected', quantity: count(631) },
    {
      key: 'crop',
      label: 'Crop Area Submerged',
      quantity: hectares(37139.52),
      precision: 2,
    },
    { key: 'camps', label: 'Relief Camps', quantity: count(90) },
    {
      key: 'centres',
      label: 'Relief Distribution Centres',
      quantity: count(94),
    },
    {
      key: 'inmates',
      label: 'Inmates',
      quantity: count(28695),
      provenance: inmatesProvenance,
    },
    { key: 'non-camp', label: 'Non-Camp Inmates', quantity: count(51777) },
  ],
  derivedMetrics: [
    campUptakeFigure,
    campLoadFigure,
    rationCoverageFigure,
    vulnerableLoadFigure,
    rescueAssetFigure,
  ],
  rivers: {
    aboveDangerLevel: ['Dhansiri (S) at Numaligarh'],
    aboveHighestFloodLevel: [],
    attribution: 'CWC bulletin issued 08:00',
  },
  casualties: zeroCasualties,
  reconciliationWarnings: [
    {
      sectionLabel: 'Animals Affected',
      column: 'Big Animals',
      statedTotal: 256334,
      computedTotal: 256004,
    },
  ],
  unreadableSections: [failedProvenance],
};

const noCasualties = zeroCasualties;

export const districtRowsFixture: readonly DistrictRowViewModel[] = [
  {
    district: 'Sivasagar',
    rank: 1,
    severityIndex: 0.81,
    contributions: [
      { component: 'affectedPopulation', weight: 0.35, normalised: 1, contribution: 0.35 },
      { component: 'villagesAffected', weight: 0.15, normalised: 0.92, contribution: 0.138 },
      { component: 'cropArea', weight: 0.15, normalised: 1, contribution: 0.15 },
      { component: 'campLoad', weight: 0.2, normalised: 0.86, contribution: 0.172 },
      { component: 'casualties', weight: 0.15, normalised: 0, contribution: 0 },
    ],
    populationAffected: count(144461),
    villagesAffected: count(210),
    cropAreaSubmerged: hectares(12340.5),
    campInmates: count(11204),
    reliefCamps: count(32),
    campLoad: 350,
    casualties: noCasualties,
    status: 'affected',
    provenance: populationProvenance,
    revenueCircles: [
      {
        circle: 'Nazira',
        villagesAffected: count(41),
        populationAffected: count(52310),
        cropAreaSubmerged: hectares(4210.25),
        reliefCamps: count(12),
        reliefDistributionCentres: count(9),
        campInmates: count(4180),
        nonCampInmates: count(7120),
        campLoad: 348,
      },
      {
        circle: 'Demow',
        villagesAffected: count(24),
        populationAffected: count(24990),
        cropAreaSubmerged: hectares(1980.75),
        reliefCamps: count(6),
        reliefDistributionCentres: count(5),
        campInmates: count(2110),
        nonCampInmates: count(3450),
        campLoad: 352,
      },
      {
        circle: 'Mahmora',
        villagesAffected: count(67),
        populationAffected: count(67128),
        cropAreaSubmerged: hectares(7340),
        reliefCamps: count(14),
        reliefDistributionCentres: count(11),
        campInmates: count(4914),
        nonCampInmates: count(9008),
        campLoad: 351,
      },
    ],
  },
  {
    district: 'Charaideo',
    rank: 2,
    severityIndex: 0.58,
    contributions: [
      { component: 'affectedPopulation', weight: 0.35, normalised: 0.68, contribution: 0.238 },
      { component: 'villagesAffected', weight: 0.15, normalised: 0.63, contribution: 0.0945 },
      { component: 'cropArea', weight: 0.15, normalised: 0.66, contribution: 0.099 },
      { component: 'campLoad', weight: 0.2, normalised: 0.74, contribution: 0.148 },
      { component: 'casualties', weight: 0.15, normalised: 0, contribution: 0 },
    ],
    populationAffected: count(98320),
    villagesAffected: count(132),
    cropAreaSubmerged: hectares(8120.2),
    campInmates: count(6540),
    reliefCamps: count(21),
    campLoad: 311,
    casualties: noCasualties,
    status: 'affected',
    revenueCircles: [
      {
        circle: 'Sonari',
        villagesAffected: count(80),
        populationAffected: count(60110),
        cropAreaSubmerged: hectares(5010.5),
        reliefCamps: count(13),
        reliefDistributionCentres: count(10),
        campInmates: count(4020),
        nonCampInmates: count(6400),
        campLoad: 309,
      },
    ],
  },
  {
    district: 'Golaghat',
    rank: 3,
    severityIndex: 0.44,
    contributions: [
      { component: 'affectedPopulation', weight: 0.35, normalised: 0.53, contribution: 0.1855 },
      { component: 'villagesAffected', weight: 0.15, normalised: 0.58, contribution: 0.087 },
      { component: 'cropArea', weight: 0.15, normalised: 0.52, contribution: 0.078 },
      { component: 'campLoad', weight: 0.2, normalised: 0.45, contribution: 0.09 },
      { component: 'casualties', weight: 0.15, normalised: 0, contribution: 0 },
    ],
    populationAffected: count(76540),
    villagesAffected: count(121),
    cropAreaSubmerged: hectares(6420.75),
    campInmates: count(5210),
    reliefCamps: count(18),
    campLoad: 289,
    casualties: noCasualties,
    status: 'affected',
    revenueCircles: [],
  },
  {
    district: 'Dhemaji',
    rank: 4,
    severityIndex: 0,
    contributions: [
      { component: 'affectedPopulation', weight: 0.35, normalised: 0, contribution: 0 },
      { component: 'villagesAffected', weight: 0.15, normalised: 0, contribution: 0 },
      { component: 'cropArea', weight: 0.15, normalised: 0, contribution: 0 },
      { component: 'campLoad', weight: 0.2, normalised: 0, contribution: 0 },
      { component: 'casualties', weight: 0.15, normalised: 0, contribution: 0 },
    ],
    populationAffected: count(0),
    villagesAffected: count(0),
    cropAreaSubmerged: hectares(0),
    campInmates: count(0),
    reliefCamps: count(0),
    campLoad: undefined,
    casualties: noCasualties,
    status: 'reported-quiet',
    revenueCircles: [],
  },
];

export const capacityFixture: ResponseCapacityViewModel = {
  riceStock: quintals(1191.092),
  campInmates: count(28695),
  reliefCamps: count(90),
  reliefDistributionCentres: count(94),
  nonCampInmates: count(51777),
  campLoad: campLoadFigure,
  rationCoverageDays: rationCoverageFigure,
  vulnerableLoad: vulnerableLoadFigure,
  rescueAssetRatio: rescueAssetFigure,
  districts: [
    {
      district: 'Sivasagar',
      reliefCamps: count(32),
      reliefDistributionCentres: count(30),
      campInmates: count(11204),
      nonCampInmates: count(20110),
      campLoad: 350,
      rationCoverageDays: 5.2,
      vulnerableLoad: 12.4,
    },
    {
      district: 'Charaideo',
      reliefCamps: count(21),
      reliefDistributionCentres: count(24),
      campInmates: count(6540),
      nonCampInmates: count(12040),
      campLoad: 311,
      rationCoverageDays: 7.8,
      vulnerableLoad: 9.7,
    },
  ],
};

export const damagePointsFixture: readonly DamagePointViewModel[] = [
  {
    id: 'road-1',
    damageClass: 'road',
    district: 'Sivasagar',
    circle: 'Nazira',
    name: 'Nazira–Simaluguri Road',
    coordinate: coord(94.7331, 26.9214),
  },
  {
    id: 'road-2',
    damageClass: 'road',
    district: 'Sivasagar',
    circle: 'Nazira',
    name: 'Nazira Bypass',
    coordinate: coord(94.7335, 26.9219),
  },
  {
    id: 'breach-1',
    damageClass: 'embankment-breached',
    district: 'Sivasagar',
    circle: 'Demow',
    name: 'Demow Dyke',
    coordinate: coord(94.5502, 27.0113),
  },
  {
    id: 'bridge-1',
    damageClass: 'bridge',
    district: 'Golaghat',
    circle: 'Bokakhat',
    name: 'Bokakhat RCC Bridge',
    coordinate: coord(93.9821, 26.5104),
  },
  {
    /** The truncated Charaideo fisheries coordinate: bare 94, 27. */
    id: 'fishery-1',
    damageClass: 'other',
    district: 'Charaideo',
    circle: 'Sonari',
    name: 'Sonari Fishery Pond',
    coordinate: coord(94, 27),
  },
  {
    id: 'fishery-2',
    damageClass: 'other',
    district: 'Charaideo',
    circle: 'Sonari',
    name: 'Lakwa Fishery Pond',
    coordinate: coord(94, 27),
  },
];

export const leversFixture: ScenarioLeversViewModel = {
  populationGrowthPercent: 30,
  campUptakePercent: 25,
  durationDays: 5,
  rationNormKgPerPersonPerDay: 0.6,
  additionalCampCapacity: 0,
};

export const comparisonsFixture: readonly ScenarioComparisonRow[] = [
  {
    key: 'affected',
    metric: 'Population Affected',
    baseline: '445,495',
    projected: '579,143',
    derivation: '445,495 × 1.30 = 579,143 people affected.',
    direction: 'worse',
  },
  {
    key: 'inmates',
    metric: 'Inmates in Relief Camps',
    baseline: '28,695',
    projected: '144,785',
    derivation: '25% uptake of 579,143 projected affected = 144,785 Inmates.',
    direction: 'worse',
  },
  {
    key: 'camp-load',
    metric: 'Camp Load',
    baseline: '319 per Relief Camp',
    projected: '1,609 per Relief Camp',
    derivation: '144,785 Inmates ÷ 90 Relief Camps = 1,609 per Relief Camp.',
    direction: 'worse',
  },
  {
    key: 'ration-days',
    metric: 'Ration Coverage Days',
    baseline: '6.9 days',
    projected: '1.4 days',
    derivation:
      'Rice runs out in 1.4 days: 144,785 Inmates × 0.6 kg = 86,871 kg/day demand vs 119,109 kg stock.',
    direction: 'worse',
  },
  {
    key: 'camps',
    metric: 'Relief Camps',
    baseline: '90',
    projected: '90',
    derivation: 'No additional camp capacity added in this scenario.',
    direction: 'unchanged',
  },
];

export const trendObservations: readonly TrendObservation[] = [
  { date: '2026-07-23', value: 402110 },
  { date: '2026-07-24', value: 421340 },
  { date: '2026-07-27', value: 445495 },
];

export const trendGaps: readonly TimelineGapViewModel[] = [
  {
    afterDate: '2026-07-24',
    beforeDate: '2026-07-27',
    missingDates: ['2026-07-25', '2026-07-26'],
  },
];

/**
 * Cumulative and peak figures over the six real July 2026 bulletins.
 *
 * Every number here is the verified statewide figure from the ASDMA PDFs in
 * `fixtures/`, so a UI test that renders 654,838 is rendering the same number
 * the composition test computes. 23 and 24 July are genuinely missing — a real
 * gap the console must state rather than smooth over.
 */
export const periodCoverageFixture: PeriodCoverageViewModel = {
  bulletinCount: 6,
  fromDate: '2026-07-20',
  toDate: '2026-07-27',
  missingDates: ['2026-07-23', '2026-07-24'],
  description:
    '6 bulletins, 2026-07-20 to 2026-07-27, 2 days missing (2026-07-23, 2026-07-24)',
};

const PERIOD_CAVEAT =
  'Derived here, not reported by ASDMA: cumulative over 6 bulletins, 2026-07-20 to ' +
  '2026-07-27, 2 days missing (2026-07-23, 2026-07-24). No bulletin covers the missing ' +
  'days, so anything reported on them is not in this total. Nothing is estimated for them.';

/**
 * The person-day caveat, which must say in prose what the type says in code.
 *
 * 3,205,823 is the number this project's own PRD uses as the cautionary
 * example of adding a stock — and as person-days it is perfectly correct. That
 * is exactly why the unit has to travel with it.
 */
const BACK_TEST_CAVEAT =
  'Derived here, not reported by ASDMA. This is what was distributed divided by the ' +
  'exposure, so it is the rate delivered and not the rate anyone was entitled to.';

const EXPOSURE_CAVEAT =
  'Derived here, not reported by ASDMA: Population Affected integrated over 6 bulletins, ' +
  '2026-07-20 to 2026-07-27, 2 days missing. This is a count of person-days — one person ' +
  'for one day — and not a count of people.';

const PEAK_CAVEAT =
  'Derived here, not reported by ASDMA: highest and latest across 6 bulletins, ' +
  '2026-07-20 to 2026-07-27, 2 days missing (2026-07-23, 2026-07-24). This is a ' +
  'point-in-time figure, so it is never totalled across bulletins — the same people, ' +
  'camps or hectares are counted again in every bulletin.';

export const periodSummaryFixture: PeriodSummaryViewModel = {
  coverage: periodCoverageFixture,
  cumulative: [
    {
      key: 'flood-deaths',
      label: 'Human Lives Lost — Flood',
      kind: 'flow',
      precision: 0,
      rationale: 'Deaths reported in the period covered by each bulletin.',
      cumulative: 41,
      cumulativeWorkings: '5 + 21 + 9 + 4 + 2 + 0 = 41',
      peak: 21,
      peakDate: '2026-07-21',
      latest: 0,
      latestDate: '2026-07-27',
      completeness: 'partial',
      caveat: PERIOD_CAVEAT,
    },
    {
      key: 'general-drownings',
      label: 'Human Lives Lost — Other Drowning',
      kind: 'flow',
      precision: 0,
      rationale: 'Non-flood drownings, totalled on their own (PRD §4.2).',
      cumulative: 1,
      cumulativeWorkings: '0 + 0 + 1 + 0 + 0 + 0 = 1',
      peak: 1,
      peakDate: '2026-07-22',
      latest: 0,
      latestDate: '2026-07-27',
      completeness: 'partial',
      caveat: PERIOD_CAVEAT,
    },
  ],
  peaks: [
    {
      key: 'population-affected',
      label: 'Population Affected',
      kind: 'stock',
      precision: 0,
      rationale: 'A level at the moment the bulletin was compiled.',
      peak: 654838,
      peakDate: '2026-07-25',
      latest: 445495,
      latestDate: '2026-07-27',
      completeness: 'partial',
      caveat: PEAK_CAVEAT,
    },
    {
      key: 'camp-inmates',
      label: 'Inmates in Relief Camps',
      kind: 'stock',
      precision: 0,
      rationale: 'A level at the moment the bulletin was compiled.',
      peak: 37724,
      peakDate: '2026-07-26',
      latest: 28695,
      latestDate: '2026-07-27',
      completeness: 'partial',
      caveat: PEAK_CAVEAT,
    },
    {
      key: 'crop-area-submerged',
      label: 'Crop Area Submerged',
      kind: 'stock',
      precision: 2,
      rationale: 'The area under water when the bulletin was compiled.',
      peak: 48742.09,
      peakDate: '2026-07-26',
      latest: 37139.52,
      latestDate: '2026-07-27',
      completeness: 'partial',
      caveat: PEAK_CAVEAT,
    },
  ],
  exposure: [
    {
      key: 'camp-inmates',
      label: 'Inmates in Relief Camps',
      unit: 'person-days',
      personDays: 151_460,
      daysCounted: 6,
      workings: '9697 + 12375 + 24418 + 18902 + 37724 + 28695 = 151811',
      completeness: 'partial',
      caveat: EXPOSURE_CAVEAT,
    },
    {
      key: 'population-affected',
      label: 'Population Affected',
      unit: 'person-days',
      personDays: 3_205_823,
      daysCounted: 6,
      workings: '362933 + 564660 + 653164 + 654838 + 524733 + 445495 = 3205823',
      completeness: 'partial',
      caveat: EXPOSURE_CAVEAT,
    },
  ],
  backTest: [
    {
      basis: 'Camp inmates',
      kgPerPersonPerDay: 7.173,
      workings: '21,680 quintals = 2,168,004 kg ÷ 302,253 person-days = 7.173 kg',
      caveat: BACK_TEST_CAVEAT,
    },
    {
      basis: 'Camp and non-camp inmates',
      kgPerPersonPerDay: 1.3,
      workings: '21,680 quintals = 2,168,004 kg ÷ 1,667,298 person-days = 1.300 kg',
      caveat: BACK_TEST_CAVEAT,
    },
  ],
  replacement: {
    label: 'Pukka dwelling, fully replaced',
    quantity: 3494,
    quantityLabel: 'houses fully or severely damaged',
    unitLow: 85_029,
    unitCentral: 180_638,
    unitHigh: 390_430,
    totalLow: 297_091_326,
    totalCentral: 631_149_172,
    totalHigh: 1_364_162_420,
    formula: 'floor area × ( earthwork + brick walling + RCC roof slab + floor finish ) × uplift',
    inputs: [
      {
        kind: 'assumed',
        label: 'Floor area of a replaced dwelling',
        value: 30,
        unit: 'm²',
        low: 20,
        high: 45,
        reason: 'A modest rural dwelling; PMAY-G sets a floor of 25 m² for a sanctioned unit.',
      },
      {
        kind: 'published',
        label: 'Brick work in cement mortar 1:5',
        value: 6138.4,
        unit: '₹/m³',
        citation: 'Assam PWD Building Schedule of Rates for Civil Works — Ch-33',
      },
    ],
    judgementSharePercent: 169,
    caveat:
      'Constructed here, not published. No schedule anywhere states a cost per house. ' +
      'Treat this as an argument to be checked, and never as an entitlement.',
    notCosted:
      'A Kuccha dwelling is built from bamboo, timber and thatch, so costing it from a ' +
      'civil works schedule would answer a question about a different building.',
    executive: {
      dwellingsDestroyed: 3494,
      householdsAffected: 147_148,
      dwellingsLow: 354_262_308,
      dwellingsCentral: 789_297_145,
      dwellingsHigh: 1_867_045_533,
      microLow: 142_000_000,
      microCentral: 485_000_000,
      microHigh: 1_341_000_000,
      macroLow: 255_000_000,
      macroCentral: 518_000_000,
      macroHigh: 883_000_000,
      assumptionCount: 15,
      publishedRateCount: 9,
    },
    assumptionRegister: [
      {
        label: 'Average damaged length per reported road',
        affects: 'Roads',
        value: 0.6,
        unit: 'km',
        low: 0.2,
        high: 1.5,
        reason: 'THE WEAKEST NUMBER IN THIS TIER. The SDRF pays per kilometre.',
        movesBy: 7.5,
      },
      {
        label: 'Share of submerged land carrying a clearable deposit',
        affects: 'Agricultural land de-silting',
        value: 0.2,
        unit: 'share',
        low: 0.08,
        high: 0.4,
        reason: 'SUBMERGED IS NOT SILTED. Deposition concentrates near breaches.',
        movesBy: 5,
      },
      {
        label: 'Floor area of a replaced dwelling',
        affects: 'Dwelling replacement',
        value: 30,
        unit: 'm²',
        low: 20,
        high: 45,
        reason: 'A modest rural dwelling; PMAY-G sets a floor of 25 m².',
        movesBy: 2.25,
      },
    ],
    micro: {
      label: 'Household assets',
      lines: [
        {
          label: 'Homestead silt clearance',
          low: 34_000_000,
          central: 202_000_000,
          high: 721_000_000,
          formula: 'households needing clearance × volume per homestead × excavation rate × GST',
          assumptions: [
            {
              kind: 'assumed',
              label: 'Share of affected households needing homestead clearance',
              value: 0.35,
              unit: 'share',
              low: 0.15,
              high: 0.6,
              reason: 'Being flooded and being left with a clearable deposit are different things.',
            },
          ],
        },
        {
          label: 'Agricultural land de-silting',
          low: 82_000_000,
          central: 204_000_000,
          high: 408_000_000,
          formula: 'peak submerged area × share carrying clearable deposit × SDRF de-silting rate',
          assumptions: [
            {
              kind: 'assumed',
              label: 'Share of submerged land carrying a clearable deposit',
              value: 0.2,
              unit: 'share',
              low: 0.08,
              high: 0.4,
              reason: 'SUBMERGED IS NOT SILTED. Deposition concentrates near breaches.',
            },
          ],
        },
      ],
      subtotalLow: 142_000_000,
      subtotalCentral: 485_000_000,
      subtotalHigh: 1_341_000_000,
      notCovered: '',
      rateScope: '',
    },
    macro: {
      label: 'Public infrastructure',
      lines: [
        {
          label: 'Roads',
          low: 8_000_000,
          central: 23_000_000,
          high: 58_000_000,
          formula: 'damaged road items × average damaged length × SDRF rural road repair rate',
          assumptions: [
            {
              kind: 'assumed',
              label: 'Average damaged length per reported road',
              value: 0.6,
              unit: 'km',
              low: 0.2,
              high: 1.5,
              reason: 'THE WEAKEST NUMBER IN THIS TIER. The SDRF pays per kilometre.',
            },
          ],
        },
      ],
      subtotalLow: 255_000_000,
      subtotalCentral: 518_000_000,
      subtotalHigh: 883_000_000,
      notCovered:
        'Railways are not in this total, and cannot be: across 4,780 damaged-asset records, ' +
        'four mention a railway at all.',
      rateScope:
        'These are RESTORATION figures, not reconstruction. The SDRF rates come from a ' +
        'chapter headed "Repair/Restoration (Immediate Nature) of Damaged Infrastructure".',
    },
    benchmark: {
      label: '₹10 lakh per affected household',
      source:
        'A publicly stated demand, not a published norm and not an entitlement. It is shown ' +
        'here to be compared against, not because this console has assessed it as correct.',
      amountPerHousehold: 1_000_000,
      dwellingsDestroyed: 3494,
      householdsAffected: 147_148,
      householdSize: 4.9,
      notDestroyedSharePercent: 97.6,
      demandAcrossAffectedLow: 133_523_000_000,
      demandAcrossAffectedCentral: 147_148_000_000,
      demandAcrossAffectedHigh: 163_869_000_000,
      demandAcrossDestroyed: 3_494_000_000,
      reconstructionLow: 455_000_000,
      reconstructionCentral: 789_000_000,
      reconstructionHigh: 1_867_000_000,
      perHouseholdMultiple: 4.4,
      caveat:
        'These two figures answer different questions and must not be netted off against ' +
        'each other. Almost all of the difference between the totals is the denominator, ' +
        'not the rate. The bulletin reports people and never households.',
    },
    kucchaSharePercent: 91,
    plinthCentral: 45_263,
    policies: [
      {
        key: 'like-for-like',
        label: 'Like for like',
        summary: 'Rebuild each dwelling in the material it was, at the same level.',
        riskEffect:
          'Reproduces the exposure that caused the loss. The next flood of the same size ' +
          'would destroy them again.',
        totalLow: 26_104_000,
        totalCentral: 55_456_000,
        totalHigh: 119_862_000,
        uncostedDwellings: 3187,
        isFloor: true,
        caveat: 'This is a floor — at least this much. Nothing at all is included for them above.',
      },
      {
        key: 'protect-in-place',
        label: 'Protect in place',
        summary: 'Rebuild Kuccha as Kuccha, but on a raised Pukka plinth.',
        riskEffect:
          'Removes most of the flood exposure without changing how people build. The plinth ' +
          'outlives several rebuilds of the house on top of it.',
        totalLow: 83_000_000,
        totalCentral: 214_000_000,
        totalHigh: 623_000_000,
        uncostedDwellings: 3187,
        isFloor: true,
        caveat:
          'This is a floor — at least this much. The raised plinths beneath them ARE priced ' +
          'and are included above.',
      },
      {
        key: 'build-back-better',
        label: 'Build back better',
        summary: 'Rebuild every destroyed dwelling to a permanent Pukka standard, raised.',
        riskEffect:
          'Removes the exposure and the vulnerability together. The most expensive option ' +
          'and the only one that does not leave a known weakness in place.',
        totalLow: 354_000_000,
        totalCentral: 789_000_000,
        totalHigh: 1_867_000_000,
        uncostedDwellings: 0,
        isFloor: false,
        caveat:
          'Every dwelling in the caseload is priced. That is a fact about the schedule, not ' +
          'a reason to choose it.',
      },
    ],
  },
};

export const trendDeltas: readonly DeltaViewModel[] = [
  {
    metricLabel: 'Population Affected',
    fromDate: '2026-07-23',
    toDate: '2026-07-24',
    from: 402110,
    to: 421340,
    delta: 19230,
    direction: 'up',
    derived: false,
  },
];

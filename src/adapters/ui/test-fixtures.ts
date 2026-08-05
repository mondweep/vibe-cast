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

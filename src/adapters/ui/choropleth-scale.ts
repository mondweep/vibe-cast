/**
 * District choropleth — matching, banding and the four states a District can
 * be in (FR-2.7).
 *
 * ---------------------------------------------------------------------------
 * Four states, not two
 * ---------------------------------------------------------------------------
 *
 * A choropleth's default failure is to have exactly two states — "shaded" and
 * "not shaded" — and to let the second one absorb three completely different
 * situations. This is ADR-0005 ("unknown is not zero") drawn rather than
 * printed, so it gets four:
 *
 *  - `reported`     the District reported a figure above zero. Shaded.
 *  - `reported-nil` the District reported, and the figure is zero. Dhemaji on
 *                   2026-07-27 is exactly this: an explicit reported 0. It is
 *                   good news and must read as good news.
 *  - `unknown`      the District is in the bulletin but this measure is not
 *                   reported for it — a blank cell or DRIMS's `SNR`. Hatched,
 *                   the long-standing cartographic mark for "no data".
 *  - `absent`       the District has no row in the bulletin at all. Nobody has
 *                   heard from it. Stippled, and never left blank, because a
 *                   blank District is the one that reads as "fine" — which is
 *                   the single most dangerous thing this map could say.
 *
 * Colour never carries any of that alone (NFR-8): each state has its own
 * texture, its own words in the legend, and its value in the `<title>` of its
 * own path, so hovering, a screen reader and a greyscale print all reach it.
 */

import { isKnown, type Quantity } from '../../domain/shared/quantity';
import {
  ASSAM_DISTRICT_BOUNDARIES,
  type DistrictBoundary,
} from '../../generated/assam-districts';
import { districtPath } from './map-projection';
import { formatNumber, type DistrictRowViewModel } from './view-models';

// ---------------------------------------------------------------------------
// The measure being shaded
// ---------------------------------------------------------------------------

export type ChoroplethMeasureKey =
  | 'populationAffected'
  | 'cropAreaSubmerged'
  | 'campInmates';

export type ChoroplethMeasure = {
  readonly key: ChoroplethMeasureKey;
  /** ASDMA's own wording (PRD §4.1). */
  readonly label: string;
  readonly unitSuffix: string;
};

/**
 * The three measures the bulletin reports per District that are worth a map.
 *
 * Severity Index is deliberately *not* offered. It is this console's own
 * weighted composite (ADR-0006), the weights are the user's to change, and a
 * shaded state map is the last place a derived number should be able to pass
 * itself off as a reported one.
 */
export const CHOROPLETH_MEASURES: readonly ChoroplethMeasure[] = [
  { key: 'populationAffected', label: 'Population Affected', unitSuffix: ' people' },
  { key: 'cropAreaSubmerged', label: 'Crop Area Submerged', unitSuffix: ' Hect.' },
  { key: 'campInmates', label: 'Inmates in Relief Camps', unitSuffix: '' },
];

export const DEFAULT_CHOROPLETH_MEASURE: ChoroplethMeasureKey = 'populationAffected';

const quantityFor = (
  row: DistrictRowViewModel,
  measure: ChoroplethMeasureKey,
): Quantity<string> => {
  switch (measure) {
    case 'populationAffected':
      return row.populationAffected;
    case 'cropAreaSubmerged':
      return row.cropAreaSubmerged;
    case 'campInmates':
      return row.campInmates;
  }
};

// ---------------------------------------------------------------------------
// Matching bulletin Districts to boundary Districts
// ---------------------------------------------------------------------------

/**
 * Comparison key for a District name.
 *
 * Parentheses, hyphens and full stops are all punctuation ASDMA and the
 * boundary dataset disagree about — `Kamrup (M)`, `South Salmara-Mankachar`,
 * `Dima Hasao` — so they collapse to spaces rather than being significant.
 * Note this is *not* `normaliseName` from the shared kernel: that one only
 * folds whitespace and case, which is right for Revenue Circles and not enough
 * here.
 */
export const districtKey = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[().,'’\-–_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Bulletin spelling → boundary-dataset spelling, by comparison key.
 *
 * Every entry is a name the two sources genuinely disagree about, and every
 * one of them is a District that would otherwise be silently dropped from the
 * map. The load-bearing case on the 2026-07-27 bulletin is the first:
 *
 *   ASDMA writes `Kamrup (M)`; the boundary data says `Kamrup Metropolitan`.
 *
 * That one matters more than it looks, because `Kamrup` *also* exists as a
 * separate rural District in both sources. A prefix or substring match — the
 * obvious shortcut — would shade rural Kamrup with Guwahati's figures, which
 * is a wrong answer rather than a missing one.
 *
 * The rest are name changes and spelling variants ASDMA has used across
 * bulletins. They cost nothing to carry and each is one District that stays on
 * the map when the bulletin changes its mind about spelling.
 */
export const DISTRICT_ALIASES: Readonly<Record<string, string>> = {
  // Kamrup Metropolitan (Guwahati) vs Kamrup (rural) — never merge these.
  'kamrup m': 'kamrup metropolitan',
  'kamrup metro': 'kamrup metropolitan',
  'kamrup r': 'kamrup',
  'kamrup rural': 'kamrup',
  // Karbi Anglong was split; ASDMA has printed the qualifier on either side.
  'karbi anglong west': 'west karbi anglong',
  'karbi anglong east': 'karbi anglong',
  'east karbi anglong': 'karbi anglong',
  // Renamed since Census 2011, which is the boundary data's vintage.
  sribhumi: 'karimganj',
  'north cachar hills': 'dima hasao',
  'north cachar': 'dima hasao',
  // Spelling variants DRIMS uses.
  marigaon: 'morigaon',
  sibsagar: 'sivasagar',
  sivsagar: 'sivasagar',
  'south salmara': 'south salmara mankachar',
  'bishwanath': 'biswanath',
  'baksha': 'baksa',
};

const BOUNDARY_BY_KEY: ReadonlyMap<string, DistrictBoundary> = new Map(
  ASSAM_DISTRICT_BOUNDARIES.map((boundary) => [districtKey(boundary.district), boundary]),
);

/** The boundary for a District as the bulletin spells it, or `undefined`. */
export const boundaryFor = (bulletinDistrict: string): DistrictBoundary | undefined => {
  const key = districtKey(bulletinDistrict);
  return BOUNDARY_BY_KEY.get(DISTRICT_ALIASES[key] ?? key);
};

// ---------------------------------------------------------------------------
// Bands
// ---------------------------------------------------------------------------

export type ChoroplethBand = {
  /** 1..n, ascending. Printed, so the band is reachable as text (NFR-8). */
  readonly rank: number;
  /** Exclusive lower edge. Band 1 starts just above zero. */
  readonly from: number;
  /** Inclusive upper edge. */
  readonly to: number;
  readonly label: string;
};

export const BAND_COUNT = 5;

/** 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ — enough steps to avoid empty bands. */
const NICE_STEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;

/** The smallest "round" number at or above `value`. */
export const niceCeiling = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const fraction = value / magnitude;
  const step = NICE_STEPS.find((candidate) => fraction <= candidate + 1e-9) ?? 10;
  return step * magnitude;
};

/**
 * Equal-interval bands from just above zero to a rounded maximum.
 *
 * Equal interval rather than quantile: a bulletin carries 6–8 affected
 * Districts, and quantile breaks over that few values move every time one
 * District's figure changes, so the same colour would mean something different
 * on consecutive days. Equal interval is legible against the printed table,
 * which is the document the officer has open next to this.
 */
export const choroplethBands = (values: readonly number[]): readonly ChoroplethBand[] => {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0);
  const ceiling = niceCeiling(positive.length === 0 ? 0 : Math.max(...positive));
  if (ceiling === 0) return [];

  const width = ceiling / BAND_COUNT;
  return Array.from({ length: BAND_COUNT }, (_unused, index) => {
    const from = index * width;
    const to = (index + 1) * width;
    return {
      rank: index + 1,
      from,
      to,
      label:
        index === 0
          ? `above 0 – ${formatNumber(to)}`
          : `${formatNumber(from)} – ${formatNumber(to)}`,
    };
  });
};

export const bandFor = (
  value: number,
  bands: readonly ChoroplethBand[],
): ChoroplethBand | undefined =>
  bands.find((band) => value > band.from && value <= band.to) ??
  (bands.length > 0 && value > bands[bands.length - 1].to
    ? bands[bands.length - 1]
    : undefined);

// ---------------------------------------------------------------------------
// Shading a District
// ---------------------------------------------------------------------------

export type DistrictShading =
  | { readonly kind: 'reported'; readonly value: number; readonly band: ChoroplethBand }
  | { readonly kind: 'reported-nil' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'absent' };

export type ShadedDistrict = {
  /** Name as published in the boundary dataset. */
  readonly district: string;
  /** Name as printed in the bulletin, when the two differ. */
  readonly bulletinDistrict?: string;
  readonly path: string;
  readonly shading: DistrictShading;
};

export type ChoroplethModel = {
  readonly measure: ChoroplethMeasure;
  readonly bands: readonly ChoroplethBand[];
  readonly districts: readonly ShadedDistrict[];
  /**
   * Districts the bulletin reports that have no boundary in the bundled data —
   * Districts created after Census 2011, typically. Named in the UI rather
   * than dropped, so their figures are never invisible (ADR-0005).
   */
  readonly withoutBoundary: readonly string[];
  readonly counts: Readonly<Record<DistrictShading['kind'], number>>;
};

const SHADING_LABELS: Readonly<Record<DistrictShading['kind'], string>> = {
  reported: 'Reported',
  'reported-nil': 'Reported nil',
  unknown: 'In the bulletin, not reported for this measure',
  absent: 'No report in this bulletin',
};

export const shadingLabel = (kind: DistrictShading['kind']): string => SHADING_LABELS[kind];

/** Cached: the projection is fixed, so a District's path never changes. */
const PATH_CACHE = new Map<string, string>();
const pathFor = (boundary: DistrictBoundary): string => {
  const cached = PATH_CACHE.get(boundary.district);
  if (cached !== undefined) return cached;
  const built = districtPath(boundary);
  PATH_CACHE.set(boundary.district, built);
  return built;
};

/**
 * Build the whole choropleth: which District gets which shade, which bulletin
 * rows found no boundary, and the bands the legend prints.
 */
export const buildChoropleth = (
  rows: readonly DistrictRowViewModel[],
  measureKey: ChoroplethMeasureKey,
): ChoroplethModel => {
  const measure =
    CHOROPLETH_MEASURES.find((candidate) => candidate.key === measureKey) ??
    CHOROPLETH_MEASURES[0];

  const byBoundaryName = new Map<string, DistrictRowViewModel>();
  const withoutBoundary: string[] = [];
  for (const row of rows) {
    const boundary = boundaryFor(row.district);
    if (boundary === undefined) withoutBoundary.push(row.district);
    else byBoundaryName.set(boundary.district, row);
  }

  const values = rows
    .map((row) => quantityFor(row, measure.key))
    .filter(isKnown)
    .map((quantity) => quantity.value);
  const bands = choroplethBands(values);

  const counts: Record<DistrictShading['kind'], number> = {
    reported: 0,
    'reported-nil': 0,
    unknown: 0,
    absent: 0,
  };

  const districts = ASSAM_DISTRICT_BOUNDARIES.map((boundary): ShadedDistrict => {
    const row = byBoundaryName.get(boundary.district);
    const shading = ((): DistrictShading => {
      if (row === undefined) return { kind: 'absent' };
      const quantity = quantityFor(row, measure.key);
      if (!isKnown(quantity)) return { kind: 'unknown' };
      if (quantity.value === 0) return { kind: 'reported-nil' };
      const band = bandFor(quantity.value, bands);
      return band === undefined
        ? { kind: 'unknown' }
        : { kind: 'reported', value: quantity.value, band };
    })();

    counts[shading.kind] += 1;

    return {
      district: boundary.district,
      bulletinDistrict: row?.district,
      path: pathFor(boundary),
      shading,
    };
  });

  return { measure, bands, districts, withoutBoundary, counts };
};

/**
 * One District as a sentence.
 *
 * This is the `<title>` of the path and the line in the hidden list, so the
 * value behind a shade is always reachable as text — the half of NFR-8 that a
 * legend on its own does not satisfy.
 */
export const describeDistrict = (
  shaded: ShadedDistrict,
  measure: ChoroplethMeasure,
): string => {
  const name =
    shaded.bulletinDistrict !== undefined && shaded.bulletinDistrict !== shaded.district
      ? `${shaded.district} District (reported as ${shaded.bulletinDistrict})`
      : `${shaded.district} District`;

  switch (shaded.shading.kind) {
    case 'reported':
      return (
        `${name}: ${measure.label} ${formatNumber(shaded.shading.value,
          measure.key === 'cropAreaSubmerged' ? 2 : 0)}${measure.unitSuffix} ` +
        `(band ${String(shaded.shading.band.rank)} of ${String(BAND_COUNT)}, ` +
        `${shaded.shading.band.label}).`
      );
    case 'reported-nil':
      return `${name}: ${measure.label} reported as nil.`;
    case 'unknown':
      return `${name}: in this bulletin, but ${measure.label} not reported.`;
    case 'absent':
      return `${name}: no report in this bulletin.`;
  }
};

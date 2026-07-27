/**
 * Shared kernel — administrative geography.
 *
 * Ubiquitous language (PRD §4.1): ASDMA's hierarchy is
 * District → Revenue Circle → Village. We use ASDMA's terms verbatim so an
 * officer can read this UI and the PDF side by side without translating.
 * "Revenue Circle" is never softened to "sub-district".
 */

export type DistrictName = string & { readonly __brand: 'DistrictName' };
export type RevenueCircleName = string & { readonly __brand: 'RevenueCircleName' };

/**
 * DRIMS spells the same circle inconsistently across sections — `Sivsagar` in
 * the circle column while the district is `Sivasagar`, and `Sonari RC part` in
 * Sivasagar alongside a plain `Sonari` in Charaideo. Names are normalised for
 * comparison but the source spelling is preserved for display, so we never
 * show an officer a name they cannot find in the bulletin.
 */
export const normaliseName = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ').toLowerCase();

export const districtName = (raw: string): DistrictName =>
  raw.trim().replace(/\s+/g, ' ') as DistrictName;

export const revenueCircleName = (raw: string): RevenueCircleName =>
  raw.trim().replace(/\s+/g, ' ') as RevenueCircleName;

export const sameUnit = (a: string, b: string): boolean => normaliseName(a) === normaliseName(b);

/**
 * Assam's bounding box, used to reject coordinates that cannot be real.
 * The 2026-07-27 bulletin contains truncated values (a bare `94` and `27` in
 * the Charaideo fisheries rows) which are inside the box but carry no useful
 * precision — see `GeoCoordinate` below.
 */
export const ASSAM_BOUNDS = {
  minLongitude: 89.7,
  maxLongitude: 96.0,
  minLatitude: 24.1,
  maxLatitude: 28.2,
} as const;

export type PreciseCoordinate = {
  readonly kind: 'precise';
  readonly longitude: number;
  readonly latitude: number;
};

/**
 * Inside Assam but reported with too few decimal places to locate anything.
 * A bare `94, 27` is accurate to roughly 100 km, so it is mapped distinctly
 * rather than plotted as though it were a real point.
 */
export type ApproximateCoordinate = {
  readonly kind: 'approximate';
  readonly longitude: number;
  readonly latitude: number;
  readonly reason: 'insufficient-precision';
};

export type GeoCoordinate = PreciseCoordinate | ApproximateCoordinate;

const decimalPlaces = (n: number): number => {
  const s = String(n);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
};

/**
 * Build a coordinate, or `undefined` if it falls outside Assam.
 *
 * Fewer than 3 decimal places (~100 m) is treated as approximate. The bulletin
 * routinely carries both kinds and conflating them puts a fishery pond in the
 * wrong district.
 */
export const geoCoordinate = (
  longitude: number,
  latitude: number,
): GeoCoordinate | undefined => {
  const inBounds =
    longitude >= ASSAM_BOUNDS.minLongitude &&
    longitude <= ASSAM_BOUNDS.maxLongitude &&
    latitude >= ASSAM_BOUNDS.minLatitude &&
    latitude <= ASSAM_BOUNDS.maxLatitude;
  if (!inBounds) return undefined;

  const precise = decimalPlaces(longitude) >= 3 && decimalPlaces(latitude) >= 3;
  return precise
    ? { kind: 'precise', longitude, latitude }
    : { kind: 'approximate', longitude, latitude, reason: 'insufficient-precision' };
};

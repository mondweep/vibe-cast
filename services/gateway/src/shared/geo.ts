/**
 * Geospatial value objects and great-circle math (Shared Kernel).
 *
 * Pure, dependency-free functions so the domain can be exercised with
 * fast, deterministic unit tests (ADR-0003, ADR-0006).
 */

export interface GeoCoordinate {
  /** Decimal degrees, north positive. */
  readonly latitudeDeg: number;
  /** Decimal degrees, east positive. */
  readonly longitudeDeg: number;
}

export interface BoundingBox {
  readonly minLatDeg: number;
  readonly minLonDeg: number;
  readonly maxLatDeg: number;
  readonly maxLonDeg: number;
}

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Great-circle distance between two coordinates in kilometres (haversine). */
export function distanceKm(a: GeoCoordinate, b: GeoCoordinate): number {
  const dLat = toRad(b.latitudeDeg - a.latitudeDeg);
  const dLon = toRad(b.longitudeDeg - a.longitudeDeg);
  const lat1 = toRad(a.latitudeDeg);
  const lat2 = toRad(b.latitudeDeg);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing (compass degrees, 0..360) from `a` towards `b`. */
export function initialBearingDeg(a: GeoCoordinate, b: GeoCoordinate): number {
  const lat1 = toRad(a.latitudeDeg);
  const lat2 = toRad(b.latitudeDeg);
  const dLon = toRad(b.longitudeDeg - a.longitudeDeg);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Axis-aligned bounding box that contains every point within `radiusKm` of
 * `centre`. Used to translate an observer's range into an OpenSky query
 * (ADR-0002). Latitude is clamped to the poles; longitude wraps are not split,
 * which is acceptable for the small ranges (<= a few hundred km) we support.
 */
export function boundingBoxAround(
  centre: GeoCoordinate,
  radiusKm: number,
): BoundingBox {
  const latDelta = toDeg(radiusKm / EARTH_RADIUS_KM);
  const cosLat = Math.cos(toRad(centre.latitudeDeg));
  const lonDelta =
    cosLat <= 1e-9 ? 180 : toDeg(radiusKm / (EARTH_RADIUS_KM * cosLat));

  return {
    minLatDeg: Math.max(-90, centre.latitudeDeg - latDelta),
    maxLatDeg: Math.min(90, centre.latitudeDeg + latDelta),
    minLonDeg: centre.longitudeDeg - lonDelta,
    maxLonDeg: centre.longitudeDeg + lonDelta,
  };
}

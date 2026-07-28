/**
 * The map's projection, in one place.
 *
 * ---------------------------------------------------------------------------
 * Equirectangular, standard parallel 26.2°N
 * ---------------------------------------------------------------------------
 *
 * A degree of latitude is ~111 km everywhere. A degree of longitude is
 * ~111 km × cos(latitude), so at Assam's mid-latitude it is only ~100 km. The
 * map this replaced stretched Assam's 6.3° of longitude and 4.1° of latitude
 * across a fixed box independently, which made the state ~11% too wide: the
 * Brahmaputra valley read as flatter and longer than it is, and no distance on
 * the map meant the same thing in two places.
 *
 * The fix is the plate carrée's standard-parallel form. Longitude is scaled by
 * cos(φ₀) with φ₀ = 26.2°N — the latitude that splits Assam's north–south
 * extent — and then a *single* scale factor takes both axes to user units:
 *
 *     x = PAD + (λ − λ_min) · cos(φ₀) · SCALE
 *     y = PAD + (φ_max − φ) · SCALE
 *
 * One scale, two axes, so the shape is right and 10 km is 10 km in any
 * direction. The viewBox height is *derived* from that scale rather than
 * chosen, which is what stops the aspect ratio from being quietly re-broken by
 * someone rounding 740.68 to 720 (ADR-0009).
 *
 * Honest about what it is not: this is conformal nowhere and equal-area
 * nowhere. Scale is exact along 26.2°N and drifts by about ±2.5% at Assam's
 * northern and southern edges. Do not compute an area from it.
 */

import { ASSAM_BOUNDS } from '../../domain/shared/administrative-unit';
import type { BoundaryRing, DistrictBoundary } from '../../generated/assam-districts';

/** The parallel along which east–west scale is exact. Assam's mid-latitude. */
export const STANDARD_PARALLEL = 26.2;

/** cos(26.2°) ≈ 0.8973 — how much a degree of longitude is worth here. */
export const LONGITUDE_SCALE = Math.cos((STANDARD_PARALLEL * Math.PI) / 180);

export const VIEW_WIDTH = 1000;
export const MAP_PAD = 28;

const LONGITUDE_SPAN = ASSAM_BOUNDS.maxLongitude - ASSAM_BOUNDS.minLongitude;
const LATITUDE_SPAN = ASSAM_BOUNDS.maxLatitude - ASSAM_BOUNDS.minLatitude;

/** User units per projected degree. The same on both axes — that is the point. */
export const MAP_SCALE = (VIEW_WIDTH - MAP_PAD * 2) / (LONGITUDE_SPAN * LONGITUDE_SCALE);

/** Derived, never chosen: 28 + 4.1° × scale + 28. */
export const VIEW_HEIGHT = MAP_PAD * 2 + LATITUDE_SPAN * MAP_SCALE;

export const projectLongitude = (longitude: number): number =>
  MAP_PAD + (longitude - ASSAM_BOUNDS.minLongitude) * LONGITUDE_SCALE * MAP_SCALE;

export const projectLatitude = (latitude: number): number =>
  MAP_PAD + (ASSAM_BOUNDS.maxLatitude - latitude) * MAP_SCALE;

/**
 * A ring as an SVG subpath.
 *
 * Rounded to one decimal — a tenth of a user unit is about 60 m on the ground
 * and well under a rendered pixel at any viewport this console is read at, so
 * the precision would only ever be paid for in DOM size.
 */
export const ringSubpath = (ring: BoundaryRing): string => {
  if (ring.length === 0) return '';
  const positions = ring.map(
    ([longitude, latitude]) =>
      `${projectLongitude(longitude).toFixed(1)},${projectLatitude(latitude).toFixed(1)}`,
  );
  return `M${positions.join('L')}Z`;
};

/** Every ring of a District as one path. Drawn with `fill-rule="evenodd"`. */
export const districtPath = (boundary: DistrictBoundary): string =>
  boundary.rings.map(ringSubpath).join('');

/**
 * The projection.
 *
 * ADR-0008 mapped longitude and latitude independently onto a fixed box, which
 * stretched Assam about 11% too wide. These tests pin the fix: one scale for
 * both axes, longitude discounted by cos(26.2°), and a viewBox whose height is
 * derived from that rather than chosen (ADR-0009).
 */

import { describe, expect, it } from 'vitest';
import { ASSAM_BOUNDS } from '../../domain/shared/administrative-unit';
import { ASSAM_DISTRICT_BOUNDARIES } from '../../generated/assam-districts';
import {
  LONGITUDE_SCALE,
  MAP_PAD,
  MAP_SCALE,
  STANDARD_PARALLEL,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  districtPath,
  projectLatitude,
  projectLongitude,
  ringSubpath,
} from './map-projection';

/** Great-circle distance in km, for checking the projection against reality. */
const haversineKm = (
  [lon1, lat1]: readonly [number, number],
  [lon2, lat2]: readonly [number, number],
): number => {
  const R = 6371;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

describe('the standard parallel', () => {
  it('sits at Assam’s mid-latitude', () => {
    const mid = (ASSAM_BOUNDS.minLatitude + ASSAM_BOUNDS.maxLatitude) / 2;
    // 26.15° rounded to a tenth. The tenth is the point: an exact bisector
    // would be spurious precision on a bounding box that is itself a rounding.
    expect(mid).toBeCloseTo(26.15, 6);
    expect(Math.abs(STANDARD_PARALLEL - mid)).toBeLessThan(0.06);
  });

  it('discounts a degree of longitude by cos(26.2°)', () => {
    expect(LONGITUDE_SCALE).toBeCloseTo(0.8973, 4);
  });
});

describe('projection', () => {
  it("maps Assam's bounding box corners to the corners of the frame", () => {
    expect(projectLongitude(ASSAM_BOUNDS.minLongitude)).toBeCloseTo(MAP_PAD, 6);
    expect(projectLongitude(ASSAM_BOUNDS.maxLongitude)).toBeCloseTo(VIEW_WIDTH - MAP_PAD, 6);
    // Latitude is inverted: north is up.
    expect(projectLatitude(ASSAM_BOUNDS.maxLatitude)).toBeCloseTo(MAP_PAD, 6);
    expect(projectLatitude(ASSAM_BOUNDS.minLatitude)).toBeCloseTo(VIEW_HEIGHT - MAP_PAD, 6);
  });

  it('derives the viewBox height from the scale instead of choosing it', () => {
    const latitudeSpan = ASSAM_BOUNDS.maxLatitude - ASSAM_BOUNDS.minLatitude;
    expect(VIEW_HEIGHT).toBeCloseTo(MAP_PAD * 2 + latitudeSpan * MAP_SCALE, 6);
    expect(VIEW_HEIGHT).toBeCloseTo(740.7, 1);
  });

  it('keeps 100 km the same length whichever way it is measured', () => {
    // The property the old linear mapping broke. A degree of latitude is ~111
    // km; a degree of longitude here is only ~100 km, and with one scale for
    // both axes the map has to agree.
    const origin = [92.5, 26.2] as const;
    const east = [92.5 + 1, 26.2] as const;
    const north = [92.5, 26.2 + 1] as const;

    const eastUnitsPerKm =
      (projectLongitude(east[0]) - projectLongitude(origin[0])) / haversineKm(origin, east);
    const northUnitsPerKm =
      (projectLatitude(origin[1]) - projectLatitude(north[1])) / haversineKm(origin, north);

    expect(eastUnitsPerKm / northUnitsPerKm).toBeCloseTo(1, 2);
  });

  it('does not stretch Assam to fill the viewport', () => {
    // Guards the specific regression: an aspect ratio taken from the box
    // rather than from the geography.
    const drawnAspect = (VIEW_WIDTH - MAP_PAD * 2) / (VIEW_HEIGHT - MAP_PAD * 2);
    const trueAspect =
      ((ASSAM_BOUNDS.maxLongitude - ASSAM_BOUNDS.minLongitude) * LONGITUDE_SCALE) /
      (ASSAM_BOUNDS.maxLatitude - ASSAM_BOUNDS.minLatitude);

    expect(drawnAspect).toBeCloseTo(trueAspect, 6);
    // And it is meaningfully different from the naive box aspect it replaced.
    expect(drawnAspect).not.toBeCloseTo((VIEW_WIDTH - 56) / (720 - 56), 2);
  });
});

describe('ring paths', () => {
  it('emits a closed subpath per ring', () => {
    const path = ringSubpath([
      [90, 25],
      [91, 25],
      [91, 26],
      [90, 25],
    ]);

    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path.split('L')).toHaveLength(4);
  });

  it('is empty for an empty ring rather than emitting a stray M', () => {
    expect(ringSubpath([])).toBe('');
  });

  it('draws every District inside the frame', () => {
    for (const boundary of ASSAM_DISTRICT_BOUNDARIES) {
      const path = districtPath(boundary);
      expect(path.length).toBeGreaterThan(0);
      expect(path.startsWith('M')).toBe(true);
      // One subpath per ring, so a multi-part District keeps its islands.
      expect(path.split('Z')).toHaveLength(boundary.rings.length + 1);
    }
  });

  it('places the whole state within the viewBox', () => {
    for (const boundary of ASSAM_DISTRICT_BOUNDARIES) {
      for (const ring of boundary.rings) {
        for (const [longitude, latitude] of ring) {
          expect(projectLongitude(longitude)).toBeGreaterThanOrEqual(0);
          expect(projectLongitude(longitude)).toBeLessThanOrEqual(VIEW_WIDTH);
          expect(projectLatitude(latitude)).toBeGreaterThanOrEqual(0);
          expect(projectLatitude(latitude)).toBeLessThanOrEqual(VIEW_HEIGHT);
        }
      }
    }
  });
});

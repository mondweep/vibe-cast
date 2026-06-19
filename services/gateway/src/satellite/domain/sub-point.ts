import { Vec3 } from './sun';

/** A point on the Earth's surface (sub-satellite point). */
export interface GroundPoint {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
}

const RAD2DEG = 180 / Math.PI;

/** Greenwich Mean Sidereal Time at `at`, radians. */
function gmstRad(at: Date): number {
  const jd = at.getTime() / 86_400_000 + 2_440_587.5;
  const n = jd - 2_451_545.0;
  const deg = (((280.46061837 + 360.98564736629 * n) % 360) + 360) % 360;
  return (deg * Math.PI) / 180;
}

/**
 * The sub-satellite point: the spot on Earth directly beneath a satellite,
 * derived from its ECI position and the sidereal rotation of the Earth.
 * Uses geocentric latitude (spherical Earth) — within ~0.2° of geodetic, which
 * is immaterial for a map marker and avoids an oblateness correction (ADR-0013).
 */
export function subSatellitePoint(eci: Vec3, at: Date): GroundPoint {
  const longitudeRad = Math.atan2(eci.y, eci.x) - gmstRad(at);
  let longitudeDeg = longitudeRad * RAD2DEG;
  longitudeDeg = ((((longitudeDeg + 180) % 360) + 360) % 360) - 180; // → (-180, 180]
  const latitudeDeg = Math.atan2(eci.z, Math.hypot(eci.x, eci.y)) * RAD2DEG;
  return { latitudeDeg, longitudeDeg };
}

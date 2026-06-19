/**
 * Low-precision solar geometry (Satellite Tracking context, Phase 3).
 *
 * Pure, dependency-free functions (~0.01° accuracy — ample for deciding whether
 * a pass is optically visible). Algorithms from the Astronomical Almanac's
 * low-precision formulae. Used to flag passes that are actually visible:
 * the satellite must be sunlit while the observer is in darkness (ADR-0004
 * follow-up).
 */
import { Observer } from '../../shared/observer';

export interface Vec3 {
  /** kilometres, Earth-Centered Inertial (equatorial) */
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const RAD = Math.PI / 180;
const AU_KM = 149_597_870.7;
const EARTH_RADIUS_KM = 6378.137;

const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

/** Julian Date from a JS Date. */
export function julianDate(at: Date): number {
  return at.getTime() / 86_400_000 + 2_440_587.5;
}

/** Approximate geocentric position of the Sun in ECI (km). */
export function sunEciKm(at: Date): Vec3 {
  const n = julianDate(at) - 2_451_545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const epsilon = (23.439 - 0.0000004 * n) * RAD;
  const rAu = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
  const r = rAu * AU_KM;
  return {
    x: r * Math.cos(lambda),
    y: r * Math.cos(epsilon) * Math.sin(lambda),
    z: r * Math.sin(epsilon) * Math.sin(lambda),
  };
}

/** The Sun's elevation above the observer's horizon, degrees. */
export function solarElevationDeg(observer: Observer, at: Date): number {
  const n = julianDate(at) - 2_451_545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const epsilon = (23.439 - 0.0000004 * n) * RAD;

  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const rightAscension = Math.atan2(
    Math.cos(epsilon) * Math.sin(lambda),
    Math.cos(lambda),
  );

  const gmstDeg = norm360(280.46061837 + 360.98564736629 * n);
  const localSiderealRad = (gmstDeg + observer.longitudeDeg) * RAD;
  const hourAngle = localSiderealRad - rightAscension;

  const lat = observer.latitudeDeg * RAD;
  const elevation = Math.asin(
    Math.sin(lat) * Math.sin(declination) +
      Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
  );
  return elevation / RAD;
}

/**
 * Whether a satellite at `satEci` is in sunlight (not inside Earth's shadow),
 * using a cylindrical umbra model — sufficient for visibility flagging.
 */
export function isSatelliteSunlit(satEci: Vec3, sunEci: Vec3): boolean {
  const sunMag = Math.hypot(sunEci.x, sunEci.y, sunEci.z);
  const ux = sunEci.x / sunMag;
  const uy = sunEci.y / sunMag;
  const uz = sunEci.z / sunMag;

  const dot = satEci.x * ux + satEci.y * uy + satEci.z * uz;
  if (dot >= 0) return true; // sun-facing hemisphere: always lit

  const satMagSq = satEci.x ** 2 + satEci.y ** 2 + satEci.z ** 2;
  const perpDistance = Math.sqrt(Math.max(0, satMagSq - dot * dot));
  return perpDistance > EARTH_RADIUS_KM; // outside the shadow cylinder
}

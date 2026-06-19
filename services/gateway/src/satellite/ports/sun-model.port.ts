import { Observer } from '../../shared/observer';
import { Vec3 } from '../domain/sun';

/**
 * Driven port: solar geometry the visibility logic needs. The production
 * adapter uses the low-precision formulae in `sun.ts`; tests substitute a fake
 * so visibility decisions are verified deterministically (ADR-0006).
 */
export interface SunModel {
  /** Geocentric position of the Sun in ECI (km). */
  sunEciKm(at: Date): Vec3;
  /** Sun elevation above the observer's horizon, degrees. */
  solarElevationDeg(observer: Observer, at: Date): number;
}

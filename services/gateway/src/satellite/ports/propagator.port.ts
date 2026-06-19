import { Observer } from '../../shared/observer';
import { LookAngle, Satellite } from '../domain/satellite';
import { Vec3 } from '../domain/sun';

/**
 * Driven port: computes where a satellite is in the observer's sky at a given
 * instant. The production adapter wraps an SGP4 implementation (satellite.js,
 * ADR-0004); tests substitute a scripted fake so pass-detection logic can be
 * verified without any orbital mechanics (London-School TDD, ADR-0006).
 */
export interface Propagator {
  lookAngle(satellite: Satellite, observer: Observer, at: Date): LookAngle;
  /**
   * Geocentric (ECI, km) position of the satellite, or null on propagation
   * error. Used by the visibility logic to test for Earth-shadow eclipse.
   */
  eciPositionKm(satellite: Satellite, at: Date): Vec3 | null;
}

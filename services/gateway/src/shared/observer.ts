import { GeoCoordinate } from './geo';

/**
 * The person/device at the centre of the sky. A value object shared by the
 * Flight Tracking and Satellite Tracking bounded contexts (Shared Kernel).
 */
export class Observer {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  /** Height above sea level, kilometres (matters for satellite look angles). */
  readonly altitudeKm: number;
  /** Aircraft further than this from the observer are ignored. */
  readonly flightRangeKm: number;
  /** A satellite is only "up" when its elevation exceeds this (degrees). */
  readonly minElevationDeg: number;

  constructor(params: {
    latitudeDeg: number;
    longitudeDeg: number;
    altitudeKm?: number;
    flightRangeKm?: number;
    minElevationDeg?: number;
  }) {
    if (params.latitudeDeg < -90 || params.latitudeDeg > 90) {
      throw new RangeError(`latitude out of range: ${params.latitudeDeg}`);
    }
    if (params.longitudeDeg < -180 || params.longitudeDeg > 180) {
      throw new RangeError(`longitude out of range: ${params.longitudeDeg}`);
    }
    this.latitudeDeg = params.latitudeDeg;
    this.longitudeDeg = params.longitudeDeg;
    this.altitudeKm = params.altitudeKm ?? 0;
    this.flightRangeKm = params.flightRangeKm ?? 50;
    this.minElevationDeg = params.minElevationDeg ?? 10;
  }

  get location(): GeoCoordinate {
    return { latitudeDeg: this.latitudeDeg, longitudeDeg: this.longitudeDeg };
  }
}

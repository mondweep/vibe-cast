import { Satellite } from './satellite';

/**
 * A single pass of a satellite over the observer: the window during which it
 * is above the configured minimum elevation.
 *
 *  AOS = Acquisition Of Signal (rise), the moment it crosses the horizon up
 *  TCA = Time of Closest Approach, peak elevation
 *  LOS = Loss Of Signal (set), the moment it drops back below
 */
export interface SatellitePass {
  readonly satelliteName: string;
  readonly noradId: number;
  readonly aosTime: Date;
  readonly tcaTime: Date;
  readonly losTime: Date;
  readonly maxElevationDeg: number;
  readonly durationSeconds: number;
}

export function passFromSamples(
  satellite: Satellite,
  aosTime: Date,
  tcaTime: Date,
  losTime: Date,
  maxElevationDeg: number,
): SatellitePass {
  return {
    satelliteName: satellite.name,
    noradId: satellite.noradId,
    aosTime,
    tcaTime,
    losTime,
    maxElevationDeg,
    durationSeconds: Math.round((losTime.getTime() - aosTime.getTime()) / 1000),
  };
}

import { Observer } from '../../shared/observer';
import { SunModel } from '../ports/sun-model.port';
import { Vec3, solarElevationDeg, sunEciKm } from '../domain/sun';

/** Production {@link SunModel} backed by the pure solar formulae in sun.ts. */
export class AstronomicalSunModel implements SunModel {
  sunEciKm(at: Date): Vec3 {
    return sunEciKm(at);
  }
  solarElevationDeg(observer: Observer, at: Date): number {
    return solarElevationDeg(observer, at);
  }
}

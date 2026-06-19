import * as satellite from 'satellite.js';
import { Observer } from '../../shared/observer';
import { LookAngle, Satellite } from '../domain/satellite';
import { Vec3 } from '../domain/sun';
import { Propagator } from '../ports/propagator.port';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

/**
 * Production {@link Propagator} backed by the SGP4 implementation in
 * satellite.js (ADR-0004). Parsed satrecs are memoised per TLE line pair.
 */
export class Sgp4Propagator implements Propagator {
  private readonly satrecs = new Map<string, satellite.SatRec>();

  lookAngle(sat: Satellite, observer: Observer, at: Date): LookAngle {
    const satrec = this.satrecFor(sat);
    const eci = satellite.propagate(satrec, at);
    if (typeof eci.position === 'boolean' || !eci.position) {
      // Propagation error (decayed orbit / bad TLE): treat as below horizon.
      return { azimuthDeg: 0, elevationDeg: -90, rangeKm: NaN };
    }
    const gmst = satellite.gstime(at);
    const ecf = satellite.eciToEcf(eci.position, gmst);
    const look = satellite.ecfToLookAngles(
      {
        longitude: observer.longitudeDeg * DEG2RAD,
        latitude: observer.latitudeDeg * DEG2RAD,
        height: observer.altitudeKm,
      },
      ecf,
    );
    return {
      azimuthDeg: (look.azimuth * RAD2DEG + 360) % 360,
      elevationDeg: look.elevation * RAD2DEG,
      rangeKm: look.rangeSat,
    };
  }

  eciPositionKm(sat: Satellite, at: Date): Vec3 | null {
    const eci = satellite.propagate(this.satrecFor(sat), at);
    if (typeof eci.position === 'boolean' || !eci.position) return null;
    return { x: eci.position.x, y: eci.position.y, z: eci.position.z };
  }

  private satrecFor(sat: Satellite): satellite.SatRec {
    const key = sat.tleLine1 + sat.tleLine2;
    let rec = this.satrecs.get(key);
    if (!rec) {
      rec = satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
      this.satrecs.set(key, rec);
    }
    return rec;
  }
}

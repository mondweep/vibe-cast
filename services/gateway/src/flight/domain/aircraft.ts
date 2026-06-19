import { GeoCoordinate } from '../../shared/geo';

/** An aircraft position report decoded from ADS-B (Flight Tracking context). */
export interface Aircraft {
  /** 24-bit ICAO transponder address, lower-case hex. Stable identity. */
  readonly icao24: string;
  readonly callsign: string | null;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  /** Barometric altitude in metres, or null when not transmitted. */
  readonly baroAltitudeM: number | null;
  /** Ground speed, metres per second, or null. */
  readonly velocityMps: number | null;
  /** True track over ground, degrees clockwise from north, or null. */
  readonly headingDeg: number | null;
  readonly onGround: boolean;
}

/** An aircraft enriched with its position relative to the observer. */
export interface NearbyAircraft {
  readonly aircraft: Aircraft;
  /** Great-circle distance from observer, kilometres. */
  readonly distanceKm: number;
  /** Compass bearing from observer to aircraft, degrees. */
  readonly bearingDeg: number;
}

export function aircraftLocation(a: Aircraft): GeoCoordinate {
  return { latitudeDeg: a.latitudeDeg, longitudeDeg: a.longitudeDeg };
}

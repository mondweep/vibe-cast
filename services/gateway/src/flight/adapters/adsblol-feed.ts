import { BoundingBox, GeoCoordinate, distanceKm } from '../../shared/geo';
import { Aircraft } from '../domain/aircraft';
import { AircraftFeed } from '../ports/aircraft-feed.port';

/** A single aircraft from the adsb.lol `ac` array (units: feet, knots, deg). */
export interface AdsbLolAircraft {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string; // number (ft) or the string "ground"
  gs?: number; // ground speed, knots
  track?: number; // degrees
}

export interface AdsbLolResponse {
  ac?: AdsbLolAircraft[];
}

const FEET_TO_M = 0.3048;
const KNOTS_TO_MPS = 0.514444;
const KM_PER_NM = 1.852;

/**
 * Pure mapping from an adsb.lol response to our Aircraft model, converting the
 * imperial units adsb.lol uses (feet, knots) to SI. Kept separate from IO for
 * unit testing (ADR-0002/0003).
 */
export function mapAdsbLolAircraft(response: AdsbLolResponse): Aircraft[] {
  const result: Aircraft[] = [];
  for (const a of response.ac ?? []) {
    if (typeof a.lat !== 'number' || typeof a.lon !== 'number') continue;
    const onGround = a.alt_baro === 'ground';
    result.push({
      icao24: (a.hex ?? '').replace('~', '').trim().toLowerCase(),
      callsign: a.flight?.trim() || null,
      latitudeDeg: a.lat,
      longitudeDeg: a.lon,
      baroAltitudeM: typeof a.alt_baro === 'number' ? a.alt_baro * FEET_TO_M : null,
      velocityMps: typeof a.gs === 'number' ? a.gs * KNOTS_TO_MPS : null,
      headingDeg: typeof a.track === 'number' ? a.track : null,
      onGround,
    });
  }
  return result;
}

export interface AdsbLolConfig {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

/**
 * Driven adapter implementing {@link AircraftFeed} over the open adsb.lol API
 * (no auth, friendly to cloud egress). adsb.lol queries by point + radius, so
 * we convert the requested bounding box to its enclosing circle; the domain
 * service then filters to the exact circular range.
 */
export class AdsbLolFeed implements AircraftFeed {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: AdsbLolConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://api.adsb.lol';
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async fetchInBoundingBox(box: BoundingBox): Promise<Aircraft[]> {
    const centre: GeoCoordinate = {
      latitudeDeg: (box.minLatDeg + box.maxLatDeg) / 2,
      longitudeDeg: (box.minLonDeg + box.maxLonDeg) / 2,
    };
    const cornerKm = distanceKm(centre, {
      latitudeDeg: box.maxLatDeg,
      longitudeDeg: box.maxLonDeg,
    });
    const distNm = Math.min(250, Math.max(1, Math.ceil(cornerKm / KM_PER_NM)));
    const url = `${this.baseUrl}/v2/lat/${centre.latitudeDeg}/lon/${centre.longitudeDeg}/dist/${distNm}`;

    const res = await this.fetchFn(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`adsb.lol request failed: ${res.status} ${res.statusText}`);
    }
    return mapAdsbLolAircraft((await res.json()) as AdsbLolResponse);
  }
}

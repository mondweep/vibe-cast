import {
  AircraftInfo,
  Airport,
  FlightInfo,
  FlightInfoProvider,
  RouteInfo,
} from '../ports/flight-info.port';

/** Pure mapping of an adsbdb `/aircraft/{icao}` response → AircraftInfo. */
export function mapAircraft(json: any): AircraftInfo | null {
  const a = json?.response?.aircraft;
  if (!a) return null;
  return {
    registration: a.registration ?? null,
    type: a.type ?? null,
    manufacturer: a.manufacturer ?? null,
    owner: a.registered_owner ?? null,
    ownerCountry: a.registered_owner_country_name ?? null,
    photoThumbUrl: a.url_photo_thumbnail ?? a.url_photo ?? null,
  };
}

const airport = (x: any): Airport | null =>
  x
    ? {
        iata: x.iata_code ?? null,
        name: x.name ?? null,
        municipality: x.municipality ?? null,
        country: x.country_name ?? null,
      }
    : null;

/** Pure mapping of an adsbdb `/callsign/{cs}` response → RouteInfo. */
export function mapRoute(json: any): RouteInfo | null {
  // Unknown callsigns return { response: "unknown callsign" } (a string).
  const fr = json?.response?.flightroute;
  if (!fr) return null;
  return {
    airlineName: fr.airline?.name ?? null,
    airlineIcao: fr.airline?.icao ?? null,
    airlineCountry: fr.airline?.country ?? null,
    origin: airport(fr.origin),
    destination: airport(fr.destination),
  };
}

export interface AdsbdbConfig {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  maxAgeMs?: number;
  now?: () => number;
}

/**
 * Driven adapter implementing {@link FlightInfoProvider} over the open
 * adsbdb.com API (no auth, CORS-friendly). Results are cached with a TTL; a
 * failed sub-lookup degrades to `null` rather than throwing, so a popup never
 * breaks (ADR-0010).
 */
export class AdsbdbFlightInfo implements FlightInfoProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxAgeMs: number;
  private readonly now: () => number;
  private readonly cache = new Map<string, { at: number; value: unknown }>();

  constructor(config: AdsbdbConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://api.adsbdb.com/v0';
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxAgeMs = config.maxAgeMs ?? 24 * 3600 * 1000;
    this.now = config.now ?? Date.now;
  }

  async lookup(icao24: string, callsign?: string): Promise<FlightInfo> {
    const [aircraft, route] = await Promise.all([
      this.cached(`a:${icao24.toLowerCase()}`, `aircraft/${encodeURIComponent(icao24)}`, mapAircraft),
      callsign
        ? this.cached(`r:${callsign.trim()}`, `callsign/${encodeURIComponent(callsign.trim())}`, mapRoute)
        : Promise.resolve(null),
    ]);
    return { aircraft, route };
  }

  private async cached<T>(key: string, path: string, map: (j: any) => T): Promise<T | null> {
    const hit = this.cache.get(key);
    if (hit && this.now() - hit.at < this.maxAgeMs) return hit.value as T;
    try {
      const res = await this.fetchFn(`${this.baseUrl}/${path}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const value = map(await res.json());
      this.cache.set(key, { at: this.now(), value });
      return value;
    } catch {
      return null; // never break a popup on an enrichment failure
    }
  }
}

import { BoundingBox } from '../../shared/geo';
import { Aircraft } from '../domain/aircraft';
import { AircraftFeed } from '../ports/aircraft-feed.port';
import { TokenProvider } from './opensky-token-manager';

/** A single element of OpenSky's `states` array (positional encoding). */
export type OpenSkyState = (string | number | boolean | null)[];

export interface OpenSkyResponse {
  time: number;
  states: OpenSkyState[] | null;
}

/**
 * Pure mapping from OpenSky's positional `states` array to our Aircraft model.
 * Kept separate from IO so it can be unit-tested without the network.
 * Column order: https://openskynetwork.github.io/opensky-api/rest.html
 */
export function mapOpenSkyStates(response: OpenSkyResponse): Aircraft[] {
  const states = response.states ?? [];
  const result: Aircraft[] = [];
  for (const s of states) {
    const latitudeDeg = s[6] as number | null;
    const longitudeDeg = s[5] as number | null;
    if (latitudeDeg == null || longitudeDeg == null) continue; // no position
    const callsign = (s[1] as string | null)?.trim() || null;
    result.push({
      icao24: (s[0] as string).trim().toLowerCase(),
      callsign,
      latitudeDeg,
      longitudeDeg,
      baroAltitudeM: (s[7] as number | null) ?? null,
      velocityMps: (s[9] as number | null) ?? null,
      headingDeg: (s[10] as number | null) ?? null,
      onGround: Boolean(s[8]),
    });
  }
  return result;
}

export interface OpenSkyConfig {
  baseUrl?: string;
  /** Optional static OAuth2 bearer token. */
  accessToken?: string;
  /**
   * Optional dynamic token source (OAuth2 client-credentials, refreshed as
   * needed). Takes precedence over `accessToken` when both are supplied.
   */
  tokenProvider?: TokenProvider;
  fetchFn?: typeof fetch;
}

/**
 * Driven adapter implementing {@link AircraftFeed} over the OpenSky Network
 * REST API (ADR-0002). The hackster "Micro Radar" build uses this same source.
 */
export class OpenSkyFeed implements AircraftFeed {
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly tokenProvider?: TokenProvider;
  private readonly fetchFn: typeof fetch;

  constructor(config: OpenSkyConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://opensky-network.org/api';
    this.accessToken = config.accessToken;
    this.tokenProvider = config.tokenProvider;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async fetchInBoundingBox(box: BoundingBox): Promise<Aircraft[]> {
    const url =
      `${this.baseUrl}/states/all` +
      `?lamin=${box.minLatDeg}&lomin=${box.minLonDeg}` +
      `&lamax=${box.maxLatDeg}&lomax=${box.maxLonDeg}`;
    const headers: Record<string, string> = {};
    const bearer = this.tokenProvider
      ? await this.tokenProvider()
      : this.accessToken;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    const res = await this.fetchFn(url, { headers });
    if (!res.ok) {
      throw new Error(`OpenSky request failed: ${res.status} ${res.statusText}`);
    }
    return mapOpenSkyStates((await res.json()) as OpenSkyResponse);
  }
}

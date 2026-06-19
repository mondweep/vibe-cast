/**
 * Flight enrichment (Flight Tracking context): airline, route and aircraft
 * details for a clicked flight. A driven port so the data source (adsbdb.com)
 * stays behind an Anti-Corruption Layer (ADR-0003, ADR-0010).
 */

export interface AircraftInfo {
  registration: string | null;
  type: string | null;
  manufacturer: string | null;
  owner: string | null;
  ownerCountry: string | null;
  photoThumbUrl: string | null;
}

export interface Airport {
  iata: string | null;
  name: string | null;
  municipality: string | null;
  country: string | null;
}

export interface RouteInfo {
  airlineName: string | null;
  airlineIcao: string | null;
  airlineCountry: string | null;
  origin: Airport | null;
  destination: Airport | null;
}

/** Combined enrichment for one flight; either part may be null when unknown. */
export interface FlightInfo {
  aircraft: AircraftInfo | null;
  route: RouteInfo | null;
}

export interface FlightInfoProvider {
  /** Look up aircraft (by ICAO24) and, when given, route (by callsign). */
  lookup(icao24: string, callsign?: string): Promise<FlightInfo>;
}

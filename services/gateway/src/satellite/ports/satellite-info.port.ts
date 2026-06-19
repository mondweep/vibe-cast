/**
 * Satellite enrichment (Satellite Tracking context): catalogue metadata for a
 * clicked satellite. Driven port; the source (CelesTrak SATCAT) stays behind an
 * Anti-Corruption Layer (ADR-0003, ADR-0010).
 */
export interface SatelliteInfo {
  name: string | null;
  intlDesignator: string | null;
  /** PAY = payload, R/B = rocket body, DEB = debris, etc. */
  objectType: string | null;
  owner: string | null;
  launchDate: string | null;
  launchSite: string | null;
  periodMin: number | null;
  inclinationDeg: number | null;
  apogeeKm: number | null;
  perigeeKm: number | null;
}

export interface SatelliteInfoProvider {
  lookup(noradId: number): Promise<SatelliteInfo | null>;
}

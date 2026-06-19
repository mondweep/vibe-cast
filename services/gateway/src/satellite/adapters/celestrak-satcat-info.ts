import { SatelliteInfo, SatelliteInfoProvider } from '../ports/satellite-info.port';

const numOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Pure mapping of one CelesTrak SATCAT JSON record → SatelliteInfo. */
export function mapSatcatRecord(rec: any): SatelliteInfo | null {
  if (!rec || rec.NORAD_CAT_ID == null) return null;
  return {
    name: rec.OBJECT_NAME ?? null,
    intlDesignator: rec.OBJECT_ID ?? null,
    objectType: rec.OBJECT_TYPE ?? null,
    owner: rec.OWNER ?? null,
    launchDate: rec.LAUNCH_DATE || null,
    launchSite: rec.LAUNCH_SITE || null,
    periodMin: numOrNull(rec.PERIOD),
    inclinationDeg: numOrNull(rec.INCLINATION),
    apogeeKm: numOrNull(rec.APOGEE),
    perigeeKm: numOrNull(rec.PERIGEE),
  };
}

export interface CelestrakSatcatConfig {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  maxAgeMs?: number;
  now?: () => number;
}

/**
 * Driven adapter implementing {@link SatelliteInfoProvider} over CelesTrak's
 * SATCAT records endpoint, cached with a TTL. Catalogue data is effectively
 * static, so a long TTL is fine (ADR-0010).
 */
export class CelestrakSatcatInfo implements SatelliteInfoProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxAgeMs: number;
  private readonly now: () => number;
  private readonly cache = new Map<number, { at: number; value: SatelliteInfo | null }>();

  constructor(config: CelestrakSatcatConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://celestrak.org/satcat/records.php';
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxAgeMs = config.maxAgeMs ?? 7 * 24 * 3600 * 1000;
    this.now = config.now ?? Date.now;
  }

  async lookup(noradId: number): Promise<SatelliteInfo | null> {
    const hit = this.cache.get(noradId);
    if (hit && this.now() - hit.at < this.maxAgeMs) return hit.value;
    try {
      const res = await this.fetchFn(`${this.baseUrl}?CATNR=${noradId}&FORMAT=json`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const records = (await res.json()) as unknown[];
      const value = Array.isArray(records) && records.length ? mapSatcatRecord(records[0]) : null;
      this.cache.set(noradId, { at: this.now(), value });
      return value;
    } catch {
      return null;
    }
  }
}

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
  maxRetries?: number;
  retryDelayMs?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Driven adapter implementing {@link SatelliteInfoProvider} over CelesTrak's
 * SATCAT records endpoint, cached with a TTL and retried on transient failure
 * (CelesTrak can throttle cloud IPs). Catalogue data is effectively static, so
 * a long TTL is fine (ADR-0010).
 */
export class CelestrakSatcatInfo implements SatelliteInfoProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxAgeMs: number;
  private readonly now: () => number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly cache = new Map<number, { at: number; value: SatelliteInfo | null }>();

  constructor(config: CelestrakSatcatConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://celestrak.org/satcat/records.php';
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxAgeMs = config.maxAgeMs ?? 7 * 24 * 3600 * 1000;
    this.now = config.now ?? Date.now;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelayMs = config.retryDelayMs ?? 400;
  }

  async lookup(noradId: number): Promise<SatelliteInfo | null> {
    const hit = this.cache.get(noradId);
    if (hit && this.now() - hit.at < this.maxAgeMs) return hit.value;

    const url = `${this.baseUrl}?CATNR=${noradId}&FORMAT=json`;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(this.retryDelayMs * attempt);
      try {
        const res = await this.fetchFn(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) continue; // transient — retry
        const records = (await res.json()) as unknown[];
        const value =
          Array.isArray(records) && records.length ? mapSatcatRecord(records[0]) : null;
        this.cache.set(noradId, { at: this.now(), value }); // cache success (incl. genuine "not found")
        return value;
      } catch {
        // network error — retry
      }
    }
    return null; // all attempts failed; not cached, so we retry next time
  }
}

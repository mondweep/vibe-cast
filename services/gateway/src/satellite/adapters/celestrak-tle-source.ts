import { Satellite } from '../domain/satellite';
import { TleSource } from '../ports/tle-source.port';

/**
 * Pure parser for CelesTrak's `FORMAT=tle` payload: repeating triples of
 * (name, line1, line2). Separated from IO for unit testing (ADR-0005).
 */
export function parseTleText(text: string): Satellite[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  const satellites: Satellite[] = [];
  for (let i = 0; i + 2 < lines.length + 1; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!name || !line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue;
    satellites.push({
      name: name.trim(),
      noradId: parseInt(line1.substring(2, 7), 10),
      tleLine1: line1,
      tleLine2: line2,
    });
  }
  return satellites;
}

export interface CelestrakConfig {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  /** Cache freshness window in milliseconds (TLEs age out after ~24h). */
  maxAgeMs?: number;
  now?: () => number;
  /** Extra fetch attempts after the first, with linear backoff (default 2). */
  maxRetries?: number;
  /** Base backoff between attempts, ms (default 400). */
  retryDelayMs?: number;
  /**
   * Last-resort bundled TLE text per group (e.g. { visual: "..." }). Used only
   * when every live fetch fails AND there is no cached result, so satellites
   * still render when CelesTrak briefly throttles cloud IPs (ADR-0010 follow-up).
   */
  fallbackTle?: Record<string, string>;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Driven adapter implementing {@link TleSource} over CelesTrak's GP endpoint,
 * with a TTL cache (ADR-0005), retry-with-backoff, and an optional bundled
 * fallback so a transient CelesTrak outage doesn't blank the satellite view.
 */
export class CelestrakTleSource implements TleSource {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxAgeMs: number;
  private readonly now: () => number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly fallbackTle: Record<string, string>;
  private readonly cache = new Map<string, { at: number; sats: Satellite[] }>();

  constructor(config: CelestrakConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://celestrak.org/NORAD/elements/gp.php';
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxAgeMs = config.maxAgeMs ?? 12 * 3600 * 1000;
    this.now = config.now ?? Date.now;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelayMs = config.retryDelayMs ?? 400;
    this.fallbackTle = config.fallbackTle ?? {};
  }

  async fetchGroup(group: string): Promise<Satellite[]> {
    const cached = this.cache.get(group);
    if (cached && this.now() - cached.at < this.maxAgeMs) {
      return cached.sats;
    }
    try {
      const sats = await this.fetchWithRetry(group);
      this.cache.set(group, { at: this.now(), sats });
      return sats;
    } catch (err) {
      if (cached) return cached.sats; // stale beats empty
      const fb = this.fallbackTle[group];
      if (fb) return parseTleText(fb); // bundled last resort (not cached → keep retrying live)
      throw err; // surfaced as a Sky Snapshot warning
    }
  }

  private async fetchWithRetry(group: string): Promise<Satellite[]> {
    const url = `${this.baseUrl}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(this.retryDelayMs * attempt);
      try {
        const res = await this.fetchFn(url);
        if (!res.ok) {
          throw new Error(`CelesTrak request failed: ${res.status} ${res.statusText}`);
        }
        return parseTleText(await res.text());
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }
}

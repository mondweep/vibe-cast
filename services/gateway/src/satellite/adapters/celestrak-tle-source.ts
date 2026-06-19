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
}

/**
 * Driven adapter implementing {@link TleSource} over CelesTrak's GP endpoint,
 * with a simple in-memory TTL cache so we are friendly to their servers
 * (ADR-0005).
 */
export class CelestrakTleSource implements TleSource {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxAgeMs: number;
  private readonly now: () => number;
  private readonly cache = new Map<string, { at: number; sats: Satellite[] }>();

  constructor(config: CelestrakConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'https://celestrak.org/NORAD/elements/gp.php';
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxAgeMs = config.maxAgeMs ?? 6 * 3600 * 1000;
    this.now = config.now ?? Date.now;
  }

  async fetchGroup(group: string): Promise<Satellite[]> {
    const cached = this.cache.get(group);
    if (cached && this.now() - cached.at < this.maxAgeMs) {
      return cached.sats;
    }
    const url = `${this.baseUrl}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
    const res = await this.fetchFn(url);
    if (!res.ok) {
      throw new Error(`CelesTrak request failed: ${res.status} ${res.statusText}`);
    }
    const sats = parseTleText(await res.text());
    this.cache.set(group, { at: this.now(), sats });
    return sats;
  }
}

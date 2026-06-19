import { Observer } from '../shared/observer';
import {
  SkySnapshot,
  SnapshotOptions,
  SnapshotProvider,
} from './sky-snapshot.service';

export interface CacheOptions {
  /** How long a snapshot stays fresh, milliseconds (default 5000). */
  ttlMs?: number;
  now?: () => number;
}

/**
 * Decorator that caches Sky Snapshots per observer for a short TTL (Phase 5).
 * Many ESP32 devices polling the same gateway, or one device polling quickly,
 * should not each trigger an upstream OpenSky/CelesTrak hit — this keeps us
 * within provider rate limits (NFR3). Concurrent requests for the same key
 * share one in-flight promise; failures are not cached.
 */
export class CachingSnapshotService implements SnapshotProvider {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly cache = new Map<string, { at: number; value: Promise<SkySnapshot> }>();

  constructor(
    private readonly inner: SnapshotProvider,
    options: CacheOptions = {},
  ) {
    this.ttlMs = options.ttlMs ?? 5000;
    this.now = options.now ?? Date.now;
  }

  snapshot(observer: Observer, options: SnapshotOptions = {}): Promise<SkySnapshot> {
    const key = this.keyFor(observer, options);
    const hit = this.cache.get(key);
    if (hit && this.now() - hit.at < this.ttlMs) {
      return hit.value;
    }

    const value = this.inner.snapshot(observer, options);
    this.cache.set(key, { at: this.now(), value });
    // Don't cache failures: evict if the upstream call rejects.
    value.catch(() => {
      if (this.cache.get(key)?.value === value) this.cache.delete(key);
    });
    return value;
  }

  private keyFor(observer: Observer, options: SnapshotOptions): string {
    return JSON.stringify({
      lat: observer.latitudeDeg,
      lon: observer.longitudeDeg,
      alt: observer.altitudeKm,
      range: observer.flightRangeKm,
      minEl: observer.minElevationDeg,
      group: options.satelliteGroup,
      hours: options.passWindowHours,
    });
  }
}

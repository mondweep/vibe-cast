import { CachingSnapshotService } from '../../src/application/caching-snapshot.service';
import { SkySnapshot, SnapshotProvider } from '../../src/application/sky-snapshot.service';
import { Observer } from '../../src/shared/observer';

const snap = (): SkySnapshot => ({
  observedAt: 't',
  flights: [],
  satellitesOverhead: [],
  upcomingPasses: [],
  warnings: [],
});

describe('CachingSnapshotService', () => {
  const observer = new Observer({ latitudeDeg: 51.5, longitudeDeg: -0.12 });

  it('serves a second call within the TTL from cache (one upstream call)', async () => {
    const inner: SnapshotProvider = { snapshot: jest.fn().mockResolvedValue(snap()) };
    let clock = 1000;
    const cache = new CachingSnapshotService(inner, { ttlMs: 5000, now: () => clock });

    await cache.snapshot(observer);
    clock += 2000;
    await cache.snapshot(observer);

    expect(inner.snapshot).toHaveBeenCalledTimes(1);
  });

  it('refreshes once the cached entry has aged past the TTL', async () => {
    const inner: SnapshotProvider = { snapshot: jest.fn().mockResolvedValue(snap()) };
    let clock = 1000;
    const cache = new CachingSnapshotService(inner, { ttlMs: 5000, now: () => clock });

    await cache.snapshot(observer);
    clock += 6000;
    await cache.snapshot(observer);

    expect(inner.snapshot).toHaveBeenCalledTimes(2);
  });

  it('keys the cache by observer, so different observers do not collide', async () => {
    const inner: SnapshotProvider = { snapshot: jest.fn().mockResolvedValue(snap()) };
    const cache = new CachingSnapshotService(inner, { ttlMs: 5000, now: () => 1000 });

    await cache.snapshot(observer);
    await cache.snapshot(new Observer({ latitudeDeg: 40, longitudeDeg: -74 }));

    expect(inner.snapshot).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const inner: SnapshotProvider = {
      snapshot: jest
        .fn()
        .mockRejectedValueOnce(new Error('upstream down'))
        .mockResolvedValueOnce(snap()),
    };
    const cache = new CachingSnapshotService(inner, { ttlMs: 5000, now: () => 1000 });

    await expect(cache.snapshot(observer)).rejects.toThrow('upstream down');
    await expect(cache.snapshot(observer)).resolves.toBeDefined(); // re-tries upstream
    expect(inner.snapshot).toHaveBeenCalledTimes(2);
  });
});

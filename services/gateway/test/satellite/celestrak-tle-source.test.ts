import {
  CelestrakTleSource,
  parseTleText,
} from '../../src/satellite/adapters/celestrak-tle-source';

const ISS_TLE = `ISS (ZARYA)
1 25544U 98067A   24171.50000000  .00016717  00000-0  10270-3 0  9994
2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49514665    01
NOAA 19
1 33591U 09005A   24171.51234567  .00000079  00000-0  66501-4 0  9991
2 33591  99.0512 200.1234 0013333  90.1234 270.5678 14.12501234    02`;

describe('parseTleText', () => {
  it('parses triples into satellites and extracts the NORAD id', () => {
    const sats = parseTleText(ISS_TLE);
    expect(sats).toHaveLength(2);
    expect(sats[0]).toMatchObject({ name: 'ISS (ZARYA)', noradId: 25544 });
    expect(sats[1]).toMatchObject({ name: 'NOAA 19', noradId: 33591 });
  });

  it('ignores blank lines and malformed trailing content', () => {
    expect(parseTleText('\n\nISS\nnot-a-tle\n')).toEqual([]);
  });
});

describe('CelestrakTleSource caching', () => {
  it('fetches once then serves subsequent calls from cache within the TTL', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, text: async () => ISS_TLE });
    let clock = 1000;
    const source = new CelestrakTleSource({
      fetchFn: fetchFn as unknown as typeof fetch,
      maxAgeMs: 10_000,
      now: () => clock,
    });

    await source.fetchGroup('stations');
    clock += 5000; // still fresh
    await source.fetchGroup('stations');

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the cached entry has aged past the TTL', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, text: async () => ISS_TLE });
    let clock = 1000;
    const source = new CelestrakTleSource({
      fetchFn: fetchFn as unknown as typeof fetch,
      maxAgeMs: 10_000,
      now: () => clock,
    });

    await source.fetchGroup('stations');
    clock += 20_000; // stale
    await source.fetchGroup('stations');

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('CelestrakTleSource resilience', () => {
  it('retries a transient failure and then succeeds', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ ok: true, text: async () => ISS_TLE });
    const source = new CelestrakTleSource({
      fetchFn: fetchFn as unknown as typeof fetch,
      maxRetries: 2,
      retryDelayMs: 0,
    });

    const sats = await source.fetchGroup('stations');
    expect(sats.length).toBeGreaterThan(0);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('falls back to the bundled TLE when every fetch fails and nothing is cached', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('fetch failed'));
    const source = new CelestrakTleSource({
      fetchFn: fetchFn as unknown as typeof fetch,
      maxRetries: 1,
      retryDelayMs: 0,
      fallbackTle: { visual: ISS_TLE },
    });

    const sats = await source.fetchGroup('visual');
    expect(sats.map((s) => s.noradId)).toContain(25544); // served from fallback
  });

  it('serves a stale cache rather than failing when a later fetch fails', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => ISS_TLE })
      .mockRejectedValue(new Error('fetch failed'));
    let clock = 1000;
    const source = new CelestrakTleSource({
      fetchFn: fetchFn as unknown as typeof fetch,
      maxAgeMs: 10_000,
      now: () => clock,
      maxRetries: 0,
      retryDelayMs: 0,
    });

    await source.fetchGroup('visual'); // primes cache
    clock += 20_000; // stale → triggers a re-fetch, which fails
    const sats = await source.fetchGroup('visual');
    expect(sats.length).toBeGreaterThan(0); // stale cache returned
  });

  it('throws (→ snapshot warning) when fetch fails with no cache and no fallback', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('fetch failed'));
    const source = new CelestrakTleSource({
      fetchFn: fetchFn as unknown as typeof fetch,
      maxRetries: 0,
      retryDelayMs: 0,
    });
    await expect(source.fetchGroup('weather')).rejects.toThrow();
  });
});

import {
  OpenSkyFeed,
  mapOpenSkyStates,
} from '../../src/flight/adapters/opensky-feed';

describe('mapOpenSkyStates', () => {
  it('maps positional state vectors to Aircraft and skips rows without a position', () => {
    const aircraft = mapOpenSkyStates({
      time: 1718798400,
      states: [
        // icao24, callsign, country, tpos, contact, lon, lat, baro, onGround, vel, track, ...
        ['ABC123', 'BAW123 ', 'UK', 0, 0, -0.45, 51.47, 11000, false, 240, 95],
        ['DEF456', null, 'UK', 0, 0, null, null, null, true, 0, 0], // no position -> skipped
      ],
    });

    expect(aircraft).toHaveLength(1);
    expect(aircraft[0]).toMatchObject({
      icao24: 'abc123',
      callsign: 'BAW123',
      latitudeDeg: 51.47,
      longitudeDeg: -0.45,
      baroAltitudeM: 11000,
      onGround: false,
    });
  });

  it('tolerates a null states array', () => {
    expect(mapOpenSkyStates({ time: 0, states: null })).toEqual([]);
  });
});

describe('OpenSkyFeed adapter', () => {
  it('builds a bounding-box query, sends the bearer token and maps the response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ time: 0, states: [] }),
    });
    const feed = new OpenSkyFeed({ accessToken: 'tok-123', fetchFn: fetchFn as unknown as typeof fetch });

    await feed.fetchInBoundingBox({
      minLatDeg: 51,
      minLonDeg: -1,
      maxLatDeg: 52,
      maxLonDeg: 0,
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toContain('/states/all?lamin=51&lomin=-1&lamax=52&lomax=0');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });

  it('throws a descriptive error on a non-OK response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' });
    const feed = new OpenSkyFeed({ fetchFn: fetchFn as unknown as typeof fetch });
    await expect(
      feed.fetchInBoundingBox({ minLatDeg: 0, minLonDeg: 0, maxLatDeg: 1, maxLonDeg: 1 }),
    ).rejects.toThrow(/429/);
  });
});

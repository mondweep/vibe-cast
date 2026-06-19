import { AdsbLolFeed, mapAdsbLolAircraft } from '../../src/flight/adapters/adsblol-feed';

describe('mapAdsbLolAircraft', () => {
  it('maps fields and converts feet→m and knots→m/s', () => {
    const out = mapAdsbLolAircraft({
      ac: [
        { hex: 'ABC123', flight: 'BAW123  ', lat: 51.4, lon: -0.4, alt_baro: 10000, gs: 400, track: 95 },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      icao24: 'abc123',
      callsign: 'BAW123',
      latitudeDeg: 51.4,
      longitudeDeg: -0.4,
      onGround: false,
    });
    expect(out[0].baroAltitudeM).toBeCloseTo(3048, 0); // 10000 ft
    expect(out[0].velocityMps).toBeCloseTo(205.78, 1); // 400 kt
  });

  it('handles "ground", strips a TIS-B ~ prefix, and skips rows without position', () => {
    const out = mapAdsbLolAircraft({
      ac: [
        { hex: '~abc999', flight: '   ', alt_baro: 'ground', lat: 51.5, lon: -0.1 },
        { hex: 'def456', lat: undefined, lon: -0.2 }, // no position -> skipped
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].icao24).toBe('abc999');
    expect(out[0].callsign).toBeNull();
    expect(out[0].onGround).toBe(true);
    expect(out[0].baroAltitudeM).toBeNull();
  });

  it('tolerates a missing ac array', () => {
    expect(mapAdsbLolAircraft({})).toEqual([]);
  });
});

describe('AdsbLolFeed adapter', () => {
  it('converts the bounding box to a point+radius query and maps the response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ac: [] }) });
    const feed = new AdsbLolFeed({ baseUrl: 'https://api.adsb.lol', fetchFn: fetchFn as unknown as typeof fetch });

    await feed.fetchInBoundingBox({ minLatDeg: 51, minLonDeg: -1, maxLatDeg: 52, maxLonDeg: 0 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toMatch(/\/v2\/lat\/51\.5\/lon\/-0\.5\/dist\/\d+$/); // centre of the box
  });

  it('throws a descriptive error on a non-OK response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });
    const feed = new AdsbLolFeed({ fetchFn: fetchFn as unknown as typeof fetch });
    await expect(
      feed.fetchInBoundingBox({ minLatDeg: 0, minLonDeg: 0, maxLatDeg: 1, maxLonDeg: 1 }),
    ).rejects.toThrow(/503/);
  });
});

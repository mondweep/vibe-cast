import {
  AdsbdbFlightInfo,
  mapAircraft,
  mapRoute,
} from '../../src/flight/adapters/adsbdb-flight-info';

const AIRCRAFT = {
  response: {
    aircraft: {
      type: 'PA-28 181 Archer II',
      manufacturer: 'Piper',
      registration: 'G-BPAY',
      registered_owner: 'White Waltham Airfield Ltd',
      registered_owner_country_name: 'United Kingdom',
      url_photo_thumbnail: 'https://img/thumb.jpg',
    },
  },
};
const ROUTE = {
  response: {
    flightroute: {
      airline: { name: 'KLM Royal Dutch Airlines', icao: 'KLM', country: 'Netherlands' },
      origin: { iata_code: 'SJO', name: 'Juan Santamaría Intl', municipality: 'San José', country_name: 'Costa Rica' },
      destination: { iata_code: 'AMS', name: 'Schiphol', municipality: 'Amsterdam', country_name: 'Netherlands' },
    },
  },
};

describe('adsbdb mappers', () => {
  it('maps aircraft details incl. a photo thumbnail', () => {
    expect(mapAircraft(AIRCRAFT)).toMatchObject({
      type: 'PA-28 181 Archer II',
      registration: 'G-BPAY',
      owner: 'White Waltham Airfield Ltd',
      ownerCountry: 'United Kingdom',
      photoThumbUrl: 'https://img/thumb.jpg',
    });
  });

  it('maps a route to airline + origin/destination', () => {
    const r = mapRoute(ROUTE)!;
    expect(r.airlineName).toBe('KLM Royal Dutch Airlines');
    expect(r.origin).toMatchObject({ iata: 'SJO', municipality: 'San José' });
    expect(r.destination).toMatchObject({ iata: 'AMS', municipality: 'Amsterdam' });
  });

  it('returns null for an unknown callsign payload', () => {
    expect(mapRoute({ response: 'unknown callsign' })).toBeNull();
  });
});

describe('AdsbdbFlightInfo', () => {
  it('combines aircraft + route, caches, and tolerates failures', async () => {
    const fetchFn = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/aircraft/')) return Promise.resolve({ ok: true, json: async () => AIRCRAFT });
      if (url.includes('/callsign/')) return Promise.resolve({ ok: true, json: async () => ROUTE });
      return Promise.resolve({ ok: false, status: 404 });
    });
    let clock = 0;
    const svc = new AdsbdbFlightInfo({ fetchFn: fetchFn as unknown as typeof fetch, maxAgeMs: 1000, now: () => clock });

    const info = await svc.lookup('ABC123', 'KLM760');
    expect(info.aircraft?.registration).toBe('G-BPAY');
    expect(info.route?.airlineName).toMatch(/KLM/);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    clock += 500; // within TTL → served from cache, no new fetches
    await svc.lookup('ABC123', 'KLM760');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('degrades to nulls (never throws) when the upstream errors', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('network down'));
    const svc = new AdsbdbFlightInfo({ fetchFn: fetchFn as unknown as typeof fetch });
    await expect(svc.lookup('ABC123', 'KLM760')).resolves.toEqual({ aircraft: null, route: null });
  });
});

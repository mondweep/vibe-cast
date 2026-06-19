import {
  CelestrakSatcatInfo,
  mapSatcatRecord,
} from '../../src/satellite/adapters/celestrak-satcat-info';

const ISS_REC = {
  OBJECT_NAME: 'ISS (ZARYA)',
  OBJECT_ID: '1998-067A',
  NORAD_CAT_ID: 25544,
  OBJECT_TYPE: 'PAY',
  OWNER: 'ISS',
  LAUNCH_DATE: '1998-11-20',
  LAUNCH_SITE: 'TYMSC',
  PERIOD: 92.95,
  INCLINATION: 51.63,
  APOGEE: 422,
  PERIGEE: 416,
};

describe('mapSatcatRecord', () => {
  it('maps a SATCAT record', () => {
    expect(mapSatcatRecord(ISS_REC)).toMatchObject({
      name: 'ISS (ZARYA)',
      intlDesignator: '1998-067A',
      objectType: 'PAY',
      launchDate: '1998-11-20',
      periodMin: 92.95,
      inclinationDeg: 51.63,
      apogeeKm: 422,
      perigeeKm: 416,
    });
  });

  it('returns null for a record without a catalog id', () => {
    expect(mapSatcatRecord({})).toBeNull();
  });
});

describe('CelestrakSatcatInfo', () => {
  it('returns the first record and caches by NORAD id', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => [ISS_REC] });
    let clock = 0;
    const svc = new CelestrakSatcatInfo({ fetchFn: fetchFn as unknown as typeof fetch, maxAgeMs: 1000, now: () => clock });

    expect((await svc.lookup(25544))?.name).toBe('ISS (ZARYA)');
    clock += 500;
    await svc.lookup(25544);
    expect(fetchFn).toHaveBeenCalledTimes(1); // cached
  });

  it('returns null for an empty catalogue result', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const svc = new CelestrakSatcatInfo({ fetchFn: fetchFn as unknown as typeof fetch });
    expect(await svc.lookup(99999)).toBeNull();
  });

  it('degrades to null (never throws) on upstream error', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('down'));
    const svc = new CelestrakSatcatInfo({ fetchFn: fetchFn as unknown as typeof fetch });
    expect(await svc.lookup(25544)).toBeNull();
  });
});

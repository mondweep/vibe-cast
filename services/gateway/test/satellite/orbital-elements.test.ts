import { orbitalElements } from '../../src/satellite/domain/orbital-elements';

describe('orbitalElements (TLE → elements)', () => {
  // ISS (ZARYA): inc 51.64°, period ~92.9 min, alt ~415 km, intl 1998-067A.
  const l1 = '1 25544U 98067A   24171.50000000  .00016717  00000-0  10270-3 0  9994';
  const l2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49514665    01';

  it('parses the ISS TLE into plausible elements', () => {
    const e = orbitalElements(l1, l2);
    expect(e.intlDesignator).toBe('1998-067A');
    expect(e.inclinationDeg).toBeCloseTo(51.64, 1);
    expect(e.periodMin).toBeCloseTo(92.9, 0);
    // ISS orbits ~400–425 km up.
    expect(e.apogeeKm).toBeGreaterThan(390);
    expect(e.apogeeKm).toBeLessThan(450);
    expect(e.perigeeKm).toBeGreaterThan(390);
    expect(e.perigeeKm).toBeLessThan(450);
    expect(e.apogeeKm).toBeGreaterThanOrEqual(e.perigeeKm as number);
  });

  it('maps a pre-2000 two-digit launch year correctly (98 → 1998)', () => {
    expect(orbitalElements(l1, l2).intlDesignator).toMatch(/^1998-067A$/);
  });

  it('returns nulls for malformed input rather than throwing', () => {
    expect(orbitalElements('1', '2')).toEqual({
      intlDesignator: null,
      inclinationDeg: null,
      periodMin: null,
      apogeeKm: null,
      perigeeKm: null,
    });
    expect(orbitalElements('', '')).toMatchObject({ periodMin: null });
  });
});

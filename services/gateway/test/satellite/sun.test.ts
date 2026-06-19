import {
  isSatelliteSunlit,
  julianDate,
  solarElevationDeg,
  sunEciKm,
} from '../../src/satellite/domain/sun';
import { Observer } from '../../src/shared/observer';

describe('solar geometry (sun.ts)', () => {
  it('julianDate is ~2451545.0 at the J2000 epoch', () => {
    expect(julianDate(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2451545.0, 3);
  });

  it('Sun is ~1 AU away', () => {
    const s = sunEciKm(new Date('2026-06-19T12:00:00Z'));
    const mag = Math.hypot(s.x, s.y, s.z);
    expect(mag).toBeGreaterThan(1.45e8);
    expect(mag).toBeLessThan(1.53e8);
  });

  const london = new Observer({ latitudeDeg: 51.5, longitudeDeg: -0.12 });

  it('Sun is high near local noon at the summer solstice', () => {
    const el = solarElevationDeg(london, new Date('2026-06-21T12:00:00Z'));
    expect(el).toBeGreaterThan(55);
    expect(el).toBeLessThan(67);
  });

  it('Sun is below the horizon at local midnight', () => {
    const el = solarElevationDeg(london, new Date('2026-06-21T00:00:00Z'));
    expect(el).toBeLessThan(0);
  });

  describe('isSatelliteSunlit (cylindrical shadow, Sun along +x)', () => {
    const sun = { x: 1.49e8, y: 0, z: 0 };

    it('lit on the sun-facing side', () => {
      expect(isSatelliteSunlit({ x: 7000, y: 0, z: 0 }, sun)).toBe(true);
    });

    it('eclipsed directly behind Earth from the Sun', () => {
      expect(isSatelliteSunlit({ x: -7000, y: 0, z: 0 }, sun)).toBe(false);
    });

    it('lit when behind Earth but outside the shadow cylinder', () => {
      expect(isSatelliteSunlit({ x: -7000, y: 8000, z: 0 }, sun)).toBe(true);
    });
  });
});

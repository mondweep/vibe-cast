import { subSatellitePoint } from '../../src/satellite/domain/sub-point';

describe('subSatellitePoint', () => {
  const at = new Date('2026-06-19T12:00:00Z');

  it('puts a satellite on the +Z axis over the north pole (lat ≈ 90)', () => {
    expect(subSatellitePoint({ x: 0, y: 0, z: 7000 }, at).latitudeDeg).toBeCloseTo(90, 3);
  });

  it('puts a satellite on the -Z axis over the south pole (lat ≈ -90)', () => {
    expect(subSatellitePoint({ x: 0, y: 0, z: -7000 }, at).latitudeDeg).toBeCloseTo(-90, 3);
  });

  it('puts an equatorial-plane satellite on the equator (lat ≈ 0)', () => {
    const p = subSatellitePoint({ x: 7000, y: 1000, z: 0 }, at);
    expect(p.latitudeDeg).toBeCloseTo(0, 3);
  });

  it('always returns a longitude in (-180, 180]', () => {
    for (const eci of [
      { x: 7000, y: 0, z: 1000 },
      { x: -5000, y: 4000, z: -2000 },
      { x: 0, y: -7000, z: 3000 },
    ]) {
      const lon = subSatellitePoint(eci, at).longitudeDeg;
      expect(lon).toBeGreaterThan(-180);
      expect(lon).toBeLessThanOrEqual(180);
    }
  });

  it('rotating the position by 90° in the equatorial plane shifts longitude by ~90°', () => {
    const a = subSatellitePoint({ x: 7000, y: 0, z: 0 }, at).longitudeDeg;
    const b = subSatellitePoint({ x: 0, y: 7000, z: 0 }, at).longitudeDeg;
    let diff = ((b - a + 540) % 360) - 180; // smallest signed delta
    expect(Math.abs(diff)).toBeCloseTo(90, 3);
  });
});

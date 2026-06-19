import { Sgp4Propagator } from '../../src/satellite/adapters/sgp4-propagator';
import { Satellite } from '../../src/satellite/domain/satellite';
import { Observer } from '../../src/shared/observer';

/**
 * Integration test: real SGP4 via satellite.js (no network). We propagate the
 * ISS at its own TLE epoch and assert the look angle is physically plausible,
 * proving the adapter wires satellite.js correctly (ADR-0004).
 */
describe('Sgp4Propagator (real satellite.js)', () => {
  const iss: Satellite = {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    tleLine1: '1 25544U 98067A   24171.50000000  .00016717  00000-0  10270-3 0  9994',
    tleLine2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49514665    01',
  };

  it('returns a finite, in-range look angle for an observer', () => {
    const observer = new Observer({ latitudeDeg: 51.5, longitudeDeg: -0.12 });
    // Epoch 24171 = 2024 day 171 at 12:00 UTC.
    const at = new Date(Date.UTC(2024, 0, 1) + (171 - 1) * 86400_000 + 12 * 3600_000);

    const look = new Sgp4Propagator().lookAngle(iss, observer, at);

    expect(Number.isFinite(look.azimuthDeg)).toBe(true);
    expect(look.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(look.azimuthDeg).toBeLessThan(360);
    expect(look.elevationDeg).toBeGreaterThanOrEqual(-90);
    expect(look.elevationDeg).toBeLessThanOrEqual(90);
    expect(look.rangeKm).toBeGreaterThan(300); // ISS is ~400+ km up at minimum slant
  });
});

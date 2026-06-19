import { PassPredictor } from '../../src/satellite/domain/pass-predictor.service';
import { Propagator } from '../../src/satellite/ports/propagator.port';
import { LookAngle, Satellite } from '../../src/satellite/domain/satellite';
import { Observer } from '../../src/shared/observer';

/**
 * London-School TDD: the PassPredictor is exercised through a *scripted fake*
 * Propagator. No SGP4 is involved — we feed a deterministic elevation curve and
 * assert the predictor detects passes (AOS/TCA/LOS) correctly.
 */
describe('PassPredictor', () => {
  const observer = new Observer({
    latitudeDeg: 51.5,
    longitudeDeg: -0.12,
    minElevationDeg: 10,
  });

  const iss: Satellite = {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    tleLine1: '1 25544U ...',
    tleLine2: '2 25544 ...',
  };

  /** Build a propagator that returns elevations from a per-step schedule. */
  const scriptedPropagator = (elevations: number[]): Propagator => {
    const start = new Date('2026-06-19T12:00:00Z').getTime();
    return {
      lookAngle(_s: Satellite, _o: Observer, at: Date): LookAngle {
        const idx = Math.round((at.getTime() - start) / (30 * 1000));
        const elevationDeg = elevations[idx] ?? -90;
        return { azimuthDeg: 180, elevationDeg, rangeKm: 800 };
      },
    };
  };

  const window = {
    from: new Date('2026-06-19T12:00:00Z'),
    hours: (10 * 30) / 3600, // ten 30-second samples
    stepSeconds: 30,
  };

  it('detects a single pass and computes AOS, TCA, LOS and peak elevation', () => {
    // below, rise, PEAK, set, below ...
    const elevations = [-5, 4, 12, 40, 25, 8, -3, -10, -20, -30, -40];
    const passes = new PassPredictor(scriptedPropagator(elevations)).predictPasses(
      iss,
      observer,
      window,
    );

    expect(passes).toHaveLength(1);
    const pass = passes[0];
    expect(pass.maxElevationDeg).toBe(40);
    // AOS is the first sample >= 10° (index 2 -> +60s)
    expect(pass.aosTime.toISOString()).toBe('2026-06-19T12:01:00.000Z');
    // TCA is the peak (index 3 -> +90s)
    expect(pass.tcaTime.toISOString()).toBe('2026-06-19T12:01:30.000Z');
    // LOS is the last sample >= 10° (index 4 -> +120s)
    expect(pass.losTime.toISOString()).toBe('2026-06-19T12:02:00.000Z');
    expect(pass.durationSeconds).toBe(60);
    expect(pass.noradId).toBe(25544);
  });

  it('returns no passes when the satellite never clears the minimum elevation', () => {
    const elevations = [-5, 2, 5, 9, 8, 3, -2, -10, -20, -30, -40];
    const passes = new PassPredictor(scriptedPropagator(elevations)).predictPasses(
      iss,
      observer,
      window,
    );
    expect(passes).toEqual([]);
  });

  it('separates two distinct passes within the window', () => {
    const elevations = [15, 20, 5, -10, -10, 12, 30, 11, -5, -10, -20];
    const passes = new PassPredictor(scriptedPropagator(elevations)).predictPasses(
      iss,
      observer,
      window,
    );
    expect(passes).toHaveLength(2);
    expect(passes[0].maxElevationDeg).toBe(20);
    expect(passes[1].maxElevationDeg).toBe(30);
  });
});

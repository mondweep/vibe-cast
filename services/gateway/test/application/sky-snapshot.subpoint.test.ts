import { SkySnapshotService } from '../../src/application/sky-snapshot.service';
import { NearbyAircraftService } from '../../src/flight/domain/nearby-aircraft.service';
import { PassPredictor } from '../../src/satellite/domain/pass-predictor.service';
import { Propagator } from '../../src/satellite/ports/propagator.port';
import { TleSource } from '../../src/satellite/ports/tle-source.port';
import { Observer } from '../../src/shared/observer';

/**
 * London-School: the snapshot service must derive each overhead satellite's
 * sub-satellite ground point from the Propagator's ECI position (ADR-0013, #11).
 */
describe('SkySnapshotService sub-satellite point', () => {
  it('adds subLatDeg/subLonDeg computed from the propagator ECI', async () => {
    const sat = { name: 'ISS', noradId: 25544, tleLine1: '1', tleLine2: '2' };
    const nearby = { aircraftNear: jest.fn().mockResolvedValue([]) } as unknown as NearbyAircraftService;
    const tleSource = { fetchGroup: jest.fn().mockResolvedValue([sat]) } as unknown as TleSource;
    const propagator = {
      lookAngle: jest.fn().mockReturnValue({ azimuthDeg: 0, elevationDeg: 50, rangeKm: 600 }),
      eciPositionKm: jest.fn().mockReturnValue({ x: 0, y: 0, z: 7000 }), // over a pole → lat ≈ 90
    } as unknown as Propagator;
    const predictor = { predictPasses: jest.fn().mockReturnValue([]) } as unknown as PassPredictor;

    const service = new SkySnapshotService(nearby, predictor, propagator, tleSource);
    const snap = await service.snapshot(new Observer({ latitudeDeg: 51.5, longitudeDeg: -0.12 }), {
      at: new Date('2026-06-19T12:00:00Z'),
    });

    expect(snap.satellitesOverhead).toHaveLength(1);
    expect(snap.satellitesOverhead[0].subLatDeg).toBeCloseTo(90, 2);
    expect(snap.satellitesOverhead[0].subLonDeg).toBeGreaterThan(-180);
    expect(snap.satellitesOverhead[0].subLonDeg).toBeLessThanOrEqual(180);
  });

  it('leaves the sub-point null when the propagator cannot give a position', async () => {
    const sat = { name: 'X', noradId: 1, tleLine1: '1', tleLine2: '2' };
    const propagator = {
      lookAngle: jest.fn().mockReturnValue({ azimuthDeg: 0, elevationDeg: 50, rangeKm: 600 }),
      eciPositionKm: jest.fn().mockReturnValue(null),
    } as unknown as Propagator;
    const service = new SkySnapshotService(
      { aircraftNear: jest.fn().mockResolvedValue([]) } as unknown as NearbyAircraftService,
      { predictPasses: jest.fn().mockReturnValue([]) } as unknown as PassPredictor,
      propagator,
      { fetchGroup: jest.fn().mockResolvedValue([sat]) } as unknown as TleSource,
    );
    const snap = await service.snapshot(new Observer({ latitudeDeg: 0, longitudeDeg: 0 }));
    expect(snap.satellitesOverhead[0].subLatDeg).toBeNull();
  });
});

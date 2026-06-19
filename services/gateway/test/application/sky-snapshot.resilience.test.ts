import { SkySnapshotService } from '../../src/application/sky-snapshot.service';
import { NearbyAircraftService } from '../../src/flight/domain/nearby-aircraft.service';
import { PassPredictor } from '../../src/satellite/domain/pass-predictor.service';
import { Propagator } from '../../src/satellite/ports/propagator.port';
import { TleSource } from '../../src/satellite/ports/tle-source.port';
import { Satellite } from '../../src/satellite/domain/satellite';
import { Observer } from '../../src/shared/observer';

/**
 * NFR6: the Flight and Satellite contexts are independent — a failure in one
 * must degrade gracefully (a warning), never break the other. Verified with
 * mocked collaborators (London-School).
 */
describe('SkySnapshotService resilience', () => {
  const observer = new Observer({ latitudeDeg: 51.5, longitudeDeg: -0.12, minElevationDeg: 10 });
  const iss: Satellite = { name: 'ISS', noradId: 25544, tleLine1: '1 ...', tleLine2: '2 ...' };

  const fakes = (over: {
    aircraftNear?: jest.Mock;
    fetchGroup?: jest.Mock;
    lookAngle?: jest.Mock;
    predictPasses?: jest.Mock;
  }) => {
    const nearby = { aircraftNear: over.aircraftNear ?? jest.fn().mockResolvedValue([]) } as unknown as NearbyAircraftService;
    const tleSource = { fetchGroup: over.fetchGroup ?? jest.fn().mockResolvedValue([]) } as unknown as TleSource;
    const propagator = {
      lookAngle: over.lookAngle ?? jest.fn().mockReturnValue({ azimuthDeg: 0, elevationDeg: -90, rangeKm: 0 }),
    } as unknown as Propagator;
    const predictor = { predictPasses: over.predictPasses ?? jest.fn().mockReturnValue([]) } as unknown as PassPredictor;
    return new SkySnapshotService(nearby, predictor, propagator, tleSource);
  };

  it('degrades flights to empty + warning when the feed fails, keeping satellites', async () => {
    const service = fakes({
      aircraftNear: jest.fn().mockRejectedValue(new Error('OpenSky 429')),
      fetchGroup: jest.fn().mockResolvedValue([iss]),
      lookAngle: jest.fn().mockReturnValue({ azimuthDeg: 130, elevationDeg: 45, rangeKm: 600 }),
    });

    const snap = await service.snapshot(observer);

    expect(snap.flights).toEqual([]);
    expect(snap.warnings.some((w) => /flights unavailable/.test(w))).toBe(true);
    expect(snap.satellitesOverhead).toHaveLength(1); // satellite side still worked
  });

  it('degrades satellites to empty + warning when the TLE source fails, keeping flights', async () => {
    const service = fakes({
      aircraftNear: jest.fn().mockResolvedValue([
        { aircraft: { icao24: 'abc' }, distanceKm: 5, bearingDeg: 90 },
      ]),
      fetchGroup: jest.fn().mockRejectedValue(new Error('CelesTrak down')),
    });

    const snap = await service.snapshot(observer);

    expect(snap.flights).toHaveLength(1);
    expect(snap.satellitesOverhead).toEqual([]);
    expect(snap.warnings.some((w) => /satellites unavailable/.test(w))).toBe(true);
  });

  it('skips an individual satellite that fails to propagate, with a warning', async () => {
    const service = fakes({
      fetchGroup: jest.fn().mockResolvedValue([iss]),
      lookAngle: jest.fn(() => {
        throw new Error('bad TLE');
      }),
    });

    const snap = await service.snapshot(observer);

    expect(snap.satellitesOverhead).toEqual([]);
    expect(snap.warnings.some((w) => /skipped ISS/.test(w))).toBe(true);
  });
});

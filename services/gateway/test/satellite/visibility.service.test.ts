import { VisibilityService } from '../../src/satellite/domain/visibility.service';
import { Propagator } from '../../src/satellite/ports/propagator.port';
import { SunModel } from '../../src/satellite/ports/sun-model.port';
import { Satellite } from '../../src/satellite/domain/satellite';
import { SatellitePass } from '../../src/satellite/domain/pass';
import { Observer } from '../../src/shared/observer';

/**
 * London-School: visibility is driven through the Propagator + SunModel ports
 * with deterministic fakes — no real astronomy in the unit under test.
 */
describe('VisibilityService', () => {
  const observer = new Observer({ latitudeDeg: 51.5, longitudeDeg: -0.12 });
  const sat: Satellite = { name: 'ISS', noradId: 25544, tleLine1: '1', tleLine2: '2' };
  const at = new Date('2026-06-19T21:30:00Z');
  const SUN_ALONG_X = { x: 1.49e8, y: 0, z: 0 };

  const make = (over: {
    sunElevation: number;
    eci: { x: number; y: number; z: number } | null;
  }) => {
    const propagator = {
      lookAngle: jest.fn(),
      eciPositionKm: jest.fn().mockReturnValue(over.eci),
    } as unknown as Propagator;
    const sunModel: SunModel = {
      sunEciKm: jest.fn().mockReturnValue(SUN_ALONG_X),
      solarElevationDeg: jest.fn().mockReturnValue(over.sunElevation),
    };
    return { service: new VisibilityService(propagator, sunModel), propagator };
  };

  it('is visible when the observer is dark and the satellite is sunlit', () => {
    const { service } = make({ sunElevation: -12, eci: { x: 7000, y: 0, z: 0 } });
    expect(service.isVisibleAt(sat, observer, at)).toBe(true);
  });

  it('is not visible when the observer is in daylight, even if sunlit', () => {
    const { service } = make({ sunElevation: 20, eci: { x: 7000, y: 0, z: 0 } });
    expect(service.isVisibleAt(sat, observer, at)).toBe(false);
  });

  it('is not visible when the satellite is eclipsed, even if dark', () => {
    const { service } = make({ sunElevation: -12, eci: { x: -7000, y: 0, z: 0 } });
    expect(service.isVisibleAt(sat, observer, at)).toBe(false);
  });

  it('is not visible when the satellite position is unavailable', () => {
    const { service } = make({ sunElevation: -12, eci: null });
    expect(service.isVisibleAt(sat, observer, at)).toBe(false);
  });

  it('respects a custom twilight threshold', () => {
    const propagator = {
      lookAngle: jest.fn(),
      eciPositionKm: jest.fn().mockReturnValue({ x: 7000, y: 0, z: 0 }),
    } as unknown as Propagator;
    const sunModel: SunModel = {
      sunEciKm: jest.fn().mockReturnValue(SUN_ALONG_X),
      solarElevationDeg: jest.fn().mockReturnValue(-3),
    };
    // -3° counts as dark under civil (-6 default)? No. But under a -2 threshold it does.
    expect(new VisibilityService(propagator, sunModel).isObserverDark(observer, at)).toBe(false);
    expect(
      new VisibilityService(propagator, sunModel, { twilightSunElevationDeg: -2 }).isObserverDark(observer, at),
    ).toBe(true);
  });

  it('annotatePass sets `visible`, evaluating at the pass TCA time', () => {
    const { service, propagator } = make({ sunElevation: -12, eci: { x: 7000, y: 0, z: 0 } });
    const pass: SatellitePass = {
      satelliteName: 'ISS',
      noradId: 25544,
      aosTime: new Date('2026-06-19T21:28:00Z'),
      tcaTime: at,
      losTime: new Date('2026-06-19T21:33:00Z'),
      maxElevationDeg: 60,
      durationSeconds: 300,
    };
    const annotated = service.annotatePass(sat, observer, pass);
    expect(annotated.visible).toBe(true);
    expect((propagator.eciPositionKm as jest.Mock).mock.calls[0][1]).toBe(at);
  });
});

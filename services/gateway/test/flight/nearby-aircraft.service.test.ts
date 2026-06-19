import { NearbyAircraftService } from '../../src/flight/domain/nearby-aircraft.service';
import { AircraftFeed } from '../../src/flight/ports/aircraft-feed.port';
import { Aircraft } from '../../src/flight/domain/aircraft';
import { Observer } from '../../src/shared/observer';

/**
 * London-School TDD: we drive the service through its single collaborator, the
 * AircraftFeed port, using a mock. We assert on the interaction (the box it was
 * queried with) and on the observable behaviour (filtering + ordering).
 */
describe('NearbyAircraftService', () => {
  const observer = new Observer({
    latitudeDeg: 51.5,
    longitudeDeg: -0.12,
    flightRangeKm: 50,
  });

  const ac = (icao24: string, lat: number, lon: number): Aircraft => ({
    icao24,
    callsign: icao24.toUpperCase(),
    latitudeDeg: lat,
    longitudeDeg: lon,
    baroAltitudeM: 10000,
    velocityMps: 230,
    headingDeg: 90,
    onGround: false,
  });

  it('queries the feed with a bounding box derived from the observer range', async () => {
    const feed: jest.Mocked<AircraftFeed> = { fetchInBoundingBox: jest.fn().mockResolvedValue([]) };

    await new NearbyAircraftService(feed).aircraftNear(observer);

    expect(feed.fetchInBoundingBox).toHaveBeenCalledTimes(1);
    const box = feed.fetchInBoundingBox.mock.calls[0][0];
    expect(box.minLatDeg).toBeLessThan(observer.latitudeDeg);
    expect(box.maxLatDeg).toBeGreaterThan(observer.latitudeDeg);
  });

  it('drops aircraft outside the circular range even when the feed returns them', async () => {
    const near = ac('aaa111', 51.55, -0.12); // ~6 km north
    const far = ac('bbb222', 53.0, -0.12); // ~167 km north, inside box edge cases excluded
    const feed: AircraftFeed = {
      fetchInBoundingBox: jest.fn().mockResolvedValue([near, far]),
    };

    const result = await new NearbyAircraftService(feed).aircraftNear(observer);

    expect(result.map((r) => r.aircraft.icao24)).toEqual(['aaa111']);
  });

  it('orders results from nearest to farthest and annotates distance/bearing', async () => {
    const close = ac('close0', 51.52, -0.12); // ~2 km
    const mid = ac('mid000', 51.62, -0.12); // ~13 km
    const feed: AircraftFeed = {
      fetchInBoundingBox: jest.fn().mockResolvedValue([mid, close]),
    };

    const result = await new NearbyAircraftService(feed).aircraftNear(observer);

    expect(result.map((r) => r.aircraft.icao24)).toEqual(['close0', 'mid000']);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
    expect(result[0].bearingDeg).toBeGreaterThanOrEqual(0);
    expect(result[0].bearingDeg).toBeLessThan(360);
  });
});

import { boundingBoxAround, distanceKm, initialBearingDeg } from '../../shared/geo';
import { Observer } from '../../shared/observer';
import { AircraftFeed } from '../ports/aircraft-feed.port';
import { Aircraft, NearbyAircraft, aircraftLocation } from './aircraft';

/**
 * Domain service: answers "what is flying near me right now?".
 *
 * Collaborates with an {@link AircraftFeed} port. Responsible for turning the
 * observer's range into a query box, then filtering the feed's rougher
 * box-shaped result down to a true circular range and ordering by proximity.
 */
export class NearbyAircraftService {
  constructor(private readonly feed: AircraftFeed) {}

  async aircraftNear(observer: Observer): Promise<NearbyAircraft[]> {
    const box = boundingBoxAround(observer.location, observer.flightRangeKm);
    const candidates = await this.feed.fetchInBoundingBox(box);

    return candidates
      .map((aircraft) => this.locate(observer, aircraft))
      .filter((n) => n.distanceKm <= observer.flightRangeKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  private locate(observer: Observer, aircraft: Aircraft): NearbyAircraft {
    const target = aircraftLocation(aircraft);
    return {
      aircraft,
      distanceKm: distanceKm(observer.location, target),
      bearingDeg: initialBearingDeg(observer.location, target),
    };
  }
}

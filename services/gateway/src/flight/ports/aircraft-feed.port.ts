import { BoundingBox } from '../../shared/geo';
import { Aircraft } from '../domain/aircraft';

/**
 * Driven port: a source of live aircraft state within a geographic box.
 * Adapters implement this over OpenSky, adsb.lol, a local dump1090, etc.
 * (ADR-0002). The domain depends only on this interface, never on HTTP.
 */
export interface AircraftFeed {
  fetchInBoundingBox(box: BoundingBox): Promise<Aircraft[]>;
}

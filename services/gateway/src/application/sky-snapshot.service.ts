import { Observer } from '../shared/observer';
import { NearbyAircraft } from '../flight/domain/aircraft';
import { NearbyAircraftService } from '../flight/domain/nearby-aircraft.service';
import { LookAngle } from '../satellite/domain/satellite';
import { SatellitePass } from '../satellite/domain/pass';
import { PassPredictor } from '../satellite/domain/pass-predictor.service';
import { Propagator } from '../satellite/ports/propagator.port';
import { TleSource } from '../satellite/ports/tle-source.port';

export interface SatelliteOverhead {
  satelliteName: string;
  noradId: number;
  look: LookAngle;
}

/** Everything the ESP32 device needs to draw the sky right now. */
export interface SkySnapshot {
  observedAt: string;
  flights: NearbyAircraft[];
  satellitesOverhead: SatelliteOverhead[];
  upcomingPasses: SatellitePass[];
  /** Non-fatal degradations (e.g. a data source was unavailable). NFR6. */
  warnings: string[];
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Application service orchestrating the two bounded contexts into the single
 * read model the firmware consumes (ADR-0001). This is the use case wired to
 * the HTTP endpoint the ESP32 polls.
 */
export class SkySnapshotService {
  constructor(
    private readonly nearbyAircraft: NearbyAircraftService,
    private readonly passPredictor: PassPredictor,
    private readonly propagator: Propagator,
    private readonly tleSource: TleSource,
  ) {}

  async snapshot(
    observer: Observer,
    options: { satelliteGroup?: string; passWindowHours?: number; at?: Date } = {},
  ): Promise<SkySnapshot> {
    const at = options.at ?? new Date();
    const group = options.satelliteGroup ?? 'visual';
    const warnings: string[] = [];

    // The two contexts are independent: a failure in one must not break the
    // other (NFR6). Resolve each defensively.
    const [flightsResult, satellitesResult] = await Promise.allSettled([
      this.nearbyAircraft.aircraftNear(observer),
      this.tleSource.fetchGroup(group),
    ]);

    let flights: NearbyAircraft[] = [];
    if (flightsResult.status === 'fulfilled') {
      flights = flightsResult.value;
    } else {
      warnings.push(`flights unavailable: ${describe(flightsResult.reason)}`);
    }

    const satellites =
      satellitesResult.status === 'fulfilled' ? satellitesResult.value : [];
    if (satellitesResult.status === 'rejected') {
      warnings.push(`satellites unavailable: ${describe(satellitesResult.reason)}`);
    }

    const satellitesOverhead: SatelliteOverhead[] = [];
    const upcomingPasses: SatellitePass[] = [];

    for (const sat of satellites) {
      try {
        const look = this.propagator.lookAngle(sat, observer, at);
        if (look.elevationDeg >= observer.minElevationDeg) {
          satellitesOverhead.push({
            satelliteName: sat.name,
            noradId: sat.noradId,
            look,
          });
        }
        upcomingPasses.push(
          ...this.passPredictor.predictPasses(sat, observer, {
            from: at,
            hours: options.passWindowHours ?? 6,
          }),
        );
      } catch (err) {
        warnings.push(`skipped ${sat.name}: ${describe(err)}`);
      }
    }

    upcomingPasses.sort((a, b) => a.aosTime.getTime() - b.aosTime.getTime());
    satellitesOverhead.sort((a, b) => b.look.elevationDeg - a.look.elevationDeg);

    return {
      observedAt: at.toISOString(),
      flights,
      satellitesOverhead,
      upcomingPasses,
      warnings,
    };
  }
}

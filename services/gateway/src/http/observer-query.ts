import { ObserverDefaults } from '../config';
import { Observer } from '../shared/observer';

/** Thrown for malformed request input; mapped to HTTP 400 by the server. */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

type QueryValue = unknown;

function optionalNumber(raw: QueryValue, name: string): number | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    throw new BadRequestError(`query parameter '${name}' must be a single value`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new BadRequestError(`query parameter '${name}' must be a number, got '${raw}'`);
  }
  return n;
}

/**
 * Build an {@link Observer} from request query parameters, falling back to the
 * gateway's configured defaults. Accepts: lat, lon, altKm, rangeKm, minEl.
 * Validation failures raise {@link BadRequestError} (→ 400).
 */
export function observerFromQuery(
  query: Record<string, QueryValue>,
  defaults: ObserverDefaults,
): Observer {
  try {
    return new Observer({
      latitudeDeg: optionalNumber(query.lat, 'lat') ?? defaults.latitudeDeg,
      longitudeDeg: optionalNumber(query.lon, 'lon') ?? defaults.longitudeDeg,
      altitudeKm: optionalNumber(query.altKm, 'altKm') ?? defaults.altitudeKm,
      flightRangeKm: optionalNumber(query.rangeKm, 'rangeKm') ?? defaults.flightRangeKm,
      minElevationDeg: optionalNumber(query.minEl, 'minEl') ?? defaults.minElevationDeg,
    });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    // Observer constructor RangeErrors are client input problems too.
    throw new BadRequestError((err as Error).message);
  }
}

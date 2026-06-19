/** Gateway runtime configuration, loaded from the environment (ADR-0008). */
export interface ObserverDefaults {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  flightRangeKm: number;
  minElevationDeg: number;
}

export interface GatewayConfig {
  port: number;
  observer: ObserverDefaults;
  satelliteGroup: string;
  passWindowHours: number;
  /** Snapshot cache TTL (ms). Should exceed compute time so polls are cheap. */
  cacheTtlMs: number;
  opensky: { baseUrl: string; clientId?: string; clientSecret?: string };
  celestrak: { baseUrl: string };
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: string | undefined, fallback: string): string {
  return value === undefined || value.trim() === '' ? fallback : value;
}

/** Build a {@link GatewayConfig} from environment variables (see .env.example). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: num(env.PORT, 8080),
    observer: {
      latitudeDeg: num(env.OBSERVER_LAT, 51.5074),
      longitudeDeg: num(env.OBSERVER_LON, -0.1278),
      altitudeKm: num(env.OBSERVER_ALT_KM, 0.03),
      flightRangeKm: num(env.FLIGHT_RANGE_KM, 50),
      minElevationDeg: num(env.MIN_ELEVATION_DEG, 10),
    },
    satelliteGroup: str(env.SATELLITE_GROUP, 'visual'),
    passWindowHours: num(env.PASS_WINDOW_HOURS, 6),
    cacheTtlMs: num(env.CACHE_TTL_MS, 30000),
    opensky: {
      baseUrl: str(env.OPENSKY_BASE_URL, 'https://opensky-network.org/api'),
      clientId: env.OPENSKY_CLIENT_ID || undefined,
      clientSecret: env.OPENSKY_CLIENT_SECRET || undefined,
    },
    celestrak: {
      baseUrl: str(env.CELESTRAK_BASE_URL, 'https://celestrak.org/NORAD/elements/gp.php'),
    },
  };
}

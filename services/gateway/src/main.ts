/**
 * Composition root: wire adapters → domain services → HTTP server and listen.
 * This is the only place that knows about concrete adapters (ADR-0003).
 */
import dns from 'node:dns';
import { loadConfig } from './config';
import { createServer } from './http/server';
import { NearbyAircraftService } from './flight/domain/nearby-aircraft.service';
import { AircraftFeed } from './flight/ports/aircraft-feed.port';
import { AdsbLolFeed } from './flight/adapters/adsblol-feed';
import { AdsbdbFlightInfo } from './flight/adapters/adsbdb-flight-info';
import { OpenSkyFeed } from './flight/adapters/opensky-feed';
import { OpenSkyTokenManager } from './flight/adapters/opensky-token-manager';
import { CelestrakTleSource } from './satellite/adapters/celestrak-tle-source';
import { CelestrakSatcatInfo } from './satellite/adapters/celestrak-satcat-info';
import { VISUAL_TLE_FALLBACK } from './satellite/data/visual-fallback';
import { Sgp4Propagator } from './satellite/adapters/sgp4-propagator';
import { AstronomicalSunModel } from './satellite/adapters/astronomical-sun-model';
import { PassPredictor } from './satellite/domain/pass-predictor.service';
import { VisibilityService } from './satellite/domain/visibility.service';
import { SkySnapshotService, SnapshotProvider } from './application/sky-snapshot.service';
import { CachingSnapshotService } from './application/caching-snapshot.service';

// On some serverless platforms (e.g. Cloud Run) Node's fetch can fail when it
// tries an unroutable IPv6 address first; prefer IPv4 so the external flight/
// TLE APIs are reachable.
dns.setDefaultResultOrder('ipv4first');

export function buildSnapshotService(
  config = loadConfig(),
): SkySnapshotService {
  const { opensky, celestrak } = config;

  // Select the flight feed. adsb.lol is the default: open, no auth, and
  // reachable from cloud egress (OpenSky blocks datacenter IPs and needs creds).
  let feed: AircraftFeed;
  if (config.flightSource === 'opensky') {
    // Only attach OAuth2 if credentials are configured; otherwise anonymous.
    const tokenProvider =
      opensky.clientId && opensky.clientSecret
        ? new OpenSkyTokenManager({
            clientId: opensky.clientId,
            clientSecret: opensky.clientSecret,
          })
        : undefined;
    feed = new OpenSkyFeed({
      baseUrl: opensky.baseUrl,
      tokenProvider: tokenProvider ? () => tokenProvider.getToken() : undefined,
    });
  } else {
    feed = new AdsbLolFeed({ baseUrl: config.adsblol.baseUrl });
  }

  const propagator = new Sgp4Propagator();
  return new SkySnapshotService(
    new NearbyAircraftService(feed),
    new PassPredictor(propagator),
    propagator,
    new CelestrakTleSource({
      baseUrl: celestrak.baseUrl,
      fallbackTle: { visual: VISUAL_TLE_FALLBACK },
    }),
    new VisibilityService(propagator, new AstronomicalSunModel()),
  );
}

export function start(): void {
  const config = loadConfig();
  // Cache snapshots briefly so rapid/multiple device polls stay within the
  // upstream provider rate limits (NFR3, Phase 5).
  const snapshotService: SnapshotProvider = new CachingSnapshotService(
    buildSnapshotService(config),
    { ttlMs: config.cacheTtlMs },
  );
  const app = createServer({
    snapshotService,
    config,
    flightInfo: new AdsbdbFlightInfo(),
    satelliteInfo: new CelestrakSatcatInfo(),
  });
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`SkyWatch gateway listening on :${config.port}`);
  });
}

if (require.main === module) {
  start();
}

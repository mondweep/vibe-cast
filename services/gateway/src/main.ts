/**
 * Composition root: wire adapters → domain services → HTTP server and listen.
 * This is the only place that knows about concrete adapters (ADR-0003).
 */
import { loadConfig } from './config';
import { createServer } from './http/server';
import { NearbyAircraftService } from './flight/domain/nearby-aircraft.service';
import { OpenSkyFeed } from './flight/adapters/opensky-feed';
import { OpenSkyTokenManager } from './flight/adapters/opensky-token-manager';
import { CelestrakTleSource } from './satellite/adapters/celestrak-tle-source';
import { Sgp4Propagator } from './satellite/adapters/sgp4-propagator';
import { PassPredictor } from './satellite/domain/pass-predictor.service';
import { SkySnapshotService } from './application/sky-snapshot.service';

export function buildSnapshotService(
  config = loadConfig(),
): SkySnapshotService {
  const { opensky, celestrak } = config;

  // Only attach OAuth2 if credentials are configured; otherwise call OpenSky
  // anonymously (stricter limits, but works).
  const tokenProvider =
    opensky.clientId && opensky.clientSecret
      ? new OpenSkyTokenManager({
          clientId: opensky.clientId,
          clientSecret: opensky.clientSecret,
        })
      : undefined;

  const feed = new OpenSkyFeed({
    baseUrl: opensky.baseUrl,
    tokenProvider: tokenProvider ? () => tokenProvider.getToken() : undefined,
  });

  const propagator = new Sgp4Propagator();
  return new SkySnapshotService(
    new NearbyAircraftService(feed),
    new PassPredictor(propagator),
    propagator,
    new CelestrakTleSource({ baseUrl: celestrak.baseUrl }),
  );
}

export function start(): void {
  const config = loadConfig();
  const app = createServer({ snapshotService: buildSnapshotService(config), config });
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`SkyWatch gateway listening on :${config.port}`);
  });
}

if (require.main === module) {
  start();
}

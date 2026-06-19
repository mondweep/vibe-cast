// Public surface of the SkyWatch gateway domain + adapters.
export * from './shared/geo';
export * from './shared/observer';

export * from './flight/domain/aircraft';
export * from './flight/ports/aircraft-feed.port';
export * from './flight/domain/nearby-aircraft.service';
export * from './flight/adapters/opensky-feed';
export * from './flight/adapters/opensky-token-manager';
export * from './flight/adapters/adsblol-feed';
export * from './flight/ports/flight-info.port';
export * from './flight/adapters/adsbdb-flight-info';
export * from './satellite/ports/satellite-info.port';
export * from './satellite/adapters/celestrak-satcat-info';

export * from './satellite/domain/satellite';
export * from './satellite/domain/pass';
export * from './satellite/ports/propagator.port';
export * from './satellite/ports/tle-source.port';
export * from './satellite/ports/sun-model.port';
export * from './satellite/domain/pass-predictor.service';
export * from './satellite/domain/sun';
export * from './satellite/domain/visibility.service';
export * from './satellite/adapters/sgp4-propagator';
export * from './satellite/adapters/celestrak-tle-source';
export * from './satellite/adapters/astronomical-sun-model';

export * from './application/sky-snapshot.service';
export * from './application/caching-snapshot.service';

export * from './config';
export * from './http/observer-query';
export * from './http/server';
export { buildSnapshotService, start } from './main';

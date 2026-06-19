import {
  BadRequestError,
  observerFromQuery,
} from '../../src/http/observer-query';
import { ObserverDefaults } from '../../src/config';

const defaults: ObserverDefaults = {
  latitudeDeg: 51.5,
  longitudeDeg: -0.12,
  altitudeKm: 0.03,
  flightRangeKm: 50,
  minElevationDeg: 10,
};

describe('observerFromQuery', () => {
  it('uses configured defaults when no query params are present', () => {
    const o = observerFromQuery({}, defaults);
    expect(o.latitudeDeg).toBe(51.5);
    expect(o.flightRangeKm).toBe(50);
    expect(o.minElevationDeg).toBe(10);
  });

  it('overrides defaults with provided numeric params', () => {
    const o = observerFromQuery(
      { lat: '40', lon: '-74', rangeKm: '120', minEl: '5', altKm: '0.1' },
      defaults,
    );
    expect(o.latitudeDeg).toBe(40);
    expect(o.longitudeDeg).toBe(-74);
    expect(o.flightRangeKm).toBe(120);
    expect(o.minElevationDeg).toBe(5);
    expect(o.altitudeKm).toBe(0.1);
  });

  it('rejects a non-numeric parameter with BadRequestError', () => {
    expect(() => observerFromQuery({ lat: 'abc' }, defaults)).toThrow(BadRequestError);
  });

  it('rejects a repeated (array) parameter', () => {
    expect(() => observerFromQuery({ lat: ['1', '2'] }, defaults)).toThrow(BadRequestError);
  });

  it('maps an out-of-range latitude to BadRequestError (not a raw RangeError)', () => {
    expect(() => observerFromQuery({ lat: '120' }, defaults)).toThrow(BadRequestError);
  });
});

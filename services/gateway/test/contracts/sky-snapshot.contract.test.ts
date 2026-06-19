import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import { SkySnapshotService } from '../../src/application/sky-snapshot.service';
import { NearbyAircraftService } from '../../src/flight/domain/nearby-aircraft.service';
import { PassPredictor } from '../../src/satellite/domain/pass-predictor.service';
import { Propagator } from '../../src/satellite/ports/propagator.port';
import { TleSource } from '../../src/satellite/ports/tle-source.port';
import { VisibilityService } from '../../src/satellite/domain/visibility.service';
import { Observer } from '../../src/shared/observer';

/**
 * Contract guard (Phase 5): the Sky Snapshot the gateway produces must conform
 * to the published JSON Schema the firmware relies on (ADR-0008). Validates
 * both the committed example and a freshly produced snapshot (serialized as it
 * would be over HTTP) so the two can never drift apart silently.
 */
const schemaPath = join(__dirname, '../../../../docs/contracts/sky-snapshot.schema.json');
const examplePath = join(__dirname, '../../../../docs/contracts/sky-snapshot.example.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

describe('Sky Snapshot contract', () => {
  it('the committed example matches the schema', () => {
    const example = JSON.parse(readFileSync(examplePath, 'utf8'));
    expect(validate(example)).toBe(true);
  });

  it('a snapshot produced by the service matches the schema (post JSON round-trip)', async () => {
    const sat = { name: 'ISS', noradId: 25544, tleLine1: '1', tleLine2: '2' };
    const nearby = {
      aircraftNear: jest.fn().mockResolvedValue([
        {
          aircraft: {
            icao24: 'abc123',
            callsign: 'BAW123',
            latitudeDeg: 51.4,
            longitudeDeg: -0.4,
            baroAltitudeM: 10000,
            velocityMps: 230,
            headingDeg: 90,
            onGround: false,
          },
          distanceKm: 12.3,
          bearingDeg: 200,
        },
      ]),
    } as unknown as NearbyAircraftService;
    const tleSource = { fetchGroup: jest.fn().mockResolvedValue([sat]) } as unknown as TleSource;
    const propagator = {
      lookAngle: jest.fn().mockReturnValue({ azimuthDeg: 130, elevationDeg: 45, rangeKm: 600 }),
      eciPositionKm: jest.fn().mockReturnValue({ x: 7000, y: 0, z: 0 }),
    } as unknown as Propagator;
    const predictor = {
      predictPasses: jest.fn().mockReturnValue([
        {
          satelliteName: 'ISS',
          noradId: 25544,
          aosTime: new Date('2026-06-19T21:28:00Z'),
          tcaTime: new Date('2026-06-19T21:30:00Z'),
          losTime: new Date('2026-06-19T21:33:00Z'),
          maxElevationDeg: 60,
          durationSeconds: 300,
        },
      ]),
    } as unknown as PassPredictor;
    const visibility = {
      annotatePass: jest.fn((_s, _o, p) => ({ ...p, visible: true })),
    } as unknown as VisibilityService;

    const service = new SkySnapshotService(nearby, predictor, propagator, tleSource, visibility);
    const snapshot = await service.snapshot(new Observer({ latitudeDeg: 51.5, longitudeDeg: -0.12 }));

    // Serialize exactly as Express would (Dates → ISO strings) before validating.
    const wire = JSON.parse(JSON.stringify(snapshot));
    const ok = validate(wire);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
    expect(wire.upcomingPasses[0].visible).toBe(true);
  });
});

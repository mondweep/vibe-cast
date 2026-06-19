import request from 'supertest';
import { createServer } from '../../src/http/server';
import { loadConfig } from '../../src/config';
import { SkySnapshot, SnapshotProvider } from '../../src/application/sky-snapshot.service';

const emptySnapshot = (): SkySnapshot => ({
  observedAt: '2026-06-19T12:00:00.000Z',
  flights: [],
  satellitesOverhead: [],
  upcomingPasses: [],
  warnings: [],
});

describe('gateway HTTP server', () => {
  const config = loadConfig({}); // defaults

  it('GET /healthz returns ok', async () => {
    const snapshotService: SnapshotProvider = { snapshot: jest.fn() };
    const res = await request(createServer({ snapshotService, config })).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET / serves the browser front-end (HTML)', async () => {
    const snapshotService: SnapshotProvider = { snapshot: jest.fn() };
    const res = await request(createServer({ snapshotService, config })).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/SkyWatch/);
  });

  it('GET /sky derives an observer from the query and returns the snapshot', async () => {
    const snapshot = jest.fn().mockResolvedValue(emptySnapshot());
    const res = await request(createServer({ snapshotService: { snapshot }, config }))
      .get('/sky')
      .query({ lat: '48.85', lon: '2.35', rangeKm: '80' });

    expect(res.status).toBe(200);
    expect(res.body.observedAt).toBe('2026-06-19T12:00:00.000Z');

    const [observer, options] = snapshot.mock.calls[0];
    expect(observer.latitudeDeg).toBe(48.85);
    expect(observer.flightRangeKm).toBe(80);
    // options come from the gateway config (ADR-0008)
    expect(options.satelliteGroup).toBe('visual');
    expect(options.passWindowHours).toBe(6);
  });

  it('GET /sky returns 400 on a malformed query parameter', async () => {
    const res = await request(
      createServer({ snapshotService: { snapshot: jest.fn() }, config }),
    )
      .get('/sky')
      .query({ lat: 'not-a-number' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lat/);
  });

  it('GET /sky returns 500 when the snapshot service throws', async () => {
    const snapshot = jest.fn().mockRejectedValue(new Error('boom'));
    const res = await request(createServer({ snapshotService: { snapshot }, config })).get('/sky');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

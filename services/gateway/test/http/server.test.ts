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

  it('GET /health returns ok', async () => {
    const snapshotService: SnapshotProvider = { snapshot: jest.fn() };
    const res = await request(createServer({ snapshotService, config })).get('/health');
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

  describe('shared-token guard (API_TOKEN set)', () => {
    const securedConfig = { ...config, apiToken: 's3cret-team-token' };
    const app = () => createServer({ snapshotService: { snapshot: jest.fn().mockResolvedValue(emptySnapshot()) }, config: securedConfig });

    it('rejects /sky without a token (401)', async () => {
      const res = await request(app()).get('/sky');
      expect(res.status).toBe(401);
    });

    it('accepts /sky with a correct Bearer token', async () => {
      const res = await request(app()).get('/sky').set('Authorization', 'Bearer s3cret-team-token');
      expect(res.status).toBe(200);
    });

    it('accepts /sky with a correct ?token= query', async () => {
      const res = await request(app()).get('/sky?token=s3cret-team-token');
      expect(res.status).toBe(200);
    });

    it('rejects a wrong token (401)', async () => {
      const res = await request(app()).get('/sky').set('Authorization', 'Bearer nope');
      expect(res.status).toBe(401);
    });

    it('leaves /health and the front-end open (no token needed)', async () => {
      expect((await request(app()).get('/health')).status).toBe(200);
      expect((await request(app()).get('/')).status).toBe(200);
    });
  });
});

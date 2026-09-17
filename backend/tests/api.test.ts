import request from 'supertest';
import { createApp } from '../src/app';
import {
  InMemoryNightRepository,
  InMemoryJournalRepository,
} from '../src/in-memory-repositories';
import type { TokenVerifier } from '../src/auth';
import type { NightAnalysis } from '@somnus/domain';

/**
 * Outside-in API tests (ADR-008).
 *
 * The token verifier is a mock rather than a real Firebase call: it is a port
 * we own, standing in front of a type we do not. Everything behind it is
 * exercised for real.
 */
const verifyToken: TokenVerifier = async (token) => {
  if (token === 'alice') return { uid: 'alice-uid', email: 'alice@example.com' };
  if (token === 'bob') return { uid: 'bob-uid', email: 'bob@example.com' };
  throw new Error('invalid token');
};

const build = () => {
  const nights = new InMemoryNightRepository();
  const journal = new InMemoryJournalRepository();
  return { app: createApp({ nights, journal, verifyToken }), nights, journal };
};

const night = (over: Partial<NightAnalysis> = {}): NightAnalysis =>
  ({
    nightId: 'night-1',
    date: '2026-09-16',
    status: 'analysed',
    monitoredMs: 28_800_000,
    interruptedMs: 0,
    snoreIndex: 12,
    snoreTimeFraction: 0.08,
    episodeCount: 96,
    episodes: [],
    bandDistribution: { quiet: 0, mild: 40, moderate: 50, loud: 6 },
    peakIntensityDb: 22,
    medianIntensityDb: 11,
    quietPeriods: [],
    analyserVersion: '1.0.0',
    wasInterrupted: false,
    ...over,
  }) as NightAnalysis;

describe('health', () => {
  // Mounted at several paths: /healthz is not reliably reachable behind the
  // Cloud Run frontend, so monitoring uses one of the alternatives.
  it.each(['/healthz', '/_health', '/api/v1/health'])(
    '%s reports ok and the analyser version',
    async (path) => {
      const { app } = build();
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.analyserVersion).toBeDefined();
    },
  );

  it('does not require a token for the health check', async () => {
    const { app } = build();
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
  });
});

describe('client config', () => {
  const withEnv = async (env: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const saved = { ...process.env };
    Object.assign(process.env, env);
    try {
      await fn();
    } finally {
      process.env = saved;
    }
  };

  it('reports sync unavailable when Firebase is not configured', async () => {
    await withEnv(
      { FIREBASE_API_KEY: undefined, FIREBASE_APP_ID: undefined, FIREBASE_AUTH_DOMAIN: undefined },
      async () => {
        const { app } = build();
        const res = await request(app).get('/api/v1/config');
        expect(res.status).toBe(200);
        expect(res.body.syncAvailable).toBe(false);
        expect(res.body.firebase).toBeNull();
      },
    );
  });

  it('serves the client config when Firebase is configured', async () => {
    await withEnv(
      {
        FIREBASE_API_KEY: 'key',
        FIREBASE_APP_ID: 'app',
        FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        GOOGLE_CLOUD_PROJECT: 'proj',
      },
      async () => {
        const { app } = build();
        const res = await request(app).get('/api/v1/config');
        expect(res.body.syncAvailable).toBe(true);
        expect(res.body.firebase.apiKey).toBe('key');
      },
    );
  });

  it('needs no token, so a signed-out client can discover how to sign in', async () => {
    const { app } = build();
    expect((await request(app).get('/api/v1/config')).status).toBe(200);
  });

  // The config route must never become a way to read a private value.
  it('serves no secret-shaped field', async () => {
    await withEnv(
      { FIREBASE_API_KEY: 'key', FIREBASE_APP_ID: 'app', FIREBASE_AUTH_DOMAIN: 'd', GOOGLE_CLOUD_PROJECT: 'p' },
      async () => {
        const { app } = build();
        const body = JSON.stringify((await request(app).get('/api/v1/config')).body);
        expect(body).not.toMatch(/secret|private_key|credential|password/i);
      },
    );
  });
});

describe('authentication (ADR-006)', () => {
  it('rejects a request with no token', async () => {
    const { app } = build();
    const res = await request(app).get('/api/v1/nights');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_bearer_token');
  });

  it('rejects a malformed authorization header', async () => {
    const { app } = build();
    const res = await request(app).get('/api/v1/nights').set('Authorization', 'alice');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid or expired token', async () => {
    const { app } = build();
    const res = await request(app)
      .get('/api/v1/nights')
      .set('Authorization', 'Bearer expired');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  // The failure that would matter most.
  it("never lets one user reach another's nights", async () => {
    const { app } = build();
    await request(app)
      .put('/api/v1/nights/night-1')
      .set('Authorization', 'Bearer alice')
      .send(night());

    const res = await request(app)
      .get('/api/v1/nights/night-1')
      .set('Authorization', 'Bearer bob');
    expect(res.status).toBe(404);

    const list = await request(app)
      .get('/api/v1/nights')
      .set('Authorization', 'Bearer bob');
    expect(list.body.nights).toHaveLength(0);
  });

  it('derives the journal owner from the token, not the request body', async () => {
    const { app, journal } = build();
    await request(app)
      .put('/api/v1/journal/2026-09-16')
      .set('Authorization', 'Bearer alice')
      .send({ userId: 'bob-uid', factors: {} });

    expect(await journal.get('bob-uid', '2026-09-16')).toBeNull();
    expect(await journal.get('alice-uid', '2026-09-16')).not.toBeNull();
  });
});

describe('night sync (ADR-007)', () => {
  it('stores a night', async () => {
    const { app } = build();
    const res = await request(app)
      .put('/api/v1/nights/night-1')
      .set('Authorization', 'Bearer alice')
      .send(night());
    expect(res.status).toBe(200);
    expect(res.body.stored).toBe(true);
  });

  it('is idempotent: replaying a sync leaves exactly one night', async () => {
    const { app } = build();
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .put('/api/v1/nights/night-1')
        .set('Authorization', 'Bearer alice')
        .send(night());
    }
    const res = await request(app).get('/api/v1/nights').set('Authorization', 'Bearer alice');
    expect(res.body.nights).toHaveLength(1);
  });

  it('rejects a body whose id disagrees with the path', async () => {
    const { app } = build();
    const res = await request(app)
      .put('/api/v1/nights/night-1')
      .set('Authorization', 'Bearer alice')
      .send(night({ nightId: 'other' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('night_id_mismatch');
  });

  it('rejects a malformed analysis', async () => {
    const { app } = build();
    const res = await request(app)
      .put('/api/v1/nights/night-1')
      .set('Authorization', 'Bearer alice')
      .send({ nightId: 'night-1' });
    expect(res.status).toBe(400);
  });
});

describe('risk screens (I-S1)', () => {
  const complete = {
    snoringLoudly: true, tiredDuringDay: true, observedApnoea: true,
    highBloodPressure: true, bmiOver35: true, ageOver50: false,
    neckOver40cm: false, maleSex: false,
  };

  it('refuses to band a partial screen', async () => {
    const { app } = build();
    const res = await request(app)
      .post('/api/v1/risk-screens')
      .set('Authorization', 'Bearer alice')
      .send({ answers: { snoringLoudly: true } });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('incomplete_screen');
  });

  it('scores a complete screen and returns any flags it raises', async () => {
    const { app } = build();
    const res = await request(app)
      .post('/api/v1/risk-screens')
      .set('Authorization', 'Bearer alice')
      .send({ answers: complete });
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(5);
    expect(res.body.band).toBe('high');
    expect(res.body.flags.map((f: { code: string }) => f.code)).toEqual(
      expect.arrayContaining(['RF-1-high-risk-score', 'RF-2-witnessed-pauses']),
    );
  });
});

describe('insights apply safeguarding precedence server-side (FR-I6)', () => {
  it('suppresses coaching when a Red Flag is raised', async () => {
    const { app } = build();
    const res = await request(app)
      .post('/api/v1/insights')
      .set('Authorization', 'Bearer alice')
      .send({ sleepinessWhileDriving: true });
    expect(res.status).toBe(200);
    expect(res.body.coaching.kind).toBe('suppressed');
    expect(res.body.flags[0].code).toBe('RF-4-sleepiness-driving');
  });

  it('reports insufficient data rather than guessing when there are no nights', async () => {
    const { app } = build();
    const res = await request(app)
      .post('/api/v1/insights')
      .set('Authorization', 'Bearer alice')
      .send({});
    expect(res.body.coaching.kind).toBe('insufficient_data');
  });
});

describe('export and erasure (FR-D3, FR-D4)', () => {
  it('exports everything the user has', async () => {
    const { app } = build();
    await request(app)
      .put('/api/v1/nights/night-1')
      .set('Authorization', 'Bearer alice')
      .send(night());
    await request(app)
      .put('/api/v1/journal/2026-09-16')
      .set('Authorization', 'Bearer alice')
      .send({ factors: {} });

    const res = await request(app).get('/api/v1/export').set('Authorization', 'Bearer alice');
    expect(res.body.nights).toHaveLength(1);
    expect(res.body.journal).toHaveLength(1);
  });

  it('deletes the account and leaves other users untouched', async () => {
    const { app } = build();
    await request(app)
      .put('/api/v1/nights/night-1')
      .set('Authorization', 'Bearer alice')
      .send(night());
    await request(app)
      .put('/api/v1/nights/night-2')
      .set('Authorization', 'Bearer bob')
      .send(night({ nightId: 'night-2' }));

    const del = await request(app)
      .delete('/api/v1/account')
      .set('Authorization', 'Bearer alice');
    expect(del.body.deleted).toBe(true);

    const alice = await request(app).get('/api/v1/export').set('Authorization', 'Bearer alice');
    expect(alice.body.nights).toHaveLength(0);

    const bob = await request(app).get('/api/v1/export').set('Authorization', 'Bearer bob');
    expect(bob.body.nights).toHaveLength(1);
  });
});

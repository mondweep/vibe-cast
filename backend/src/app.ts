import express, { type Express, type Request, type Response } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import {
  evaluateRedFlags,
  rankAssociations,
  coach,
  scoreStopBang,
  ANALYSER_VERSION,
  type JournalRepositoryPort,
  type NightRepositoryPort,
  type NightAnalysis,
  type JournalEntry,
} from '@somnus/domain';
import { requireAuth, type TokenVerifier } from './auth';

export interface AppDependencies {
  readonly nights: NightRepositoryPort;
  readonly journal: JournalRepositoryPort;
  readonly verifyToken: TokenVerifier;
  /** Absolute path to the built PWA, when serving it from this container. */
  readonly staticDir?: string;
}

const RECENT_NIGHTS = 60;

/**
 * Build the API.
 *
 * Every collaborator arrives as a parameter rather than being imported, which
 * is what lets the whole surface be driven from the outside in tests with
 * fakes, and is the shape ADR-008's outside-in cycle produced.
 */
export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));

  /**
   * Health check, exposed at several paths.
   *
   * `/healthz` is the conventional name, but it is not reliably reachable
   * here: requests to it come back as a Google Frontend 404 that never
   * reaches this process, while every other path is served normally. Rather
   * than depend on a path something upstream is claiming, the same handler is
   * mounted at two alternatives and monitoring uses those.
   */
  const health = (_req: Request, res: Response): void => {
    res.json({ status: 'ok', analyserVersion: ANALYSER_VERSION });
  };
  app.get('/healthz', health);
  app.get('/_health', health);
  app.get('/api/v1/health', health);

  const auth = requireAuth(deps.verifyToken);
  const api = express.Router();
  api.use(auth);

  /** ADR-007: idempotent upsert on the client-generated night id. */
  api.put('/nights/:nightId', async (req: Request, res: Response) => {
    const uid = req.user!.uid;
    const analysis = req.body as NightAnalysis;

    if (analysis?.nightId !== req.params.nightId) {
      res.status(400).json({ error: 'night_id_mismatch' });
      return;
    }
    if (typeof analysis.date !== 'string' || typeof analysis.monitoredMs !== 'number') {
      res.status(400).json({ error: 'malformed_analysis' });
      return;
    }

    await deps.nights.save(uid, analysis);
    res.status(200).json({ nightId: analysis.nightId, stored: true });
  });

  api.get('/nights', async (req, res) => {
    const nights = await deps.nights.listRecent(req.user!.uid, RECENT_NIGHTS);
    res.json({ nights });
  });

  api.get('/nights/:nightId', async (req, res) => {
    const night = await deps.nights.get(req.user!.uid, req.params.nightId);
    if (night === null) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(night);
  });

  api.put('/journal/:date', async (req, res) => {
    const uid = req.user!.uid;
    // The uid comes from the verified token, never from the body (ADR-006).
    const entry: JournalEntry = { ...(req.body as JournalEntry), userId: uid, date: req.params.date };
    await deps.journal.save(entry);
    res.json({ date: entry.date, stored: true });
  });

  api.get('/journal', async (req, res) => {
    const entries = await deps.journal.listRecent(req.user!.uid, RECENT_NIGHTS);
    res.json({ entries });
  });

  /**
   * Insight, with safeguarding precedence applied server-side as well as on
   * the device — the rule is in the domain, and both callers get it.
   */
  api.post('/insights', async (req, res) => {
    const uid = req.user!.uid;
    const [nights, journal] = await Promise.all([
      deps.nights.listRecent(uid, RECENT_NIGHTS),
      deps.journal.listRecent(uid, RECENT_NIGHTS),
    ]);

    const body = (req.body ?? {}) as {
      answers?: Record<string, boolean>;
      sleepinessWhileDriving?: boolean;
    };

    const flags = evaluateRedFlags({
      answers: body.answers ?? {},
      sleepinessWhileDriving: body.sleepinessWhileDriving,
      recentNights: nights,
    });

    const report = rankAssociations(nights, journal);
    res.json({ flags, report, coaching: coach(report, flags) });
  });

  api.post('/risk-screens', async (req, res) => {
    const body = (req.body ?? {}) as {
      answers?: Record<string, boolean>;
      sleepinessWhileDriving?: boolean;
    };
    const result = scoreStopBang(body.answers ?? {});
    // Invariant I-S1: a partial screen yields no band at all.
    if (result === null) {
      res.status(422).json({ error: 'incomplete_screen' });
      return;
    }
    const nights = await deps.nights.listRecent(req.user!.uid, RECENT_NIGHTS);
    res.json({
      ...result,
      flags: evaluateRedFlags({
        answers: body.answers ?? {},
        sleepinessWhileDriving: body.sleepinessWhileDriving,
        recentNights: nights,
      }),
    });
  });

  /** FR-D3 */
  api.get('/export', async (req, res) => {
    const uid = req.user!.uid;
    const [nights, journal] = await Promise.all([
      deps.nights.listRecent(uid, 10_000),
      deps.journal.listRecent(uid, 10_000),
    ]);
    res.json({ exportedFor: uid, analyserVersion: ANALYSER_VERSION, nights, journal });
  });

  /** FR-D4 */
  api.delete('/account', async (req, res) => {
    const uid = req.user!.uid;
    await Promise.all([deps.nights.deleteAll(uid), deps.journal.deleteAll(uid)]);
    res.json({ deleted: true });
  });

  app.use('/api/v1', api);

  if (deps.staticDir !== undefined) {
    app.use(express.static(deps.staticDir));
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: deps.staticDir });
    });
  }

  return app;
}

import express, { Express, Request, Response } from 'express';
import { GatewayConfig } from '../config';
import { SnapshotProvider } from '../application/sky-snapshot.service';
import { BadRequestError, observerFromQuery } from './observer-query';

export interface ServerDeps {
  snapshotService: SnapshotProvider;
  config: GatewayConfig;
}

/**
 * Build the Express app (composition is done by the caller). Exposes:
 *  - GET /healthz  → liveness probe
 *  - GET /sky      → the Sky Snapshot for an observer (ADR-0008)
 */
export function createServer({ snapshotService, config }: ServerDeps): Express {
  const app = express();

  app.get('/healthz', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'skywatch-gateway' });
  });

  app.get('/sky', async (req: Request, res: Response) => {
    try {
      const observer = observerFromQuery(req.query, config.observer);
      const snapshot = await snapshotService.snapshot(observer, {
        satelliteGroup: config.satelliteGroup,
        passWindowHours: config.passWindowHours,
      });
      res.json(snapshot);
    } catch (err) {
      if (err instanceof BadRequestError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'internal error computing sky snapshot' });
    }
  });

  return app;
}

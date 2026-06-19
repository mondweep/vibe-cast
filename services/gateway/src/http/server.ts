import path from 'path';
import { timingSafeEqual } from 'crypto';
import express, { Express, Request, Response } from 'express';
import { GatewayConfig } from '../config';
import { SnapshotProvider } from '../application/sky-snapshot.service';
import { BadRequestError, observerFromQuery } from './observer-query';

/** Constant-time string compare that is safe for differing lengths. */
function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** True if the request carries the configured token (or no token is required). */
function isAuthorized(config: GatewayConfig, req: Request): boolean {
  if (!config.apiToken) return true; // open when no token configured
  const header = req.header('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  return safeEqual(bearer, config.apiToken) || safeEqual(queryToken, config.apiToken);
}

export interface ServerDeps {
  snapshotService: SnapshotProvider;
  config: GatewayConfig;
  /** Directory of the browser front-end. Defaults to the bundled `public/`. */
  publicDir?: string;
}

/**
 * Build the Express app (composition is done by the caller). Exposes:
 *  - GET /health  → liveness probe
 *  - GET /sky      → the Sky Snapshot for an observer (ADR-0008)
 *  - GET /         → the browser radar front-end (static `public/index.html`)
 */
export function createServer({ snapshotService, config, publicDir }: ServerDeps): Express {
  const app = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'skywatch-gateway' });
  });

  app.get('/sky', async (req: Request, res: Response) => {
    if (!isAuthorized(config, req)) {
      res.status(401).json({ error: 'missing or invalid access token' });
      return;
    }
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

  // Browser front-end. Resolves to services/gateway/public for both the compiled
  // build (dist/http/server.js) and ts-jest (src/http/server.ts) — both are two
  // levels below the service root.
  const staticDir = publicDir ?? path.join(__dirname, '..', '..', 'public');
  app.use(express.static(staticDir));

  return app;
}


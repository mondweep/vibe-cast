import path from 'path';
import { timingSafeEqual } from 'crypto';
import express, { Express, Request, Response } from 'express';
import { GatewayConfig } from '../config';
import { SnapshotProvider } from '../application/sky-snapshot.service';
import { FlightInfoProvider } from '../flight/ports/flight-info.port';
import { SatelliteInfoProvider } from '../satellite/ports/satellite-info.port';
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
  /** Optional enrichment providers for the click-for-details popups (ADR-0010). */
  flightInfo?: FlightInfoProvider;
  satelliteInfo?: SatelliteInfoProvider;
  /** Directory of the browser front-end. Defaults to the bundled `public/`. */
  publicDir?: string;
}

/**
 * Build the Express app (composition is done by the caller). Exposes:
 *  - GET /health             → liveness probe
 *  - GET /sky                → the Sky Snapshot for an observer (ADR-0008)
 *  - GET /flight/:icao24     → airline/route/aircraft enrichment (ADR-0010)
 *  - GET /satellite/:noradId → catalogue metadata enrichment (ADR-0010)
 *  - GET /                   → the browser radar front-end (static `public/`)
 */
export function createServer({
  snapshotService,
  config,
  flightInfo,
  satelliteInfo,
  publicDir,
}: ServerDeps): Express {
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

  app.get('/flight/:icao24', async (req: Request, res: Response) => {
    if (!isAuthorized(config, req)) {
      res.status(401).json({ error: 'missing or invalid access token' });
      return;
    }
    if (!flightInfo) {
      res.status(501).json({ error: 'flight enrichment not configured' });
      return;
    }
    const callsign = typeof req.query.callsign === 'string' ? req.query.callsign : undefined;
    try {
      res.json(await flightInfo.lookup(req.params.icao24, callsign));
    } catch {
      res.status(502).json({ error: 'flight info lookup failed' });
    }
  });

  app.get('/satellite/:noradId', async (req: Request, res: Response) => {
    if (!isAuthorized(config, req)) {
      res.status(401).json({ error: 'missing or invalid access token' });
      return;
    }
    if (!satelliteInfo) {
      res.status(501).json({ error: 'satellite enrichment not configured' });
      return;
    }
    const noradId = Number(req.params.noradId);
    if (!Number.isInteger(noradId)) {
      res.status(400).json({ error: 'noradId must be an integer' });
      return;
    }
    try {
      const info = await satelliteInfo.lookup(noradId);
      if (!info) {
        res.status(404).json({ error: 'satellite not found' });
        return;
      }
      res.json(info);
    } catch {
      res.status(502).json({ error: 'satellite info lookup failed' });
    }
  });

  // Browser front-end. Resolves to services/gateway/public for both the compiled
  // build (dist/http/server.js) and ts-jest (src/http/server.ts) — both are two
  // levels below the service root.
  const staticDir = publicDir ?? path.join(__dirname, '..', '..', 'public');
  app.use(express.static(staticDir));

  return app;
}


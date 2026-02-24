import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health check
  if (req.path === '/health') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  if (token !== env.FIAT500_TRACKER_API_KEY) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
}

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Routes that allow unauthenticated GET requests (public read-only)
const PUBLIC_GET_PREFIXES = [
  '/config',
  '/listings',
  '/shortlist',
  '/scrape/status',
];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health check
  if (req.path === '/health') {
    next();
    return;
  }

  // Allow public GET access to read-only routes
  if (req.method === 'GET') {
    const isPublic = PUBLIC_GET_PREFIXES.some(
      prefix => req.path === prefix || req.path.startsWith(prefix + '/')
    );
    if (isPublic) {
      next();
      return;
    }
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  if (!constantTimeEqual(token, env.FIAT500_TRACKER_API_KEY)) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
}

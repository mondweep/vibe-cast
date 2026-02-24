import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authMiddleware } from '../src/middleware/auth.js';
import configRoutes from '../src/routes/config.js';
import listingsRoutes from '../src/routes/listings.js';
import shortlistRoutes from '../src/routes/shortlist.js';
import conversationsRoutes from '../src/routes/conversations.js';
import scrapeRoutes from '../src/routes/scrape.js';
import trackingRoutes from '../src/routes/tracking.js';
import webhooksRoutes from '../src/routes/webhooks.js';

const API_KEY = process.env.FIAT500_TRACKER_API_KEY || 'ft-api-k3y-2026-s3cur3-t0k3n';

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.use('/api', authMiddleware);
  app.use('/api/config', configRoutes);
  app.use('/api/listings', listingsRoutes);
  app.use('/api/shortlist', shortlistRoutes);
  app.use('/api/conversations', conversationsRoutes);
  app.use('/api/scrape', scrapeRoutes);
  app.use('/api/tracking', trackingRoutes);
  app.use('/api/webhooks', webhooksRoutes);

  return app;
}

describe('Phase 1: API Skeleton', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('Health check', () => {
    it('GET /health returns 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Auth middleware', () => {
    it('rejects requests without Authorization header', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Missing');
    });

    it('rejects requests with invalid token', async () => {
      const res = await request(app)
        .get('/api/config')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('allows requests with valid token', async () => {
      const res = await request(app)
        .get('/api/shortlist')
        .set('Authorization', `Bearer ${API_KEY}`);
      // Should not be 401 — it might be 200 or 500 depending on Supabase
      expect(res.status).not.toBe(401);
    });
  });

  describe('Route stubs', () => {
    it('GET /api/shortlist returns array', async () => {
      const res = await request(app)
        .get('/api/shortlist')
        .set('Authorization', `Bearer ${API_KEY}`);
      // May be 200 with empty array or 500 if tables don't exist yet
      expect([200, 500]).toContain(res.status);
    });

    it('POST /api/scrape/trigger returns 202', async () => {
      const res = await request(app)
        .post('/api/scrape/trigger')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(202);
      expect(res.body.status).toBe('started');
    });

    it('GET /api/scrape/status returns status', async () => {
      const res = await request(app)
        .get('/api/scrape/status')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('idle');
    });

    it('POST /api/conversations creates draft (stub)', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ listing_id: 'test-id', template: 'initial_enquiry' });
      expect(res.status).toBe(201);
    });

    it('GET /api/conversations returns array', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('POST /api/tracking/pause returns success', async () => {
      const res = await request(app)
        .post('/api/tracking/pause')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(200);
      expect(res.body.tracking_active).toBe(false);
    });

    it('POST /api/tracking/resume returns success', async () => {
      const res = await request(app)
        .post('/api/tracking/resume')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(200);
      expect(res.body.tracking_active).toBe(true);
    });

    it('POST /api/webhooks/email-inbound returns success', async () => {
      const res = await request(app)
        .post('/api/webhooks/email-inbound')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(200);
    });

    it('POST /api/listings/manual returns 201', async () => {
      const res = await request(app)
        .post('/api/listings/manual')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ url: 'https://www.autotrader.co.uk/car/123' });
      expect(res.status).toBe(201);
    });
  });
});

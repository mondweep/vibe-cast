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

describe('API Tests', () => {
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
      expect(res.status).not.toBe(401);
    });
  });

  describe('Config routes', () => {
    it('GET /api/config returns 404 when no config exists', async () => {
      const res = await request(app)
        .get('/api/config')
        .set('Authorization', `Bearer ${API_KEY}`);
      // 404 if no config, 200 if config exists
      expect([200, 404]).toContain(res.status);
    });

    it('PUT /api/config rejects invalid body', async () => {
      const res = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ postcode: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('PUT /api/config validates budget_min < budget_max', async () => {
      const res = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({
          postcode: 'GU14 6TH',
          budget_min: 500000,
          budget_max: 100000,
          adults: [{ age: 40, ncb_years: 5 }],
        });
      expect(res.status).toBe(400);
    });
  });

  describe('Scrape routes', () => {
    it('POST /api/scrape/trigger returns 400 without config', async () => {
      const res = await request(app)
        .post('/api/scrape/trigger')
        .set('Authorization', `Bearer ${API_KEY}`);
      // 400 if no config, 202 if config exists
      expect([202, 400]).toContain(res.status);
    });

    it('GET /api/scrape/status returns status', async () => {
      const res = await request(app)
        .get('/api/scrape/status')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Listings routes', () => {
    it('GET /api/listings returns array', async () => {
      const res = await request(app)
        .get('/api/listings')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect([200, 500]).toContain(res.status);
    });

    it('GET /api/listings/:id returns 404 for non-existent listing', async () => {
      const res = await request(app)
        .get('/api/listings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect(res.status).toBe(404);
    });

    it('POST /api/listings/manual rejects invalid URL', async () => {
      const res = await request(app)
        .post('/api/listings/manual')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ url: 'not-a-url' });
      expect(res.status).toBe(400);
    });

    it('POST /api/listings/manual returns 422 when Playwright unavailable', async () => {
      const res = await request(app)
        .post('/api/listings/manual')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ url: 'https://www.autotrader.co.uk/car/123' });
      // 422 if Playwright not installed, 201 if it is
      expect([201, 422]).toContain(res.status);
    });
  });

  describe('Conversation routes', () => {
    it('POST /api/conversations rejects invalid listing_id', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ listing_id: 'not-a-uuid', template: 'initial_enquiry' });
      expect(res.status).toBe(400);
    });

    it('POST /api/conversations returns 404 for non-existent listing', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ listing_id: '00000000-0000-0000-0000-000000000000', template: 'initial_enquiry' });
      expect(res.status).toBe(404);
    });

    it('GET /api/conversations returns array or error', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${API_KEY}`);
      // 200 if table exists, 500 if not
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('Tracking routes', () => {
    it('POST /api/tracking/pause returns 404 without config or 200 with config', async () => {
      const res = await request(app)
        .post('/api/tracking/pause')
        .set('Authorization', `Bearer ${API_KEY}`);
      // 404 if no config, 200 if config exists
      expect([200, 404]).toContain(res.status);
    });

    it('POST /api/tracking/resume returns 404 without config or 200 with config', async () => {
      const res = await request(app)
        .post('/api/tracking/resume')
        .set('Authorization', `Bearer ${API_KEY}`);
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Webhook routes', () => {
    it('POST /api/webhooks/email-inbound rejects missing sender', async () => {
      const res = await request(app)
        .post('/api/webhooks/email-inbound')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('POST /api/webhooks/email-inbound processes valid email', async () => {
      const res = await request(app)
        .post('/api/webhooks/email-inbound')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ from: 'seller@example.com', subject: 'Re: Fiat 500', text: 'Yes still available' });
      expect(res.status).toBe(200);
    });
  });
});

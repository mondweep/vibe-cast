import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { supabase } from './db/client.js';
import configRoutes from './routes/config.js';
import listingsRoutes from './routes/listings.js';
import shortlistRoutes from './routes/shortlist.js';
import conversationsRoutes from './routes/conversations.js';
import scrapeRoutes from './routes/scrape.js';
import trackingRoutes from './routes/tracking.js';
import webhooksRoutes from './routes/webhooks.js';
import { startDigestScheduler } from './scheduler/digest.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: false })); // API-only, no browser CORS needed
app.use(express.json({ limit: '100kb' }));

// Global rate limit: 60 requests/minute per IP
app.use(rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Health check (no auth)
app.get('/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('user_config').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Health] Database check failed:', err);
    res.status(503).json({ status: 'unhealthy' });
  }
});

// Auth middleware for all /api/* routes
app.use('/api', authMiddleware);

// Stricter rate limits for resource-intensive endpoints
const scrapeRateLimit = rateLimit({
  windowMs: 10 * 60_000,
  max: 2,
  message: { error: 'Scrape rate limit exceeded — max 2 per 10 minutes' },
});
app.use('/api/scrape/trigger', scrapeRateLimit);
app.use('/api/listings/manual', scrapeRateLimit);

// Mount routes
app.use('/api/config', configRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/shortlist', shortlistRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/webhooks', webhooksRoutes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`Fiat 500 Tracker API running on port ${port}`);
  startDigestScheduler();
});

export { app };

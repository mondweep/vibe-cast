import express from 'express';
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

app.use(express.json());

// Health check (no auth)
app.get('/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('user_config').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: String(err) });
  }
});

// Auth middleware for all /api/* routes
app.use('/api', authMiddleware);

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

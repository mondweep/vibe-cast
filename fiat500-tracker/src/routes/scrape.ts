import { Router, Request, Response } from 'express';
import { supabase } from '../db/client.js';
import { runScrapeOrchestrator } from '../scrapers/scrape-orchestrator.js';
import { CarGurusScraper } from '../scrapers/cargurus.js';
import { BigMotoringWorldScraper } from '../scrapers/big-motoring-world.js';
import { CinchScraper } from '../scrapers/cinch.js';
import { HeycarScraper } from '../scrapers/heycar.js';
import { CarwowScraper } from '../scrapers/carwow.js';
import { AutoTraderScraper } from '../scrapers/autotrader.js';
import { recalculateAllScores } from '../ranking/engine.js';
import { batchEstimateInsurance } from '../insurance/estimator.js';
import type { UserConfig } from '../types/index.js';

const router = Router();

// Track if a scrape is currently running
let currentScrapeRunId: string | null = null;

router.post('/trigger', async (_req: Request, res: Response) => {
  // Check if config exists
  const { data: config, error: configError } = await supabase
    .from('user_config')
    .select('*')
    .limit(1)
    .single();

  if (configError || !config) {
    res.status(400).json({ error: 'No configuration found. Use PUT /api/config to set up first.' });
    return;
  }

  // Check if tracking is active
  if (!config.tracking_active) {
    res.status(400).json({ error: 'Tracking is paused. Use POST /api/tracking/resume first.' });
    return;
  }

  // Don't start if already running
  if (currentScrapeRunId) {
    res.status(409).json({ error: 'A scrape is already running', run_id: currentScrapeRunId });
    return;
  }

  // HTTP-based scrapers + Playwright-based AutoTrader (container has Playwright installed)
  // Platforms not included:
  //   Cazoo — Vercel security checkpoint blocks all non-browser requests
  //   Cargiant — no Fiat 500 stock (London physical dealer, limited inventory)
  //   Gumtree / eBay Motors / Motors.co.uk — require Playwright (TODO: convert)
  const scrapers = [
    new AutoTraderScraper(),
    new CarGurusScraper(),
    new BigMotoringWorldScraper(),
    new CinchScraper(),
    new HeycarScraper(),
    new CarwowScraper(),
  ];

  // Return immediately with 202
  res.status(202).json({ status: 'started', message: 'Scrape started in background' });

  // Run in background
  currentScrapeRunId = 'starting';
  runScrapeOrchestrator(scrapers, config as UserConfig)
    .then(async (result) => {
      console.log(`[Scrape] Completed: ${result.listingsNew} new, ${result.listingsUpdated} updated, ${result.priceDrops} price drops`);

      // Recalculate scores and insurance after scrape
      try {
        await recalculateAllScores(config as UserConfig);
        await batchEstimateInsurance(config as UserConfig);
        console.log('[Scrape] Scores and insurance estimates updated');
      } catch (err) {
        console.error('[Scrape] Post-scrape processing error:', err);
      }

      currentScrapeRunId = null;
    })
    .catch(err => {
      console.error('[Scrape] Failed:', err);
      currentScrapeRunId = null;
    });
});

router.get('/status', async (_req: Request, res: Response) => {
  // Get the latest scrape run
  const { data: latestRun, error } = await supabase
    .from('scrape_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !latestRun) {
    res.json({ status: 'idle', last_run: null });
    return;
  }

  res.json({
    status: latestRun.status,
    last_run: {
      id: latestRun.id,
      started_at: latestRun.started_at,
      completed_at: latestRun.completed_at,
      listings_found: latestRun.listings_found,
      listings_new: latestRun.listings_new,
      listings_updated: latestRun.listings_updated,
      price_drops: latestRun.price_drops,
      errors: latestRun.errors,
    },
  });
});

export default router;

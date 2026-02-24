import cron from 'node-cron';
import { supabase } from '../db/client.js';
import { sendDailyDigest } from '../notifications/openclaw-webhook.js';
import { recalculateAllScores, saveShortlistSnapshot } from '../ranking/engine.js';
import { batchEstimateInsurance } from '../insurance/estimator.js';
import type { UserConfig } from '../types/index.js';

let digestTask: cron.ScheduledTask | null = null;

export function startDigestScheduler(): void {
  if (digestTask) {
    console.log('[Digest] Scheduler already running');
    return;
  }

  // Run daily at 18:00 UTC
  digestTask = cron.schedule('0 18 * * *', async () => {
    console.log('[Digest] Running daily digest...');
    try {
      await runDailyDigest();
    } catch (err) {
      console.error('[Digest] Error:', err);
    }
  });

  console.log('[Digest] Scheduler started — runs daily at 18:00 UTC');
}

export function stopDigestScheduler(): void {
  if (digestTask) {
    digestTask.stop();
    digestTask = null;
    console.log('[Digest] Scheduler stopped');
  }
}

export async function runDailyDigest(): Promise<void> {
  // Check if tracking is active
  const { data: config } = await supabase
    .from('user_config')
    .select('*')
    .limit(1)
    .single();

  if (!config || !config.tracking_active) {
    console.log('[Digest] Tracking is paused — skipping digest');
    return;
  }

  // Recalculate scores
  await recalculateAllScores(config as UserConfig);

  // Batch estimate insurance
  await batchEstimateInsurance(config as UserConfig);

  // Save daily snapshot
  await saveShortlistSnapshot();

  // Compile digest data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Count new listings today
  const { count: newListingsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .gte('first_seen_at', todayISO)
    .eq('is_active', true);

  // Count price drops today
  const { count: priceDropsCount } = await supabase
    .from('price_history')
    .select('*', { count: 'exact', head: true })
    .gte('recorded_at', todayISO);

  // Get top 10
  const { data: top10 } = await supabase
    .from('listings')
    .select('id, title, price, mileage, year, composite_score, insurance_estimate, url')
    .eq('is_active', true)
    .not('composite_score', 'is', null)
    .order('composite_score', { ascending: false })
    .limit(10);

  const topPick = top10 && top10.length > 0
    ? {
      title: top10[0].title,
      price: top10[0].price,
      score: top10[0].composite_score,
      url: top10[0].url,
    }
    : null;

  const top10Summary = (top10 || []).map((l, i) =>
    `${i + 1}. ${l.title} — £${(l.price / 100).toFixed(0)} | ${l.mileage?.toLocaleString() || '?'} mi | Score: ${l.composite_score}`
  );

  await sendDailyDigest({
    new_listings_today: newListingsCount || 0,
    price_drops_today: priceDropsCount || 0,
    top_pick: topPick,
    top_10_summary: top10Summary,
  });

  console.log(`[Digest] Sent: ${newListingsCount || 0} new listings, ${priceDropsCount || 0} price drops`);
}

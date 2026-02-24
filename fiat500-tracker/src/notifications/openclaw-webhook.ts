import crypto from 'crypto';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import type { WebhookEvent } from '../types/index.js';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function signPayload(payload: string, secret: string, timestamp: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
}

export async function sendWebhookEvent(event: WebhookEvent): Promise<boolean> {
  // Get webhook URL from config
  const { data: config } = await supabase
    .from('user_config')
    .select('openclaw_webhook_url')
    .limit(1)
    .single();

  const webhookUrl = config?.openclaw_webhook_url || env.OPENCLAW_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[OpenClaw] No webhook URL configured — skipping notification');
    return false;
  }

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = env.OPENCLAW_WEBHOOK_SECRET
    ? signPayload(body, env.OPENCLAW_WEBHOOK_SECRET, timestamp)
    : '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Event-Type': event.event,
        },
        body,
      });

      if (response.ok) {
        console.log(`[OpenClaw] Event ${event.event} sent successfully`);
        return true;
      }

      console.warn(`[OpenClaw] HTTP ${response.status} for event ${event.event} (attempt ${attempt + 1})`);
    } catch (err) {
      console.warn(`[OpenClaw] Network error for event ${event.event} (attempt ${attempt + 1})`);
    }

    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`[OpenClaw] Failed to send event ${event.event} after ${MAX_RETRIES + 1} attempts`);
  return false;
}

// Convenience functions for each event type

export async function notifyNewShortlistEntry(listing: {
  title: string;
  price: number;
  mileage: number;
  composite_score: number;
  insurance_estimate: number | null;
  url: string;
}): Promise<boolean> {
  return sendWebhookEvent({
    event: 'new_shortlist_entry',
    timestamp: new Date().toISOString(),
    data: {
      title: listing.title,
      price: `£${(listing.price / 100).toFixed(0)}`,
      mileage: `${listing.mileage.toLocaleString()} miles`,
      score: listing.composite_score,
      insurance: listing.insurance_estimate
        ? `£${(listing.insurance_estimate / 100).toFixed(0)}/yr (est.)`
        : 'N/A',
      url: listing.url,
    },
  });
}

export async function notifyPriceDrop(listing: {
  title: string;
  url: string;
  old_price: number;
  new_price: number;
}): Promise<boolean> {
  const saving = listing.old_price - listing.new_price;
  return sendWebhookEvent({
    event: 'price_drop',
    timestamp: new Date().toISOString(),
    data: {
      title: listing.title,
      old_price: `£${(listing.old_price / 100).toFixed(0)}`,
      new_price: `£${(listing.new_price / 100).toFixed(0)}`,
      saving: `£${(saving / 100).toFixed(0)}`,
      url: listing.url,
    },
  });
}

export async function notifyListingRemoved(listing: {
  title: string;
  price: number;
  url: string;
}): Promise<boolean> {
  return sendWebhookEvent({
    event: 'listing_removed',
    timestamp: new Date().toISOString(),
    data: {
      title: listing.title,
      price: `£${(listing.price / 100).toFixed(0)}`,
      url: listing.url,
      message: 'This listing has not been seen for 48 hours and may have been sold.',
    },
  });
}

export async function notifySellerReply(conversation: {
  conversation_id: string;
  seller_name: string;
  reply_body: string;
}): Promise<boolean> {
  return sendWebhookEvent({
    event: 'seller_reply',
    timestamp: new Date().toISOString(),
    data: conversation,
  });
}

export async function sendDailyDigest(digest: {
  new_listings_today: number;
  price_drops_today: number;
  top_pick: { title: string; price: number; score: number; url: string } | null;
  top_10_summary: string[];
}): Promise<boolean> {
  return sendWebhookEvent({
    event: 'daily_digest',
    timestamp: new Date().toISOString(),
    data: digest,
  });
}

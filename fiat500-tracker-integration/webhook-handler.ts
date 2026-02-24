/**
 * Webhook Handler for Fiat 500 Tracker Events
 * Receives events from GCP app via Tailscale, formats for WhatsApp delivery
 */

import { Fiat500Client, WebhookEvent } from './client';

interface FormattedEvent {
  type: string;
  message: string;
  emoji: string;
  data?: Record<string, any>;
}

class WebhookHandler {
  private client: Fiat500Client;

  constructor(client: Fiat500Client) {
    this.client = client;
  }

  /**
   * Parse incoming webhook event and format for WhatsApp
   */
  async handleEvent(event: WebhookEvent): Promise<FormattedEvent> {
    console.log(`[Webhook] Received event: ${event.event} at ${event.timestamp}`);

    switch (event.event) {
      case 'new_shortlist_entry':
        return this.handleNewShortlistEntry(event);
      case 'price_drop':
        return this.handlePriceDrop(event);
      case 'listing_removed':
        return this.handleListingRemoved(event);
      case 'seller_reply':
        return this.handleSellerReply(event);
      case 'daily_digest':
        return this.handleDailyDigest(event);
      default:
        throw new Error(`Unknown event type: ${event.event}`);
    }
  }

  /**
   * new_shortlist_entry: A car entered the top 10
   */
  private handleNewShortlistEntry(event: WebhookEvent): FormattedEvent {
    const { listing } = event.data;
    const {
      title,
      price,
      mileage,
      composite_score,
      insurance_estimate,
      distance_miles,
      url,
    } = listing;

    const priceFormatted = `£${(price / 100).toFixed(2)}`;
    const insuranceFormatted = `£${(insurance_estimate / 100).toFixed(2)}/yr`;
    const message = [
      `🚗 *New car in shortlist*`,
      `${title}`,
      `💰 Price: ${priceFormatted} | Insurance: ${insuranceFormatted}`,
      `📊 Score: ${composite_score.toFixed(0)}% | Mileage: ${mileage.toLocaleString()} miles`,
      `📍 Distance: ${distance_miles.toFixed(1)} miles`,
      `[View on platform](${url})`,
    ].join('\n');

    return {
      type: 'new_shortlist_entry',
      message,
      emoji: '🚗',
      data: listing,
    };
  }

  /**
   * price_drop: A tracked car decreased in price
   */
  private handlePriceDrop(event: WebhookEvent): FormattedEvent {
    const { listing_id, title, old_price, new_price, price_drop_amount } = event.data;

    const oldFormatted = `£${(old_price / 100).toFixed(2)}`;
    const newFormatted = `£${(new_price / 100).toFixed(2)}`;
    const dropFormatted = `£${(price_drop_amount / 100).toFixed(2)}`;

    const message = [
      `💰 *Price drop detected!*`,
      `${title}`,
      `${oldFormatted} → ${newFormatted}`,
      `📉 Saved: ${dropFormatted}`,
      `Command: /tracker car ${listing_id} to view full details`,
    ].join('\n');

    return {
      type: 'price_drop',
      message,
      emoji: '💰',
      data: event.data,
    };
  }

  /**
   * listing_removed: A car is no longer available
   */
  private handleListingRemoved(event: WebhookEvent): FormattedEvent {
    const { listing_id, title, last_seen_ago_hours } = event.data;

    const message = [
      `⚠️ *Car no longer available*`,
      `${title}`,
      `Last seen: ${last_seen_ago_hours} hours ago (likely sold)`,
      `Command: /tracker car ${listing_id} to view history`,
    ].join('\n');

    return {
      type: 'listing_removed',
      message,
      emoji: '⚠️',
      data: event.data,
    };
  }

  /**
   * seller_reply: A seller responded to our email
   */
  private handleSellerReply(event: WebhookEvent): FormattedEvent {
    const { conversation_id, listing_id, seller_name, listing_title, reply_preview } =
      event.data;

    const message = [
      `📧 *Seller replied*`,
      `From: ${seller_name}`,
      `Re: ${listing_title}`,
      ``,
      `_${reply_preview}_`,
      ``,
      `Command: /tracker conversation ${conversation_id} to respond`,
    ].join('\n');

    return {
      type: 'seller_reply',
      message,
      emoji: '📧',
      data: event.data,
    };
  }

  /**
   * daily_digest: 6pm summary of the day
   */
  private handleDailyDigest(event: WebhookEvent): FormattedEvent {
    const {
      new_listings_count,
      price_drops_count,
      removed_listings_count,
      top_10_summary,
      highest_scoring_car,
    } = event.data;

    const topCarLine = highest_scoring_car
      ? `\n🏆 *Top pick:* ${highest_scoring_car.title} (${highest_scoring_car.composite_score.toFixed(0)}%)\n`
      : '';

    const message = [
      `📊 *Daily Digest*`,
      ``,
      `📅 New listings: ${new_listings_count}`,
      `💰 Price drops: ${price_drops_count}`,
      `❌ Removed: ${removed_listings_count}`,
      topCarLine,
      `Command: /tracker shortlist to view top 10`,
    ].join('\n');

    return {
      type: 'daily_digest',
      message,
      emoji: '📊',
      data: event.data,
    };
  }

  /**
   * Validate incoming webhook (bearer token)
   */
  validateWebhookAuth(authHeader: string, expectedSecret: string): boolean {
    const token = authHeader?.replace('Bearer ', '').trim();
    return token === expectedSecret;
  }
}

export { WebhookHandler, FormattedEvent };

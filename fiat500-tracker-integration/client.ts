/**
 * Fiat 500 Tracker API Client
 * Wrapper for secure communication with GCP Cloud Run app via Tailscale
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  mileage: number;
  year: number;
  engine_size: string;
  location: string;
  distance_miles: number;
  composite_score: number;
  insurance_estimate: number;
  url: string;
  platform: string;
  image_urls: string[];
}

interface ShortlistEntry extends Listing {
  rank: number;
}

interface Conversation {
  id: string;
  listing_id: string;
  status: 'awaiting_approval' | 'sent' | 'replied' | 'closed';
  seller_name: string;
  listing_title: string;
  messages: ConversationMessage[];
}

interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  sent_at?: string;
  approved_at?: string;
}

interface WebhookEvent {
  event: 'new_shortlist_entry' | 'price_drop' | 'listing_removed' | 'seller_reply' | 'daily_digest';
  timestamp: string;
  data: Record<string, any>;
}

class Fiat500Client {
  private config: ApiConfig;
  private retryAttempts = 3;
  private retryDelayMs = 1000;

  constructor(configPath?: string) {
    const path = configPath || resolve(process.cwd(), '.private/fiat500-api-config.json');
    try {
      const raw = readFileSync(path, 'utf-8');
      this.config = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Failed to load Fiat500 API config from ${path}: ${err.message}`);
    }
  }

  /**
   * Health check — verify API connectivity
   */
  async health(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      const res = await this.fetch('/health', { method: 'GET' });
      return { status: 'ok', message: 'API healthy' };
    } catch (err) {
      return { status: 'error', message: `API unreachable: ${err.message}` };
    }
  }

  /**
   * Get user's search configuration
   */
  async getConfig(): Promise<Record<string, any>> {
    return this.fetch('/api/config', { method: 'GET' });
  }

  /**
   * Get top 10 shortlist
   */
  async getShortlist(): Promise<ShortlistEntry[]> {
    const listings = await this.fetch('/api/shortlist', { method: 'GET' });
    return listings.map((listing: Listing, index: number) => ({
      ...listing,
      rank: index + 1,
    }));
  }

  /**
   * Get all active listings
   */
  async getAllListings(): Promise<Listing[]> {
    return this.fetch('/api/listings', { method: 'GET' });
  }

  /**
   * Get single listing with price history
   */
  async getListing(id: string): Promise<Record<string, any>> {
    return this.fetch(`/api/listings/${id}`, { method: 'GET' });
  }

  /**
   * Get insurance estimate for a listing
   */
  async getInsurance(id: string): Promise<Record<string, any>> {
    return this.fetch(`/api/listings/${id}/insurance`, { method: 'GET' });
  }

  /**
   * Trigger scraping of all 8 platforms
   */
  async triggerScrape(): Promise<{ run_id: string; status: string }> {
    return this.fetch('/api/scrape/trigger', { method: 'POST', body: {} });
  }

  /**
   * Check scraping progress
   */
  async getScrapeStatus(): Promise<Record<string, any>> {
    return this.fetch('/api/scrape/status', { method: 'GET' });
  }

  /**
   * Pause auto-scraping
   */
  async pauseTracking(): Promise<{ status: string }> {
    return this.fetch('/api/tracking/pause', { method: 'POST', body: {} });
  }

  /**
   * Resume auto-scraping
   */
  async resumeTracking(): Promise<{ status: string }> {
    return this.fetch('/api/tracking/resume', { method: 'POST', body: {} });
  }

  /**
   * List seller conversations
   */
  async getConversations(): Promise<Conversation[]> {
    return this.fetch('/api/conversations', { method: 'GET' });
  }

  /**
   * Draft a seller email
   * @param listingId Listing ID
   * @param template Template type (initial_enquiry, follow_up, negotiate, decline)
   * @param customBody Optional override body text
   */
  async draftConversation(
    listingId: string,
    template: string,
    customBody?: string
  ): Promise<Conversation> {
    return this.fetch('/api/conversations', {
      method: 'POST',
      body: {
        listing_id: listingId,
        template,
        custom_body: customBody,
      },
    });
  }

  /**
   * Approve and send a draft email
   */
  async approveConversation(conversationId: string): Promise<{ status: string }> {
    return this.fetch(`/api/conversations/${conversationId}/approve`, {
      method: 'POST',
      body: {},
    });
  }

  /**
   * Reject a draft email
   */
  async rejectConversation(conversationId: string): Promise<{ status: string }> {
    return this.fetch(`/api/conversations/${conversationId}/reject`, {
      method: 'POST',
      body: {},
    });
  }

  /**
   * Low-level fetch with retry + auth
   */
  private async fetch(
    path: string,
    options: { method: 'GET' | 'POST'; body?: Record<string, any> },
    attempt = 1
  ): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    try {
      const res = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        timeout: 30000, // 30s timeout
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorBody}`);
      }

      return res.json();
    } catch (err) {
      if (attempt < this.retryAttempts && this.isRetryable(err)) {
        const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Retry attempt ${attempt}/${this.retryAttempts} in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.fetch(path, options, attempt + 1);
      }
      throw err;
    }
  }

  private isRetryable(err: any): boolean {
    const msg = err.message?.toLowerCase() || '';
    // Retry on network errors, timeouts, and 5xx
    return (
      msg.includes('econnrefused') ||
      msg.includes('timeout') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503')
    );
  }

  /**
   * Validate webhook signature (called by webhook handler)
   */
  validateWebhookSignature(body: string, signature: string): boolean {
    // TODO: Implement HMAC-SHA256 validation if Fiat500 sends signatures
    // For now, bearer token auth is sufficient
    return signature === this.config.webhookSecret;
  }
}

export { Fiat500Client, Listing, ShortlistEntry, Conversation, WebhookEvent, ApiConfig };

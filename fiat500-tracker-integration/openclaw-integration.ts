/**
 * OpenClaw Integration Module
 * Hooks Fiat 500 Tracker into OpenClaw's message routing
 * Handles:
 *   1. Incoming /tracker commands from WhatsApp
 *   2. Incoming webhooks from GCP (via Tailscale)
 */

import { Fiat500Client } from './client';
import { WebhookHandler, FormattedEvent } from './webhook-handler';
import { MessageRouter, CommandResponse } from './message-router';

interface Message {
  text: string;
  from?: string;
  to?: string;
  platform?: string;
}

interface WebhookRequest {
  headers: Record<string, string>;
  body: string;
}

class Fiat500Integration {
  private client: Fiat500Client;
  private webhookHandler: WebhookHandler;
  private messageRouter: MessageRouter;
  private webhookSecret: string;

  constructor() {
    this.client = new Fiat500Client();
    this.webhookHandler = new WebhookHandler(this.client);
    this.messageRouter = new MessageRouter(this.client);
    this.webhookSecret = '6a516b2129ee22bbc1347a904104e5bd5dc649a7b5716797'; // From config
  }

  /**
   * Handle incoming WhatsApp message
   * If it starts with /tracker, route to Fiat500 tracker
   * Otherwise, pass through to regular message handling
   */
  async handleMessage(message: Message): Promise<string | null> {
    if (!message.text?.startsWith('/tracker')) {
      return null; // Not a tracker command
    }

    console.log(`[Fiat500] Handling tracker command: ${message.text}`);

    const response = await this.messageRouter.route(message.text);
    return response.message;
  }

  /**
   * Handle incoming webhook from Fiat500 app (GCP)
   * Called by OpenClaw gateway at POST /webhooks/fiat500
   */
  async handleWebhook(request: WebhookRequest): Promise<{
    success: boolean;
    message: string;
    event?: FormattedEvent;
  }> {
    // Validate bearer token
    const authHeader = request.headers['authorization'] || '';
    if (!this.webhookHandler.validateWebhookAuth(authHeader, this.webhookSecret)) {
      return {
        success: false,
        message: 'Unauthorized: invalid webhook secret',
      };
    }

    try {
      const event = JSON.parse(request.body);
      console.log(`[Fiat500] Webhook received: ${event.event}`);

      const formattedEvent = await this.webhookHandler.handleEvent(event);
      console.log(`[Fiat500] Formatted event: ${formattedEvent.type}`);

      // In a real implementation, this would send the message to WhatsApp
      // For now, we return it formatted
      return {
        success: true,
        message: formattedEvent.message,
        event: formattedEvent,
      };
    } catch (err) {
      console.error(`[Fiat500] Webhook error:`, err);
      return {
        success: false,
        message: `Error processing webhook: ${err.message}`,
      };
    }
  }

  /**
   * Health check - verify Fiat500 API is reachable
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    const health = await this.client.health();
    return {
      healthy: health.status === 'ok',
      message: health.message,
    };
  }
}

export { Fiat500Integration };

/**
 * Factory function for OpenClaw
 * Called by message router or webhook handler
 */
export async function createFiat500Integration(): Promise<Fiat500Integration> {
  return new Fiat500Integration();
}

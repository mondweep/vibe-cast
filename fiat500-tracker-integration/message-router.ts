/**
 * Message Router for Fiat 500 Tracker Commands
 * Parses /tracker commands from WhatsApp, executes against API, formats responses
 */

import { Fiat500Client, ShortlistEntry, Conversation } from './client';

interface CommandRequest {
  action: string;
  args: string[];
}

interface CommandResponse {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

class MessageRouter {
  private client: Fiat500Client;

  constructor(client: Fiat500Client) {
    this.client = client;
  }

  /**
   * Route a /tracker command
   * Examples:
   *   /tracker shortlist
   *   /tracker car 3
   *   /tracker scrape
   *   /tracker config
   *   /tracker pause
   *   /tracker resume
   *   /tracker conversations
   *   /tracker email car 3 initial
   */
  async route(text: string): Promise<CommandResponse> {
    if (!text.startsWith('/tracker')) {
      return { success: false, message: 'Not a tracker command' };
    }

    const parts = text.slice(8).trim().split(/\s+/);
    const action = parts[0];
    const args = parts.slice(1);

    try {
      switch (action) {
        case 'shortlist':
          return await this.cmdShortlist();
        case 'car':
          return await this.cmdCar(args[0]);
        case 'scrape':
          return await this.cmdScrape();
        case 'status':
          return await this.cmdStatus();
        case 'config':
          return await this.cmdConfig();
        case 'pause':
          return await this.cmdPause();
        case 'resume':
          return await this.cmdResume();
        case 'conversations':
          return await this.cmdConversations();
        case 'email':
          return await this.cmdDraftEmail(args);
        case 'help':
          return this.cmdHelp();
        default:
          return { success: false, message: `Unknown command: ${action}. Try /tracker help` };
      }
    } catch (err) {
      console.error(`[Router] Command error:`, err);
      return {
        success: false,
        message: `Error: ${err.message}`,
      };
    }
  }

  /**
   * /tracker shortlist — Show top 10 cars
   */
  private async cmdShortlist(): Promise<CommandResponse> {
    const shortlist = await this.client.getShortlist();

    if (shortlist.length === 0) {
      return {
        success: true,
        message: 'No cars in shortlist yet. Run `/tracker scrape` to find cars.',
      };
    }

    const lines = ['🚗 *Top 10 Shortlist*\n'];
    for (const car of shortlist) {
      const priceFormatted = `£${(car.price / 100).toFixed(0)}`;
      const insuranceFormatted = `£${(car.insurance_estimate / 100).toFixed(0)}/yr`;
      const scoreBar = this.scoreBar(car.composite_score);

      lines.push(
        `*${car.rank}.* ${car.title}`,
        `   ${priceFormatted} | ${insuranceFormatted} insurance`,
        `   ${car.mileage.toLocaleString()} miles | ${car.year}`,
        `   ${scoreBar} ${car.composite_score.toFixed(0)}%`,
        `   📍 ${car.distance_miles.toFixed(1)} miles away`,
        ``
      );
    }

    lines.push(`_Use /tracker car N to view details_`);

    return {
      success: true,
      message: lines.join('\n'),
      data: { count: shortlist.length, cars: shortlist },
    };
  }

  /**
   * /tracker car {id} — Show details for a specific car
   */
  private async cmdCar(id: string): Promise<CommandResponse> {
    if (!id) {
      return { success: false, message: 'Usage: /tracker car <number 1-10 or listing_id>' };
    }

    const shortlist = await this.client.getShortlist();
    let car = shortlist.find((c) => c.rank.toString() === id || c.id === id);

    if (!car) {
      return { success: false, message: `Car ${id} not found in shortlist` };
    }

    const listing = await this.client.getListing(car.id);
    const insurance = await this.client.getInsurance(car.id);

    const priceFormatted = `£${(car.price / 100).toFixed(2)}`;
    const insuranceAnnual = `£${(insurance.estimated_annual_total / 100).toFixed(2)}`;
    const scoreBar = this.scoreBar(car.composite_score);

    const lines = [
      `🚗 *${car.rank}. ${car.title}*`,
      ``,
      `*Pricing & Costs*`,
      `💰 Price: ${priceFormatted}`,
      `🛡️ Insurance: ${insuranceAnnual}/year (${insurance.cover_type || 'estimate'})`,
      ``,
      `*Vehicle Details*`,
      `📅 Year: ${car.year}`,
      `🔧 Engine: ${car.engine_size}`,
      `📍 Location: ${car.location}`,
      `🚗 Mileage: ${car.mileage.toLocaleString()} miles`,
      `📏 Distance: ${car.distance_miles.toFixed(1)} miles`,
      ``,
      `*Ranking*`,
      `${scoreBar} Overall Score: ${car.composite_score.toFixed(0)}%`,
      `Platform: ${car.platform}`,
      ``,
      `*Actions*`,
      `/tracker email car ${car.rank} initial`,
      `[View listing](${car.url})`,
    ];

    return {
      success: true,
      message: lines.join('\n'),
      data: { car, listing, insurance },
    };
  }

  /**
   * /tracker scrape — Trigger scraping of all 8 platforms
   */
  private async cmdScrape(): Promise<CommandResponse> {
    const result = await this.client.triggerScrape();

    return {
      success: true,
      message: `🔄 Scraping started (run ID: ${result.run_id})\n_Results will arrive in 5-15 minutes. You'll get a notification when new cars are found._`,
      data: result,
    };
  }

  /**
   * /tracker status — Check scrape progress
   */
  private async cmdStatus(): Promise<CommandResponse> {
    const status = await this.client.getScrapeStatus();

    const lines = [
      `📊 *Scrape Status*`,
      `Status: ${status.status}`,
      `Listings found: ${status.listing_count || 0}`,
      `Started: ${new Date(status.started_at).toLocaleString('en-GB')}`,
    ];

    if (status.completed_at) {
      lines.push(`Completed: ${new Date(status.completed_at).toLocaleString('en-GB')}`);
    }

    if (status.errors && status.errors.length > 0) {
      lines.push(`\n⚠️ Errors: ${status.errors.join(', ')}`);
    }

    return {
      success: true,
      message: lines.join('\n'),
      data: status,
    };
  }

  /**
   * /tracker config — Show search configuration
   */
  private async cmdConfig(): Promise<CommandResponse> {
    const config = await this.client.getConfig();

    const lines = [
      `⚙️ *Search Configuration*`,
      ``,
      `📍 Postcode: ${config.postcode}`,
      `📏 Search radius: ${config.search_radius_miles} miles`,
      `💰 Budget: £${(config.budget_min / 100).toFixed(0)} - £${(config.budget_max / 100).toFixed(0)}`,
      ``,
      `*Drivers*`,
    ];

    for (const driver of config.adults || []) {
      lines.push(`   Age ${driver.age}, ${driver.ncb_years} years NCB`);
    }

    if (config.learner_age) {
      lines.push(`   Provisional driver: age ${config.learner_age}`);
    }

    lines.push(``, `Email: ${config.outbound_email}`);

    return {
      success: true,
      message: lines.join('\n'),
      data: config,
    };
  }

  /**
   * /tracker pause — Stop auto-scraping
   */
  private async cmdPause(): Promise<CommandResponse> {
    await this.client.pauseTracking();
    return {
      success: true,
      message: `⏸️ Tracking paused. Auto-scraping disabled.\nUse /tracker resume to restart.`,
    };
  }

  /**
   * /tracker resume — Start auto-scraping
   */
  private async cmdResume(): Promise<CommandResponse> {
    await this.client.resumeTracking();
    return {
      success: true,
      message: `▶️ Tracking resumed. Auto-scraping will run every 3 hours.`,
    };
  }

  /**
   * /tracker conversations — List seller conversations
   */
  private async cmdConversations(): Promise<CommandResponse> {
    const conversations = await this.client.getConversations();

    if (conversations.length === 0) {
      return {
        success: true,
        message: 'No conversations yet. Use /tracker email to draft a message.',
      };
    }

    const lines = [`📧 *Conversations*\n`];
    for (const conv of conversations) {
      const statusEmoji = conv.status === 'replied' ? '✅' : '⏳';
      lines.push(
        `${statusEmoji} ${conv.listing_title}`,
        `   Seller: ${conv.seller_name}`,
        `   Status: ${conv.status}`,
        ``
      );
    }

    return {
      success: true,
      message: lines.join('\n'),
      data: { count: conversations.length, conversations },
    };
  }

  /**
   * /tracker email car N {template} — Draft email to seller
   * Templates: initial, followup, negotiate, decline
   */
  private async cmdDraftEmail(args: string[]): Promise<CommandResponse> {
    if (args.length < 2) {
      return {
        success: false,
        message:
          'Usage: /tracker email car <number> <template>\nTemplates: initial, followup, negotiate, decline',
      };
    }

    const carNum = args[1];
    const template = args[2] || 'initial';

    const shortlist = await this.client.getShortlist();
    const car = shortlist.find((c) => c.rank.toString() === carNum);

    if (!car) {
      return { success: false, message: `Car ${carNum} not found in shortlist` };
    }

    const conversation = await this.client.draftConversation(
      car.id,
      template === 'initial' ? 'initial_enquiry' : `${template}`,
      undefined
    );

    const lines = [
      `📧 *Draft Email to ${conversation.seller_name}*`,
      `Re: ${conversation.listing_title}`,
      `Status: ${conversation.status}`,
      ``,
      `${conversation.messages[0]?.body || '(no content)'}`,
      ``,
      `✅ /tracker approve ${conversation.id}`,
      `❌ /tracker reject ${conversation.id}`,
    ];

    return {
      success: true,
      message: lines.join('\n'),
      data: { conversation },
    };
  }

  /**
   * /tracker help — Show available commands
   */
  private cmdHelp(): CommandResponse {
    const message = [
      `🚗 *Fiat 500 Tracker Commands*`,
      ``,
      `📋 */tracker shortlist* — View top 10 ranked cars`,
      `🚗 */tracker car N* — Details for car #N (or listing ID)`,
      `🔄 */tracker scrape* — Start scraping all 8 platforms`,
      `📊 */tracker status* — Check scrape progress`,
      `⚙️ */tracker config* — View search configuration`,
      `⏸️ */tracker pause* — Stop auto-scraping`,
      `▶️ */tracker resume* — Resume auto-scraping`,
      `📧 */tracker conversations* — List seller emails`,
      `✉️ */tracker email car N initial* — Draft email to seller`,
      ``,
      `Webhooks will notify you of:`,
      `  🚗 New cars entering shortlist`,
      `  💰 Price drops`,
      `  ⚠️ Listings removed`,
      `  📧 Seller replies`,
      `  📊 Daily digest at 6pm`,
    ].join('\n');

    return { success: true, message };
  }

  /**
   * Helper: render a simple score bar
   */
  private scoreBar(score: number): string {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}

export { MessageRouter, CommandRequest, CommandResponse };

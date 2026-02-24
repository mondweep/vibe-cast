import type { ScrapedListing } from '../types/index.js';
import type { UserConfig } from '../types/index.js';

export interface ScraperResult {
  listings: ScrapedListing[];
  platform: string;
  scrapedAt: Date;
  errors: string[];
}

export abstract class BaseScraper {
  abstract platform: string;
  abstract scrape(config: UserConfig): Promise<ScraperResult>;

  protected makeResult(listings: ScrapedListing[], errors: string[] = []): ScraperResult {
    return {
      listings,
      platform: this.platform,
      scrapedAt: new Date(),
      errors,
    };
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected randomDelay(minMs: number, maxMs: number): Promise<void> {
    const ms = minMs + Math.random() * (maxMs - minMs);
    return this.delay(ms);
  }
}

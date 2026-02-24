import { chromium, type Browser } from 'playwright';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class CinchScraper extends BaseScraper {
  platform = 'cinch';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      const priceMin = Math.round(config.budget_min / 100);
      const priceMax = Math.round(config.budget_max / 100);

      const searchUrl = `https://www.cinch.co.uk/used-cars/fiat/500?price-from=${priceMin}&price-to=${priceMax}&fuel-type=petrol&transmission=manual`;

      console.log(`[Cinch] Searching: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
      await this.randomDelay(2000, 4000);

      // Cinch is a React app — wait for content to render
      await page.waitForSelector('[data-testid="vehicle-card"], .vehicle-card, article', { timeout: 15000 }).catch(() => null);

      const cards = await page.locator('[data-testid="vehicle-card"], .vehicle-card, article').all();

      for (const card of cards) {
        try {
          const href = await card.locator('a').first().getAttribute('href').catch(() => null);
          if (!href) continue;

          const url = href.startsWith('http') ? href : `https://www.cinch.co.uk${href}`;
          const idMatch = href.match(/\/(\d+)$/);
          const title = await card.locator('h2, h3, [data-testid="vehicle-title"]').first().textContent().catch(() => 'Fiat 500');
          const priceText = await card.locator('[data-testid="vehicle-price"], [class*="price"]').first().textContent().catch(() => '0');
          const price = parseInt((priceText || '0').replace(/[^0-9]/g, ''), 10) * 100;

          const specsText = await card.locator('[data-testid="vehicle-specs"], [class*="spec"]').first().textContent().catch(() => '');
          const imgSrc = await card.locator('img').first().getAttribute('src').catch(() => null);

          listings.push({
            platform: 'cinch',
            platform_listing_id: idMatch ? idMatch[1] : href,
            url,
            title: (title || 'Fiat 500').trim(),
            price,
            year: this.extractYear(title || '') || 2015,
            mileage: this.extractMileage(specsText || ''),
            engine_size: this.extractEngineSize(title || ''),
            fuel_type: 'petrol',
            transmission: 'manual',
            colour: null,
            mot_expiry: null,
            seller_name: 'cinch',
            seller_type: 'dealer',
            seller_rating: 75,
            location_postcode: null,
            description: null,
            image_urls: imgSrc ? [imgSrc] : [],
          });
        } catch (err) {
          errors.push(`Cinch card parse error: ${err}`);
        }
      }

      console.log(`[Cinch] Found ${listings.length} listings`);
      await context.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Cinch scraper error: ${msg}`);
      console.error(`[Cinch] Error:`, msg);
    } finally {
      if (browser) await browser.close();
    }

    return this.makeResult(listings, errors);
  }

  private extractYear(text: string): number | null {
    const match = text.match(/\b(20[0-2]\d)\b/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractMileage(text: string): number {
    const match = text.match(/([\d,]+)\s*miles/i);
    return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
  }

  private extractEngineSize(text: string): string {
    if (/0\.9|twinair/i.test(text)) return '0.9';
    if (/1\.2/i.test(text)) return '1.2';
    if (/1\.4/i.test(text)) return '1.4';
    return '1.2';
  }
}

import { chromium, type Browser, type Page } from 'playwright';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class GumtreeScraper extends BaseScraper {
  platform = 'gumtree';

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

      // Gumtree search URL for Fiat 500
      const searchUrl = `https://www.gumtree.com/search?search_category=cars&search_location=${encodeURIComponent(config.postcode)}&distance=${config.search_radius_miles}&vehicle_make=Fiat&vehicle_model=500&min_price=${priceMin}&max_price=${priceMax}&vehicle_fuel_type=petrol&vehicle_transmission=manual&sort=date`;

      console.log(`[Gumtree] Searching: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent
      try {
        const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept Cookies")').first();
        if (await cookieBtn.isVisible({ timeout: 3000 })) {
          await cookieBtn.click();
          await this.delay(1000);
        }
      } catch {
        // No cookie banner
      }

      // Parse listings
      let pageNum = 1;
      const maxPages = 3;

      while (pageNum <= maxPages) {
        const pageListings = await this.parseSearchPage(page, errors);
        listings.push(...pageListings);
        console.log(`[Gumtree] Page ${pageNum}: found ${pageListings.length} listings`);

        // Check for next page
        const nextBtn = page.locator('a[data-q="pagination-next"], a:has-text("Next")').first();
        const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasNext || pageNum >= maxPages) break;

        await nextBtn.click();
        await this.randomDelay(2000, 4000);
        pageNum++;
      }

      await context.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Gumtree scraper error: ${msg}`);
      console.error(`[Gumtree] Error:`, msg);
    } finally {
      if (browser) await browser.close();
    }

    return this.makeResult(listings, errors);
  }

  private async parseSearchPage(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      await page.waitForSelector('article, [data-q="search-result"]', { timeout: 15000 }).catch(() => null);

      const cards = await page.locator('article, [data-q="search-result"]').all();

      for (const card of cards) {
        try {
          const listing = await this.parseCard(card);
          if (listing) listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse Gumtree card: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to parse Gumtree page: ${msg}`);
    }

    return listings;
  }

  private async parseCard(card: import('playwright').Locator): Promise<ScrapedListing | null> {
    const linkEl = card.locator('a[href*="/p/"]').first();
    const href = await linkEl.getAttribute('href').catch(() => null);
    if (!href) return null;

    const url = href.startsWith('http') ? href : `https://www.gumtree.com${href}`;
    const idMatch = href.match(/\/p\/(\d+)/);
    const platformListingId = idMatch ? idMatch[1] : href;

    const title = await card.locator('h2, [data-q="tile-title"]').first().textContent().catch(() => null) || 'Fiat 500';

    const priceText = await card.locator('[data-q="tile-price"], .listing-price').first().textContent().catch(() => '0');
    const price = this.parsePrice(priceText || '0');

    const descText = await card.locator('[data-q="tile-description"], .listing-description').first().textContent().catch(() => '');

    const year = this.extractYear(title) || this.extractYear(descText || '') || 2015;
    const mileage = this.extractMileage(descText || '') || this.extractMileage(title);
    const engineSize = this.extractEngineSize(title + ' ' + (descText || ''));

    const locationText = await card.locator('[data-q="tile-location"], .listing-location').first().textContent().catch(() => null);

    const imgSrc = await card.locator('img').first().getAttribute('src').catch(() => null);

    return {
      platform: 'gumtree',
      platform_listing_id: platformListingId,
      url,
      title: title.trim(),
      price,
      year,
      mileage,
      engine_size: engineSize,
      fuel_type: 'petrol',
      transmission: 'manual',
      colour: null,
      mot_expiry: null,
      seller_name: null,
      seller_type: 'private',
      seller_rating: null,
      location_postcode: this.extractPostcode(locationText || ''),
      description: descText?.trim() || null,
      image_urls: imgSrc ? [imgSrc] : [],
    };
  }

  private parsePrice(text: string): number {
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) * 100 : 0;
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
    if (/1\.0/i.test(text)) return '1.0';
    return '1.2';
  }

  private extractPostcode(text: string): string | null {
    const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i);
    return match ? match[0].toUpperCase() : null;
  }
}

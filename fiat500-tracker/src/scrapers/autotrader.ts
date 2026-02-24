import { chromium, type Browser, type Page } from 'playwright';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class AutoTraderScraper extends BaseScraper {
  platform = 'autotrader';

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

      const priceMin = Math.round(config.budget_min / 100); // pence to pounds
      const priceMax = Math.round(config.budget_max / 100);
      const postcode = encodeURIComponent(config.postcode.replace(/\s+/g, ''));
      const radius = config.search_radius_miles;

      // AutoTrader search URL with Fiat 500 filters
      const searchUrl = `https://www.autotrader.co.uk/car-search?postcode=${postcode}&radius=${radius}&make=Fiat&model=500&price-from=${priceMin}&price-to=${priceMax}&fuel-type=Petrol&transmission=Manual&include-delivery-option=on&sort=relevance`;

      console.log(`[AutoTrader] Searching: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent if present
      try {
        const cookieBtn = page.locator('button:has-text("Accept All")').first();
        if (await cookieBtn.isVisible({ timeout: 3000 })) {
          await cookieBtn.click();
          await this.delay(1000);
        }
      } catch {
        // No cookie banner — continue
      }

      // Parse search results across pages
      let pageNum = 1;
      const maxPages = 5;

      while (pageNum <= maxPages) {
        const pageListings = await this.parseSearchPage(page, errors);
        listings.push(...pageListings);

        console.log(`[AutoTrader] Page ${pageNum}: found ${pageListings.length} listings`);

        // Check for next page
        const nextBtn = page.locator('a[data-testid="pagination-next"]').first();
        const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasNext || pageNum >= maxPages) break;

        await nextBtn.click();
        await this.randomDelay(2000, 4000);
        pageNum++;
      }

      await context.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`AutoTrader scraper error: ${msg}`);
      console.error(`[AutoTrader] Error:`, msg);
    } finally {
      if (browser) await browser.close();
    }

    return this.makeResult(listings, errors);
  }

  private async parseSearchPage(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      // Wait for listing cards to load
      await page.waitForSelector('[data-testid="trader-seller-listing"], [data-testid="private-seller-listing"], article[data-standout-type]', { timeout: 15000 }).catch(() => null);

      const cards = await page.locator('article[data-standout-type], [data-testid="trader-seller-listing"], [data-testid="private-seller-listing"]').all();

      for (const card of cards) {
        try {
          const listing = await this.parseCard(card);
          if (listing) listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse AutoTrader card: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to parse AutoTrader page: ${msg}`);
    }

    return listings;
  }

  private async parseCard(card: import('playwright').Locator): Promise<ScrapedListing | null> {
    // Extract listing URL and ID
    const linkEl = card.locator('a[href*="/car-details/"]').first();
    const href = await linkEl.getAttribute('href').catch(() => null);
    if (!href) return null;

    const url = href.startsWith('http') ? href : `https://www.autotrader.co.uk${href}`;
    const idMatch = href.match(/car-details\/(\d+)/);
    const platformListingId = idMatch ? idMatch[1] : href;

    // Extract title
    const title = await card.locator('h3, [data-testid="listing-title"]').first().textContent().catch(() => null) || 'Fiat 500';

    // Extract price
    const priceText = await card.locator('[data-testid="search-listing-price"], .product-card-pricing__price').first().textContent().catch(() => '0');
    const price = this.parsePrice(priceText || '0');

    // Extract key specs
    const specsText = await card.locator('ul[data-testid="search-listing-specs"], .product-card-details__specs').first().textContent().catch(() => '');

    const year = this.extractYear(title) || this.extractYear(specsText || '') || 2015;
    const mileage = this.extractMileage(specsText || '');
    const engineSize = this.extractEngineSize(title + ' ' + (specsText || ''));

    // Seller info
    const sellerName = await card.locator('[data-testid="search-listing-seller"], .product-card-seller__name').first().textContent().catch(() => null);
    const isDealer = await card.getAttribute('data-testid').catch(() => '') === 'trader-seller-listing' ||
      !!(await card.locator('[data-testid="trader-seller-listing"]').count());

    // Location
    const locationText = await card.locator('[data-testid="search-listing-seller-location"], .product-card-seller__location').first().textContent().catch(() => null);

    // Image
    const imgSrc = await card.locator('img').first().getAttribute('src').catch(() => null);

    return {
      platform: 'autotrader',
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
      seller_name: sellerName?.trim() || null,
      seller_type: isDealer ? 'dealer' : 'private',
      seller_rating: null,
      location_postcode: this.extractPostcode(locationText || ''),
      description: null,
      image_urls: imgSrc ? [imgSrc] : [],
    };
  }

  private parsePrice(text: string): number {
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) * 100 : 0; // convert pounds to pence
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
    return '1.2'; // default for Fiat 500
  }

  private extractPostcode(text: string): string | null {
    const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i);
    return match ? match[0].toUpperCase() : null;
  }
}

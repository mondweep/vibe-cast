import { chromium, type Browser, type Page } from 'playwright';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class MotorsCoUkScraper extends BaseScraper {
  platform = 'motors-co-uk';

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

      // Motors.co.uk search URL for Fiat 500
      const searchUrl = `https://www.motors.co.uk/search/car/fiat/500/?price-from=${priceMin}&price-to=${priceMax}&fuel-type=petrol&transmission=manual&postcode=${postcode}&radius=${radius}&sort=price-asc`;

      console.log(`[Motors.co.uk] Searching: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent if present
      try {
        const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all cookies"), button:has-text("Accept & Close"), button[id*="accept"], #onetrust-accept-btn-handler').first();
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

        console.log(`[Motors.co.uk] Page ${pageNum}: found ${pageListings.length} listings`);

        // Check for next page
        const nextBtn = page.locator('a[aria-label="Next page"], a:has-text("Next"), [data-testid="pagination-next"], .pagination__next').first();
        const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasNext || pageNum >= maxPages) break;

        await nextBtn.click();
        await this.randomDelay(2000, 4000);
        pageNum++;
      }

      console.log(`[Motors.co.uk] Total found: ${listings.length} listings`);
      await context.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Motors.co.uk scraper error: ${msg}`);
      console.error(`[Motors.co.uk] Error:`, msg);
    } finally {
      if (browser) await browser.close();
    }

    return this.makeResult(listings, errors);
  }

  private async parseSearchPage(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      // Wait for listing cards to load — Motors.co.uk uses a card-based layout similar to AutoTrader
      await page.waitForSelector('[data-testid="search-result"], .search-result-card, article[class*="listing"], .vehicle-card', { timeout: 15000 }).catch(() => null);

      const cards = await page.locator('[data-testid="search-result"], .search-result-card, article[class*="listing"], .vehicle-card').all();

      for (const card of cards) {
        try {
          const listing = await this.parseCard(card);
          if (listing) listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse Motors.co.uk card: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to parse Motors.co.uk page: ${msg}`);
    }

    return listings;
  }

  private async parseCard(card: import('playwright').Locator): Promise<ScrapedListing | null> {
    // Extract listing URL and ID
    const linkEl = card.locator('a[href*="/detail/"], a[href*="/car-"], a[href*="/listing/"]').first();
    const href = await linkEl.getAttribute('href').catch(() => null);
    if (!href) return null;

    const url = href.startsWith('http') ? href : `https://www.motors.co.uk${href}`;
    const idMatch = href.match(/\/detail\/(\d+)/) || href.match(/\/car-(\d+)/) || href.match(/\/listing\/([^/?]+)/);
    const platformListingId = idMatch ? idMatch[1] : href.split('/').filter(Boolean).pop() || href;

    // Extract title
    const title = await card.locator('h2, h3, [data-testid="listing-title"], [class*="title"]').first().textContent().catch(() => null) || 'Fiat 500';

    // Extract price
    const priceText = await card.locator('[data-testid="listing-price"], [class*="price"]').first().textContent().catch(() => '0');
    const price = this.parsePrice(priceText || '0');

    // Extract key specs — Motors.co.uk typically shows specs in a list or badges
    const specsText = await card.locator('[data-testid="listing-specs"], [class*="spec"], [class*="key-info"], ul[class*="feature"], ul[class*="spec"]').first().textContent().catch(() => '');

    const year = this.extractYear(title) || this.extractYear(specsText || '') || 2015;
    const mileage = this.extractMileage(specsText || '') || this.extractMileage(title);
    const engineSize = this.extractEngineSize(title + ' ' + (specsText || ''));
    const fuelType = this.extractFuelType(specsText || '');
    const transmission = this.extractTransmission(specsText || '');

    // Seller info
    const sellerName = await card.locator('[data-testid="dealer-name"], [class*="dealer"], [class*="seller"]').first().textContent().catch(() => null);

    // Determine seller type from card content
    const sellerTypeText = await card.locator('[class*="seller-type"], [data-testid="seller-type"]').first().textContent().catch(() => '');
    const isDealer = !sellerTypeText || !sellerTypeText.toLowerCase().includes('private');

    // Location
    const locationText = await card.locator('[data-testid="dealer-location"], [class*="location"], [class*="distance"]').first().textContent().catch(() => null);

    // Seller rating — Motors.co.uk sometimes shows star ratings
    const ratingText = await card.locator('[class*="rating"], [data-testid="dealer-rating"]').first().textContent().catch(() => null);
    const sellerRating = this.extractRating(ratingText || '');

    // Image
    const imgSrc = await card.locator('img').first().getAttribute('src').catch(() => null);

    return {
      platform: 'motors-co-uk',
      platform_listing_id: platformListingId,
      url,
      title: title.trim(),
      price,
      year,
      mileage,
      engine_size: engineSize,
      fuel_type: fuelType,
      transmission,
      colour: null,
      mot_expiry: null,
      seller_name: sellerName?.trim() || null,
      seller_type: isDealer ? 'dealer' : 'private',
      seller_rating: sellerRating,
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

  private extractTransmission(text: string): string {
    if (/\bauto(matic)?\b/i.test(text)) return 'automatic';
    return 'manual'; // default based on search filter
  }

  private extractFuelType(text: string): string {
    if (/\bdiesel\b/i.test(text)) return 'diesel';
    if (/\belectric\b/i.test(text)) return 'electric';
    if (/\bhybrid\b/i.test(text)) return 'hybrid';
    return 'petrol'; // default based on search filter
  }

  private extractRating(text: string): number | null {
    if (!text) return null;
    // Extract star rating (e.g. "4.5 stars", "4.5/5", "4.5 out of 5")
    const match = text.match(/([\d.]+)\s*(?:\/\s*5|stars?|out\s+of\s+5)/i);
    if (match) {
      const rating = parseFloat(match[1]);
      // Normalise to 0-100 scale
      return Math.round((rating / 5) * 100);
    }
    // Try plain number
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num >= 0 && num <= 5) {
      return Math.round((num / 5) * 100);
    }
    return null;
  }

  private extractPostcode(text: string): string | null {
    const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i);
    return match ? match[0].toUpperCase() : null;
  }
}

import { chromium, type Browser, type Page } from 'playwright';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class EbayMotorsScraper extends BaseScraper {
  platform = 'ebay-motors';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      const priceMin = Math.round(config.budget_min / 100); // pence to pounds
      const priceMax = Math.round(config.budget_max / 100);
      const postcode = encodeURIComponent(config.postcode.replace(/\s+/g, ''));
      const radius = config.search_radius_miles;

      // eBay Motors UK search URL for Fiat 500 manual petrol
      const searchUrl = `https://www.ebay.co.uk/sch/Cars/9801/i.html?_nkw=fiat+500+manual+petrol&_udlo=${priceMin}&_udhi=${priceMax}&_stpos=${postcode}&_sadis=${radius}&_sop=12&LH_PrefLoc=99&_dmd=1`;

      console.log(`[eBay Motors] Searching: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent if present
      try {
        const cookieBtn = page.locator('button#gdpr-banner-accept, button:has-text("Accept all"), button:has-text("Accept cookies")').first();
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

        console.log(`[eBay Motors] Page ${pageNum}: found ${pageListings.length} listings`);

        // Check for next page
        const nextBtn = page.locator('a.pagination__next, a[aria-label="Go to next search page"], nav a:has-text("Next")').first();
        const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasNext || pageNum >= maxPages) break;

        await nextBtn.click();
        await this.randomDelay(2000, 4000);
        pageNum++;
      }

      console.log(`[eBay Motors] Total found: ${listings.length} listings`);
      await context.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`eBay Motors scraper error: ${msg}`);
      console.error(`[eBay Motors] Error:`, msg);
    } finally {
      if (browser) await browser.close();
    }

    return this.makeResult(listings, errors);
  }

  private async parseSearchPage(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      // Wait for listing cards to load
      await page.waitForSelector('.s-item, li[data-viewport], .srp-results .s-item__wrapper', { timeout: 15000 }).catch(() => null);

      const cards = await page.locator('.s-item, li[data-viewport]').all();

      for (const card of cards) {
        try {
          const listing = await this.parseCard(card);
          if (listing) listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse eBay Motors card: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to parse eBay Motors page: ${msg}`);
    }

    return listings;
  }

  private async parseCard(card: import('playwright').Locator): Promise<ScrapedListing | null> {
    // Extract listing URL and ID
    const linkEl = card.locator('a.s-item__link, a[href*="ebay.co.uk/itm/"]').first();
    const href = await linkEl.getAttribute('href').catch(() => null);
    if (!href || href.includes('null')) return null;

    // eBay item IDs are numeric in the URL path
    const idMatch = href.match(/\/itm\/(\d+)/);
    const platformListingId = idMatch ? idMatch[1] : href;

    // Skip the "Shop on eBay" placeholder card
    if (platformListingId === href && !idMatch) return null;

    // Extract title
    const title = await card.locator('.s-item__title, h3').first().textContent().catch(() => null) || '';
    if (!title || title.toLowerCase().includes('shop on ebay')) return null;

    // Filter out non-Fiat 500 results
    const titleLower = title.toLowerCase();
    if (!titleLower.includes('fiat') && !titleLower.includes('500')) return null;

    // Extract price — handle both Buy It Now and Auction
    const priceText = await card.locator('.s-item__price, .s-item__detail--primary').first().textContent().catch(() => '0');
    const price = this.parsePrice(priceText || '0');
    if (price === 0) return null;

    // Detect listing type (Auction vs Buy It Now)
    const listingTypeText = await card.locator('.s-item__purchase-options, .s-item__bids, .s-item__time-left').first().textContent().catch(() => '');
    const isAuction = this.isAuctionListing(listingTypeText || '');

    // Extract subtitle / details
    const subtitleText = await card.locator('.s-item__subtitle, .s-item__details').first().textContent().catch(() => '');

    // Extract location
    const locationText = await card.locator('.s-item__location, .s-item__itemLocation').first().textContent().catch(() => null);
    const cleanLocation = locationText ? locationText.replace(/^from\s+/i, '').trim() : null;

    // Extract image
    const imgSrc = await card.locator('img.s-item__image-img, img').first().getAttribute('src').catch(() => null);

    // Combine title + subtitle for year/mileage/engine extraction
    const combinedText = `${title} ${subtitleText || ''}`;

    const year = this.extractYear(combinedText) || 2015;
    const mileage = this.extractMileage(combinedText);
    const engineSize = this.extractEngineSize(combinedText);
    const transmission = this.extractTransmission(combinedText);
    const fuelType = this.extractFuelType(combinedText);
    const colour = this.extractColour(combinedText);

    // Build description noting if auction
    const description = isAuction
      ? `Auction listing. ${(subtitleText || '').trim()}`
      : (subtitleText || '').trim() || null;

    return {
      platform: 'ebay-motors',
      platform_listing_id: platformListingId,
      url: href.split('?')[0], // Clean URL without tracking params
      title: title.trim(),
      price,
      year,
      mileage,
      engine_size: engineSize,
      fuel_type: fuelType,
      transmission,
      colour,
      mot_expiry: null,
      seller_name: null,
      seller_type: 'private', // eBay defaults to private unless clearly a dealer
      seller_rating: null,
      location_postcode: this.extractPostcode(cleanLocation || ''),
      description,
      image_urls: imgSrc && !imgSrc.includes('s-l225') ? [imgSrc] : imgSrc ? [imgSrc] : [],
    };
  }

  private isAuctionListing(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('bid') || lower.includes('auction') || lower.includes('time left');
  }

  private parsePrice(text: string): number {
    // eBay may show "£3,500.00" or a range like "£3,000.00 to £4,000.00"
    // Take the first price found
    const match = text.match(/£([\d,]+(?:\.\d{2})?)/);
    if (!match) {
      const cleaned = text.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return num && !isNaN(num) ? Math.round(num * 100) : 0;
    }
    const pounds = parseFloat(match[1].replace(/,/g, ''));
    return Math.round(pounds * 100); // convert pounds to pence
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

  private extractColour(text: string): string | null {
    const colours = [
      'white', 'black', 'silver', 'grey', 'gray', 'blue', 'red',
      'green', 'yellow', 'orange', 'purple', 'pink', 'beige',
      'brown', 'gold', 'cream', 'bronze', 'burgundy',
    ];
    const lower = text.toLowerCase();
    for (const colour of colours) {
      if (lower.includes(colour)) return colour;
    }
    return null;
  }

  private extractPostcode(text: string): string | null {
    const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i);
    return match ? match[0].toUpperCase() : null;
  }
}

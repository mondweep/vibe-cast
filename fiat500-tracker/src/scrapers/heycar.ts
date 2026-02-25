import { chromium, type Browser, type Page } from 'playwright';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class HeycarScraper extends BaseScraper {
  platform = 'heycar';

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

      // Heycar search URL for Fiat 500
      const searchUrl = `https://www.heycar.co.uk/used-cars/fiat/500?price-from=${priceMin}&price-to=${priceMax}&fuel-type=petrol&transmission=manual&postcode=${postcode}&radius=${radius}&sort=price-asc`;

      console.log(`[Heycar] Searching: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent if present
      try {
        const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all cookies"), button:has-text("Accept & Close"), button[id*="accept"]').first();
        if (await cookieBtn.isVisible({ timeout: 3000 })) {
          await cookieBtn.click();
          await this.delay(1000);
        }
      } catch {
        // No cookie banner — continue
      }

      // Try extracting from structured data (JSON-LD) first
      const structuredListings = await this.extractStructuredData(page, errors);
      if (structuredListings.length > 0) {
        listings.push(...structuredListings);
        console.log(`[Heycar] Extracted ${structuredListings.length} listings from structured data`);
      }

      // Also parse search result cards from the DOM
      let pageNum = 1;
      const maxPages = 5;

      while (pageNum <= maxPages) {
        const pageListings = await this.parseSearchPage(page, errors);

        // Avoid duplicates with structured data results
        for (const pl of pageListings) {
          const isDuplicate = listings.some(
            l => l.platform_listing_id === pl.platform_listing_id,
          );
          if (!isDuplicate) listings.push(pl);
        }

        console.log(`[Heycar] Page ${pageNum}: found ${pageListings.length} listings`);

        // Check for next page
        const nextBtn = page.locator('a[aria-label="Next page"], button:has-text("Next"), a:has-text("Next"), [data-testid="pagination-next"]').first();
        const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasNext || pageNum >= maxPages) break;

        await nextBtn.click();
        await this.randomDelay(2000, 4000);
        pageNum++;
      }

      console.log(`[Heycar] Total found: ${listings.length} listings`);
      await context.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Heycar scraper error: ${msg}`);
      console.error(`[Heycar] Error:`, msg);
    } finally {
      if (browser) await browser.close();
    }

    return this.makeResult(listings, errors);
  }

  private async extractStructuredData(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      // Heycar often embeds JSON-LD structured data for vehicle listings
      const scripts = await page.locator('script[type="application/ld+json"]').all();

      for (const script of scripts) {
        try {
          const content = await script.textContent().catch(() => null);
          if (!content) continue;

          const data = JSON.parse(content);

          // Handle single object or array
          const items = Array.isArray(data) ? data : [data];

          for (const item of items) {
            if (item['@type'] === 'Car' || item['@type'] === 'Vehicle' || item['@type'] === 'Product') {
              const listing = this.mapJsonLd(item);
              if (listing) listings.push(listing);
            }

            // Handle ItemList with ListItem entries
            if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
              for (const listItem of item.itemListElement) {
                const vehicle = listItem.item || listItem;
                if (vehicle['@type'] === 'Car' || vehicle['@type'] === 'Vehicle' || vehicle['@type'] === 'Product') {
                  const listing = this.mapJsonLd(vehicle);
                  if (listing) listings.push(listing);
                }
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Heycar JSON-LD parse error: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Heycar structured data extraction error: ${msg}`);
    }

    return listings;
  }

  private mapJsonLd(item: Record<string, unknown>): ScrapedListing | null {
    const name = String(item.name || '');
    const url = String(item.url || '');
    if (!url && !name) return null;

    const fullUrl = url.startsWith('http') ? url : `https://www.heycar.co.uk${url}`;
    const idMatch = fullUrl.match(/\/vehicle\/([^/?]+)/);
    const platformListingId = idMatch ? idMatch[1] : url.split('/').pop() || url;

    // Extract price from offers
    const offers = item.offers as Record<string, unknown> | undefined;
    const rawPrice = offers ? Number(offers.price || 0) : 0;
    const price = rawPrice * 100; // pounds to pence

    // Extract vehicle details
    const modelDate = Number(item.modelDate || item.vehicleModelDate || item.productionDate || 0);

    const mileageObj = item.mileageFromOdometer as Record<string, unknown> | undefined;
    const mileage = mileageObj ? Number(mileageObj.value || 0) : 0;

    const fuelType = String(item.fuelType || 'petrol').toLowerCase();
    const transmission = String(item.vehicleTransmission || 'manual').toLowerCase();
    const colour = item.color ? String(item.color) : null;

    const imageUrl = typeof item.image === 'string'
      ? item.image
      : Array.isArray(item.image) && item.image.length > 0
        ? String(item.image[0])
        : null;

    return {
      platform: 'heycar',
      platform_listing_id: platformListingId,
      url: fullUrl,
      title: name || 'Fiat 500',
      price,
      year: modelDate || this.extractYear(name) || 2015,
      mileage,
      engine_size: this.extractEngineSize(name),
      fuel_type: fuelType.includes('petrol') ? 'petrol' : fuelType.includes('diesel') ? 'diesel' : fuelType,
      transmission: transmission.includes('manual') ? 'manual' : transmission.includes('auto') ? 'automatic' : transmission,
      colour,
      mot_expiry: null,
      seller_name: null,
      seller_type: 'dealer', // Heycar only lists dealer cars
      seller_rating: null,
      location_postcode: null,
      description: item.description ? String(item.description) : null,
      image_urls: imageUrl ? [imageUrl] : [],
    };
  }

  private async parseSearchPage(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      // Wait for listing cards to load
      await page.waitForSelector('[data-testid="vehicle-card"], article[class*="card"], [class*="search-result"], [class*="listing-card"]', { timeout: 15000 }).catch(() => null);

      const cards = await page.locator('[data-testid="vehicle-card"], article[class*="card"], [class*="search-result-card"], [class*="listing-card"]').all();

      for (const card of cards) {
        try {
          const listing = await this.parseCard(card);
          if (listing) listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse Heycar card: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to parse Heycar page: ${msg}`);
    }

    return listings;
  }

  private async parseCard(card: import('playwright').Locator): Promise<ScrapedListing | null> {
    // Extract listing URL and ID
    const linkEl = card.locator('a[href*="/vehicle/"], a[href*="/used-cars/"]').first();
    const href = await linkEl.getAttribute('href').catch(() => null);
    if (!href) return null;

    const url = href.startsWith('http') ? href : `https://www.heycar.co.uk${href}`;
    const idMatch = href.match(/\/vehicle\/([^/?]+)/);
    const platformListingId = idMatch ? idMatch[1] : href.split('/').pop() || href;

    // Extract title
    const title = await card.locator('h2, h3, [data-testid="vehicle-title"], [class*="title"]').first().textContent().catch(() => null) || 'Fiat 500';

    // Extract price
    const priceText = await card.locator('[data-testid="vehicle-price"], [class*="price"]').first().textContent().catch(() => '0');
    const price = this.parsePrice(priceText || '0');

    // Extract key specs — Heycar typically shows specs in a structured list
    const specsText = await card.locator('[data-testid="vehicle-specs"], [class*="spec"], [class*="key-info"], ul').first().textContent().catch(() => '');

    const year = this.extractYear(title) || this.extractYear(specsText || '') || 2015;
    const mileage = this.extractMileage(specsText || '') || this.extractMileage(title);
    const engineSize = this.extractEngineSize(title + ' ' + (specsText || ''));
    const fuelType = this.extractFuelType(specsText || '');
    const transmission = this.extractTransmission(specsText || '');

    // Seller info — Heycar is dealer-only
    const sellerName = await card.locator('[data-testid="dealer-name"], [class*="dealer"], [class*="seller"]').first().textContent().catch(() => null);

    // Location
    const locationText = await card.locator('[data-testid="dealer-location"], [class*="location"], [class*="distance"]').first().textContent().catch(() => null);

    // Image
    const imgSrc = await card.locator('img').first().getAttribute('src').catch(() => null);

    return {
      platform: 'heycar',
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
      seller_type: 'dealer', // Heycar only lists dealer cars
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

  private extractPostcode(text: string): string | null {
    const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i);
    return match ? match[0].toUpperCase() : null;
  }
}

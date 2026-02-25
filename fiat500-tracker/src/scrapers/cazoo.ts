import { chromium, type Browser, type Page } from 'playwright';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class CazooScraper extends BaseScraper {
  platform = 'cazoo';

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

      const searchUrl = `https://www.cazoo.co.uk/cars/fiat/500/?budget-from=${priceMin}&budget-to=${priceMax}&fuel-type=petrol&gearbox=manual`;

      console.log(`[Cazoo] Searching: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent if present
      try {
        const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all cookies"), button[id*="accept"]').first();
        if (await cookieBtn.isVisible({ timeout: 3000 })) {
          await cookieBtn.click();
          await this.delay(1000);
        }
      } catch {
        // No cookie banner — continue
      }

      // Cazoo is a Next.js app — try to extract __NEXT_DATA__ first
      const nextDataListings = await this.extractFromNextData(page, errors);

      if (nextDataListings.length > 0) {
        listings.push(...nextDataListings);
        console.log(`[Cazoo] Extracted ${nextDataListings.length} listings from __NEXT_DATA__`);
      } else {
        // Fallback: try React hydration data or other embedded JSON
        const hydrationListings = await this.extractFromHydrationData(page, errors);

        if (hydrationListings.length > 0) {
          listings.push(...hydrationListings);
          console.log(`[Cazoo] Extracted ${hydrationListings.length} listings from hydration data`);
        } else {
          // Last resort: parse the rendered DOM
          let pageNum = 1;
          const maxPages = 5;

          while (pageNum <= maxPages) {
            const pageListings = await this.parseSearchPage(page, errors);
            listings.push(...pageListings);
            console.log(`[Cazoo] Page ${pageNum}: found ${pageListings.length} listings`);

            // Check for next page
            const nextBtn = page.locator('a[aria-label="Next page"], button:has-text("Next"), [data-testid="pagination-next"]').first();
            const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

            if (!hasNext || pageNum >= maxPages) break;

            await nextBtn.click();
            await this.randomDelay(2000, 4000);
            pageNum++;
          }
        }
      }

      console.log(`[Cazoo] Total found: ${listings.length} listings`);
      await context.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Cazoo scraper error: ${msg}`);
      console.error(`[Cazoo] Error:`, msg);
    } finally {
      if (browser) await browser.close();
    }

    return this.makeResult(listings, errors);
  }

  private async extractFromNextData(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      const nextDataContent = await page.locator('script#__NEXT_DATA__').textContent().catch(() => null);
      if (!nextDataContent) return listings;

      const nextData = JSON.parse(nextDataContent);

      // Navigate through Next.js page props to find vehicle listings
      const pageProps = nextData?.props?.pageProps;
      if (!pageProps) return listings;

      // Cazoo may store results in various locations within pageProps
      const vehicles = pageProps.searchResults?.vehicles
        || pageProps.vehicles
        || pageProps.results?.vehicles
        || pageProps.data?.vehicles
        || [];

      for (const vehicle of vehicles) {
        try {
          const listing = this.mapNextDataVehicle(vehicle);
          if (listing) listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Cazoo __NEXT_DATA__ vehicle parse error: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Cazoo __NEXT_DATA__ parse error: ${msg}`);
    }

    return listings;
  }

  private async extractFromHydrationData(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      // Some React apps embed data in script tags with type="application/json"
      // or in __APOLLO_STATE__, __RELAY_STORE__, etc.
      const pageContent = await page.content();

      // Try __APOLLO_STATE__ pattern
      const apolloMatch = pageContent.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
      if (apolloMatch) {
        try {
          const apolloData = JSON.parse(apolloMatch[1]);
          for (const key of Object.keys(apolloData)) {
            if (key.startsWith('Vehicle:') || key.startsWith('SearchResult:')) {
              const vehicle = apolloData[key];
              const listing = this.mapHydrationVehicle(vehicle);
              if (listing) listings.push(listing);
            }
          }
        } catch {
          // Apollo state parse failed — continue
        }
      }

      // Try generic embedded JSON with vehicle data
      const jsonMatches = pageContent.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of jsonMatches) {
        try {
          const data = JSON.parse(m[1]);
          const vehicles = this.findVehiclesInObject(data);
          for (const vehicle of vehicles) {
            const listing = this.mapHydrationVehicle(vehicle);
            if (listing) listings.push(listing);
          }
        } catch {
          // Skip unparseable JSON
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Cazoo hydration data parse error: ${msg}`);
    }

    return listings;
  }

  private findVehiclesInObject(obj: unknown, depth = 0): Record<string, unknown>[] {
    const vehicles: Record<string, unknown>[] = [];
    if (depth > 5 || !obj || typeof obj !== 'object') return vehicles;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (this.looksLikeVehicle(item)) {
          vehicles.push(item as Record<string, unknown>);
        } else {
          vehicles.push(...this.findVehiclesInObject(item, depth + 1));
        }
      }
    } else {
      const record = obj as Record<string, unknown>;
      if (this.looksLikeVehicle(record)) {
        vehicles.push(record);
      }
      for (const value of Object.values(record)) {
        vehicles.push(...this.findVehiclesInObject(value, depth + 1));
      }
    }

    return vehicles;
  }

  private looksLikeVehicle(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;
    const record = obj as Record<string, unknown>;
    // Check for common vehicle-like properties
    return !!(
      (record.make || record.manufacturer) &&
      (record.price || record.currentPrice || record.salePrice) &&
      (record.mileage || record.odometer || record.miles)
    );
  }

  private mapNextDataVehicle(vehicle: Record<string, unknown>): ScrapedListing | null {
    const id = String(vehicle.id || vehicle.stockId || vehicle.vehicleId || '');
    if (!id) return null;

    const slug = String(vehicle.slug || vehicle.url || '');
    const url = slug.startsWith('http') ? slug : `https://www.cazoo.co.uk/cars/${slug || id}`;

    const make = String(vehicle.make || 'Fiat');
    const model = String(vehicle.model || '500');
    const year = Number(vehicle.year || vehicle.registrationYear || 0);
    const variant = String(vehicle.variant || vehicle.trim || '');
    const title = vehicle.title
      ? String(vehicle.title)
      : `${year || ''} ${make} ${model} ${variant}`.trim();

    const rawPrice = Number(vehicle.price || vehicle.currentPrice || vehicle.salePrice || 0);
    const price = rawPrice * 100; // pounds to pence

    const rawMileage = Number(vehicle.mileage || vehicle.odometer || vehicle.miles || 0);

    const colour = vehicle.colour || vehicle.color || vehicle.exteriorColour || null;
    const fuelType = String(vehicle.fuelType || vehicle.fuel || 'petrol').toLowerCase();
    const transmission = String(vehicle.transmission || vehicle.gearbox || 'manual').toLowerCase();

    const images: string[] = [];
    if (Array.isArray(vehicle.images)) {
      for (const img of vehicle.images) {
        if (typeof img === 'string') images.push(img);
        else if (img && typeof img === 'object') {
          const imgObj = img as Record<string, unknown>;
          const imgUrl = imgObj.url || imgObj.src || imgObj.uri;
          if (typeof imgUrl === 'string') images.push(imgUrl);
        }
      }
    } else if (typeof vehicle.mainImage === 'string') {
      images.push(vehicle.mainImage);
    } else if (typeof vehicle.imageUrl === 'string') {
      images.push(vehicle.imageUrl);
    }

    return {
      platform: 'cazoo',
      platform_listing_id: id,
      url,
      title,
      price,
      year: year || 2015,
      mileage: rawMileage,
      engine_size: this.extractEngineSize(title + ' ' + variant),
      fuel_type: fuelType.includes('petrol') ? 'petrol' : fuelType.includes('diesel') ? 'diesel' : fuelType,
      transmission: transmission.includes('manual') ? 'manual' : transmission.includes('auto') ? 'automatic' : transmission,
      colour: colour ? String(colour) : null,
      mot_expiry: null,
      seller_name: 'Cazoo',
      seller_type: 'dealer',
      seller_rating: null,
      location_postcode: null,
      description: vehicle.description ? String(vehicle.description) : null,
      image_urls: images,
    };
  }

  private mapHydrationVehicle(vehicle: Record<string, unknown>): ScrapedListing | null {
    const id = String(vehicle.id || vehicle.stockId || vehicle.vehicleId || '');
    if (!id) return null;

    const url = `https://www.cazoo.co.uk/cars/${id}`;

    const make = String(vehicle.make || vehicle.manufacturer || 'Fiat');
    const model = String(vehicle.model || '500');
    const year = Number(vehicle.year || vehicle.registrationYear || 0);
    const title = `${year || ''} ${make} ${model}`.trim();

    const rawPrice = Number(vehicle.price || vehicle.currentPrice || vehicle.salePrice || 0);
    const price = rawPrice * 100; // pounds to pence

    const rawMileage = Number(vehicle.mileage || vehicle.odometer || vehicle.miles || 0);

    return {
      platform: 'cazoo',
      platform_listing_id: id,
      url,
      title,
      price,
      year: year || 2015,
      mileage: rawMileage,
      engine_size: this.extractEngineSize(title),
      fuel_type: 'petrol',
      transmission: 'manual',
      colour: vehicle.colour ? String(vehicle.colour) : null,
      mot_expiry: null,
      seller_name: 'Cazoo',
      seller_type: 'dealer',
      seller_rating: null,
      location_postcode: null,
      description: null,
      image_urls: [],
    };
  }

  private async parseSearchPage(page: Page, errors: string[]): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      await page.waitForSelector('[data-testid="vehicle-card"], [class*="vehicle-card"], article, [class*="listing-card"]', { timeout: 15000 }).catch(() => null);

      const cards = await page.locator('[data-testid="vehicle-card"], [class*="vehicle-card"], article, [class*="listing-card"]').all();

      for (const card of cards) {
        try {
          const listing = await this.parseCard(card);
          if (listing) listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to parse Cazoo card: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to parse Cazoo page: ${msg}`);
    }

    return listings;
  }

  private async parseCard(card: import('playwright').Locator): Promise<ScrapedListing | null> {
    const linkEl = card.locator('a[href*="/cars/"]').first();
    const href = await linkEl.getAttribute('href').catch(() => null);
    if (!href) return null;

    const url = href.startsWith('http') ? href : `https://www.cazoo.co.uk${href}`;
    const idMatch = href.match(/\/cars\/([^/?]+)/);
    const platformListingId = idMatch ? idMatch[1] : href;

    const title = await card.locator('h2, h3, [data-testid="vehicle-title"], [class*="title"]').first().textContent().catch(() => null) || 'Fiat 500';

    const priceText = await card.locator('[data-testid="vehicle-price"], [class*="price"]').first().textContent().catch(() => '0');
    const price = this.parsePrice(priceText || '0');

    const specsText = await card.locator('[data-testid="vehicle-specs"], [class*="spec"], [class*="key-info"]').first().textContent().catch(() => '');

    const year = this.extractYear(title) || this.extractYear(specsText || '') || 2015;
    const mileage = this.extractMileage(specsText || '') || this.extractMileage(title);
    const engineSize = this.extractEngineSize(title + ' ' + (specsText || ''));

    const imgSrc = await card.locator('img').first().getAttribute('src').catch(() => null);

    return {
      platform: 'cazoo',
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
      seller_name: 'Cazoo',
      seller_type: 'dealer',
      seller_rating: null,
      location_postcode: null,
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
}

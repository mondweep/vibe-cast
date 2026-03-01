import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class HeycarScraper extends BaseScraper {
  platform = 'heycar';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];

    try {
      // Heycar is a Next.js RSC app that embeds listing data in plpEvents within
      // self.__next_f.push() script chunks. We can extract these via plain fetch.
      const lat = config.latitude || 51.385117;
      const lon = config.longitude || 0.378817;
      const postcode = encodeURIComponent(config.postcode);

      const searchUrl = `https://heycar.com/uk/autos/make/fiat/model/500?stock-condition=used&sort=i15_uk_elo&lat=${lat}&lon=${lon}&postcode=${postcode}`;

      console.log(`[Heycar] Fetching: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      });

      if (!response.ok) {
        errors.push(`Heycar HTTP ${response.status}`);
        return this.makeResult(listings, errors);
      }

      const html = await response.text();
      console.log(`[Heycar] Got ${html.length} bytes of HTML`);

      // Extract plpEvents from RSC script chunks
      const events = this.extractPlpEvents(html);

      if (events.length === 0) {
        errors.push('Heycar: could not extract plpEvents from page');
        return this.makeResult(listings, errors);
      }

      const priceMin = config.budget_min; // pence
      const priceMax = config.budget_max;

      console.log(`[Heycar] Found ${events.length} listings in plpEvents`);

      for (const event of events) {
        const data = event.data;
        if (!data) continue;

        const listing = this.mapEvent(data);
        if (!listing) continue;

        // Filter by budget
        if (listing.price < priceMin || listing.price > priceMax) continue;

        listings.push(listing);
      }

      console.log(`[Heycar] ${listings.length} listings within budget`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Heycar scraper error: ${msg}`);
      console.error('[Heycar] Error:', msg);
    }

    return this.makeResult(listings, errors);
  }

  private extractPlpEvents(html: string): HeycarPlpEvent[] {
    // RSC data is embedded in self.__next_f.push([1,"..."]) calls
    // The plpEvents array is inside one of these chunks
    const regex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      let chunk: string;
      try {
        chunk = JSON.parse(`"${match[1]}"`); // unescape the string
      } catch {
        continue;
      }

      if (!chunk.includes('plpEvents')) continue;

      // Find the plpEvents JSON array within the chunk
      const eventsIdx = chunk.indexOf('"plpEvents"');
      if (eventsIdx === -1) continue;

      // Find the opening bracket
      const bracketIdx = chunk.indexOf('[', eventsIdx);
      if (bracketIdx === -1) continue;

      // Walk to find matching closing bracket
      let depth = 0;
      let end = -1;
      for (let i = bracketIdx; i < chunk.length; i++) {
        if (chunk[i] === '[') depth++;
        else if (chunk[i] === ']') {
          depth--;
          if (depth === 0) { end = i + 1; break; }
        }
      }

      if (end === -1) continue;

      const eventsJson = chunk.slice(bracketIdx, end);
      try {
        const events = JSON.parse(eventsJson) as HeycarPlpEvent[];
        if (Array.isArray(events) && events.length > 0) {
          return events;
        }
      } catch {
        // Try to fix common RSC serialization quirks
        const cleaned = eventsJson.replace(/"\$undefined"/g, 'null');
        try {
          const events = JSON.parse(cleaned) as HeycarPlpEvent[];
          if (Array.isArray(events)) return events;
        } catch {
          continue;
        }
      }
    }

    return [];
  }

  private mapEvent(data: HeycarEventData): ScrapedListing | null {
    const id = data.listing_id;
    if (!id) return null;

    const price = (data.price || 0) * 100; // pounds to pence
    if (price === 0) return null;

    const year = data.year || 0;
    const variant = data.variant || '';
    const title = `${year} ${data.vehicle_name || 'Fiat 500'} ${variant}`.trim();

    const url = `https://heycar.com/uk/autos/detail/${id}`;

    return {
      platform: 'heycar',
      platform_listing_id: id,
      url,
      title,
      price,
      year: year || 2015,
      mileage: data.mileage || 0,
      engine_size: this.extractEngineSize(variant),
      fuel_type: this.extractFuelType(variant),
      transmission: this.extractTransmission(variant),
      colour: data.colour || null,
      mot_expiry: null,
      seller_name: data.advertiser_id ? `Heycar dealer ${data.advertiser_id}` : null,
      seller_type: 'dealer',
      seller_rating: null,
      location_postcode: null,
      description: variant || null,
      image_urls: [],
    };
  }

  private extractEngineSize(text: string): string {
    if (/0\.9|twinair/i.test(text)) return '0.9';
    if (/1\.2/i.test(text)) return '1.2';
    if (/1\.4/i.test(text)) return '1.4';
    if (/1\.0/i.test(text)) return '1.0';
    return '1.2';
  }

  private extractFuelType(text: string): string {
    if (/\bdiesel\b/i.test(text)) return 'diesel';
    if (/\belectric\b/i.test(text)) return 'electric';
    if (/\bhybrid\b/i.test(text)) return 'hybrid';
    return 'petrol';
  }

  private extractTransmission(text: string): string {
    if (/\bauto(matic)?\b/i.test(text)) return 'automatic';
    return 'manual';
  }
}

// ── Types ──────────────────────────────────────────────────────────────

interface HeycarPlpEvent {
  schema?: string;
  data?: HeycarEventData;
}

interface HeycarEventData {
  advertiser_id?: string;
  body_style?: string;
  colour?: string;
  condition?: string;
  created_at?: string;
  listing_id?: string;
  make?: string;
  mileage?: number;
  model?: string;
  monthly_price?: number;
  price?: number;
  registration?: string;
  variant?: string;
  vehicle_name?: string;
  vin?: string;
  year?: number;
  vehicle_available?: boolean;
}

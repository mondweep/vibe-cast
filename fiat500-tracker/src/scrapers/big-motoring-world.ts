import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class BigMotoringWorldScraper extends BaseScraper {
  platform = 'bigmotoringworld';

  private readonly BASE_URL = 'https://www.bigmotoringworld.co.uk';
  private readonly API_PATH = '/API/stock/search';
  private readonly PAGE_SIZE = 10;

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];

    try {
      const priceMin = Math.round(config.budget_min / 100); // pence to pounds
      const priceMax = Math.round(config.budget_max / 100);

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({
          makes: 'Fiat',
          models: '500',
          minFullPrice: String(priceMin),
          maxFullPrice: String(priceMax),
          page: String(page),
        });

        const url = `${this.BASE_URL}${this.API_PATH}?${params}`;
        console.log(`[BigMotoringWorld] Fetching page ${page}: ${url}`);

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          errors.push(`BigMotoringWorld HTTP ${response.status} on page ${page}`);
          break;
        }

        const data: BMWSearchResponse = await response.json();

        if (!data.Cars || !Array.isArray(data.Cars)) {
          errors.push('BigMotoringWorld: unexpected response shape — no Cars array');
          break;
        }

        console.log(`[BigMotoringWorld] Page ${page}: ${data.Cars.length} cars (total: ${data.TotalCount ?? '?'})`);

        for (const car of data.Cars) {
          const listing = this.mapCar(car);
          if (listing) listings.push(listing);
        }

        hasMore = data.HasMoreCars === true;
        page++;

        // Safety limit — Big Motoring World typically has <100 Fiat 500s
        if (page > 20) {
          console.log('[BigMotoringWorld] Hit page limit, stopping');
          break;
        }

        if (hasMore) await this.randomDelay(500, 1200);
      }

      console.log(`[BigMotoringWorld] Found ${listings.length} listings total`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`BigMotoringWorld scraper error: ${msg}`);
      console.error('[BigMotoringWorld] Error:', msg);
    }

    return this.makeResult(listings, errors);
  }

  private mapCar(car: BMWCar): ScrapedListing | null {
    const id = car.StockNumber;
    if (!id) return null;

    const price = Math.round((car.AskingPrice || 0) * 100); // pounds to pence
    if (price === 0) return null;

    const year = car.DateRegistered
      ? new Date(car.DateRegistered).getFullYear()
      : this.extractYearFromString(car.YearString);

    const title = car.HeadlineCaption
      || `${car.YearString || year || ''} Fiat 500 ${car.Spec || ''}`.trim();

    const url = car.WebsiteURL
      ? `${this.BASE_URL}${car.WebsiteURL}`
      : `${this.BASE_URL}/used-cars/fiat/500/`;

    const images: string[] = [];
    if (car.SliderImages && Array.isArray(car.SliderImages)) {
      for (const img of car.SliderImages) {
        if (img.ClearImage && !img.ClearImage.includes('ComingSoon')) {
          images.push(img.ClearImage);
        }
      }
    }
    if (images.length === 0 && car.MainThumbnailImage && !car.MainThumbnailImage.includes('ComingSoon')) {
      images.push(car.MainThumbnailImage);
    }

    const motExpiry = car.MOTExpiry ? this.parseMOTDate(car.MOTExpiry) : null;

    return {
      platform: 'bigmotoringworld',
      platform_listing_id: String(id),
      url,
      title,
      price,
      year: year || 2015,
      mileage: car.Mileage || 0,
      engine_size: car.EnginePower ? String(car.EnginePower) : '1.2',
      fuel_type: this.normalizeFuel(car.Fuel || 'Petrol'),
      transmission: this.normalizeTransmission(car.Transmission || 'Manual'),
      colour: car.Colour || null,
      mot_expiry: motExpiry,
      seller_name: `Big Motoring World ${car.DisplayLocation || ''}`.trim(),
      seller_type: 'dealer',
      seller_rating: this.mapPriceLabel(car.PriceLabel),
      location_postcode: null,
      description: car.KeyFeaturesString || null,
      image_urls: images,
    };
  }

  private extractYearFromString(yearStr: string | undefined): number | null {
    if (!yearStr) return null;
    const match = yearStr.match(/\b(20[0-2]\d)\b/);
    return match ? parseInt(match[1], 10) : null;
  }

  /** MOT dates come as "DD-MM-YYYY" e.g. "17-03-2027" — convert to ISO */
  private parseMOTDate(mot: string): string | null {
    const parts = mot.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }

  private mapPriceLabel(label: string | undefined): number | null {
    if (!label) return null;
    const map: Record<string, number> = {
      'Amazing': 95,
      'Great': 85,
      'Good': 70,
      'Fair': 55,
      'Above Average': 40,
      'High': 30,
    };
    return map[label] ?? 50;
  }

  private normalizeFuel(fuel: string): string {
    const lower = fuel.toLowerCase();
    if (lower.includes('petrol') || lower.includes('gasoline')) return 'petrol';
    if (lower.includes('diesel')) return 'diesel';
    if (lower.includes('electric')) return 'electric';
    if (lower.includes('hybrid')) return 'hybrid';
    return 'petrol';
  }

  private normalizeTransmission(trans: string): string {
    const lower = trans.toLowerCase();
    if (lower.includes('auto')) return 'automatic';
    if (lower.includes('manual')) return 'manual';
    return 'manual';
  }
}

// ── Types for Big Motoring World API response ──────────────────────────

interface BMWSearchResponse {
  Cars?: BMWCar[];
  TotalCount?: number;
  HasMoreCars?: boolean;
}

interface BMWCar {
  StockNumber?: number;
  Registration?: string;
  Make?: string;
  Model?: string;
  Spec?: string;
  AskingPrice?: number;
  DisplayLocation?: string;
  Status?: string;
  KeyFeaturesString?: string;
  DateRegistered?: string;
  Mileage?: number;
  EnginePower?: number;
  Fuel?: string;
  Transmission?: string;
  Colour?: string;
  YearString?: string;
  HeadlineCaption?: string;
  MOTExpiry?: string;
  WebsiteURL?: string;
  MainThumbnailImage?: string;
  SliderImages?: Array<{ ClearImage?: string }>;
  PriceLabel?: string;
  EngineSizeString?: string;
  Doors?: number;
  BHP?: number;
  BodyType?: string;
  InsuranceGroup?: number;
}

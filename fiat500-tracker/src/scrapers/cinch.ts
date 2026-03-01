import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class CinchScraper extends BaseScraper {
  platform = 'cinch';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];

    try {
      // Cinch is a Next.js app with __NEXT_DATA__ containing full vehicle listings
      const searchUrl = 'https://www.cinch.co.uk/used-cars/fiat/500/manual-gearbox?financeType=any';

      console.log(`[Cinch] Fetching: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      });

      if (!response.ok) {
        errors.push(`Cinch HTTP ${response.status}`);
        return this.makeResult(listings, errors);
      }

      const html = await response.text();
      console.log(`[Cinch] Got ${html.length} bytes of HTML`);

      // Extract __NEXT_DATA__ JSON
      const nextData = this.extractNextData(html);
      if (!nextData) {
        errors.push('Cinch: could not extract __NEXT_DATA__ from page');
        return this.makeResult(listings, errors);
      }

      const vehicleListings = nextData?.props?.pageProps?.searchResults?.response?.vehicleListings;
      if (!Array.isArray(vehicleListings)) {
        errors.push('Cinch: no vehicleListings in __NEXT_DATA__');
        return this.makeResult(listings, errors);
      }

      const priceMin = config.budget_min; // pence
      const priceMax = config.budget_max;

      console.log(`[Cinch] Found ${vehicleListings.length} vehicles in __NEXT_DATA__`);

      for (const vehicle of vehicleListings) {
        const listing = this.mapVehicle(vehicle);
        if (!listing) continue;

        // Filter by budget (Cinch prices are in pounds, we convert to pence)
        if (listing.price < priceMin || listing.price > priceMax) continue;

        listings.push(listing);
      }

      console.log(`[Cinch] ${listings.length} listings within budget`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Cinch scraper error: ${msg}`);
      console.error('[Cinch] Error:', msg);
    }

    return this.makeResult(listings, errors);
  }

  private extractNextData(html: string): NextDataResponse | null {
    const marker = '<script id="__NEXT_DATA__" type="application/json">';
    const idx = html.indexOf(marker);
    if (idx === -1) return null;

    const start = idx + marker.length;
    const end = html.indexOf('</script>', start);
    if (end === -1) return null;

    try {
      return JSON.parse(html.slice(start, end));
    } catch {
      return null;
    }
  }

  private mapVehicle(v: CinchVehicle): ScrapedListing | null {
    const id = v.vehicleId;
    if (!id) return null;

    const price = (v.price || 0) * 100; // pounds to pence
    if (price === 0) return null;

    const year = v.vehicleYear || v.modelYear || 0;
    const variant = v.variant || '';
    const trim = v.trim || '';
    const title = `${year} Fiat 500 ${variant}`.trim();

    const url = `https://www.cinch.co.uk/used-cars/fiat/500/${id}`;

    const engineCc = v.engineCapacityCc || v.engineSize || 0;
    const engineSize = engineCc > 0 ? (engineCc / 1000).toFixed(1) : this.extractEngineSize(variant);

    return {
      platform: 'cinch',
      platform_listing_id: id,
      url,
      title,
      price,
      year: year || 2015,
      mileage: v.mileage || 0,
      engine_size: engineSize,
      fuel_type: this.normalizeFuel(v.fuelType || 'Petrol'),
      transmission: this.normalizeTransmission(v.transmissionType || 'Manual'),
      colour: v.colour || null,
      mot_expiry: null,
      seller_name: v.site ? `cinch ${v.site}` : 'cinch',
      seller_type: 'dealer',
      seller_rating: 75,
      location_postcode: null,
      description: [trim, variant].filter(Boolean).join(' - ') || null,
      image_urls: v.thumbnailUrl ? [v.thumbnailUrl] : [],
    };
  }

  private extractEngineSize(text: string): string {
    if (/0\.9|twinair/i.test(text)) return '0.9';
    if (/1\.2/i.test(text)) return '1.2';
    if (/1\.4/i.test(text)) return '1.4';
    if (/1\.0/i.test(text)) return '1.0';
    return '1.2';
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

// ── Types ──────────────────────────────────────────────────────────────

interface NextDataResponse {
  props?: {
    pageProps?: {
      searchResults?: {
        response?: {
          vehicleListings?: CinchVehicle[];
          searchResultsCount?: number;
        };
      };
    };
  };
}

interface CinchVehicle {
  vehicleId?: string;
  modelYear?: number;
  vehicleYear?: number;
  bodyType?: string;
  colour?: string;
  doors?: number;
  engineCapacityCc?: number;
  engineSize?: number;
  fuelType?: string;
  vrm?: string;
  mileage?: number;
  seats?: number;
  stockType?: string;
  trim?: string;
  variant?: string;
  transmissionType?: string;
  make?: string;
  model?: string;
  price?: number;
  priceIncludingAdminFee?: number;
  thumbnailUrl?: string;
  site?: string;
  isAvailable?: boolean;
  condition?: string;
}

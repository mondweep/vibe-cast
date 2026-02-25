import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class CarGurusScraper extends BaseScraper {
  platform = 'cargurus';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];

    try {
      const postcode = encodeURIComponent(config.postcode.replace(/\s+/g, ''));
      const priceMin = Math.round(config.budget_min / 100); // pence to pounds
      const priceMax = Math.round(config.budget_max / 100);

      // CarGurus UK listing page — entity d3131 = Fiat 500
      const searchUrl = `https://www.cargurus.co.uk/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=d3131&zip=${postcode}&distance=${config.search_radius_miles}&minPrice=${priceMin}&maxPrice=${priceMax}&transmissionCodes=M&fuelTypes=PETROL`;

      console.log(`[CarGurus] Searching: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      });

      if (!response.ok) {
        errors.push(`CarGurus HTTP ${response.status}`);
        return this.makeResult(listings, errors);
      }

      const html = await response.text();
      console.log(`[CarGurus] Got ${html.length} bytes of HTML`);

      // CarGurus embeds listing data as window.__PREFLIGHT__ = {...}; in a script tag
      // Extract using brace-balanced parsing since the JSON is large and contains nested objects
      const preflight = this.extractPreflight(html);

      if (preflight?.tiles && Array.isArray(preflight.tiles)) {
        console.log(`[CarGurus] Found ${preflight.tiles.length} tiles in __PREFLIGHT__ (total: ${preflight.totalListings ?? 'unknown'})`);

        for (const tile of preflight.tiles) {
          const listing = this.mapTile(tile);
          if (listing) listings.push(listing);
        }
      } else {
        console.log('[CarGurus] No tiles found in __PREFLIGHT__, check HTML structure');
        errors.push('CarGurus: could not extract __PREFLIGHT__ tiles from page');
      }

      console.log(`[CarGurus] Found ${listings.length} listings`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`CarGurus scraper error: ${msg}`);
      console.error(`[CarGurus] Error:`, msg);
    }

    return this.makeResult(listings, errors);
  }

  private extractPreflight(html: string): PreflightData | null {
    const marker = 'window.__PREFLIGHT__';
    const idx = html.indexOf(marker);
    if (idx === -1) return null;

    // Find the opening brace after the '='
    const eqIdx = html.indexOf('=', idx + marker.length);
    if (eqIdx === -1) return null;

    let braceStart = -1;
    for (let i = eqIdx + 1; i < html.length; i++) {
      if (html[i] === '{') { braceStart = i; break; }
      if (html[i] !== ' ' && html[i] !== '\t' && html[i] !== '\n' && html[i] !== '\r') return null;
    }
    if (braceStart === -1) return null;

    // Walk through to find matching closing brace, respecting strings
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = braceStart; i < html.length; i++) {
      const ch = html[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"' && !escape) { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const jsonStr = html.slice(braceStart, i + 1);
          try {
            return JSON.parse(jsonStr) as PreflightData;
          } catch (err) {
            console.error(`[CarGurus] JSON parse failed at length ${jsonStr.length}: ${err}`);
            return null;
          }
        }
      }
    }
    return null;
  }

  private mapTile(tile: CarGurusTile): ScrapedListing | null {
    // Tiles have nested structure: { type: "LISTING_...", data: { ...fields } }
    const d = tile.data || tile;
    const id = d.id || d.listingId;
    if (!id) return null;

    const price = (d.price || 0) * 100; // pounds to pence
    if (price === 0) return null;

    const title = d.listingTitle || `${d.carYear || ''} Fiat 500`.trim();

    // Build URL from listing ID
    const url = `https://www.cargurus.co.uk/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action#listing=${id}`;

    // Extract image URL from originalPictureData or fallback
    const imageUrl = d.originalPictureData?.url || d.mainPictureUrl || d.pictureUrl || null;

    return {
      platform: 'cargurus',
      platform_listing_id: String(id),
      url,
      title,
      price,
      year: d.carYear || this.extractYear(title) || 2015,
      mileage: d.mileage || 0,
      engine_size: this.extractEngineSize(title),
      fuel_type: this.normalizeFuel(d.localizedFuelType || 'petrol'),
      transmission: this.normalizeTransmission(d.localizedTransmission || 'manual'),
      colour: d.localizedExteriorColor || d.exteriorColorName || null,
      mot_expiry: null,
      seller_name: d.dealerName || d.serviceProviderName || null,
      seller_type: d.sellerType === 'DEALER' || d.dealerName ? 'dealer' : 'private',
      seller_rating: d.dealRating ? this.mapDealRating(d.dealRating) : null,
      location_postcode: d.sellerPostalCode || null,
      description: null,
      image_urls: imageUrl ? [imageUrl] : [],
    };
  }

  private mapDealRating(rating: string): number {
    // CarGurus uses UPPER_SNAKE_CASE like "GREAT_PRICE", "GOOD_PRICE", etc.
    const map: Record<string, number> = {
      'GREAT_PRICE': 90,
      'GOOD_PRICE': 75,
      'FAIR_PRICE': 60,
      'HIGH_PRICE': 40,
      'OVERPRICED': 20,
      // Also handle simpler forms
      'Great': 90,
      'Good': 75,
      'Fair': 60,
      'High': 40,
    };
    return map[rating] ?? 50;
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

  private extractYear(text: string): number | null {
    const match = text.match(/\b(20[0-2]\d)\b/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractEngineSize(text: string): string {
    if (/0\.9|twinair/i.test(text)) return '0.9';
    if (/1\.2/i.test(text)) return '1.2';
    if (/1\.4/i.test(text)) return '1.4';
    if (/1\.0/i.test(text)) return '1.0';
    return '1.2';
  }
}

// Types for CarGurus __PREFLIGHT__ data
interface PreflightData {
  tiles?: CarGurusTile[];
  totalListings?: number;
}

// Each tile wraps listing data in { type, data } structure
interface CarGurusTile {
  type?: string;
  data?: CarGurusTileData;
  // Flat fallback fields (in case structure changes)
  id?: number;
  listingId?: number;
  listingTitle?: string;
  price?: number;
  carYear?: number;
  mileage?: number;
  localizedFuelType?: string;
  localizedTransmission?: string;
  dealerName?: string;
  sellerType?: string;
  dealRating?: string;
  localizedExteriorColor?: string;
  exteriorColorName?: string;
  sellerPostalCode?: string;
  serviceProviderName?: string;
  originalPictureData?: { url?: string };
  mainPictureUrl?: string;
  pictureUrl?: string;
}

interface CarGurusTileData {
  id?: number;
  listingId?: number;
  listingTitle?: string;
  price?: number;
  carYear?: number;
  mileage?: number;
  localizedFuelType?: string;
  localizedTransmission?: string;
  localizedExteriorColor?: string;
  exteriorColorName?: string;
  dealerName?: string;
  serviceProviderName?: string;
  sellerType?: string;
  sellerPostalCode?: string;
  dealRating?: string;
  originalPictureData?: { url?: string };
  mainPictureUrl?: string;
  pictureUrl?: string;
}

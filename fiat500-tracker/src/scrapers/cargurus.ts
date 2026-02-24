import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class CarGurusScraper extends BaseScraper {
  platform = 'cargurus';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];

    try {
      const priceMin = Math.round(config.budget_min / 100);
      const priceMax = Math.round(config.budget_max / 100);
      const postcode = encodeURIComponent(config.postcode.replace(/\s+/g, ''));

      // CarGurus UK has a JSON search API
      const searchUrl = `https://www.cargurus.co.uk/Cars/searchResults.action?zip=${postcode}&inventorySearchWidgetType=AUTO&searchId=&sortDir=ASC&sortType=DEAL_SCORE&sourceContext=cargurus&maxMileage=&transmissionCodes=M&fuelTypes=PETROL&minPrice=${priceMin}&maxPrice=${priceMax}&entitySelectionsString=c29607&distance=${config.search_radius_miles}`;

      console.log(`[CarGurus] Searching: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        errors.push(`CarGurus HTTP ${response.status}`);
        return this.makeResult(listings, errors);
      }

      const html = await response.text();

      // CarGurus embeds listing data as JSON in the page
      const jsonMatch = html.match(/window\.__CARGURUS_LISTINGS__\s*=\s*(\[[\s\S]*?\]);/);

      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]) as CarGurusListing[];
          for (const item of data) {
            const listing = this.mapListing(item);
            if (listing) listings.push(listing);
          }
        } catch (parseErr) {
          errors.push(`CarGurus JSON parse error: ${parseErr}`);
        }
      }

      // Fallback: try to extract from embedded JSON-LD or other structured data
      if (listings.length === 0) {
        const scriptMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
        for (const m of scriptMatches) {
          try {
            const ld = JSON.parse(m[1]);
            if (ld['@type'] === 'Car' || ld['@type'] === 'Vehicle') {
              const listing = this.mapJsonLd(ld);
              if (listing) listings.push(listing);
            }
            if (Array.isArray(ld)) {
              for (const item of ld) {
                if (item['@type'] === 'Car' || item['@type'] === 'Vehicle') {
                  const listing = this.mapJsonLd(item);
                  if (listing) listings.push(listing);
                }
              }
            }
          } catch {
            // Skip invalid JSON-LD
          }
        }
      }

      // If still nothing, try regex extraction from HTML
      if (listings.length === 0) {
        const extracted = this.extractFromHtml(html, errors);
        listings.push(...extracted);
      }

      console.log(`[CarGurus] Found ${listings.length} listings`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`CarGurus scraper error: ${msg}`);
      console.error(`[CarGurus] Error:`, msg);
    }

    return this.makeResult(listings, errors);
  }

  private mapListing(item: CarGurusListing): ScrapedListing | null {
    if (!item.id || !item.listingUrl) return null;

    return {
      platform: 'cargurus',
      platform_listing_id: String(item.id),
      url: item.listingUrl.startsWith('http') ? item.listingUrl : `https://www.cargurus.co.uk${item.listingUrl}`,
      title: item.listingTitle || `${item.year || ''} Fiat 500`.trim(),
      price: (item.price || 0) * 100, // pounds to pence
      year: item.year || 2015,
      mileage: item.mileage || 0,
      engine_size: this.extractEngineSize(item.listingTitle || ''),
      fuel_type: 'petrol',
      transmission: 'manual',
      colour: item.exteriorColor || null,
      mot_expiry: null,
      seller_name: item.sellerName || null,
      seller_type: item.sellerType === 'dealer' ? 'dealer' : 'private',
      seller_rating: item.dealRating ? this.mapDealRating(item.dealRating) : null,
      location_postcode: null,
      description: null,
      image_urls: item.mainPictureUrl ? [item.mainPictureUrl] : [],
    };
  }

  private mapJsonLd(ld: Record<string, unknown>): ScrapedListing | null {
    const name = String(ld.name || 'Fiat 500');
    const url = String(ld.url || '');
    if (!url) return null;

    const offers = ld.offers as Record<string, unknown> | undefined;
    const price = offers ? Number(offers.price || 0) : 0;

    return {
      platform: 'cargurus',
      platform_listing_id: url.split('/').pop() || url,
      url: url.startsWith('http') ? url : `https://www.cargurus.co.uk${url}`,
      title: name,
      price: price * 100,
      year: Number(ld.modelDate || ld.vehicleModelDate || 2015),
      mileage: Number((ld.mileageFromOdometer as Record<string, unknown>)?.value || 0),
      engine_size: this.extractEngineSize(name),
      fuel_type: 'petrol',
      transmission: 'manual',
      colour: String(ld.color || '') || null,
      mot_expiry: null,
      seller_name: null,
      seller_type: 'private',
      seller_rating: null,
      location_postcode: null,
      description: String(ld.description || '') || null,
      image_urls: ld.image ? [String(ld.image)] : [],
    };
  }

  private extractFromHtml(html: string, errors: string[]): ScrapedListing[] {
    const listings: ScrapedListing[] = [];
    // Regex-based extraction as last resort
    const listingPattern = /data-listing-id="(\d+)"[\s\S]*?href="([^"]*)"[\s\S]*?class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\//gi;

    let match;
    while ((match = listingPattern.exec(html)) !== null) {
      try {
        const [, id, href, priceText] = match;
        const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) * 100;
        if (!price) continue;

        listings.push({
          platform: 'cargurus',
          platform_listing_id: id,
          url: href.startsWith('http') ? href : `https://www.cargurus.co.uk${href}`,
          title: 'Fiat 500',
          price,
          year: 2015,
          mileage: 0,
          engine_size: '1.2',
          fuel_type: 'petrol',
          transmission: 'manual',
          colour: null,
          mot_expiry: null,
          seller_name: null,
          seller_type: 'private',
          seller_rating: null,
          location_postcode: null,
          description: null,
          image_urls: [],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`CarGurus HTML parse error: ${msg}`);
      }
    }
    return listings;
  }

  private mapDealRating(rating: string): number {
    const map: Record<string, number> = {
      'Great': 90,
      'Good': 75,
      'Fair': 60,
      'High': 40,
      'Overpriced': 20,
    };
    return map[rating] ?? 50;
  }

  private extractEngineSize(text: string): string {
    if (/0\.9|twinair/i.test(text)) return '0.9';
    if (/1\.2/i.test(text)) return '1.2';
    if (/1\.4/i.test(text)) return '1.4';
    if (/1\.0/i.test(text)) return '1.0';
    return '1.2';
  }
}

interface CarGurusListing {
  id?: number;
  listingUrl?: string;
  listingTitle?: string;
  price?: number;
  year?: number;
  mileage?: number;
  exteriorColor?: string;
  sellerName?: string;
  sellerType?: string;
  dealRating?: string;
  mainPictureUrl?: string;
}

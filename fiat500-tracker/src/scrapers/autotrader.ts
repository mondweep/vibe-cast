import { randomUUID } from 'node:crypto';
import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

const AT_GATEWAY = 'https://www.autotrader.co.uk/at-gateway';
const MAX_PAGES = 10;

const SEARCH_QUERY = `query SearchResultsListingsGridQuery(
  $filters: [FilterInput!]!
  $channel: Channel!
  $page: Int
  $sortBy: SearchResultsSort
  $listingType: [ListingType!]
  $searchId: String!
  $featureFlags: [FeatureFlag]
) {
  searchResults(input: {
    facets: []
    filters: $filters
    channel: $channel
    page: $page
    sortBy: $sortBy
    listingType: $listingType
    searchId: $searchId
    featureFlags: $featureFlags
  }) {
    listings {
      ... on SearchListing {
        type
        advertId
        title
        subTitle
        attentionGrabber
        price
        vehicleLocation
        sellerType
        fpaLink
        images
        numberOfImages
        dealerReview { overallReviewRating }
        trackingContext {
          advertContext { make model year price }
          distance { distance distance_unit }
        }
      }
    }
    page { number count results { count } }
  }
}`;

export class AutoTraderScraper extends BaseScraper {
  platform = 'autotrader';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];

    try {
      const postcode = config.postcode;
      const radius = String(config.search_radius_miles);
      const priceMin = String(Math.round(config.budget_min / 100));
      const priceMax = String(Math.round(config.budget_max / 100));
      const searchId = randomUUID();

      const filters = [
        { filter: 'postcode', selected: [postcode] },
        { filter: 'make', selected: ['Fiat'] },
        { filter: 'model', selected: ['500'] },
        { filter: 'distance', selected: [radius] },
        { filter: 'transmission', selected: ['Manual'] },
        { filter: 'min_price', selected: [priceMin] },
        { filter: 'max_price', selected: [priceMax] },
        { filter: 'price_search_type', selected: ['total'] },
      ];

      console.log(`[AutoTrader] Searching: postcode=${postcode} radius=${radius} budget=£${priceMin}-£${priceMax}`);

      let pageNum = 1;
      let totalPages = 1;

      while (pageNum <= Math.min(totalPages, MAX_PAGES)) {
        const result = await this.fetchPage(filters, searchId, pageNum);

        if (!result) {
          errors.push(`AutoTrader: empty response on page ${pageNum}`);
          break;
        }

        const sr = result.data?.searchResults;
        if (!sr) {
          errors.push(`AutoTrader: no searchResults in response on page ${pageNum}`);
          break;
        }

        totalPages = sr.page?.count ?? 1;
        const totalResults = sr.page?.results?.count ?? 0;

        if (pageNum === 1) {
          console.log(`[AutoTrader] ${totalResults} total results across ${totalPages} pages`);
        }

        const pageListing = (sr.listings || [])
          .filter((l: ATListing) => l.type === 'NATURAL_LISTING' && l.advertId)
          .map((l: ATListing) => this.mapListing(l))
          .filter((l: ScrapedListing | null): l is ScrapedListing => l !== null);

        listings.push(...pageListing);
        console.log(`[AutoTrader] Page ${pageNum}/${totalPages}: ${pageListing.length} listings`);

        if (pageNum >= totalPages) break;
        pageNum++;
        await this.randomDelay(500, 1500);
      }

      console.log(`[AutoTrader] Done: ${listings.length} total listings scraped`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`AutoTrader scraper error: ${msg}`);
      console.error(`[AutoTrader] Error:`, msg);
    }

    return this.makeResult(listings, errors);
  }

  private async fetchPage(
    filters: { filter: string; selected: string[] }[],
    searchId: string,
    page: number,
  ): Promise<ATResponse | null> {
    const body = {
      operationName: 'SearchResultsListingsGridQuery',
      variables: {
        filters,
        channel: 'cars',
        page,
        sortBy: 'relevance',
        listingType: ['NATURAL_LISTING'],
        searchId,
        featureFlags: [],
      },
      query: SEARCH_QUERY,
    };

    const response = await fetch(AT_GATEWAY, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': 'https://www.autotrader.co.uk',
        'Referer': 'https://www.autotrader.co.uk/car-search',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[AutoTrader] HTTP ${response.status} on page ${page}`);
      return null;
    }

    return response.json() as Promise<ATResponse>;
  }

  private mapListing(l: ATListing): ScrapedListing | null {
    const ctx = l.trackingContext?.advertContext;
    const price = (ctx?.price ?? 0) * 100; // pounds to pence
    if (price === 0) return null;

    const title = [l.title, l.subTitle].filter(Boolean).join(' ');
    const year = ctx?.year ?? this.extractYear(title) ?? 2015;
    const engineSize = this.extractEngineSize(l.subTitle || title);

    const fpaLink = l.fpaLink || '';
    const idMatch = fpaLink.match(/car-details\/(\d+)/);
    const advertId = l.advertId || (idMatch ? idMatch[1] : '');
    if (!advertId) return null;

    const url = `https://www.autotrader.co.uk/car-details/${advertId}`;

    const images = (l.images || [])
      .slice(0, 5)
      .map(img => img.replace('{resize}', 'w800'));

    const distance = l.trackingContext?.distance;
    const rating = l.dealerReview?.overallReviewRating;

    return {
      platform: 'autotrader',
      platform_listing_id: advertId,
      url,
      title,
      price,
      year,
      mileage: 0, // not available in search results — filled on detail page or stays 0
      engine_size: engineSize,
      fuel_type: 'petrol',
      transmission: 'manual',
      colour: null,
      mot_expiry: null,
      seller_name: null,
      seller_type: l.sellerType === 'PRIVATE' ? 'private' : 'dealer',
      seller_rating: rating ? Math.round(rating * 20) : null, // 0-5 → 0-100
      location_postcode: null,
      description: l.attentionGrabber || null,
      image_urls: images,
    };
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

// Types for AutoTrader GraphQL response
interface ATResponse {
  data?: {
    searchResults?: {
      listings: ATListing[];
      page?: { number: number; count: number; results?: { count: number } };
    };
  };
  errors?: { message: string }[];
}

interface ATListing {
  type: string;
  advertId: string;
  title: string;
  subTitle: string;
  attentionGrabber: string | null;
  price: string;
  vehicleLocation: string;
  sellerType: string;
  fpaLink: string;
  images: string[];
  numberOfImages: number;
  dealerReview: { overallReviewRating: number } | null;
  trackingContext: {
    advertContext: { make: string; model: string; year: number; price: number };
    distance: { distance: number; distance_unit: string | null };
  };
}

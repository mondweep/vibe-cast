import { BaseScraper, type ScraperResult } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export class CarwowScraper extends BaseScraper {
  platform = 'carwow';

  private readonly BASE_URL = 'https://quotes.carwow.co.uk';

  async scrape(config: UserConfig): Promise<ScraperResult> {
    const errors: string[] = [];
    const listings: ScrapedListing[] = [];

    try {
      // Step 1: Fetch the deal-cards turbo frame to get card IDs
      const radius = config.search_radius_miles || 20;
      const cardsUrl = `${this.BASE_URL}/stock_cars/deal-cards?brand_slug=fiat&deal_type_group=cash&distance%5Blte%5D=${radius}&model_slug=500&sort=recommended&vehicle_state_group=used&vehicle_type=car`;

      console.log(`[Carwow] Fetching deal cards: ${cardsUrl}`);

      const cardsResponse = await fetch(cardsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/vnd.turbo-stream.html, text/html, application/xhtml+xml',
          'Turbo-Frame': 'stock_cars_v2_cards',
        },
      });

      if (!cardsResponse.ok) {
        errors.push(`Carwow deal-cards HTTP ${cardsResponse.status}`);
        return this.makeResult(listings, errors);
      }

      const cardsHtml = await cardsResponse.text();
      console.log(`[Carwow] Got ${cardsHtml.length} bytes of deal cards HTML`);

      // Extract lazy card frame IDs and their src URLs
      const cardFrames = this.extractCardFrames(cardsHtml);
      console.log(`[Carwow] Found ${cardFrames.length} card frames`);

      if (cardFrames.length === 0) {
        console.log('[Carwow] No deal cards found');
        return this.makeResult(listings, errors);
      }

      // Step 2: Fetch each individual card
      const priceMin = config.budget_min; // pence
      const priceMax = config.budget_max;

      for (const frame of cardFrames) {
        try {
          await this.randomDelay(300, 800);

          const cardResponse = await fetch(frame.src, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept': 'text/html',
              'Accept-Encoding': 'identity',
              'Turbo-Frame': frame.id,
            },
          });

          if (!cardResponse.ok) {
            errors.push(`Carwow card ${frame.id} HTTP ${cardResponse.status}`);
            continue;
          }

          const cardHtml = await cardResponse.text();
          const listing = this.parseCard(cardHtml, frame.dealId);

          if (!listing) continue;
          if (listing.price < priceMin || listing.price > priceMax) continue;

          listings.push(listing);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Carwow card fetch error: ${msg}`);
        }
      }

      console.log(`[Carwow] ${listings.length} listings within budget`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Carwow scraper error: ${msg}`);
      console.error('[Carwow] Error:', msg);
    }

    return this.makeResult(listings, errors);
  }

  private extractCardFrames(html: string): CardFrame[] {
    const frames: CardFrame[] = [];

    // Match turbo-frame elements with lazy loading src
    const regex = /<turbo-frame[^>]*loading="lazy"[^>]*id="(lazy_deal_card_([a-f0-9]+))"[^>]*src="([^"]*)"[^>]*>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const src = match[3].replace(/&amp;/g, '&');
      frames.push({
        id: match[1],
        dealId: match[2],
        src,
      });
    }

    return frames;
  }

  private parseCard(html: string, dealId: string): ScrapedListing | null {
    // Extract price
    const priceMatch = html.match(/£([\d,]+)/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) * 100 : 0;
    if (price === 0) return null;

    // Extract year
    const yearMatch = html.match(/\b(20[0-2]\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

    // Extract mileage
    const mileageMatch = html.match(/([\d,]+)\s*miles/i);
    const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, ''), 10) : 0;

    // Extract fuel type
    const fuelMatch = html.match(/\b(Petrol|Diesel|Electric|Hybrid)\b/i);
    const fuelType = fuelMatch ? fuelMatch[1].toLowerCase() : 'petrol';

    // Extract transmission
    const transMatch = html.match(/\b(Manual|Automatic)\b/i);
    const transmission = transMatch ? transMatch[1].toLowerCase() : 'manual';

    // Extract link
    const hrefMatch = html.match(/href="(https:\/\/quotes\.carwow\.co\.uk\/deals\/[^"]+)"/);
    const url = hrefMatch ? hrefMatch[1] : `${this.BASE_URL}/deals/${dealId}`;

    // Extract deal score
    const scoreMatch = html.match(/data-deal-score="([\d.]+)"/);
    const score = scoreMatch ? Math.round(parseFloat(scoreMatch[1]) * 10) : null;

    // Extract image
    const imgMatch = html.match(/srcset="([^"]*120w)/);
    let imageUrl: string | null = null;
    if (imgMatch) {
      const srcsetPart = imgMatch[1];
      const urlEnd = srcsetPart.lastIndexOf(' 120w');
      if (urlEnd > 0) {
        imageUrl = srcsetPart.slice(0, urlEnd).replace(/&amp;/g, '&');
      }
    }

    // Extract colour from badges
    const colourMatch = html.match(/\b(White|Black|Silver|Grey|Blue|Red|Green|Yellow|Orange|Pink|Brown|Gold|Cream)\b/i);

    // Extract dealer name
    const dealerMatch = html.match(/deal-card__dealer[^>]*>([^<]+)/);

    const title = `${year || ''} Fiat 500`.trim();

    return {
      platform: 'carwow',
      platform_listing_id: dealId,
      url,
      title,
      price,
      year: year || 2015,
      mileage,
      engine_size: this.extractEngineSize(html),
      fuel_type: fuelType,
      transmission,
      colour: colourMatch ? colourMatch[1].toLowerCase() : null,
      mot_expiry: null,
      seller_name: dealerMatch ? dealerMatch[1].trim() : 'Carwow dealer',
      seller_type: 'dealer',
      seller_rating: score,
      location_postcode: null,
      description: null,
      image_urls: imageUrl ? [imageUrl] : [],
    };
  }

  private extractEngineSize(text: string): string {
    if (/0\.9|twinair/i.test(text)) return '0.9';
    if (/1\.2/i.test(text)) return '1.2';
    if (/1\.4/i.test(text)) return '1.4';
    if (/1\.0/i.test(text)) return '1.0';
    return '1.2';
  }
}

interface CardFrame {
  id: string;
  dealId: string;
  src: string;
}

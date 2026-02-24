import { supabase } from '../db/client.js';
import { geocodePostcode, haversineDistance } from '../config/geocode.js';
import type { BaseScraper } from './base-scraper.js';
import type { ScrapedListing, UserConfig } from '../types/index.js';

export interface OrchestratorResult {
  runId: string;
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  priceDrops: number;
  errors: string[];
}

export async function runScrapeOrchestrator(
  scrapers: BaseScraper[],
  config: UserConfig,
): Promise<OrchestratorResult> {
  // Create scrape run record
  const { data: run, error: runError } = await supabase
    .from('scrape_runs')
    .insert({ status: 'running' })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create scrape run: ${runError?.message}`);
  }

  const runId = run.id;
  let listingsFound = 0;
  let listingsNew = 0;
  let listingsUpdated = 0;
  let priceDrops = 0;
  const allErrors: string[] = [];

  try {
    // Run all scrapers in parallel
    const results = await Promise.allSettled(
      scrapers.map(scraper =>
        withTimeout(scraper.scrape(config), 120000, `${scraper.platform} timeout after 120s`)
      )
    );

    // Collect all listings
    const allListings: ScrapedListing[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allListings.push(...result.value.listings);
        allErrors.push(...result.value.errors);
      } else {
        allErrors.push(`Scraper failed: ${result.reason}`);
      }
    }

    listingsFound = allListings.length;
    console.log(`[Orchestrator] Total listings found: ${listingsFound}`);

    // Deduplicate
    const deduplicated = deduplicateListings(allListings);
    console.log(`[Orchestrator] After dedup: ${deduplicated.length} unique listings`);

    // Store each listing
    for (const listing of deduplicated) {
      try {
        const result = await storeListing(listing, config);
        if (result === 'new') listingsNew++;
        else if (result === 'updated') listingsUpdated++;
        else if (result === 'price_drop') {
          listingsUpdated++;
          priceDrops++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        allErrors.push(`Failed to store listing: ${msg}`);
      }
    }

    // Mark stale listings as inactive (not seen in 48 hours)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('listings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)
      .lt('last_seen_at', cutoff);

    // Update scrape run as completed
    await supabase
      .from('scrape_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        listings_found: listingsFound,
        listings_new: listingsNew,
        listings_updated: listingsUpdated,
        price_drops: priceDrops,
        errors: allErrors,
      })
      .eq('id', runId);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    allErrors.push(`Orchestrator error: ${msg}`);

    await supabase
      .from('scrape_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        listings_found: listingsFound,
        listings_new: listingsNew,
        listings_updated: listingsUpdated,
        price_drops: priceDrops,
        errors: allErrors,
      })
      .eq('id', runId);
  }

  return { runId, listingsFound, listingsNew, listingsUpdated, priceDrops, errors: allErrors };
}

function deduplicateListings(listings: ScrapedListing[]): ScrapedListing[] {
  const seen = new Map<string, ScrapedListing>();

  for (const listing of listings) {
    // Dedup key: year + approximate mileage + approximate price + location prefix
    const mileageBucket = Math.round(listing.mileage / 1000) * 1000;
    const priceBucket = Math.round(listing.price / 10000) * 10000; // nearest £100
    const locationPrefix = (listing.location_postcode || '').slice(0, 4).toUpperCase();
    const key = `${listing.year}-${mileageBucket}-${priceBucket}-${locationPrefix}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, listing);
    } else {
      // Keep the one with more data
      const existingScore = dataRichness(existing);
      const newScore = dataRichness(listing);
      if (newScore > existingScore) {
        // Keep the richer listing, but save the other's URL as alternative
        seen.set(key, listing);
      }
    }
  }

  return Array.from(seen.values());
}

function dataRichness(listing: ScrapedListing): number {
  let score = 0;
  if (listing.description) score += 2;
  if (listing.image_urls.length > 0) score += 1;
  if (listing.seller_name) score += 1;
  if (listing.seller_rating) score += 1;
  if (listing.mot_expiry) score += 1;
  if (listing.location_postcode) score += 1;
  if (listing.mileage > 0) score += 1;
  return score;
}

async function storeListing(
  scraped: ScrapedListing,
  config: UserConfig,
): Promise<'new' | 'updated' | 'price_drop' | 'unchanged'> {
  // Calculate distance if we have postcode
  let distanceMiles: number | null = null;
  let locationLat: number | null = null;
  let locationLng: number | null = null;

  if (scraped.location_postcode && config.latitude && config.longitude) {
    try {
      const geo = await geocodePostcode(scraped.location_postcode);
      if (geo) {
        locationLat = geo.latitude;
        locationLng = geo.longitude;
        distanceMiles = haversineDistance(
          config.latitude, config.longitude,
          geo.latitude, geo.longitude,
        );
      }
    } catch {
      // Skip geocoding failure
    }
  }

  // Check if listing already exists
  const { data: existing } = await supabase
    .from('listings')
    .select('id, price')
    .eq('platform', scraped.platform)
    .eq('platform_listing_id', scraped.platform_listing_id)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    // Update existing listing
    const updates: Record<string, unknown> = {
      last_seen_at: now,
      updated_at: now,
      is_active: true,
    };

    // Update distance if newly calculated
    if (distanceMiles !== null) {
      updates.distance_miles = distanceMiles;
      updates.location_lat = locationLat;
      updates.location_lng = locationLng;
    }

    let result: 'updated' | 'price_drop' | 'unchanged' = 'unchanged';

    if (existing.price !== scraped.price) {
      updates.price = scraped.price;
      result = scraped.price < existing.price ? 'price_drop' : 'updated';

      // Record price history
      await supabase.from('price_history').insert({
        listing_id: existing.id,
        price: scraped.price,
      });
    }

    await supabase
      .from('listings')
      .update(updates)
      .eq('id', existing.id);

    return result;
  } else {
    // Insert new listing
    const { data: inserted } = await supabase
      .from('listings')
      .insert({
        platform: scraped.platform,
        platform_listing_id: scraped.platform_listing_id,
        url: scraped.url,
        title: scraped.title,
        price: scraped.price,
        year: scraped.year,
        mileage: scraped.mileage,
        engine_size: scraped.engine_size,
        fuel_type: scraped.fuel_type,
        transmission: scraped.transmission,
        colour: scraped.colour,
        mot_expiry: scraped.mot_expiry,
        seller_name: scraped.seller_name,
        seller_type: scraped.seller_type,
        seller_rating: scraped.seller_rating,
        location_postcode: scraped.location_postcode,
        location_lat: locationLat,
        location_lng: locationLng,
        distance_miles: distanceMiles,
        description: scraped.description,
        image_urls: scraped.image_urls,
        alternative_urls: [],
        is_active: true,
        first_seen_at: now,
        last_seen_at: now,
      })
      .select('id')
      .single();

    // Record initial price in history
    if (inserted) {
      await supabase.from('price_history').insert({
        listing_id: inserted.id,
        price: scraped.price,
      });
    }

    return 'new';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

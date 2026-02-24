import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/client.js';
import { scrapeManualUrl } from '../scrapers/manual-url.js';
import { geocodePostcode, haversineDistance } from '../config/geocode.js';
import { estimateInsurance } from '../insurance/estimator.js';
import type { Listing, UserConfig } from '../types/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const activeOnly = req.query.active !== 'false';

  let query = supabase
    .from('listings')
    .select('*')
    .order('composite_score', { ascending: false, nullsFirst: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data || []);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  // Also fetch price history
  const { data: priceHistory } = await supabase
    .from('price_history')
    .select('*')
    .eq('listing_id', req.params.id)
    .order('recorded_at', { ascending: true });

  res.json({ ...data, price_history: priceHistory || [] });
});

const manualUrlSchema = z.object({
  url: z.string().url(),
});

router.post('/manual', async (req: Request, res: Response) => {
  const parsed = manualUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid URL', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { url } = parsed.data;

  // Get user config for distance calculation
  const { data: config } = await supabase
    .from('user_config')
    .select('*')
    .limit(1)
    .single();

  // Scrape the URL
  const scraped = await scrapeManualUrl(url);
  if (!scraped) {
    res.status(422).json({ error: 'Failed to extract listing data from the URL' });
    return;
  }

  // Calculate distance if possible
  let distanceMiles: number | null = null;
  let locationLat: number | null = null;
  let locationLng: number | null = null;

  if (scraped.location_postcode && config?.latitude && config?.longitude) {
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
    } catch { /* skip */ }
  }

  const now = new Date().toISOString();

  const { data: inserted, error } = await supabase
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
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to store listing', details: error.message });
    return;
  }

  // Record initial price in history
  if (inserted) {
    await supabase.from('price_history').insert({
      listing_id: inserted.id,
      price: scraped.price,
    });
  }

  res.status(201).json(inserted);
});

// Insurance estimate for a specific listing
router.get('/:id/insurance', async (req: Request, res: Response) => {
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (listingError || !listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  const { data: config } = await supabase
    .from('user_config')
    .select('*')
    .limit(1)
    .single();

  if (!config) {
    res.status(400).json({ error: 'No user configuration found' });
    return;
  }

  // Check for existing actual quote
  const { data: existingQuote } = await supabase
    .from('insurance_quotes')
    .select('*')
    .eq('listing_id', req.params.id)
    .eq('is_actual_quote', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingQuote) {
    res.json({ type: 'actual_quote', ...existingQuote });
    return;
  }

  const breakdown = estimateInsurance(listing as Listing, config as UserConfig);
  res.json({ type: 'estimate', ...breakdown });
});

// Manual insurance quote override
const manualQuoteSchema = z.object({
  provider: z.string().min(1),
  annual_premium: z.number().int().positive(),
  cover_type: z.string().default('comprehensive'),
});

router.post('/:id/insurance', async (req: Request, res: Response) => {
  const parsed = manualQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', req.params.id)
    .single();

  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  const { data: quote, error } = await supabase
    .from('insurance_quotes')
    .insert({
      listing_id: req.params.id,
      is_actual_quote: true,
      provider: parsed.data.provider,
      annual_premium: parsed.data.annual_premium,
      cover_type: parsed.data.cover_type,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to save quote', details: error.message });
    return;
  }

  // Update listing with actual quote
  await supabase
    .from('listings')
    .update({ insurance_estimate: parsed.data.annual_premium, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  res.status(201).json(quote);
});

export default router;

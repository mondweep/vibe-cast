import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/client.js';
import { geocodePostcode } from '../config/geocode.js';

const router = Router();

const driverProfileSchema = z.object({
  age: z.number().int().min(17).max(100),
  ncb_years: z.number().int().min(0).max(20),
});

const configSchema = z.object({
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode'),
  search_radius_miles: z.number().int().min(1).max(100).default(50),
  budget_min: z.number().int().positive(),
  budget_max: z.number().int().positive(),
  outbound_email: z.string().email().optional(),
  user_name: z.string().min(1).max(100).default('User'),
  adults: z.array(driverProfileSchema).min(1).max(4),
  learner_age: z.number().int().min(16).max(25).optional().nullable(),
  openclaw_webhook_url: z.string().url().optional().nullable(),
}).refine(data => data.budget_min < data.budget_max, {
  message: 'budget_min must be less than budget_max',
  path: ['budget_min'],
});

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('user_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'No configuration found. Use PUT /api/config to set up.' });
    return;
  }

  res.json(data);
});

router.put('/', async (req: Request, res: Response) => {
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const config = parsed.data;

  // Geocode postcode
  let latitude: number | null = null;
  let longitude: number | null = null;
  try {
    const geo = await geocodePostcode(config.postcode);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
  } catch (err) {
    console.warn('Failed to geocode postcode:', err);
  }

  const row = {
    postcode: config.postcode.toUpperCase().replace(/\s+/g, ' ').trim(),
    latitude,
    longitude,
    search_radius_miles: config.search_radius_miles,
    budget_min: config.budget_min,
    budget_max: config.budget_max,
    outbound_email: config.outbound_email || null,
    user_name: config.user_name,
    adults: config.adults,
    learner_age: config.learner_age ?? null,
    openclaw_webhook_url: config.openclaw_webhook_url ?? null,
    tracking_active: true,
    updated_at: new Date().toISOString(),
  };

  // Check if config exists
  const { data: existing } = await supabase
    .from('user_config')
    .select('id')
    .limit(1)
    .single();

  let result;
  if (existing) {
    // Update existing
    result = await supabase
      .from('user_config')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    // Insert new
    result = await supabase
      .from('user_config')
      .insert(row)
      .select()
      .single();
  }

  if (result.error) {
    console.error('[Config] Save error:', result.error);
    res.status(500).json({ error: 'Failed to save config' });
    return;
  }

  res.json(result.data);
});

export default router;

import { Router, Request, Response } from 'express';
import { supabase } from '../db/client.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price, mileage, year, engine_size, location_postcode, distance_miles, composite_score, insurance_estimate, url, platform, image_urls')
    .eq('is_active', true)
    .not('composite_score', 'is', null)
    .order('composite_score', { ascending: false })
    .limit(10);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const shortlist = (data || []).map((listing, index) => ({
    rank: index + 1,
    ...listing,
  }));

  res.json(shortlist);
});

export default router;

import { Router, Request, Response } from 'express';
import { supabase } from '../db/client.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('composite_score', { ascending: false });

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

  res.json(data);
});

router.post('/manual', async (req: Request, res: Response) => {
  // Stub — full implementation in Phase 3
  res.status(201).json({ message: 'Manual listing stub', url: req.body.url });
});

export default router;

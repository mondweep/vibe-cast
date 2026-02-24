import { Router, Request, Response } from 'express';
import { supabase } from '../db/client.js';

const router = Router();

router.post('/pause', async (_req: Request, res: Response) => {
  const { data: config } = await supabase
    .from('user_config')
    .select('id')
    .limit(1)
    .single();

  if (!config) {
    res.status(404).json({ error: 'No configuration found' });
    return;
  }

  await supabase
    .from('user_config')
    .update({ tracking_active: false, updated_at: new Date().toISOString() })
    .eq('id', config.id);

  res.json({ message: 'Tracking paused', tracking_active: false });
});

router.post('/resume', async (_req: Request, res: Response) => {
  const { data: config } = await supabase
    .from('user_config')
    .select('id')
    .limit(1)
    .single();

  if (!config) {
    res.status(404).json({ error: 'No configuration found' });
    return;
  }

  await supabase
    .from('user_config')
    .update({ tracking_active: true, updated_at: new Date().toISOString() })
    .eq('id', config.id);

  res.json({ message: 'Tracking resumed', tracking_active: true });
});

export default router;

import { Router, Request, Response } from 'express';

const router = Router();

router.post('/trigger', async (_req: Request, res: Response) => {
  // Stub — full implementation in Phase 3
  res.status(202).json({
    run_id: 'stub-run-id',
    status: 'started',
    message: 'Scrape trigger stub — full implementation in Phase 3',
  });
});

router.get('/status', async (_req: Request, res: Response) => {
  res.json({
    status: 'idle',
    last_run: null,
    message: 'Scrape status stub — full implementation in Phase 3',
  });
});

export default router;

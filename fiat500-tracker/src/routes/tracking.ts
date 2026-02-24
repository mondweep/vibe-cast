import { Router, Request, Response } from 'express';

const router = Router();

router.post('/pause', async (_req: Request, res: Response) => {
  // Stub — full implementation in Phase 6
  res.json({ message: 'Tracking paused (stub)', tracking_active: false });
});

router.post('/resume', async (_req: Request, res: Response) => {
  // Stub — full implementation in Phase 6
  res.json({ message: 'Tracking resumed (stub)', tracking_active: true });
});

export default router;

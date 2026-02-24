import { Router, Request, Response } from 'express';

const router = Router();

router.post('/email-inbound', async (req: Request, res: Response) => {
  // Stub — full implementation in Phase 7
  console.log('Received inbound email webhook (stub)');
  res.json({ message: 'Email inbound webhook received (stub)' });
});

export default router;

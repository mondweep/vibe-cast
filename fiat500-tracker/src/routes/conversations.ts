import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  // Stub — full implementation in Phase 7
  res.status(201).json({
    message: 'Conversation draft created (stub)',
    listing_id: req.body.listing_id,
    template: req.body.template,
  });
});

router.get('/', async (_req: Request, res: Response) => {
  res.json([]);
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  res.json({ message: 'Conversation approved (stub)', id: req.params.id });
});

router.post('/:id/reply', async (req: Request, res: Response) => {
  res.json({ message: 'Reply draft created (stub)', id: req.params.id });
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  res.json({ message: 'Conversation rejected (stub)', id: req.params.id });
});

export default router;

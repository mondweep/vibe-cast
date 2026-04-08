import type { NextApiRequest, NextApiResponse } from 'next';
import { getTicket } from '@/lib/db';
import { classifyTicket } from '@/agents/intake-agent';

/**
 * Manual trigger to classify a single ticket
 * POST /api/agents/classify?ticketId=...
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;

    if (typeof ticketId !== 'string') {
      return res.status(400).json({ error: 'ticketId is required' });
    }

    // Get ticket
    const ticket = getTicket(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Classify
    const classification = await classifyTicket(ticket);

    res.status(200).json(classification);
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({
      error: 'Classification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

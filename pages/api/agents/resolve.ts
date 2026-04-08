import type { NextApiRequest, NextApiResponse } from 'next';
import { getTicket } from '@/lib/db';
import { resolveBillingTicket } from '@/agents/billing-specialist';
import { resolveTechnicalTicket } from '@/agents/technical-specialist';
import { resolveAccountTicket } from '@/agents/account-manager';

/**
 * Trigger resolution for a classified ticket
 * POST /api/agents/resolve?ticketId=...
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

    const ticket = getTicket(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!ticket.category) {
      return res.status(400).json({ error: 'Ticket must be classified first' });
    }

    let resolution: any;

    // Route to appropriate specialist
    switch (ticket.category) {
      case 'billing':
        resolution = await resolveBillingTicket(ticket);
        break;
      case 'technical':
        resolution = await resolveTechnicalTicket(ticket);
        break;
      case 'account':
        resolution = await resolveAccountTicket(ticket);
        break;
      case 'feature-request':
        resolution = {
          ticketId,
          resolution: 'Feature request created and added to product backlog',
          escalationRequired: false
        };
        break;
      default:
        return res.status(400).json({ error: `Unknown category: ${ticket.category}` });
    }

    res.status(200).json(resolution);
  } catch (error) {
    console.error('Resolution error:', error);
    res.status(500).json({
      error: 'Resolution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

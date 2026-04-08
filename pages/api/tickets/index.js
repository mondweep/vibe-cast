import type { NextApiRequest, NextApiResponse } from 'next';
import { getTickets, createTicket, getTicketCounts } from '@/lib/db';
import { emitEvent } from '@/lib/events';
import { TicketInput, ListTicketsResponse } from '@/lib/types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    handleGet(req, res);
  } else if (req.method === 'POST') {
    handlePost(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function handleGet(req: NextApiRequest, res: NextApiResponse<ListTicketsResponse>) {
  try {
    const { status, limit = '100', offset = '0' } = req.query;

    const tickets = getTickets(
      status as string | undefined,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    const counts = getTicketCounts();

    res.status(200).json({
      tickets,
      ...counts
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      tickets: [],
      total: 0,
      pending: 0,
      resolved: 0,
      escalated: 0
    });
  }
}

function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const input = req.body as TicketInput;

    // Validate input
    if (!input.customerName || !input.email || !input.subject || !input.description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create ticket
    const ticket = createTicket({
      customerName: input.customerName,
      email: input.email,
      subject: input.subject,
      description: input.description
    });

    // Emit event
    emitEvent('ticket.created', {
      ticketId: ticket.id,
      timestamp: new Date().toISOString(),
      data: { ticket }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
}

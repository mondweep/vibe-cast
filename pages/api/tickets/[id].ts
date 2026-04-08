import type { NextApiRequest, NextApiResponse } from 'next';
import { getTicket, updateTicket, addAgentLog } from '@/lib/db';
import { emitEvent } from '@/lib/events';
import { Ticket } from '@/lib/types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  if (req.method === 'GET') {
    handleGet(id, res);
  } else if (req.method === 'PATCH') {
    handlePatch(id, req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function handleGet(id: string, res: NextApiResponse) {
  try {
    const ticket = getTicket(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
}

function handlePatch(id: string, req: NextApiRequest, res: NextApiResponse<Ticket>) {
  try {
    const ticket = getTicket(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' } as any);
    }

    const updates = req.body;
    const { agentId, action, reasoning, tokensUsed, ...ticketUpdates } = updates;

    // Update ticket (atomic operation wrapped in transaction)
    const updated = updateTicket(id, ticketUpdates);

    // Log agent action if provided
    if (agentId && action) {
      addAgentLog({
        ticketId: id,
        agentId,
        action,
        reasoning,
        tokensUsed
      });
    }

    // Emit event based on action
    if (action === 'classified') {
      emitEvent('ticket.classified', {
        ticketId: id,
        agentId,
        timestamp: new Date().toISOString(),
        data: {
          category: ticketUpdates.category,
          priority: ticketUpdates.priority
        }
      });
    } else if (action === 'assigned') {
      emitEvent('ticket.assigned', {
        ticketId: id,
        agentId,
        timestamp: new Date().toISOString(),
        data: { assignedTo: agentId }
      });
    } else if (action === 'resolved') {
      emitEvent('ticket.resolved', {
        ticketId: id,
        agentId,
        timestamp: new Date().toISOString(),
        data: { resolution: ticketUpdates.resolution }
      });
    } else if (action === 'escalated') {
      emitEvent('ticket.escalated', {
        ticketId: id,
        agentId,
        timestamp: new Date().toISOString(),
        data: { escalationReason: reasoning }
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' } as any);
  }
}

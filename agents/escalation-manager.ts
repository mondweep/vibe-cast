import { Ticket, EscalationReview } from '@/lib/types';
import { getTicket, updateTicket, addAgentLog, query } from '@/lib/db';
import { emitEvent } from '@/lib/events';

const AGENT_ID = 'escalation-manager';

/**
 * Review escalation and decide if justified
 */
export async function reviewEscalation(ticketId: string, escalationReason: string): Promise<EscalationReview> {
  const startTime = Date.now();

  try {
    const ticket = getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    console.log(`⬆️  [${AGENT_ID}] Reviewing escalation: ${ticketId}`);

    // Get agent logs to understand context
    const logs = query<any>(
      'SELECT * FROM agent_logs WHERE ticket_id = ? ORDER BY timestamp DESC LIMIT 1',
      [ticketId]
    );

    const lastLog = logs[0];
    const fromAgent = lastLog?.agent_id || 'unknown';

    // Determine if escalation is justified based on reason
    const isJustified = shouldEscalate(escalationReason, ticket);

    const reviewedAt = new Date().toISOString();

    const review: EscalationReview = {
      ticketId,
      originalAgentId: fromAgent,
      escalationReason,
      isJustified,
      reviewedAt,
      humanNotificationSent: isJustified,
      status: isJustified ? 'pending-human' : 'rejected-reassign'
    };

    // Log the review
    addAgentLog({
      ticketId,
      agentId: AGENT_ID,
      action: 'escalation_reviewed',
      reasoning: `Escalation ${isJustified ? 'approved' : 'rejected'}: ${escalationReason}`,
      tokensUsed: 50 // Minimal tokens for review
    });

    // Update ticket status
    if (isJustified) {
      updateTicket(ticketId, {
        status: 'pending-human'
      });

      emitEvent('ticket.needs-human-review', {
        ticketId,
        agentId: AGENT_ID,
        timestamp: new Date().toISOString(),
        data: {
          escalationReason,
          fromAgent
        }
      });

      console.log(`✅ [${AGENT_ID}] Escalation approved after ${Date.now() - startTime}ms`);
    } else {
      // Reassign to appropriate agent
      const nextAgent = getReassignmentAgent(ticket);
      updateTicket(ticketId, {
        status: 'assigned',
        current_agent_id: nextAgent
      });

      emitEvent('ticket.assigned', {
        ticketId,
        agentId: nextAgent,
        timestamp: new Date().toISOString(),
        data: { reassigned: true }
      });

      console.log(`⏸️  [${AGENT_ID}] Escalation rejected, reassigned to ${nextAgent} after ${Date.now() - startTime}ms`);
    }

    return review;
  } catch (error) {
    console.error(`❌ [${AGENT_ID}] Review failed:`, error);

    // Fallback: approve if we can't process
    return {
      ticketId,
      originalAgentId: 'unknown',
      escalationReason,
      isJustified: true,
      reviewedAt: new Date().toISOString(),
      humanNotificationSent: true,
      status: 'pending-human'
    };
  }
}

/**
 * Determine if escalation is justified
 */
function shouldEscalate(reason: string, ticket: Ticket): boolean {
  const lowerReason = reason.toLowerCase();

  // Always escalate for these
  const escalateKeywords = [
    'security',
    'breach',
    'fraud',
    'data loss',
    'cannot determine',
    'out of scope',
    'engineering',
    'investigation',
    'critical',
    'requires human',
    'business impact',
    'legal',
    'chargeback'
  ];

  for (const keyword of escalateKeywords) {
    if (lowerReason.includes(keyword)) {
      return true;
    }
  }

  // Escalate high/critical priority
  if (ticket.priority === 'critical' || ticket.priority === 'high') {
    return true;
  }

  // Escalate feature requests
  if (ticket.category === 'feature-request') {
    return true;
  }

  return false;
}

/**
 * Determine which agent to reassign to
 */
function getReassignmentAgent(ticket: Ticket): string {
  const agentMap: { [key: string]: string } = {
    'billing': 'billing-specialist',
    'technical': 'technical-specialist',
    'account': 'account-manager',
    'feature-request': 'escalation-manager'
  };

  return agentMap[ticket.category || 'technical'] || 'technical-specialist';
}

/**
 * Process all escalated tickets
 */
export async function processEscalations(): Promise<EscalationReview[]> {
  try {
    const escalatedTickets = query<Ticket>(
      `SELECT * FROM tickets WHERE status = 'escalated' LIMIT 100`
    );

    console.log(`📦 [${AGENT_ID}] Processing ${escalatedTickets.length} escalations`);

    const results: EscalationReview[] = [];

    for (const ticket of escalatedTickets) {
      // Get the escalation reason from last log
      const logs = query<any>(
        'SELECT * FROM agent_logs WHERE ticket_id = ? AND action = ? ORDER BY timestamp DESC LIMIT 1',
        [ticket.id, 'escalated']
      );

      const escalationReason = logs[0]?.reasoning || 'Escalated for review';
      const review = await reviewEscalation(ticket.id, escalationReason);
      results.push(review);
    }

    console.log(`✅ [${AGENT_ID}] Processed ${results.length} escalations`);
    return results;
  } catch (error) {
    console.error(`❌ [${AGENT_ID}] Escalation processing failed:`, error);
    return [];
  }
}

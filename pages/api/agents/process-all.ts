import type { NextApiRequest, NextApiResponse } from 'next';
import { getTickets, setAgentActivity } from '@/lib/db';
import { classifyTickets } from '@/agents/intake-agent';
import { resolveBillingTicket } from '@/agents/billing-specialist';
import { resolveTechnicalTicket } from '@/agents/technical-specialist';
import { resolveAccountTicket } from '@/agents/account-manager';
import { processEscalations } from '@/agents/escalation-manager';

/**
 * End-to-end processing of all tickets
 * POST /api/agents/process-all
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();

    // Step 1: Classify unclassified tickets
    const unclassified = getTickets('new', 1000, 0);
    console.log(`\n🚀 PHASE 1: Classifying ${unclassified.length} tickets...`);
    
    if (unclassified.length > 0) {
      setAgentActivity('intake-agent', `Classifying ${unclassified.length} new tickets...`);
    }
    
    const classified = await classifyTickets(unclassified);
    setAgentActivity('intake-agent', null);

    // Step 2: Resolve by category (Uncapped for Cloud Run)
    console.log(`\n🚀 PHASE 2: Resolving classified tickets (Full batch)...`);
    const ticketsToResolve = getTickets('classified', 100, 0); 

    let resolved = 0;
    for (const ticket of ticketsToResolve) {
      const agentId = `${ticket.category}-specialist` === 'technical-specialist' ? 'technical-specialist' :
                      `${ticket.category}-specialist` === 'billing-specialist' ? 'billing-specialist' :
                      ticket.category === 'account' ? 'account-manager' : null;
      
      try {
        if (agentId) {
          setAgentActivity(agentId, `Analyzing Ticket #${ticket.id.split('-').pop()}: "${ticket.subject}"`);
        }

        switch (ticket.category) {
          case 'billing':
            await resolveBillingTicket(ticket);
            break;
          case 'technical':
            await resolveTechnicalTicket(ticket);
            break;
          case 'account':
            await resolveAccountTicket(ticket);
            break;
          case 'feature-request':
            // Feature requests skip specialist resolution
            break;
        }

        if (agentId) {
          setAgentActivity(agentId, null);
        }
        resolved++;
      } catch (error) {
        console.error(`Failed to resolve ${ticket.id}:`, error);
        if (agentId) setAgentActivity(agentId, null);
      }
    }

    // Step 3: Process escalations
    console.log(`\n🚀 PHASE 3: Processing escalations...`);
    setAgentActivity('escalation-manager', 'Reviewing system escalations...');
    const escalationResults = await processEscalations();
    setAgentActivity('escalation-manager', null);

    const elapsedMs = Date.now() - startTime;
    const totalTickets = getTickets('', 1000, 0).length;

    res.status(200).json({
      message: 'All-in-one processing complete',
      timestamp: new Date().toISOString(),
      elapsedMs,
      summary: {
        totalTickets,
        classified: classified.length,
        resolved,
        escalated: escalationResults.length
      }
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

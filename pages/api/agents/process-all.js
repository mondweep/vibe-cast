import type { NextApiRequest, NextApiResponse } from 'next';
import { getTickets } from '@/lib/db';
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
    const classified = await classifyTickets(unclassified);

    // Step 2: Resolve by category
    console.log(`\n🚀 PHASE 2: Resolving classified tickets...`);
    const ticketsToResolve = getTickets('classified', 1000, 0);

    let resolved = 0;
    for (const ticket of ticketsToResolve) {
      try {
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
        resolved++;
      } catch (error) {
        console.error(`Failed to resolve ${ticket.id}:`, error);
      }

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 3: Process escalations
    console.log(`\n🚀 PHASE 3: Processing escalations...`);
    const escalationResults = await processEscalations();

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

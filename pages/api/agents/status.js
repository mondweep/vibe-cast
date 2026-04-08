import type { NextApiRequest, NextApiResponse } from 'next';
import { getAgentStatus } from '@/lib/db';
import { AgentsStatusResponse, AgentStatus } from '@/lib/types';

const AGENTS = ['intake-agent', 'billing-specialist', 'technical-specialist', 'account-manager', 'escalation-manager'];

export default function handler(req: NextApiRequest, res: NextApiResponse<AgentsStatusResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ agents: [], timestamp: new Date().toISOString() });
  }

  try {
    const agents: AgentStatus[] = AGENTS.map(agentId => {
      const status = getAgentStatus(agentId);

      return {
        id: agentId,
        status: 'idle',
        currentTicketId: null,
        tokensUsed: status.tokensUsed,
        monthlyBudget: status.monthlyBudget,
        percentBudgetUsed: status.percentBudgetUsed,
        avgResponseTimeMs: status.avgResponseTimeMs
      };
    });

    res.status(200).json({
      agents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agent status:', error);
    res.status(500).json({
      agents: [],
      timestamp: new Date().toISOString()
    });
  }
}

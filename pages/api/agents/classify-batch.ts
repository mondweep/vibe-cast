import type { NextApiRequest, NextApiResponse } from 'next';
import { getTickets } from '@/lib/db';
import { classifyTickets } from '@/agents/intake-agent';

/**
 * Batch classify all unclassified tickets
 * POST /api/agents/classify-batch
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get unclassified tickets
    const unclassified = getTickets('new', 1000, 0);

    if (unclassified.length === 0) {
      return res.status(200).json({
        message: 'No unclassified tickets',
        classified: 0,
        results: []
      });
    }

    console.log(`🚀 Batch classifying ${unclassified.length} tickets...`);

    // Classify
    const results = await classifyTickets(unclassified);

    res.status(200).json({
      message: `Classified ${results.length} tickets`,
      classified: results.length,
      results
    });
  } catch (error) {
    console.error('Batch classification error:', error);
    res.status(500).json({
      error: 'Batch classification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

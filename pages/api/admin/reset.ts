import type { NextApiRequest, NextApiResponse } from 'next';
import { resetDatabase } from '@/lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    resetDatabase();
    res.status(200).json({ 
      message: 'Demo environment reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset demo environment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

import { Handler } from '@netlify/functions';

/**
 * Vote Netlify Function
 *
 * Submits a vote (upvote or downvote) for an existing memory in the pi.ruv.io network.
 *
 * Reference: SPEC-001 API Contracts
 */

interface VoteRequest {
  memoryId: string;
  vote: 1 | -1; // 1 for upvote, -1 for downvote
}

interface VoteResponse {
  memoryId: string;
  voteCount: number;
  userVote: 1 | -1 | null;
  timestamp: string;
}

export const handler: Handler = async (event, context) => {
  try {
    // Validate required headers
    const apiKey = event.headers['x-api-key'];

    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required header: x-api-key',
        }),
      };
    }

    // Parse request body
    let body: VoteRequest;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { memoryId, vote } = body;

    // Validate input
    if (!memoryId || typeof memoryId !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'memoryId is required and must be a string' }),
      };
    }

    if (vote !== 1 && vote !== -1) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Vote must be 1 (upvote) or -1 (downvote)',
        }),
      };
    }

    console.log(`[VOTE] MemoryId: "${memoryId}", Vote: ${vote}`);

    // TODO: Implement pi.ruv.io API integration
    // This is a stub that returns mock vote confirmation for development
    const mockResponse: VoteResponse = {
      memoryId,
      voteCount: 42,
      userVote: vote,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockResponse),
    };
  } catch (error: any) {
    console.error('[VOTE] Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Vote failed',
        details: error.message,
      }),
    };
  }
};

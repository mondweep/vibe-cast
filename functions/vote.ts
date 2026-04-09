import { Handler } from '@netlify/functions';
import { voteOnMemory, PiNetworkApiError } from '../src/services/piNetworkAPI';
import { corsHeaders, isPreflight, preflightResponse } from '../src/utils/cors';

/**
 * Vote Netlify Function
 *
 * Submits a vote (upvote or downvote) for an existing memory in the pi.ruv.io network.
 * Vote is applied immediately; confirmation returned directly (no async PubNub needed for votes).
 *
 * Reference: SPEC-001 API Contracts
 */

interface VoteRequest {
  memoryId: string;
  vote: 1 | -1; // 1 for upvote, -1 for downvote
}

export const handler: Handler = async (event) => {
  // Handle OPTIONS preflight request
  if (isPreflight(event)) {
    return preflightResponse;
  }

  try {
    // Validate required headers
    const encodedApiKey = event.headers['x-api-key'];

    if (!encodedApiKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required header: x-api-key',
        }),
      };
    }

    // Decode API key from Base64
    let apiKey: string;
    try {
      apiKey = Buffer.from(encodedApiKey, 'base64').toString('utf8');
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid API key encoding' }),
      };
    }

    // Parse request body
    let body: VoteRequest;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { memoryId, vote } = body;

    // Validate input
    if (!memoryId || typeof memoryId !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'memoryId is required and must be a string' }),
      };
    }

    if (vote !== 1 && vote !== -1) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Vote must be 1 (upvote) or -1 (downvote)',
        }),
      };
    }

    console.log(
      `[VOTE] MemoryId: "${memoryId}", Vote: ${vote > 0 ? 'upvote' : 'downvote'}`,
    );

    // Submit vote to pi network
    const result = await voteOnMemory(memoryId, vote, {
      apiKey,
      timeout: 5000, // Votes are quick operations
    });

    console.log(
      `[VOTE] Vote recorded: ${result.voteCount || 0} total votes on memory`,
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        memoryId: result.memoryId || memoryId,
        voteCount: result.voteCount || 0,
        userVote: vote,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('[VOTE] Error:', error);

    // Handle known Pi Network API errors
    if (error instanceof PiNetworkApiError) {
      return {
        statusCode: error.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: error.code,
          message: error.message,
          timestamp: error.timestamp,
        }),
      };
    }

    // Generic server error
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'VOTE_FAILED',
        message: error.message || 'Vote failed',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

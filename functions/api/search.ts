import { Handler } from '@netlify/functions';
import { searchPiNetwork, PiNetworkApiError } from '../../src/services/piNetworkAPI';
import { getPubNubClient, publishMessage, getChannelName } from '../../src/services/pubnubService';

/**
 * Search Netlify Function
 *
 * Queries the pi.ruv.io network for knowledge matching a search query.
 * Results are published to PubNub channel for real-time delivery (<500ms latency).
 *
 * Reference: SPEC-001 API Contracts, ADR-002 (PubNub real-time)
 */

interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  domain?: string;
}

export const handler: Handler = async (event) => {
  try {
    // Validate required headers
    const apiKey = event.headers['x-api-key'];
    const sessionId = event.headers['x-session-id'];

    if (!apiKey || !sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required headers: x-api-key, x-session-id',
        }),
      };
    }

    // Parse request body
    let body: SearchRequest;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { query, limit = 10, offset = 0, domain } = body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Query is required and must be a non-empty string' }),
      };
    }

    console.log(`[SEARCH] Query: "${query}", SessionId: ${sessionId}`);

    // Query pi network
    const searchResults = await searchPiNetwork(query, {
      apiKey,
      limit,
      offset,
      domain,
      timeout: 8000, // 8 seconds per SPEC-001, fits within Netlify 10s timeout
      retries: 2,
    });

    console.log(`[SEARCH] Found ${searchResults.results.length} results`);

    // Initialize PubNub and publish results
    const pubNub = getPubNubClient();
    const channel = getChannelName('search_results', sessionId);

    await publishMessage(pubNub, {
      channel,
      message: searchResults,
    });

    console.log(`[SEARCH] Published results to PubNub channel: ${channel}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'published',
        channel,
        resultCount: searchResults.results.length,
      }),
    };
  } catch (error: any) {
    console.error('[SEARCH] Error:', error);

    // Handle known Pi Network API errors
    if (error instanceof PiNetworkApiError) {
      const statusCode = error.status;
      const isClientError = statusCode >= 400 && statusCode < 500;

      return {
        statusCode,
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
      body: JSON.stringify({
        error: 'SEARCH_FAILED',
        message: error.message || 'Search failed',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

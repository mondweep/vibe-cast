import { Handler } from '@netlify/functions';
import { searchPiNetwork, PiNetworkApiError } from '../src/services/piNetworkAPI';
import { getPubNubClient, publishMessage, getChannelName } from '../src/services/pubnubService';
import { corsHeaders, isPreflight, preflightResponse } from '../src/utils/cors';

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
  // Handle OPTIONS preflight request
  if (isPreflight(event)) {
    return preflightResponse;
  }

  try {
    // Validate required headers
    const encodedApiKey = event.headers['x-api-key'];
    const sessionId = event.headers['x-session-id'];

    if (!encodedApiKey || !sessionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required headers: x-api-key, x-session-id',
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
    let body: SearchRequest;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { query, limit = 10, offset = 0, domain } = body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
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
    // Strip 'embedding' arrays from results before publishing — they are large float arrays
    // (~1KB each) used for semantic search by the Pi Network but not needed by the frontend.
    // Without stripping, payloads can exceed PubNub's 32KB message limit.
    const pubNub = getPubNubClient();
    const channel = getChannelName('search_results', sessionId);

    const slimResults = {
      ...searchResults,
      results: searchResults.results.map(({ ...r }: any) => {
        delete r.embedding;
        if (r.content && r.content.length > 600) {
          r.content = r.content.substring(0, 600) + '...';
        }
        return r;
      }),
    };

    await publishMessage(pubNub, {
      channel,
      message: slimResults,
    });

    console.log(`[SEARCH] Published results to PubNub channel: ${channel}`);

    return {
      statusCode: 200,
      headers: corsHeaders,
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

      return {
        statusCode,
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
        error: 'SEARCH_FAILED',
        message: error.message || 'Search failed',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

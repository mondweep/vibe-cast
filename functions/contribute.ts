import { Handler } from '@netlify/functions';
import { contributeToPiNetwork, PiNetworkApiError } from '../src/services/piNetworkAPI';
import { getPubNubClient, publishMessage, getChannelName } from '../src/services/pubnubService';
import { corsHeaders, isPreflight, preflightResponse } from '../src/utils/cors';

/**
 * Contribute Netlify Function
 *
 * Submits new knowledge (memories) to the pi.ruv.io network.
 * Confirmation is published to PubNub channel for real-time feedback (<500ms latency).
 *
 * Reference: SPEC-001 API Contracts, ADR-002 (PubNub real-time)
 */

interface ContributeRequest {
  title: string;
  content: string;
  domain: string;
  tags?: string[];
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
    let body: ContributeRequest;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { title, content, domain, tags = [] } = body;

    // Validate input per SPEC-001 acceptance criteria
    if (!title || typeof title !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Title is required and must be a string' }),
      };
    }

    if (title.length < 1 || title.length > 200) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Title must be between 1 and 200 characters',
        }),
      };
    }

    if (!content || typeof content !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Content is required and must be a string' }),
      };
    }

    if (content.length < 10 || content.length > 5000) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Content must be between 10 and 5000 characters',
        }),
      };
    }

    if (!domain || typeof domain !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Domain is required and must be a string' }),
      };
    }

    console.log(`[CONTRIBUTE] Title: "${title}", Domain: "${domain}", SessionId: ${sessionId}`);

    // Submit to pi network
    const result = await contributeToPiNetwork(
      {
        title,
        content,
        domain,
        tags,
      },
      {
        apiKey,
        timeout: 8000, // 8 seconds per SPEC-001
      },
    );

    console.log(`[CONTRIBUTE] Submitted memory: ${result.memoryId || 'unknown'}`);

    // Initialize PubNub and publish confirmation
    const pubNub = getPubNubClient();
    const channel = getChannelName('contribution_updates', sessionId);

    await publishMessage(pubNub, {
      channel,
      message: {
        memoryId: result.memoryId,
        status: result.status || 'accepted',
        message: result.message || 'Knowledge accepted into the network',
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[CONTRIBUTE] Published confirmation to PubNub channel: ${channel}`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'published',
        channel,
        memoryId: result.memoryId,
      }),
    };
  } catch (error: any) {
    console.error('[CONTRIBUTE] Error:', error);

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
        error: 'CONTRIBUTION_FAILED',
        message: error.message || 'Contribution failed',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

import { Handler } from '@netlify/functions';

/**
 * Contribute Netlify Function
 *
 * Submits new knowledge (memories) to the pi.ruv.io network.
 * Confirmation is published to PubNub channel for real-time feedback.
 *
 * Reference: SPEC-001 API Contracts
 */

interface ContributeRequest {
  title: string;
  content: string;
  domain: string;
  tags?: string[];
}

interface ContributionResponse {
  memoryId: string;
  status: 'accepted' | 'pending' | 'rejected';
  message: string;
  timestamp: string;
}

export const handler: Handler = async (event, context) => {
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
    let body: ContributeRequest;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { title, content, domain, tags = [] } = body;

    // Validate input per SPEC-001 acceptance criteria
    if (!title || typeof title !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Title is required and must be a string' }),
      };
    }

    if (title.length < 1 || title.length > 200) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Title must be between 1 and 200 characters',
        }),
      };
    }

    if (!content || typeof content !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Content is required and must be a string' }),
      };
    }

    if (content.length < 10 || content.length > 5000) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Content must be between 10 and 5000 characters',
        }),
      };
    }

    if (!domain || typeof domain !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Domain is required and must be a string' }),
      };
    }

    console.log(`[CONTRIBUTE] Title: "${title}", Domain: "${domain}", SessionId: ${sessionId}`);

    // TODO: Implement pi.ruv.io API integration
    // This is a stub that returns mock confirmation for development
    const mockResponse: ContributionResponse = {
      memoryId: `mem_${Date.now()}`,
      status: 'accepted',
      message: 'Knowledge accepted into the network',
      timestamp: new Date().toISOString(),
    };

    // TODO: Publish to PubNub channel `contribution_updates_${sessionId}`
    // Using PubNub SDK to deliver confirmation in real-time

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'published',
        channel: `contribution_updates_${sessionId}`,
      }),
    };
  } catch (error: any) {
    console.error('[CONTRIBUTE] Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Contribution failed',
        details: error.message,
      }),
    };
  }
};

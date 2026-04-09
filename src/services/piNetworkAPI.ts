/**
 * Pi Network API Client
 *
 * Wraps the pi.ruv.io REST API with error handling, timeouts, and retries.
 * This service is used by Netlify Functions to communicate with the pi network.
 *
 * Reference: SPEC-001 API Contracts
 */

import type { SearchResponse } from '../types';

interface FetchOptions {
  apiKey: string;
  timeout?: number;
  retries?: number;
}

interface PiNetworkError {
  code: string;
  message: string;
  status: number;
  timestamp: string;
}

/**
 * Search the pi network knowledge graph
 */
export async function searchPiNetwork(
  query: string,
  options: FetchOptions & { limit?: number; offset?: number; domain?: string },
): Promise<SearchResponse> {
  const {
    apiKey,
    timeout = 8000,
    retries = 2,
    limit = 10,
    offset = 0,
    domain,
  } = options;

  const piNetworkUrl = process.env.PI_NETWORK_API_URL || 'https://pi.ruv.io';

  const requestBody = {
    query,
    limit,
    offset,
    ...(domain && { domain }),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `[PI_API] Search attempt ${attempt + 1}/${retries + 1}: "${query}"`,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${piNetworkUrl}/api/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const errorMessage = `HTTP ${response.status}: ${errorText}`;

        if (response.status === 401) {
          throw new PiNetworkApiError('INVALID_API_KEY', 'Invalid or expired API key', 401);
        }

        if (response.status === 429) {
          if (attempt < retries) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.warn(`[PI_API] Rate limited. Waiting ${waitTime}ms before retry...`);
            await sleep(waitTime);
            continue;
          }
          throw new PiNetworkApiError('RATE_LIMITED', 'API rate limit exceeded', 429);
        }

        throw new PiNetworkApiError('API_ERROR', errorMessage, response.status);
      }

      const result = await response.json();

      // Validate response shape
      if (!Array.isArray(result.results)) {
        throw new PiNetworkApiError(
          'INVALID_RESPONSE',
          'Response missing results array',
          500,
        );
      }

      console.log(`[PI_API] Search succeeded: ${result.results.length} results`);

      return {
        results: result.results,
        totalCount: result.totalCount || result.results.length,
        executionTime: result.executionTime || 0,
      };
    } catch (error: any) {
      lastError = error;

      // Don't retry on auth errors
      if (error instanceof PiNetworkApiError && error.code === 'INVALID_API_KEY') {
        throw error;
      }

      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        console.error(`[PI_API] Search timed out after ${timeout}ms`);
        lastError = new PiNetworkApiError('TIMEOUT', `Request timeout after ${timeout}ms`, 408);

        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(
            `[PI_API] Timeout on attempt ${attempt + 1}. Retrying in ${waitTime}ms...`,
          );
          await sleep(waitTime);
          continue;
        }
      }

      // Retry on network errors
      if (attempt < retries && !error.message?.includes('Invalid')) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(
          `[PI_API] Error on attempt ${attempt + 1}. Retrying in ${waitTime}ms...`,
        );
        await sleep(waitTime);
        continue;
      }

      break;
    }
  }

  throw lastError || new Error('Search failed after retries');
}

/**
 * Contribute new knowledge to the pi network
 */
export async function contributeToPiNetwork(
  memory: {
    title: string;
    content: string;
    domain: string;
    tags?: string[];
  },
  options: FetchOptions,
): Promise<any> {
  const { apiKey, timeout = 8000 } = options;
  const piNetworkUrl = process.env.PI_NETWORK_API_URL || 'https://pi.ruv.io';

  try {
    console.log(`[PI_API] Contribute: "${memory.title}"`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${piNetworkUrl}/api/memories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memory),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');

      if (response.status === 401) {
        throw new PiNetworkApiError('INVALID_API_KEY', 'Invalid or expired API key', 401);
      }

      if (response.status === 400) {
        throw new PiNetworkApiError('INVALID_DATA', errorText, 400);
      }

      throw new PiNetworkApiError('API_ERROR', errorText, response.status);
    }

    const result = await response.json();

    console.log(`[PI_API] Contribution succeeded: ${result.memoryId || 'unknown'}`);

    return result;
  } catch (error: any) {
    if (error instanceof PiNetworkApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new PiNetworkApiError('TIMEOUT', `Request timeout after ${timeout}ms`, 408);
    }

    throw new PiNetworkApiError('API_ERROR', error.message, 500);
  }
}

/**
 * Vote on a memory in the pi network
 */
export async function voteOnMemory(
  memoryId: string,
  vote: 1 | -1,
  options: FetchOptions,
): Promise<any> {
  const { apiKey, timeout = 5000 } = options;
  const piNetworkUrl = process.env.PI_NETWORK_API_URL || 'https://pi.ruv.io';

  try {
    console.log(`[PI_API] Vote: ${vote > 0 ? 'upvote' : 'downvote'} on ${memoryId}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${piNetworkUrl}/api/memories/${memoryId}/vote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vote }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');

      if (response.status === 401) {
        throw new PiNetworkApiError('INVALID_API_KEY', 'Invalid or expired API key', 401);
      }

      if (response.status === 404) {
        throw new PiNetworkApiError('NOT_FOUND', 'Memory not found', 404);
      }

      throw new PiNetworkApiError('API_ERROR', errorText, response.status);
    }

    const result = await response.json();

    console.log(`[PI_API] Vote succeeded: ${result.voteCount || 0} total votes`);

    return result;
  } catch (error: any) {
    if (error instanceof PiNetworkApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new PiNetworkApiError('TIMEOUT', `Request timeout after ${timeout}ms`, 408);
    }

    throw new PiNetworkApiError('API_ERROR', error.message, 500);
  }
}

/**
 * Custom error class for Pi Network API errors
 */
export class PiNetworkApiError extends Error implements PiNetworkError {
  code: string;
  status: number;
  timestamp: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'PiNetworkApiError';
    this.code = code;
    this.status = status;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Sleep helper for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

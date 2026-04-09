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

      const bearerToken = `Bearer ${encodeURIComponent(apiKey)}`;

      const url = new URL(`${piNetworkUrl}/v1/memories/search`);
      url.searchParams.append('q', query);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());
      if (domain) {
        url.searchParams.append('domain', domain);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': bearerToken,
          'Content-Type': 'application/json',
        },
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

      // API returns a raw array of memory objects
      const results = Array.isArray(result) ? result : (result.results || result.memories || []);

      // Validate response shape
      if (!Array.isArray(results)) {
        throw new PiNetworkApiError(
          'INVALID_RESPONSE',
          'Unexpected response format from Pi Network API',
          500,
        );
      }

      console.log(`[PI_API] Search succeeded: ${results.length} results`);

      return {
        results: results.map((m: any) => ({
          id: m.id,
          title: m.title || 'Untitled',
          content: m.content || '',
          score: m.score ?? m.bayesian_score ?? 0.5,
          domain: typeof m.category === 'string' 
            ? m.category 
            : (m.category?.custom || m.domain || 'general'),
          authorPseudonym: m.author_pseudonym || m.authorId || 'anonymous',
          createdAt: m.created_at || m.createdAt || new Date().toISOString(),
          votes: m.votes || { up: 0, down: 0 },
        })),
        totalCount: results.length,
        executionTime: 0,
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

    const bearerToken = `Bearer ${encodeURIComponent(apiKey)}`;

    const ALLOWED_CATEGORIES = new Set([
      'architecture', 'pattern', 'solution', 'convention', 'security', 'performance', 
      'tooling', 'debug', 'sota', 'discovery', 'hypothesis', 'cross_domain', 
      'neural_architecture', 'compression', 'self_learning', 'reinforcement_learning', 
      'graph_intelligence', 'distributed_systems', 'edge_computing', 'hardware_acceleration', 
      'quantum', 'neuromorphic', 'bio_computing', 'cognitive_science', 'formal_methods', 
      'geopolitics', 'climate', 'biomedical', 'space', 'finance', 'meta_cognition', 
      'benchmark', 'consciousness', 'information_decomposition'
    ]);

    const providedDomain = (memory.domain || 'general').toLowerCase();
    const categoryPayload = ALLOWED_CATEGORIES.has(providedDomain) 
      ? providedDomain 
      : { custom: providedDomain };

    // The API expects 'category' instead of 'domain', and requires specific enum variants
    const apiPayload = {
      title: memory.title,
      content: memory.content,
      category: categoryPayload,
      tags: memory.tags || [],
    };

    const response = await fetch(`${piNetworkUrl}/v1/memories`, {
      method: 'POST',
      headers: {
        'Authorization': bearerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
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

    const bearerToken = `Bearer ${encodeURIComponent(apiKey)}`;

    const response = await fetch(`${piNetworkUrl}/v1/memories/${memoryId}/vote`, {
      method: 'POST',
      headers: {
        'Authorization': bearerToken,
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

/**
 * Fetch a full, unabridged memory by its exact ID directly from pi.ruv.io
 */
export async function getMemoryById(
  memoryId: string,
  options: FetchOptions,
): Promise<any> {
  const { apiKey, timeout = 5000 } = options;
  const piNetworkUrl = process.env.PI_NETWORK_API_URL || 'https://pi.ruv.io';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const bearerToken = `Bearer ${encodeURIComponent(apiKey)}`;

    const response = await fetch(`${piNetworkUrl}/v1/memories/${memoryId}`, {
      method: 'GET',
      headers: { 'Authorization': bearerToken },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new PiNetworkApiError('API_ERROR', errorText, response.status);
    }
    
    return await response.json();
  } catch (error: any) {
    if (error instanceof PiNetworkApiError) throw error;
    if (error.name === 'AbortError') throw new PiNetworkApiError('TIMEOUT', `Request timeout`, 408);
    throw new PiNetworkApiError('NETWORK_ERROR', error.message, 0);
  }
}

/**
 * Permanently delete a memory by ID (requires the author's precise API key)
 */
export async function deleteMemoryById(
  memoryId: string,
  options: FetchOptions,
): Promise<boolean> {
  const { apiKey, timeout = 5000 } = options;
  const piNetworkUrl = process.env.PI_NETWORK_API_URL || 'https://pi.ruv.io';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const bearerToken = `Bearer ${encodeURIComponent(apiKey)}`;

    const response = await fetch(`${piNetworkUrl}/v1/memories/${memoryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': bearerToken },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new PiNetworkApiError('FORBIDDEN', 'You do not have permission to delete this memory', response.status);
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new PiNetworkApiError('API_ERROR', errorText, response.status);
    }
    
    return true; // 204 No Content typically means success
  } catch (error: any) {
    if (error instanceof PiNetworkApiError) throw error;
    if (error.name === 'AbortError') throw new PiNetworkApiError('TIMEOUT', `Request timeout`, 408);
    throw new PiNetworkApiError('NETWORK_ERROR', error.message, 0);
  }
}

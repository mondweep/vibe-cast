import { FastifyRequest, FastifyReply } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../shared/infrastructure/logging/Logger';

/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header with two key types:
 * - Publishable keys (pk_*): Read-only access
 * - Secret keys (sk_*): Full access (read/write)
 *
 * Write operations (POST, PUT, DELETE) require secret keys
 * Read operations can use either key type
 */

export interface ApiKeyContext {
  keyType: 'publishable' | 'secret';
  keyId: string;
}

declare global {
  namespace FastifyInstance {
    interface FastifyInstance {
      apiKeyContext?: ApiKeyContext;
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyContext?: ApiKeyContext;
  }
}

export function createAuthMiddleware(
  logger: Logger,
  authClient: SupabaseClient | null = null,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Only the JSON API under /api/* requires authentication. Public paths
    // (the SPA, its static assets, /health, /metrics) must remain reachable
    // so the site loads and monitoring works.
    if (!request.url.startsWith('/api/')) {
      return;
    }

    // The learning curriculum catalog is public, read-only (PRD §4.1 — anyone
    // may browse paths/lessons). Exempt GET requests to it from the API key.
    const publicGetPrefixes = [
      '/api/v1/learning/paths',
      '/api/v1/learning/lessons',
      '/api/v1/certification/certifications',
      '/api/v1/kg',
    ];
    if (
      request.method === 'GET' &&
      publicGetPrefixes.some((p) => request.url.startsWith(p))
    ) {
      return;
    }

    // Primary auth: a Supabase session JWT from the frontend (Authorization:
    // Bearer <token>). If present and valid, the request is authenticated as
    // that user — no legacy X-API-Key needed. This bridges the frontend's
    // Supabase auth to the backend (previously a hard mismatch → 401 loop).
    const authz = request.headers['authorization'];
    if (typeof authz === 'string' && authz.startsWith('Bearer ')) {
      const token = authz.slice('Bearer '.length).trim();
      if (authClient && token) {
        try {
          const { data, error } = await authClient.auth.getUser(token);
          if (!error && data?.user) {
            (request as FastifyRequest & { authUser?: { id: string; email?: string } }).authUser = {
              id: data.user.id,
              email: data.user.email,
            };
            return;
          }
        } catch {
          // fall through to the 401 below
        }
      }
      logger.warn('Invalid or unverifiable session token', { path: request.url });
      return reply.status(401).send({
        status: 'error',
        message: 'Invalid or expired session token',
        code: 'INVALID_TOKEN',
      });
    }

    // Fallback auth: legacy X-API-Key (service/programmatic clients).
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      logger.warn('Missing API key', {
        path: request.url,
        method: request.method,
      });
      return reply.status(401).send({
        status: 'error',
        message: 'Missing X-API-Key header',
        code: 'MISSING_API_KEY',
      });
    }

    // Validate key format and type
    const keyMatch = apiKey.match(/^(pk_|sk_)(.+)$/);
    if (!keyMatch) {
      logger.warn('Invalid API key format', {
        path: request.url,
        method: request.method,
      });
      return reply.status(401).send({
        status: 'error',
        message: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT',
      });
    }

    const [, keyType, keyId] = keyMatch;
    const isSecret = keyType === 'sk_';
    const isPublishable = keyType === 'pk_';

    // Check if publishable key is used for write operation
    if (
      isPublishable &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
    ) {
      logger.warn('Write operation with publishable key', {
        path: request.url,
        method: request.method,
        keyType: 'publishable',
      });
      return reply.status(403).send({
        status: 'error',
        message: 'Publishable keys cannot be used for write operations',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Store key context on request
    request.apiKeyContext = {
      keyType: isSecret ? 'secret' : 'publishable',
      keyId,
    };

    logger.debug('API key validated', {
      path: request.url,
      method: request.method,
      keyType: request.apiKeyContext.keyType,
    });
  };
}

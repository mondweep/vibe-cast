import { FastifyRequest, FastifyReply } from 'fastify';
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

export function createAuthMiddleware(logger: Logger) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { createAuthMiddleware } from '../../src/api/middleware/auth';
import { createLoggingMiddleware } from '../../src/api/middleware/logging';
import { registerErrorHandler } from '../../src/api/middleware/error';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';

/**
 * Middleware Tests
 *
 * Tests for:
 * - API key validation (auth middleware)
 * - Request/response logging
 * - Error handling and mapping
 */

describe('API Middleware', () => {
  let fastify: FastifyInstance;
  let logger: ConsoleLogger;

  beforeEach(async () => {
    logger = new ConsoleLogger();
    fastify = Fastify();
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('Auth Middleware', () => {
    beforeEach(async () => {
      const authMiddleware = createAuthMiddleware(logger);
      fastify.addHook('preHandler', authMiddleware);
      fastify.get('/protected', async () => ({ ok: true }));
    });

    it('should accept valid secret key', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          'x-api-key': 'sk_valid_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should accept valid publishable key for GET', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          'x-api-key': 'pk_valid_publishable_key_123',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject missing API key', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('MISSING_API_KEY');
    });

    it('should reject invalid API key format', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          'x-api-key': 'invalid_key_format',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('INVALID_API_KEY_FORMAT');
    });

    it('should reject publishable key for POST', async () => {
      fastify.post('/protected', async () => ({ created: true }));

      const response = await fastify.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-api-key': 'pk_publishable_key_123',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should accept secret key for POST', async () => {
      fastify.post('/protected', async () => ({ created: true }));

      const response = await fastify.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          'x-api-key': 'sk_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject publishable key for PUT', async () => {
      fastify.put('/protected', async () => ({ updated: true }));

      const response = await fastify.inject({
        method: 'PUT',
        url: '/protected',
        headers: {
          'x-api-key': 'pk_publishable_key_123',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject publishable key for DELETE', async () => {
      fastify.delete('/protected', async () => ({ deleted: true }));

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/protected',
        headers: {
          'x-api-key': 'pk_publishable_key_123',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Logging Middleware', () => {
    beforeEach(async () => {
      const loggingMiddleware = createLoggingMiddleware(logger);
      fastify.addHook('preHandler', loggingMiddleware);
      fastify.get('/test', async () => ({ ok: true }));
    });

    it('should attach correlation ID to request', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-api-key': 'sk_test_key',
          'x-correlation-id': 'test-correlation-123',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should generate correlation ID if not provided', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-api-key': 'sk_test_key',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Error Handler', () => {
    beforeEach(async () => {
      registerErrorHandler(fastify, logger);
      fastify.get('/error', async () => {
        const error: any = new Error('Test error');
        error.statusCode = 400;
        error.code = 'TEST_ERROR';
        throw error;
      });
    });

    it('should handle errors with custom status code', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.code).toBe('TEST_ERROR');
    });
  });
});

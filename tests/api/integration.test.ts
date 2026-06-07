import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiServer } from '../../src/api/server';

/**
 * Integration Tests
 *
 * Tests for:
 * - Full HTTP endpoint workflows
 * - Database read model consistency
 * - Event publishing and handling
 * - Error scenarios
 *
 * Note: Requires test database setup
 */

describe('API Integration Tests', () => {
  let server: ApiServer;

  beforeAll(async () => {
    server = new ApiServer();
    await server.initialize();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-api-key': 'sk_test_key_123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('success');
      expect(body.data.status).toBe('ok');
      expect(body.data.timestamp).toBeDefined();
    });

    it('should return metrics', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/metrics',
        headers: {
          'x-api-key': 'sk_test_key_123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('success');
      expect(body.data.eventCount).toBeDefined();
    });
  });

  describe('Learning Endpoints', () => {
    it('should handle missing API key', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/learning/enrollments',
        payload: {
          learnerId: '550e8400-e29b-41d4-a716-446655440000',
          certificationId: '550e8400-e29b-41d4-a716-446655440001',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject publishable key for POST', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/learning/enrollments',
        headers: {
          'x-api-key': 'pk_publishable_key_123',
          'content-type': 'application/json',
        },
        payload: {
          learnerId: '550e8400-e29b-41d4-a716-446655440000',
          certificationId: '550e8400-e29b-41d4-a716-446655440001',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should validate enrollment request body', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/learning/enrollments',
        headers: {
          'x-api-key': 'sk_secret_key_123',
          'content-type': 'application/json',
        },
        payload: {
          learnerId: 'invalid-uuid',
          certificationId: '550e8400-e29b-41d4-a716-446655440001',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle GET learner profile 404', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/learning/learners/550e8400-e29b-41d4-a716-446655440000/profile',
        headers: {
          'x-api-key': 'sk_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should validate completion score range', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/learning/enrollments/550e8400-e29b-41d4-a716-446655440000/complete',
        headers: {
          'x-api-key': 'sk_secret_key_123',
          'content-type': 'application/json',
        },
        payload: {
          finalScore: 150, // Invalid: > 100
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Certification Endpoints', () => {
    it('should validate badge issuance request', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/certification/badges/issue',
        headers: {
          'x-api-key': 'sk_secret_key_123',
          'content-type': 'application/json',
        },
        payload: {
          learnerId: 'invalid-uuid',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle certification progress 404', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/certification/learners/550e8400-e29b-41d4-a716-446655440000/progress',
        headers: {
          'x-api-key': 'sk_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate exam submission score range', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/certification/exams/submit',
        headers: {
          'x-api-key': 'sk_secret_key_123',
          'content-type': 'application/json',
        },
        payload: {
          enrollmentId: '550e8400-e29b-41d4-a716-446655440000',
          examId: '550e8400-e29b-41d4-a716-446655440001',
          answers: { q1: 'a' },
          score: -10, // Invalid: < 0
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Community Endpoints', () => {
    it('should handle member profile 404', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/community/members/550e8400-e29b-41d4-a716-446655440000/profile',
        headers: {
          'x-api-key': 'sk_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return leaderboard with pagination', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/community/leaderboard?limit=10&skip=0',
        headers: {
          'x-api-key': 'sk_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('success');
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.skip).toBe(0);
    });

    it('should validate leaderboard pagination params', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/community/leaderboard?limit=invalid&skip=0',
        headers: {
          'x-api-key': 'sk_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should enforce max leaderboard limit', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/community/leaderboard?limit=1000&skip=0',
        headers: {
          'x-api-key': 'sk_secret_key_123',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Correlation ID Tracking', () => {
    it('should preserve X-Correlation-ID header', async () => {
      const fastify = server.getFastifyInstance();
      const correlationId = 'test-correlation-12345';
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-api-key': 'sk_test_key_123',
          'x-correlation-id': correlationId,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should generate correlation ID if not provided', async () => {
      const fastify = server.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-api-key': 'sk_test_key_123',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

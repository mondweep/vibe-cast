/**
 * Community Patterns Routes (ADR-016, P1)
 *
 * Public:
 *   GET  /api/v1/community/patterns               list published patterns
 *   GET  /api/v1/community/patterns/:patternId    get single pattern
 *
 * Authenticated:
 *   POST /api/v1/community/patterns               submit pattern for moderation
 *   POST /api/v1/community/patterns/:patternId/rate  rate a pattern
 */

import { FastifyInstance } from 'fastify';
import { CommunityPatternsController } from '../controllers/communityPatterns';

export async function registerCommunityPatternRoutes(
  fastify: FastifyInstance,
  controller: CommunityPatternsController,
) {
  // Public reads
  fastify.get('/api/v1/community/patterns', (req, reply) =>
    controller.listPatterns(req, reply),
  );

  fastify.get('/api/v1/community/patterns/:patternId', (req, reply) =>
    controller.getPattern(req, reply),
  );

  // Auth-gated commands
  fastify.post('/api/v1/community/patterns', (req, reply) =>
    controller.submitPattern(req, reply),
  );

  fastify.post('/api/v1/community/patterns/:patternId/rate', (req, reply) =>
    controller.ratePattern(req, reply),
  );
}

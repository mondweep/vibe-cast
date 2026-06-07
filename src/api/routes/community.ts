import { FastifyInstance } from 'fastify';
import { CommunityController } from '../controllers/community';
import { createValidationMiddleware } from '../middleware/validation';
import { LeaderboardQuerySchema } from '../schemas/validation';

/**
 * Community Domain Routes
 *
 * GET    /api/v1/community/members/:id/profile
 * GET    /api/v1/community/leaderboard
 */
export async function registerCommunityRoutes(
  fastify: FastifyInstance,
  controller: CommunityController
) {
  /**
   * Get member profile
   * GET /api/v1/community/members/:id/profile
   */
  fastify.get(
    '/api/v1/community/members/:id/profile',
    (request, reply) => controller.getMemberProfile(request, reply)
  );

  /**
   * Get leaderboard
   * GET /api/v1/community/leaderboard
   */
  fastify.get(
    '/api/v1/community/leaderboard',
    {
      preHandler: [
        createValidationMiddleware(fastify.logger, {
          querySchema: LeaderboardQuerySchema,
        }),
      ],
    },
    (request, reply) => controller.getLeaderboard(request, reply)
  );
}

import { FastifyInstance } from 'fastify';
import { CommunityReadController } from '../controllers/communityRead';

/**
 * Community Read Routes — closes the SPA contract gap.
 *
 * GET /api/v1/community/leaderboard/current-user   the caller's rank/position
 * GET /api/v1/community/members/search?q=&limit=    member search by name
 *
 * Both require a Supabase JWT. NOTE: register the more specific
 * /leaderboard/current-user BEFORE the existing /community/leaderboard route so
 * Fastify routing does not treat "current-user" as a leaderboard query — these
 * are distinct static paths, so order is not strictly required, but keeping the
 * specific path explicit avoids ambiguity.
 */
export async function registerCommunityReadRoutes(
  fastify: FastifyInstance,
  controller: CommunityReadController,
) {
  fastify.get('/api/v1/community/leaderboard/current-user', (req, reply) =>
    controller.getCurrentUserRank(req, reply),
  );
  fastify.get('/api/v1/community/members/search', (req, reply) =>
    controller.searchMembers(req, reply),
  );
}

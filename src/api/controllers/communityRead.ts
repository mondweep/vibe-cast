import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import {
  CommunityReadRepository,
  CommunityProfileRow,
} from '../../learning/infrastructure/repositories/CommunityReadRepository';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Community Read Controller — closes the SPA contract gap for member search and
 * the current user's leaderboard rank. Backed by a Supabase read repository so
 * it actually returns data (the legacy generic read model never could).
 *
 * Both endpoints require a Supabase JWT (request.authUser set by auth middleware).
 * Maps snake_case rows to the camelCase CommunityMember shape.
 */
export class CommunityReadController {
  constructor(
    private repository: CommunityReadRepository,
    private logger: Logger,
  ) {}

  private toMember(row: CommunityProfileRow) {
    return {
      learnerId: row.learner_id,
      displayName: row.display_name ?? '',
      avatar: undefined,
      badgeCount: row.badge_count ?? 0,
      reputationScore: row.reputation_score ?? 0,
      totalEnrollments: 0,
    };
  }

  async searchMembers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    try {
      const query = (request.query as Record<string, unknown>) ?? {};
      const q = typeof query.q === 'string' ? query.q : '';
      const limit = toPositiveInt(query.limit);
      const members = await this.repository.searchMembers(q, limit);
      reply.status(200).send(successResponse(members.map((m) => this.toMember(m))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to search members', { error: message, correlationId });
      reply.status(500).send(errorResponse('Failed to search members', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  async getCurrentUserRank(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const authUser = (request as any).authUser as { id: string } | undefined;
    try {
      if (!authUser?.id) {
        return reply.status(401).send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
      }
      const profile = await this.repository.findProfile(authUser.id);
      if (!profile) {
        // No community profile yet — render an unranked state, not an error.
        return reply.status(200).send(successResponse({ rank: 0, position: 'Unranked' }));
      }
      const { rank, total } = await this.repository.getRank(profile.reputation_score ?? 0);
      reply.status(200).send(successResponse({ rank, position: `${rank} of ${total}` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch current user rank', { error: message, correlationId });
      reply.status(500).send(errorResponse('Failed to fetch current user rank', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}

function toPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

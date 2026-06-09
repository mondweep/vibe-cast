import { FastifyRequest, FastifyReply } from 'fastify';
import { IReadModelRepository } from '../../shared/infrastructure/readmodels/IReadModelRepository';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { LeaderboardQuery } from '../schemas/validation';

/**
 * Community Domain Controller
 *
 * Handles API requests for community-related operations:
 * - Member profile queries
 * - Leaderboard rankings
 *
 * Read-only operations querying read models
 */
export class CommunityController {
  constructor(
    private readModelRepository: IReadModelRepository,
    private logger: Logger
  ) {}

  /**
   * Get member profile
   * GET /api/v1/community/members/:id/profile
   */
  async getMemberProfile(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const memberId = (request.params as any).id as string;

      this.logger.debug('Fetching member profile', {
        correlationId,
        memberId,
      });

      // Query read model
      const profile = await this.readModelRepository.findCommunityProfile(memberId);

      if (!profile) {
        this.logger.warn('Member profile not found', {
          correlationId,
          memberId,
        });
        return reply.status(404).send(
          errorResponse(
            'Member not found',
            'NOT_FOUND',
            undefined,
            correlationId
          )
        );
      }

      this.logger.debug('Member profile fetched', {
        correlationId,
        memberId,
      });

      reply.status(200).send(
        successResponse({
          learner_id: profile.learner_id,
          display_name: profile.display_name,
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || null,
          badge_count: profile.badge_count || 0,
          reputation_score: profile.reputation_score || 0,
          joined_at: profile.joined_at,
          last_activity: profile.last_activity || null,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch member profile', {
        error: message,
      });
      throw error;
    }
  }

  /**
   * Get leaderboard
   * GET /api/v1/community/leaderboard?limit=10&skip=0
   */
  async getLeaderboard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const query = (request as any).validatedQuery as LeaderboardQuery;

      this.logger.debug('Fetching leaderboard', {
        correlationId,
        limit: query.limit,
        skip: query.skip,
        certification: query.certification,
      });

      // Query leaderboard from read model (sorted by reputation, highest first)
      const profiles = await this.readModelRepository.findTopLearnersByReputation(
        query.limit + query.skip
      );

      // Apply skip for pagination
      const pagedProfiles = profiles.slice(query.skip, query.skip + query.limit);

      if (pagedProfiles.length === 0) {
        this.logger.warn('Leaderboard query returned no results', {
          correlationId,
        });
        return reply.status(200).send(
          paginatedResponse([], profiles.length, query.limit, query.skip)
        );
      }

      // Format leaderboard entries with rank
      const entries = pagedProfiles.map((entry, index) => ({
        rank: query.skip + index + 1,
        learner_id: entry.learner_id,
        display_name: entry.display_name,
        reputation_score: entry.reputation_score,
        badge_count: entry.badge_count || 0,
        avatar_url: entry.avatar_url || null,
      }));

      this.logger.debug('Leaderboard fetched', {
        correlationId,
        count: entries.length,
        total: profiles.length,
      });

      reply.status(200).send(
        paginatedResponse(
          entries,
          profiles.length,
          query.limit,
          query.skip
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch leaderboard', {
        error: message,
      });
      throw error;
    }
  }
}

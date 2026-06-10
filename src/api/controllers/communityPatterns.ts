/**
 * Community Patterns Controller
 * Handles Pattern Repository API (ADR-016, P1)
 * Routes: GET /api/v1/community/patterns, GET /api/v1/community/patterns/:patternId,
 *         POST /api/v1/community/patterns, POST /api/v1/community/patterns/:patternId/rate
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { PatternRepository } from '../../community/infrastructure/repositories/PatternRepository';
import { Pattern, PatternCategory, PatternDifficulty } from '../../community/domain/models/Pattern';
import { successResponse, errorResponse } from '../utils/response';

export class CommunityPatternsController {
  constructor(
    private patternRepo: PatternRepository,
    private logger: Logger,
  ) {}

  // ---------------------------------------------------------------- mappers

  private toPatternDto(row: { pattern_id: string; author_id: string; title: string; category: string; difficulty: string; problem: string; solution: string; code_example: string | null; production_context: string | null; performance_notes: string | null; known_limitations: string | null; status: string; stars: number; rating_count: number; created_at: string; updated_at: string }) {
    return {
      id: row.pattern_id,
      authorId: row.author_id,
      title: row.title,
      category: row.category,
      difficulty: row.difficulty,
      problem: row.problem,
      solution: row.solution,
      codeExample: row.code_example,
      productionContext: row.production_context,
      performanceNotes: row.performance_notes,
      knownLimitations: row.known_limitations,
      status: row.status,
      stars: Number(row.stars),
      ratingCount: row.rating_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ------------------------------------------------------------------ reads

  /**
   * GET /api/v1/community/patterns
   * List published patterns; optional ?category= &difficulty= &search=
   */
  async listPatterns(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const { category, difficulty, search } = request.query as Record<string, string | undefined>;

    try {
      const rows = await this.patternRepo.findPublished({
        category: category as PatternCategory | undefined,
        difficulty: difficulty as PatternDifficulty | undefined,
        search,
      });
      reply.status(200).send(successResponse(rows.map((r) => this.toPatternDto(r))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list patterns', { error: message, correlationId });
      reply.status(500).send(errorResponse('Failed to list patterns', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * GET /api/v1/community/patterns/:patternId
   * Get single pattern by ID (public)
   */
  async getPattern(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const { patternId } = request.params as { patternId: string };

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(patternId)) {
      return reply.status(404).send(errorResponse('Pattern not found', 'NOT_FOUND', undefined, correlationId));
    }

    try {
      const row = await this.patternRepo.findById(patternId);
      if (!row) {
        return reply.status(404).send(errorResponse('Pattern not found', 'NOT_FOUND', undefined, correlationId));
      }
      reply.status(200).send(successResponse(this.toPatternDto(row)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get pattern', { error: message, correlationId, patternId });
      reply.status(500).send(errorResponse('Failed to get pattern', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  // --------------------------------------------------------------- commands

  /**
   * POST /api/v1/community/patterns
   * Submit a new pattern for moderation (auth required)
   */
  async submitPattern(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const authUser = (request as any).authUser as { id?: string; sub?: string } | undefined;
    const learnerId = authUser?.id ?? authUser?.sub;

    if (!learnerId) {
      return reply.status(401).send(
        errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId),
      );
    }

    try {
      const { title, category, difficulty, problem, solution, codeExample } = request.body as {
        title: string;
        category: PatternCategory;
        difficulty: PatternDifficulty;
        problem: string;
        solution: string;
        codeExample?: string;
      };

      if (!title || !category || !difficulty || !problem || !solution) {
        return reply.status(400).send(
          errorResponse('title, category, difficulty, problem, and solution are required', 'VALIDATION_ERROR', undefined, correlationId),
        );
      }

      const authorId = learnerId;
      const pattern = Pattern.create(authorId, title, category, difficulty, problem, solution, codeExample ?? '');
      await this.patternRepo.save(pattern);

      this.logger.info('Pattern submitted for moderation', { correlationId, patternId: pattern.id, authorId });
      reply.status(201).send(successResponse({ id: pattern.id, status: pattern.status }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to submit pattern', { error: message, correlationId });
      reply.status(500).send(errorResponse('Failed to submit pattern', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * POST /api/v1/community/patterns/:patternId/rate
   * Rate a pattern (auth required); body: { stars: 1-5, reviewText? }
   * Upserts the rating and recalculates the pattern average.
   */
  async ratePattern(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { patternId } = request.params as { patternId: string };
    const authUser = (request as any).authUser as { id?: string; sub?: string } | undefined;
    const learnerId = authUser?.id ?? authUser?.sub;

    if (!learnerId) {
      return reply.status(401).send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
    }

    try {
      const { stars, reviewText } = request.body as { stars: number; reviewText?: string };

      if (!stars || stars < 1 || stars > 5) {
        return reply.status(400).send(
          errorResponse('stars must be an integer between 1 and 5', 'VALIDATION_ERROR', undefined, correlationId),
        );
      }

      const row = await this.patternRepo.findById(patternId);
      if (!row) {
        return reply.status(404).send(errorResponse('Pattern not found', 'NOT_FOUND', undefined, correlationId));
      }

      // Upsert rating via the ratings table (handled by Supabase; compute new avg)
      const supabase = (this.patternRepo as any).supabase;
      const schema = (this.patternRepo as any).schema ?? 'ruflo_demo';

      const { error: upsertError } = await supabase
        .schema(schema)
        .from('ruflo_demo_pattern_rating_read_model')
        .upsert(
          { pattern_id: patternId, learner_id: learnerId, stars, review_text: reviewText ?? null },
          { onConflict: 'pattern_id,learner_id' },
        );
      if (upsertError) throw upsertError;

      // Recalculate average stars
      const { data: ratingsData, error: ratingsError } = await supabase
        .schema(schema)
        .from('ruflo_demo_pattern_rating_read_model')
        .select('stars')
        .eq('pattern_id', patternId);
      if (ratingsError) throw ratingsError;

      const ratings = (ratingsData as { stars: number }[]) ?? [];
      const avg = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
        : 0;

      await supabase
        .schema(schema)
        .from('ruflo_demo_pattern_read_model')
        .update({ stars: Math.round(avg * 100) / 100, rating_count: ratings.length, updated_at: new Date().toISOString() })
        .eq('pattern_id', patternId);

      this.logger.info('Pattern rated', { correlationId, patternId, learnerId, stars });
      reply.status(200).send(successResponse({ patternId, stars, averageStars: Math.round(avg * 100) / 100 }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to rate pattern', { error: message, correlationId, patternId });
      reply.status(500).send(errorResponse('Failed to rate pattern', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}

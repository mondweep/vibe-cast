import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import {
  LearningCatalogRepository,
  LearningPathRow,
  LessonRow,
} from '../../learning/infrastructure/repositories/LearningCatalogRepository';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Learning Catalog Controller (read side)
 *
 * Serves the curriculum catalog (paths + lessons) for browsing — PRD §4.1.
 * Public, read-only endpoints; maps snake_case read-model rows to the camelCase
 * shape the frontend types expect.
 */
export class LearningCatalogController {
  constructor(
    private repository: LearningCatalogRepository,
    private logger: Logger,
  ) {}

  private toPath(row: LearningPathRow) {
    return {
      id: row.path_id,
      level: row.level,
      title: row.title,
      description: row.description,
      estimatedHours: row.estimated_hours,
      lessonCount: row.lesson_count,
      orderedLessonIds: row.ordered_lesson_ids ?? [],
      prerequisitePathId: row.prerequisite_path_id,
      status: row.status,
      totalLikes: row.total_likes ?? 0,
    };
  }

  private toLesson(row: LessonRow) {
    return {
      id: row.lesson_id,
      pathId: row.path_id,
      order: row.lesson_order,
      title: row.title,
      topics: row.topics ?? [],
      estimatedHours: row.estimated_hours,
      capstone: row.capstone,
      prerequisiteLessonId: row.prerequisite_lesson_id,
      content: row.content ?? [],
      status: row.status,
    };
  }

  async getPaths(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    try {
      // Fetch paths and the cumulative-likes rollup in parallel. The like-count
      // lookup is best-effort: a failure (e.g. view missing) yields an empty map
      // so cards still render, just without the count.
      const [paths, likeCounts] = await Promise.all([
        this.repository.findAllPaths(),
        this.repository
          .findPathLikeCounts()
          .catch(() => ({} as Record<string, number>)),
      ]);
      reply.status(200).send(
        successResponse(
          paths.map((p) => ({
            ...this.toPath(p),
            totalLikes: likeCounts[p.path_id] ?? 0,
          })),
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list learning paths', { error: message, correlationId });
      reply.status(500).send(errorResponse('Failed to list learning paths', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  async getPath(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const pathId = (request.params as any).id as string;
    try {
      const path = await this.repository.findPathById(pathId);
      if (!path) {
        return reply.status(404).send(errorResponse('Learning path not found', 'NOT_FOUND', undefined, correlationId));
      }
      reply.status(200).send(successResponse(this.toPath(path)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch learning path', { error: message, correlationId, pathId });
      reply.status(500).send(errorResponse('Failed to fetch learning path', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  async getPathLessons(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const pathId = (request.params as any).id as string;
    try {
      const lessons = await this.repository.findLessonsByPath(pathId);
      reply.status(200).send(successResponse(lessons.map((l) => this.toLesson(l))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list lessons', { error: message, correlationId, pathId });
      reply.status(500).send(errorResponse('Failed to list lessons', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  async getLesson(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const lessonId = (request.params as any).id as string;
    try {
      const lesson = await this.repository.findLessonById(lessonId);
      if (!lesson) {
        return reply.status(404).send(errorResponse('Lesson not found', 'NOT_FOUND', undefined, correlationId));
      }
      reply.status(200).send(successResponse(this.toLesson(lesson)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch lesson', { error: message, correlationId, lessonId });
      reply.status(500).send(errorResponse('Failed to fetch lesson', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  // ---- Learner reads (repaired; authenticated via Supabase JWT) ----

  private toLearner(row: Record<string, any>) {
    const badges = row.badges_earned;
    return {
      id: row.learner_id,
      displayName: row.display_name ?? '',
      email: row.email ?? '',
      totalEnrollments: row.total_enrollments ?? 0,
      averageScore: Number(row.average_score ?? 0),
      badgesEarned: Array.isArray(badges) ? badges.length : Number(badges ?? 0),
      reputationScore: row.reputation_score ?? 0,
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };
  }

  private toEnrollment(row: Record<string, any>) {
    return {
      id: row.enrollment_id,
      learnerId: row.learner_id,
      certificationId: row.certification_id,
      status: row.enrollment_status ?? 'ACTIVE',
      enrolledAt: row.created_at ?? '',
      completedAt: row.updated_at ?? undefined,
      finalScore: row.current_grade != null ? Number(row.current_grade) : undefined,
      currentProgress: 0,
    };
  }

  async getLearnerProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const learnerId = (request.params as any).id as string;
    try {
      const row = await this.repository.findLearnerProfile(learnerId);
      // 200 with null when no profile yet — the SPA renders an empty state
      // gracefully rather than treating a missing profile as an error.
      reply.status(200).send(successResponse(row ? this.toLearner(row) : null));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch learner profile', { error: message, correlationId, learnerId });
      reply.status(500).send(errorResponse('Failed to fetch learner profile', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  async getLearnerEnrollments(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const learnerId = (request.params as any).id as string;
    try {
      const rows = await this.repository.findLearnerEnrollments(learnerId);
      reply.status(200).send(successResponse(rows.map((r) => this.toEnrollment(r))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch learner enrollments', { error: message, correlationId, learnerId });
      reply.status(500).send(errorResponse('Failed to fetch learner enrollments', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}

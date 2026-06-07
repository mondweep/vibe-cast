import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import {
  ProgressReadRepository,
  PathEnrollmentRow,
  PathProgressRow,
  LessonCompletionRow,
} from '../../learning/infrastructure/repositories/ProgressReadRepository';
import {
  LearningCatalogRepository,
  LearningPathRow,
  LessonRow,
} from '../../learning/infrastructure/repositories/LearningCatalogRepository';
import { PathProgress } from '../../learning/domain/models/PathProgress';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Learning Progress Controller — Progress Dashboard (PRD §4.3, ADR-011 CQRS).
 *
 * Reads the per-learner progress read models for the dashboard, and serves the
 * write commands (start path / complete lesson) by exercising the PathProgress
 * aggregate (the source of the domain events) and UPSERTing the read models.
 *
 * Maps snake_case read-model rows to the camelCase shape the frontend expects;
 * returns [] / null gracefully so the SPA renders empty states.
 */
export class LearningProgressController {
  constructor(
    private progressRepo: ProgressReadRepository,
    private catalogRepo: LearningCatalogRepository,
    private logger: Logger,
  ) {}

  // ---------------------------------------------------------------- mappers

  private toEnrollment(row: PathEnrollmentRow, progress?: PathProgressRow | null) {
    return {
      id: row.enrollment_id,
      learnerId: row.learner_id,
      pathId: row.path_id,
      totalLessons: row.total_lessons,
      status: row.status,
      enrolledAt: row.enrolled_at,
      progressPercent: progress?.progress_percent ?? 0,
      completedLessons: progress?.completed_lesson_ids?.length ?? 0,
      currentLessonId: progress?.current_lesson_id ?? null,
    };
  }

  private toCompletion(row: LessonCompletionRow) {
    return {
      id: row.completion_id,
      learnerId: row.learner_id,
      pathId: row.path_id,
      lessonId: row.lesson_id,
      progressPercent: row.progress_percent,
      completedAt: row.completed_at,
    };
  }

  /** Resolve the next un-completed lesson for a path (continue-where-left-off). */
  private nextLesson(path: LearningPathRow, completedIds: string[]): string | null {
    const ordered = path.ordered_lesson_ids ?? [];
    return ordered.find((id) => !completedIds.includes(id)) ?? null;
  }

  // ------------------------------------------------------------------ reads

  /**
   * GET /api/v1/learning/learners/:id/progress
   * Dashboard summary: per-path progress with %, next lesson, X/Y lessons,
   * estimated hours remaining, and an aggregate active-path pointer.
   */
  async getLearnerProgress(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const learnerId = (request.params as any).id as string;
    try {
      const [enrollments, progressRows] = await Promise.all([
        this.progressRepo.findEnrollmentsByLearner(learnerId),
        this.progressRepo.findProgressByLearner(learnerId),
      ]);
      const progressByPath = new Map(progressRows.map((p) => [p.path_id, p]));

      const paths = await Promise.all(
        enrollments.map((e) => this.catalogRepo.findPathById(e.path_id)),
      );
      const pathById = new Map(
        paths.filter((p): p is LearningPathRow => !!p).map((p) => [p.path_id, p]),
      );

      const items = enrollments.map((e) => {
        const progress = progressByPath.get(e.path_id) ?? null;
        const path = pathById.get(e.path_id);
        const completedIds = progress?.completed_lesson_ids ?? [];
        const totalLessons = path?.lesson_count ?? e.total_lessons ?? 0;
        const completedCount = completedIds.length;
        const estimatedHoursTotal = path?.estimated_hours ?? 0;
        const remainingHours =
          totalLessons > 0
            ? Math.round(estimatedHoursTotal * ((totalLessons - completedCount) / totalLessons))
            : 0;
        return {
          pathId: e.path_id,
          pathTitle: path?.title ?? '',
          level: path?.level ?? '',
          status: progress?.status ?? e.status,
          progressPercent: progress?.progress_percent ?? 0,
          completedLessons: completedCount,
          totalLessons,
          nextLessonId: path ? this.nextLesson(path, completedIds) : null,
          estimatedHoursRemaining: remainingHours,
          startedAt: progress?.started_at ?? e.enrolled_at,
          completedAt: progress?.completed_at ?? null,
        };
      });

      const active = items.find((i) => i.status === 'ACTIVE') ?? items[0] ?? null;

      reply.status(200).send(
        successResponse({
          learnerId,
          activePath: active,
          paths: items,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch learner progress', { error: message, correlationId, learnerId });
      reply
        .status(500)
        .send(errorResponse('Failed to fetch learner progress', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /** GET /api/v1/learning/learners/:id/path-enrollments — enrollments with %. */
  async getLearnerEnrollments(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const learnerId = (request.params as any).id as string;
    try {
      const [enrollments, progressRows] = await Promise.all([
        this.progressRepo.findEnrollmentsByLearner(learnerId),
        this.progressRepo.findProgressByLearner(learnerId),
      ]);
      const progressByPath = new Map(progressRows.map((p) => [p.path_id, p]));
      reply
        .status(200)
        .send(successResponse(enrollments.map((e) => this.toEnrollment(e, progressByPath.get(e.path_id)))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch path enrollments', { error: message, correlationId, learnerId });
      reply
        .status(500)
        .send(errorResponse('Failed to fetch path enrollments', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /** GET /api/v1/learning/learners/:id/completed-lessons. */
  async getCompletedLessons(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const learnerId = (request.params as any).id as string;
    try {
      const rows = await this.progressRepo.findCompletedLessons(learnerId);
      reply.status(200).send(successResponse(rows.map((r) => this.toCompletion(r))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch completed lessons', { error: message, correlationId, learnerId });
      reply
        .status(500)
        .send(errorResponse('Failed to fetch completed lessons', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  // --------------------------------------------------------------- commands

  /**
   * POST /api/v1/learning/paths/:id/enroll
   * Start a path: exercises the PathProgress aggregate (emits LearnerEnrolled),
   * then UPSERTs the enrollment + progress read models.
   */
  async enroll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const pathId = (request.params as any).id as string;
    const learnerId = (request.body as any)?.learnerId as string;
    try {
      if (!learnerId) {
        return reply
          .status(400)
          .send(errorResponse('learnerId is required', 'VALIDATION_ERROR', undefined, correlationId));
      }
      const path = await this.catalogRepo.findPathById(pathId);
      if (!path) {
        return reply.status(404).send(errorResponse('Learning path not found', 'NOT_FOUND', undefined, correlationId));
      }

      const totalLessons = path.lesson_count || (path.ordered_lesson_ids ?? []).length || 1;
      const aggregate = PathProgress.start({ learnerId, pathId, totalLessons, correlationId });
      // last_synced_event_id is a UUID column; domain event ids are not UUIDs,
      // so stamp a fresh UUID marking this projection sync point (ADR-011).
      const lastEventId = uuidv4();

      await this.progressRepo.upsertEnrollment({
        enrollment_id: aggregate.getId(),
        learner_id: learnerId,
        path_id: pathId,
        total_lessons: totalLessons,
        status: 'ACTIVE',
        enrolled_at: aggregate.getStartedAt().toISOString(),
        last_synced_event_id: lastEventId,
      });
      await this.progressRepo.upsertProgress({
        progress_id: aggregate.getId(),
        learner_id: learnerId,
        path_id: pathId,
        completed_lesson_ids: [],
        progress_percent: 0,
        status: 'ACTIVE',
        current_lesson_id: (path.ordered_lesson_ids ?? [])[0] ?? null,
        started_at: aggregate.getStartedAt().toISOString(),
        completed_at: null,
        last_synced_event_id: lastEventId,
      });
      aggregate.markEventsAsCommitted();

      this.logger.info('Learner enrolled in path', { correlationId, learnerId, pathId });
      reply.status(201).send(
        successResponse({ id: aggregate.getId(), learnerId, pathId, status: 'ACTIVE', progressPercent: 0 }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to enroll in path', { error: message, correlationId, learnerId, pathId });
      reply.status(500).send(errorResponse('Failed to enroll in path', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * POST /api/v1/learning/lessons/:id/complete
   * Mark a lesson complete: rebuilds the PathProgress aggregate from the read
   * model, applies completeLesson (emits LessonCompleted / PathCompleted), then
   * UPSERTs the progress + completion read models.
   */
  async completeLesson(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const lessonId = (request.params as any).id as string;
    const learnerId = (request.body as any)?.learnerId as string;
    try {
      if (!learnerId) {
        return reply
          .status(400)
          .send(errorResponse('learnerId is required', 'VALIDATION_ERROR', undefined, correlationId));
      }
      const lesson = await this.catalogRepo.findLessonById(lessonId);
      if (!lesson) {
        return reply.status(404).send(errorResponse('Lesson not found', 'NOT_FOUND', undefined, correlationId));
      }
      const pathId = lesson.path_id;
      const path = await this.catalogRepo.findPathById(pathId);
      const totalLessons = path?.lesson_count || (path?.ordered_lesson_ids ?? []).length || 1;

      const existing = await this.progressRepo.findProgress(learnerId, pathId);
      const completedIds = existing?.completed_lesson_ids ?? [];
      if (completedIds.includes(lessonId)) {
        // Idempotent: already completed — return current state.
        return reply.status(200).send(
          successResponse({
            lessonId,
            pathId,
            progressPercent: existing?.progress_percent ?? 0,
            status: existing?.status ?? 'ACTIVE',
          }),
        );
      }

      const aggregate = PathProgress.rehydrate({
        id: existing?.progress_id ?? uuidv4(),
        learnerId,
        pathId,
        totalLessons,
        completedLessonIds: completedIds,
        status: (existing?.status as 'ACTIVE' | 'COMPLETED') ?? 'ACTIVE',
        startedAt: existing?.started_at ? new Date(existing.started_at) : new Date(),
        completedAt: existing?.completed_at ? new Date(existing.completed_at) : null,
        correlationId,
      });
      aggregate.completeLesson(lessonId);

      // last_synced_event_id is a UUID column; stamp a fresh UUID sync marker.
      const lastEventId = uuidv4();
      const newCompleted = aggregate.getCompletedLessonIds();
      const progressPercent = aggregate.getProgressPercent();
      const status = aggregate.getStatus();
      const nextLessonId = (path?.ordered_lesson_ids ?? []).find((id) => !newCompleted.includes(id)) ?? null;

      await this.progressRepo.upsertProgress({
        progress_id: aggregate.getId(),
        learner_id: learnerId,
        path_id: pathId,
        completed_lesson_ids: newCompleted,
        progress_percent: progressPercent,
        status,
        current_lesson_id: nextLessonId,
        started_at: aggregate.getStartedAt().toISOString(),
        completed_at: aggregate.getCompletedAt()?.toISOString() ?? null,
        last_synced_event_id: lastEventId,
      });
      await this.progressRepo.upsertCompletion({
        completion_id: uuidv4(),
        learner_id: learnerId,
        path_id: pathId,
        lesson_id: lessonId,
        progress_percent: progressPercent,
        completed_at: new Date().toISOString(),
        last_synced_event_id: lastEventId,
      });
      aggregate.markEventsAsCommitted();

      this.logger.info('Lesson completed', { correlationId, learnerId, pathId, lessonId, progressPercent });
      reply.status(200).send(successResponse({ lessonId, pathId, progressPercent, status }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to complete lesson', { error: message, correlationId, lessonId, learnerId });
      reply.status(500).send(errorResponse('Failed to complete lesson', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}

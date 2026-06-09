import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import {
  MetricsReadRepository,
  LearnerMetricsRow,
  CohortRow,
} from '../../metrics/infrastructure/repositories/MetricsReadRepository';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Metrics Controller — Learner & Cohort Analytics (PRD §8, ADR-017).
 *
 * Serves the read side of the Metrics domain:
 *   - A learner's own progress metrics (path %, lessons, exercises, time, trend)
 *   - Cohort aggregate overview (size, active %, avg progress, completion, churn)
 *   - List of all cohorts (demo: no instructor gating yet)
 *
 * All data comes from the CQRS read models populated by MetricsProjector.
 */
export class MetricsController {
  constructor(
    private metricsRepo: MetricsReadRepository,
    private logger: Logger,
  ) {}

  // ---------------------------------------------------------------- mappers

  private toLearnerMetrics(row: LearnerMetricsRow) {
    return {
      metricsId:            row.metrics_id,
      learnerId:            row.learner_id,
      pathProgressPercent:  row.path_progress_percent,
      lessonsCompleted:     row.lessons_completed,
      lessonsTotal:         row.lessons_total,
      exercisesCompleted:   row.exercises_completed,
      exercisesTotal:       row.exercises_total,
      timeInvestedHours:    row.time_invested_hours,
      lastActivityAt:       row.last_activity_at,
      daysInactive:         row.days_inactive,
      engagementTrend:      row.engagement_trend,
      estCertDate:          row.est_cert_date,
      updatedAt:            row.updated_at,
    };
  }

  private toCohort(row: CohortRow) {
    return {
      cohortId:               row.cohort_id,
      name:                   row.name,
      instructorId:           row.instructor_id,
      learnerCount:           row.learner_ids?.length ?? 0,
      activeThisWeekPct:      row.active_this_week_pct,
      avgPathProgress:        row.avg_path_progress,
      completionRate:         row.completion_rate,
      avgTimePerLessonHours:  row.avg_time_per_lesson_hours,
      churnRiskCount:         row.churn_risk_learner_ids?.length ?? 0,
      updatedAt:              row.updated_at,
    };
  }

  // ---------------------------------------------------------------- handlers

  /**
   * GET /api/v1/metrics/my
   * Returns the authenticated learner's own metrics row.
   * Uses the JWT sub (auth.uid) as the learner ID.
   */
  async getLearnerMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const learnerId = (request as any).authUser?.id as string | undefined;

    if (!learnerId) {
      return reply
        .status(401)
        .send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
    }

    try {
      const row = await this.metricsRepo.getLearnerMetrics(learnerId);

      if (!row) {
        // Learner exists but has no metrics yet — return a zero-state stub
        return reply.status(200).send(
          successResponse({
            learnerId,
            pathProgressPercent:  0,
            lessonsCompleted:     0,
            lessonsTotal:         0,
            exercisesCompleted:   0,
            exercisesTotal:       0,
            timeInvestedHours:    0,
            lastActivityAt:       null,
            daysInactive:         0,
            engagementTrend:      'neutral',
            estCertDate:          null,
          }),
        );
      }

      reply.status(200).send(successResponse(this.toLearnerMetrics(row)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch learner metrics', { error: message, correlationId, learnerId });
      reply
        .status(500)
        .send(errorResponse('Failed to fetch learner metrics', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * GET /api/v1/metrics/cohorts/:cohortId
   * Returns aggregate stats for a single cohort.
   */
  async getCohortOverview(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const cohortId = (request.params as any).cohortId as string;

    try {
      const row = await this.metricsRepo.getCohortMetrics(cohortId);

      if (!row) {
        return reply
          .status(404)
          .send(errorResponse('Cohort not found', 'NOT_FOUND', undefined, correlationId));
      }

      reply.status(200).send(successResponse(this.toCohort(row)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch cohort overview', { error: message, correlationId, cohortId });
      reply
        .status(500)
        .send(errorResponse('Failed to fetch cohort overview', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * GET /api/v1/metrics/cohorts
   * Lists all cohorts (demo: no instructor gating).
   */
  async listCohorts(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;

    try {
      const rows = await this.metricsRepo.getAllCohorts();
      reply.status(200).send(successResponse(rows.map((r) => this.toCohort(r))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list cohorts', { error: message, correlationId });
      reply
        .status(500)
        .send(errorResponse('Failed to list cohorts', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}

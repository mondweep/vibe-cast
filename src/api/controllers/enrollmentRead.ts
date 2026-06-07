import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import {
  EnrollmentReadRepository,
  EnrollmentRow,
} from '../../learning/infrastructure/repositories/EnrollmentReadRepository';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Enrollment Read Controller — closes the SPA contract gap for fetching a single
 * enrollment (GET /learning/enrollments/:id). Authenticated via Supabase JWT.
 * Maps the certification progress row to the camelCase Enrollment shape.
 */
export class EnrollmentReadController {
  constructor(
    private repository: EnrollmentReadRepository,
    private logger: Logger,
  ) {}

  private toEnrollment(row: EnrollmentRow) {
    const completed = row.enrollment_status === 'COMPLETED';
    return {
      id: row.enrollment_id,
      learnerId: row.learner_id,
      certificationId: row.certification_id,
      status: row.enrollment_status ?? 'ACTIVE',
      enrolledAt: row.created_at ?? '',
      completedAt: completed ? (row.updated_at ?? undefined) : undefined,
      finalScore: row.current_grade != null ? Number(row.current_grade) : undefined,
      currentProgress: completed ? 100 : 0,
    };
  }

  async getEnrollment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const enrollmentId = (request.params as any).id as string;
    try {
      const row = await this.repository.findById(enrollmentId);
      if (!row) {
        return reply.status(404).send(errorResponse('Enrollment not found', 'NOT_FOUND', undefined, correlationId));
      }
      reply.status(200).send(successResponse(this.toEnrollment(row)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch enrollment', { error: message, correlationId, enrollmentId });
      reply.status(500).send(errorResponse('Failed to fetch enrollment', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}

import { FastifyRequest, FastifyReply } from 'fastify';
import { IEventBus } from '../../shared/infrastructure/events/IEventBus';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { IReadModelRepository } from '../../shared/infrastructure/readmodels/IReadModelRepository';
import { BadgeIssued } from '../../certification/domain/events/BadgeIssued';
import { ExamCompleted } from '../../certification/domain/events/ExamCompleted';
import { successResponse, errorResponse } from '../utils/response';
import {
  IssueBadgeRequest,
  SubmitExamRequest,
} from '../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

/**
 * Certification Domain Controller
 *
 * Handles API requests for certification-related operations:
 * - Badge issuance
 * - Certification progress queries
 * - Exam submission
 *
 * Publishes domain events to EventBus for each write operation
 */
export class CertificationController {
  constructor(
    private eventBus: IEventBus,
    private readModelRepository: IReadModelRepository,
    private logger: Logger
  ) {}

  /**
   * Issue a badge
   * POST /api/v1/certification/badges/issue
   */
  async issueBadge(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const body = (request as any).validatedBody as IssueBadgeRequest;

      this.logger.info('Issuing badge', {
        correlationId,
        learnerId: body.learnerId,
        badgeId: body.badgeId,
      });

      // Generate saga ID
      const sagaId = uuidv4();

      // Create BadgeIssued event
      const badgeEvent = new BadgeIssued({
        badgeId: body.badgeId,
        learnerId: body.learnerId,
        enrollmentId: body.enrollmentId,
        certificationName: body.certificationName,
        issuedAt: new Date().toISOString(),
        correlationId,
      });

      // Publish event to EventBus
      await this.eventBus.publish(badgeEvent);

      this.logger.info('Badge issued', {
        correlationId,
        badgeId: body.badgeId,
        learnerId: body.learnerId,
        sagaId,
      });

      // Return accepted response (202 Accepted for async processing)
      reply.status(202).send(
        successResponse({
          badgeId: body.badgeId,
          learnerId: body.learnerId,
          status: 'PROCESSING',
          sagaId,
          createdAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to issue badge', {
        error: message,
      });
      throw error;
    }
  }

  /**
   * Get certification progress
   * GET /api/v1/certification/learners/:id/progress
   */
  async getCertificationProgress(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const learnerId = (request.params as any).id as string;

      this.logger.debug('Fetching certification progress', {
        correlationId,
        learnerId,
      });

      // Query read model for certification progress
      const progress = await this.readModelRepository.findById(
        'CertificationProgress',
        learnerId
      );

      if (!progress) {
        this.logger.warn('Certification progress not found', {
          correlationId,
          learnerId,
        });
        return reply.status(404).send(
          errorResponse(
            'Progress not found',
            'NOT_FOUND',
            undefined,
            correlationId
          )
        );
      }

      this.logger.debug('Certification progress fetched', {
        correlationId,
        learnerId,
      });

      reply.status(200).send(
        successResponse({
          learner_id: progress.learner_id,
          enrollment_id: progress.enrollment_id,
          current_grade: progress.current_grade || null,
          exam_attempts: progress.exam_attempts || 0,
          badge_status: progress.badge_status || 'PENDING',
          certifications: progress.certifications || [],
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch certification progress', {
        error: message,
      });
      throw error;
    }
  }

  /**
   * Submit an exam
   * POST /api/v1/certification/exams/submit
   */
  async submitExam(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const body = (request as any).validatedBody as SubmitExamRequest;

      this.logger.info('Submitting exam', {
        correlationId,
        enrollmentId: body.enrollmentId,
        examId: body.examId,
        score: body.score,
      });

      // Get enrollment from read model
      const enrollment = await this.readModelRepository.findById(
        'Enrollment',
        body.enrollmentId
      );

      if (!enrollment) {
        this.logger.warn('Enrollment not found for exam submission', {
          correlationId,
          enrollmentId: body.enrollmentId,
        });
        return reply.status(404).send(
          errorResponse(
            'Enrollment not found',
            'NOT_FOUND',
            undefined,
            correlationId
          )
        );
      }

      // Calculate pass/fail (assuming 70% is passing)
      const passingScore = 70;
      const passed = body.score >= passingScore;

      // Create ExamCompleted event
      const examEvent = new ExamCompleted({
        examId: body.examId,
        enrollmentId: body.enrollmentId,
        learnerId: enrollment.learner_id,
        score: body.score,
        passed,
        answeredAt: new Date().toISOString(),
        correlationId,
      });

      // Publish event to EventBus
      await this.eventBus.publish(examEvent);

      this.logger.info('Exam submitted', {
        correlationId,
        examId: body.examId,
        enrollmentId: body.enrollmentId,
        passed,
      });

      reply.status(200).send(
        successResponse({
          examId: body.examId,
          enrollmentId: body.enrollmentId,
          score: body.score,
          passed,
          submittedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to submit exam', {
        error: message,
      });
      throw error;
    }
  }
}

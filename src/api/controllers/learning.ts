import { FastifyRequest, FastifyReply } from 'fastify';
import { IEventBus } from '../../shared/infrastructure/events/IEventBus';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { IReadModelRepository } from '../../shared/infrastructure/readmodels/IReadModelRepository';
import { EnrollmentCompleted } from '../../learning/domain/events/EnrollmentCompleted';
import { successResponse, errorResponse } from '../utils/response';
import {
  EnrollmentRequest,
  CompleteEnrollmentRequest,
} from '../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

/**
 * Learning Domain Controller
 *
 * Handles API requests for learning-related operations:
 * - Enrollment creation and management
 * - Learner profile queries
 * - Enrollment completion
 *
 * Publishes domain events to EventBus for each write operation
 */
export class LearningController {
  constructor(
    private eventBus: IEventBus,
    private readModelRepository: IReadModelRepository,
    private logger: Logger
  ) {}

  /**
   * Create a new enrollment
   * POST /api/v1/learning/enrollments
   */
  async createEnrollment(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const body = (request as any).validatedBody as EnrollmentRequest;

      this.logger.info('Creating enrollment', {
        correlationId,
        learnerId: body.learnerId,
        certificationId: body.certificationId,
      });

      // Generate IDs
      const enrollmentId = uuidv4();

      // Create EnrollmentInitiated event
      const enrollmentEvent = {
        eventType: 'learning.enrollment.initiated',
        aggregateId: enrollmentId,
        aggregateType: 'Enrollment',
        data: {
          enrollmentId,
          learnerId: body.learnerId,
          certificationId: body.certificationId,
          status: 'ACTIVE',
          enrolledAt: new Date().toISOString(),
        },
        correlationId,
        timestamp: new Date(),
        version: 1,
      };

      // Publish event to EventBus
      await this.eventBus.publish({
        aggregateId: enrollmentId,
        aggregateType: 'Enrollment',
        eventName: 'EnrollmentInitiated',
        data: enrollmentEvent.data,
        correlationId,
      });

      this.logger.info('Enrollment created', {
        correlationId,
        enrollmentId,
        learnerId: body.learnerId,
      });

      // Return success response
      reply.status(201).send(
        successResponse({
          enrollmentId,
          learnerId: body.learnerId,
          certificationId: body.certificationId,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create enrollment', {
        error: message,
      });
      throw error;
    }
  }

  /**
   * Get learner profile
   * GET /api/v1/learning/learners/:id/profile
   */
  async getLearnerProfile(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const learnerId = (request.params as any).id as string;

      this.logger.debug('Fetching learner profile', {
        correlationId,
        learnerId,
      });

      // Query read model
      const profile = await this.readModelRepository.findLearnerProfile(learnerId);

      if (!profile) {
        this.logger.warn('Learner profile not found', {
          correlationId,
          learnerId,
        });
        return reply.status(404).send(
          errorResponse('Learner not found', 'NOT_FOUND', undefined, correlationId)
        );
      }

      this.logger.debug('Learner profile fetched', {
        correlationId,
        learnerId,
      });

      reply.status(200).send(
        successResponse({
          learner_id: profile.learner_id,
          display_name: profile.display_name,
          email: profile.email,
          total_enrollments: profile.total_enrollments || 0,
          completed_enrollments: profile.completed_enrollments || 0,
          average_score: profile.average_score || 0,
          badges_earned: profile.badges_earned || 0,
          reputation_score: profile.reputation_score || 0,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch learner profile', {
        error: message,
      });
      throw error;
    }
  }

  /**
   * Complete an enrollment
   * POST /api/v1/learning/enrollments/:id/complete
   */
  async completeEnrollment(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const correlationId = (request as any).correlationId;
      const enrollmentId = (request.params as any).id as string;
      const body = (request as any)
        .validatedBody as CompleteEnrollmentRequest;

      this.logger.info('Completing enrollment', {
        correlationId,
        enrollmentId,
        finalScore: body.finalScore,
      });

      // Get enrollment from read model (using certification progress as enrollment record)
      const enrollment = await this.readModelRepository.findCertificationProgress(enrollmentId);

      if (!enrollment) {
        this.logger.warn('Enrollment not found', {
          correlationId,
          enrollmentId,
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

      // Publish EnrollmentCompleted event
      const completionEvent = new EnrollmentCompleted({
        enrollmentId,
        learnerId: enrollment.learner_id,
        pathId: enrollment.certification_id,
        finalScore: body.finalScore,
        completedAt: body.completedAt || new Date().toISOString(),
        correlationId,
      });

      await this.eventBus.publish(completionEvent);

      this.logger.info('Enrollment completed', {
        correlationId,
        enrollmentId,
        finalScore: body.finalScore,
      });

      reply.status(200).send(
        successResponse({
          enrollmentId,
          status: 'COMPLETED',
          finalScore: body.finalScore,
          completedAt: body.completedAt || new Date().toISOString(),
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to complete enrollment', {
        error: message,
      });
      throw error;
    }
  }
}

import { FastifyInstance } from 'fastify';
import { LearningController } from '../controllers/learning';
import { createValidationMiddleware } from '../middleware/validation';
import {
  EnrollmentRequestSchema,
  CompleteEnrollmentRequestSchema,
  LearnerProfileQuerySchema,
} from '../schemas/validation';

/**
 * Learning Domain Routes
 *
 * POST   /api/v1/learning/enrollments
 * GET    /api/v1/learning/learners/:id/profile
 * POST   /api/v1/learning/enrollments/:id/complete
 */
export async function registerLearningRoutes(
  fastify: FastifyInstance,
  controller: LearningController
) {
  /**
   * Create enrollment
   * POST /api/v1/learning/enrollments
   */
  fastify.post(
    '/api/v1/learning/enrollments',
    {
      preHandler: [
        createValidationMiddleware(fastify.logger, {
          bodySchema: EnrollmentRequestSchema,
        }),
      ],
    },
    (request, reply) => controller.createEnrollment(request, reply)
  );

  /**
   * Get learner profile
   * GET /api/v1/learning/learners/:id/profile
   */
  fastify.get(
    '/api/v1/learning/learners/:id/profile',
    (request, reply) => controller.getLearnerProfile(request, reply)
  );

  /**
   * Complete enrollment
   * POST /api/v1/learning/enrollments/:id/complete
   */
  fastify.post(
    '/api/v1/learning/enrollments/:id/complete',
    {
      preHandler: [
        createValidationMiddleware(fastify.logger, {
          bodySchema: CompleteEnrollmentRequestSchema,
        }),
      ],
    },
    (request, reply) => controller.completeEnrollment(request, reply)
  );
}

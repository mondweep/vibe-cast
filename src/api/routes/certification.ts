import { FastifyInstance } from 'fastify';
import { CertificationController } from '../controllers/certification';
import { createValidationMiddleware } from '../middleware/validation';
import {
  IssueBadgeRequestSchema,
  SubmitExamRequestSchema,
  CertificationProgressQuerySchema,
} from '../schemas/validation';

/**
 * Certification Domain Routes
 *
 * POST   /api/v1/certification/badges/issue
 * GET    /api/v1/certification/learners/:id/progress
 * POST   /api/v1/certification/exams/submit
 */
export async function registerCertificationRoutes(
  fastify: FastifyInstance,
  controller: CertificationController
) {
  /**
   * Issue badge
   * POST /api/v1/certification/badges/issue
   */
  fastify.post(
    '/api/v1/certification/badges/issue',
    {
      preHandler: [
        createValidationMiddleware(fastify.logger, {
          bodySchema: IssueBadgeRequestSchema,
        }),
      ],
    },
    (request, reply) => controller.issueBadge(request, reply)
  );

  /**
   * Get certification progress
   * GET /api/v1/certification/learners/:id/progress
   */
  fastify.get(
    '/api/v1/certification/learners/:id/progress',
    (request, reply) => controller.getCertificationProgress(request, reply)
  );

  /**
   * Submit exam
   * POST /api/v1/certification/exams/submit
   */
  fastify.post(
    '/api/v1/certification/exams/submit',
    {
      preHandler: [
        createValidationMiddleware(fastify.logger, {
          bodySchema: SubmitExamRequestSchema,
        }),
      ],
    },
    (request, reply) => controller.submitExam(request, reply)
  );
}

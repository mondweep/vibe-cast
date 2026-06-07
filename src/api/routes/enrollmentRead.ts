import { FastifyInstance } from 'fastify';
import { EnrollmentReadController } from '../controllers/enrollmentRead';

/**
 * Enrollment Read Route — closes the SPA contract gap.
 *
 * GET /api/v1/learning/enrollments/:id   single enrollment detail (JWT auth)
 *
 * Registered separately from the write routes (POST /enrollments,
 * POST /enrollments/:id/complete) which 'progress'/learning own.
 */
export async function registerEnrollmentReadRoutes(
  fastify: FastifyInstance,
  controller: EnrollmentReadController,
) {
  fastify.get('/api/v1/learning/enrollments/:id', (req, reply) =>
    controller.getEnrollment(req, reply),
  );
}

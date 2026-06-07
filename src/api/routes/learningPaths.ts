import { FastifyInstance } from 'fastify';
import { LearningCatalogController } from '../controllers/learningCatalog';

/**
 * Learning Catalog Routes (public, read-only) — PRD §4.1
 *
 * GET /api/v1/learning/paths                 list published paths
 * GET /api/v1/learning/paths/:id             path detail
 * GET /api/v1/learning/paths/:id/lessons     ordered lessons for a path
 * GET /api/v1/learning/lessons/:id           lesson detail (+ authored content)
 */
export async function registerLearningPathRoutes(
  fastify: FastifyInstance,
  controller: LearningCatalogController,
) {
  fastify.get('/api/v1/learning/paths', (req, reply) => controller.getPaths(req, reply));
  fastify.get('/api/v1/learning/paths/:id', (req, reply) => controller.getPath(req, reply));
  fastify.get('/api/v1/learning/paths/:id/lessons', (req, reply) => controller.getPathLessons(req, reply));
  fastify.get('/api/v1/learning/lessons/:id', (req, reply) => controller.getLesson(req, reply));

  // Learner reads (authenticated via Supabase JWT) — repaired here because the
  // legacy LearningController used a generic findById that the repo never had.
  fastify.get('/api/v1/learning/learners/:id/profile', (req, reply) => controller.getLearnerProfile(req, reply));
  fastify.get('/api/v1/learning/learners/:id/enrollments', (req, reply) => controller.getLearnerEnrollments(req, reply));
}

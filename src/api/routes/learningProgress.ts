import { FastifyInstance } from 'fastify';
import { LearningProgressController } from '../controllers/learningProgress';

/**
 * Learning Progress Routes — Progress Dashboard (PRD §4.3, ADR-011 CQRS).
 *
 * Reads (authenticated via Supabase JWT; owner-scoped by RLS):
 *   GET  /api/v1/learning/learners/:id/progress           dashboard summary
 *   GET  /api/v1/learning/learners/:id/path-enrollments   enrollments with %
 *   GET  /api/v1/learning/learners/:id/completed-lessons  completed lessons
 *
 * Commands (append domain events / upsert read models):
 *   POST /api/v1/learning/paths/:id/enroll                start a path
 *   POST /api/v1/learning/lessons/:id/complete            complete a lesson
 *
 * Note: distinct from the certification enrollment routes in learningPaths.ts
 * (`/learners/:id/enrollments`) — path progress is its own bounded read model
 * (ADR-013 §6).
 */
export async function registerLearningProgressRoutes(
  fastify: FastifyInstance,
  controller: LearningProgressController,
) {
  fastify.get('/api/v1/learning/learners/:id/progress', (req, reply) =>
    controller.getLearnerProgress(req, reply),
  );
  fastify.get('/api/v1/learning/learners/:id/path-enrollments', (req, reply) =>
    controller.getLearnerEnrollments(req, reply),
  );
  fastify.get('/api/v1/learning/learners/:id/completed-lessons', (req, reply) =>
    controller.getCompletedLessons(req, reply),
  );

  fastify.post('/api/v1/learning/paths/:id/enroll', (req, reply) =>
    controller.enroll(req, reply),
  );
  fastify.post('/api/v1/learning/lessons/:id/complete', (req, reply) =>
    controller.completeLesson(req, reply),
  );
}

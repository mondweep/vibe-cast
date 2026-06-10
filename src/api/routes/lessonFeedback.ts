import { FastifyInstance } from 'fastify';
import { LessonFeedbackController } from '../controllers/lessonFeedback';

/**
 * Lesson Feedback Routes — per-lesson likes + comments.
 *
 * Public reads:
 *   GET  /api/v1/lessons/:lessonId/feedback   → { likeCount, myLike, comments }
 *
 * Auth-required writes (Supabase JWT required):
 *   POST /api/v1/lessons/:lessonId/reactions  → toggle like
 *   POST /api/v1/lessons/:lessonId/comments   → add comment
 */
export async function registerLessonFeedbackRoutes(
  fastify: FastifyInstance,
  controller: LessonFeedbackController,
): Promise<void> {
  fastify.get('/api/v1/lessons/:lessonId/feedback', (req, reply) =>
    controller.getFeedback(req, reply),
  );
  fastify.post('/api/v1/lessons/:lessonId/reactions', (req, reply) =>
    controller.toggleReaction(req, reply),
  );
  fastify.post('/api/v1/lessons/:lessonId/comments', (req, reply) =>
    controller.addComment(req, reply),
  );
}

import { FastifyInstance } from 'fastify';
import { FeedbackController } from '../controllers/feedback';

/**
 * Feedback route (public — anonymous visitors may submit; a signed-in learner's
 * identity is attached from the verified session in the controller).
 * POST /api/v1/feedback  { category, subject?, message, name?, email?, pageContext?, allowPublic? }
 */
export async function registerFeedbackRoutes(
  fastify: FastifyInstance,
  controller: FeedbackController,
) {
  fastify.post('/api/v1/feedback', (req, reply) => controller.submit(req, reply));
}

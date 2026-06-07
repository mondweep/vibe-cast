import { FastifyInstance } from 'fastify';
import { TutorController } from '../controllers/tutor';

/**
 * Tutor route (authenticated via Supabase JWT — not in the public allowlist).
 * POST /api/v1/tutor/ask  { question, context?: { lessonId?, pathId? } }
 */
export async function registerTutorRoutes(
  fastify: FastifyInstance,
  controller: TutorController,
) {
  fastify.post('/api/v1/tutor/ask', (req, reply) => controller.ask(req, reply));
}

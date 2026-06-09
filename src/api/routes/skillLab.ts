import { FastifyInstance } from 'fastify';
import { SkillLabController } from '../controllers/skillLab';

/**
 * Skill Lab Routes (ADR-015, PRD §5).
 *
 * Public catalog reads:
 *   GET  /api/v1/skill-lab/exercises              list (+ ?skill= ?level= filters)
 *   GET  /api/v1/skill-lab/exercises/:exerciseId  detail (hints stripped)
 *
 * Authenticated writes (Supabase JWT required):
 *   POST /api/v1/skill-lab/exercises/:exerciseId/submit    submit code, run hidden tests
 *   GET  /api/v1/skill-lab/exercises/:exerciseId/hint      get next progressive hint
 *   POST /api/v1/skill-lab/exercises/:exerciseId/complete  mark exercise completed
 */
export async function registerSkillLabRoutes(
  fastify: FastifyInstance,
  controller: SkillLabController,
): Promise<void> {
  // Public
  fastify.get('/api/v1/skill-lab/exercises', (req, reply) =>
    controller.listExercises(req, reply),
  );
  fastify.get('/api/v1/skill-lab/exercises/:exerciseId', (req, reply) =>
    controller.getExercise(req, reply),
  );

  // Auth-required
  fastify.post('/api/v1/skill-lab/exercises/:exerciseId/submit', (req, reply) =>
    controller.submitAttempt(req, reply),
  );
  fastify.get('/api/v1/skill-lab/exercises/:exerciseId/hint', (req, reply) =>
    controller.getHint(req, reply),
  );
  fastify.post('/api/v1/skill-lab/exercises/:exerciseId/complete', (req, reply) =>
    controller.completeExercise(req, reply),
  );
}

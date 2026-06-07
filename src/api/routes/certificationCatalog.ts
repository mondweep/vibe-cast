import { FastifyInstance } from 'fastify';
import { CertificationCatalogController } from '../controllers/certificationCatalog';

/**
 * Certification Catalog Routes (read side) — closes the SPA contract gap.
 *
 * GET /api/v1/certification/certifications          list certifications (filters)
 * GET /api/v1/certification/certifications/:id       certification detail
 * GET /api/v1/certification/learners/:id/badges      per-learner earned badges
 *
 * The two catalog routes are public reads (added to the auth allowlist in
 * server.ts by 'integrator'); learner badges require a Supabase JWT.
 */
export async function registerCertificationCatalogRoutes(
  fastify: FastifyInstance,
  controller: CertificationCatalogController,
) {
  fastify.get('/api/v1/certification/certifications', (req, reply) =>
    controller.getCertifications(req, reply),
  );
  fastify.get('/api/v1/certification/certifications/:id', (req, reply) =>
    controller.getCertification(req, reply),
  );
  fastify.get('/api/v1/certification/learners/:id/badges', (req, reply) =>
    controller.getLearnerBadges(req, reply),
  );
}

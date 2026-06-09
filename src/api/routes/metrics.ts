import { FastifyInstance } from 'fastify';
import { MetricsController } from '../controllers/metrics';

/**
 * Metrics Routes — Learner & Cohort Analytics (PRD §8, ADR-017).
 *
 * All routes require a valid Supabase JWT (Bearer token).
 *
 *   GET /api/v1/metrics/my                       learner's own metrics
 *   GET /api/v1/metrics/cohorts                  list all cohorts
 *   GET /api/v1/metrics/cohorts/:cohortId         cohort aggregate overview
 */
export async function registerMetricsRoutes(
  fastify: FastifyInstance,
  controller: MetricsController,
): Promise<void> {
  fastify.get('/api/v1/metrics/my', (req, reply) =>
    controller.getLearnerMetrics(req, reply),
  );

  fastify.get('/api/v1/metrics/cohorts', (req, reply) =>
    controller.listCohorts(req, reply),
  );

  fastify.get('/api/v1/metrics/cohorts/:cohortId', (req, reply) =>
    controller.getCohortOverview(req, reply),
  );
}

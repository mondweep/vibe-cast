import { FastifyInstance } from 'fastify';
import { KnowledgeGraphController } from '../controllers/knowledgeGraph';

/**
 * Knowledge graph route (public, read-only — in the auth allowlist).
 * GET /api/v1/kg/graph -> { nodes, edges, counts }
 */
export async function registerKnowledgeGraphRoutes(
  fastify: FastifyInstance,
  controller: KnowledgeGraphController,
) {
  fastify.get('/api/v1/kg/graph', (req, reply) => controller.getGraph(req, reply));
}

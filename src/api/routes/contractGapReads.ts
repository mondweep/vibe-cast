import { FastifyInstance } from 'fastify';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { CertificationCatalogRepository } from '../../learning/infrastructure/repositories/CertificationCatalogRepository';
import { CertificationCatalogController } from '../controllers/certificationCatalog';
import { registerCertificationCatalogRoutes } from './certificationCatalog';
import { CommunityReadRepository } from '../../learning/infrastructure/repositories/CommunityReadRepository';
import { CommunityReadController } from '../controllers/communityRead';
import { registerCommunityReadRoutes } from './communityRead';
import { EnrollmentReadRepository } from '../../learning/infrastructure/repositories/EnrollmentReadRepository';
import { EnrollmentReadController } from '../controllers/enrollmentRead';
import { registerEnrollmentReadRoutes } from './enrollmentRead';

// supabase-js needs a global WebSocket even for REST-only use (mirrors the
// catalog/progress repositories). Polyfill for Node < 22.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/**
 * Build a service-preferring Supabase client for owner-scoped reads (badges,
 * single enrollment). These read models are RLS-protected (owner + service_role
 * only), so the public/anon catalog client cannot read them. The server is
 * trusted and scopes every query by id, so a service key is appropriate — this
 * mirrors createProgressSupabaseClient (ADR-011). Falls back to the publishable
 * key (then those endpoints simply return empty under RLS rather than crashing).
 * NEVER reads .env directly; never logs the key.
 */
function createServiceReadClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  const schema = process.env.DATABASE_SCHEMA || 'ruflo_demo';
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
}

/**
 * Register all read endpoints that close the frontend<->backend contract gap:
 *
 *   GET /api/v1/certification/certifications          (public)
 *   GET /api/v1/certification/certifications/:id        (public)
 *   GET /api/v1/certification/learners/:id/badges       (JWT)
 *   GET /api/v1/community/leaderboard/current-user      (JWT)
 *   GET /api/v1/community/members/search                (JWT)
 *   GET /api/v1/learning/enrollments/:id                (JWT)
 *
 * @param publicClient the publishable/anon catalog client (public_read tables:
 *   certifications, community profiles).
 */
export async function registerContractGapReadRoutes(
  fastify: FastifyInstance,
  publicClient: SupabaseClient,
  logger: Logger,
): Promise<void> {
  // Badges + single enrollment are owner/service-only — use a service client.
  const serviceClient = createServiceReadClient() ?? publicClient;

  // Certifications + community profiles are public_read — use the public client.
  // Badges are owner-scoped — pass the service client as the badge repository.
  const certRepo = new CertificationCatalogRepository(publicClient);
  const badgeRepo = new CertificationCatalogRepository(serviceClient);
  const certController = new CertificationCatalogController(certRepo, logger, badgeRepo);
  await registerCertificationCatalogRoutes(fastify, certController);

  const communityRepo = new CommunityReadRepository(publicClient);
  const communityController = new CommunityReadController(communityRepo, logger);
  await registerCommunityReadRoutes(fastify, communityController);

  const enrollmentRepo = new EnrollmentReadRepository(serviceClient);
  const enrollmentController = new EnrollmentReadController(enrollmentRepo, logger);
  await registerEnrollmentReadRoutes(fastify, enrollmentController);

  logger.info('Contract-gap read routes registered (certifications, badges, community search/rank, enrollment)');
}

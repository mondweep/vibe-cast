import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import {
  CertificationCatalogRepository,
  CertificationRow,
  BadgeRow,
  CertificationFilters,
} from '../../learning/infrastructure/repositories/CertificationCatalogRepository';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Certification Catalog Controller (read side) — closes the contract gap for
 * the SPA's list/detail certifications and per-learner badge reads.
 *
 * Public catalog endpoints (list/detail); learner badges authenticated via JWT.
 * Maps snake_case read-model rows to the camelCase shape the frontend types
 * expect (Certification, Badge).
 */
export class CertificationCatalogController {
  /**
   * @param repository public catalog reads (certifications — public_read RLS).
   * @param logger structured logger.
   * @param badgeRepository owner-scoped badge reads (service client). Defaults
   *   to the catalog repository when not supplied.
   */
  constructor(
    private repository: CertificationCatalogRepository,
    private logger: Logger,
    private badgeRepository: CertificationCatalogRepository = repository,
  ) {}

  private toCertification(row: CertificationRow) {
    return {
      id: row.certification_id,
      name: row.name,
      description: row.description,
      domain: row.domain,
      difficulty: row.difficulty,
      duration: row.duration_hours,
      examCount: row.exam_count,
      badgeId: row.badge_id ?? undefined,
      createdAt: row.created_at ?? '',
    };
  }

  private toBadge(row: BadgeRow) {
    return {
      id: row.badge_id,
      certificationId: row.certification_id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url ?? '',
      difficulty: row.difficulty,
      earnedAt: row.earned_at ?? undefined,
    };
  }

  private parseFilters(query: Record<string, unknown>): CertificationFilters {
    const allowedDifficulty = ['beginner', 'intermediate', 'advanced'];
    const allowedDomain = ['tech', 'business', 'creative'];
    const difficulty = typeof query.difficulty === 'string' ? query.difficulty : undefined;
    const domain = typeof query.domain === 'string' ? query.domain : undefined;
    const limit = toPositiveInt(query.limit);
    const skip = toPositiveInt(query.skip);
    return {
      difficulty: difficulty && allowedDifficulty.includes(difficulty) ? difficulty : undefined,
      domain: domain && allowedDomain.includes(domain) ? domain : undefined,
      limit,
      skip,
    };
  }

  async getCertifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    try {
      const filters = this.parseFilters((request.query as Record<string, unknown>) ?? {});
      const certs = await this.repository.findAllCertifications(filters);
      reply.status(200).send(successResponse(certs.map((c) => this.toCertification(c))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list certifications', { error: message, correlationId });
      reply.status(500).send(errorResponse('Failed to list certifications', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  async getCertification(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const certificationId = (request.params as any).id as string;
    try {
      const cert = await this.repository.findCertificationById(certificationId);
      if (!cert) {
        return reply.status(404).send(errorResponse('Certification not found', 'NOT_FOUND', undefined, correlationId));
      }
      reply.status(200).send(successResponse(this.toCertification(cert)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch certification', { error: message, correlationId, certificationId });
      reply.status(500).send(errorResponse('Failed to fetch certification', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  async getLearnerBadges(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const learnerId = (request.params as any).id as string;
    try {
      const badges = await this.badgeRepository.findBadgesByLearner(learnerId);
      reply.status(200).send(successResponse(badges.map((b) => this.toBadge(b))));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to fetch learner badges', { error: message, correlationId, learnerId });
      reply.status(500).send(errorResponse('Failed to fetch learner badges', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}

function toPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

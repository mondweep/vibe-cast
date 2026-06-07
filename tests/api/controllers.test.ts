import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LearningController } from '../../src/api/controllers/learning';
import { CertificationController } from '../../src/api/controllers/certification';
import { CommunityController } from '../../src/api/controllers/community';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';
import { IEventBus } from '../../src/shared/infrastructure/events/IEventBus';
import { IReadModelRepository } from '../../src/shared/infrastructure/readmodels/IReadModelRepository';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Controller Tests
 *
 * Tests for:
 * - Learning controller (enrollment, profile, completion)
 * - Certification controller (badges, progress, exams)
 * - Community controller (profiles, leaderboard)
 */

class MockReadModelRepository implements IReadModelRepository {
  private data: Map<string, Map<string, any>> = new Map();

  async findById(collection: string, id: string): Promise<any> {
    return this.data.get(collection)?.get(id) || null;
  }

  async findByQuery(collection: string, query: any): Promise<any> {
    return { data: [], total: 0 };
  }

  async save(collection: string, document: any): Promise<void> {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map());
    }
    this.data.get(collection)!.set(document.id, document);
  }

  setMockData(collection: string, id: string, data: any): void {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map());
    }
    this.data.get(collection)!.set(id, data);
  }
}

describe('API Controllers', () => {
  let logger: ConsoleLogger;
  let eventBus: IEventBus;
  let readModelRepository: MockReadModelRepository;

  beforeEach(() => {
    logger = new ConsoleLogger();
    eventBus = new EventBus(logger);
    readModelRepository = new MockReadModelRepository();
  });

  describe('LearningController', () => {
    let controller: LearningController;
    let mockRequest: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;

    beforeEach(() => {
      controller = new LearningController(
        eventBus,
        readModelRepository,
        logger
      );

      mockRequest = {
        correlationId: 'test-correlation-123',
        validatedBody: {},
      };

      mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };
    });

    it('should create enrollment and publish event', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');

      mockRequest.validatedBody = {
        learnerId: '550e8400-e29b-41d4-a716-446655440000',
        certificationId: '550e8400-e29b-41d4-a716-446655440001',
      };

      await controller.createEnrollment(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(publishSpy).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 for missing learner profile', async () => {
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      await controller.getLearnerProfile(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
    });

    it('should return learner profile when found', async () => {
      const learnerId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.params = { id: learnerId };

      readModelRepository.setMockData('LearnerProfile', learnerId, {
        learner_id: learnerId,
        display_name: 'Test Learner',
        email: 'test@example.com',
        total_enrollments: 2,
        completed_enrollments: 1,
        average_score: 85,
        badges_earned: 3,
        reputation_score: 100,
      });

      await controller.getLearnerProfile(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should complete enrollment and publish event', async () => {
      const enrollmentId = '550e8400-e29b-41d4-a716-446655440000';
      const learnerId = '550e8400-e29b-41d4-a716-446655440001';

      mockRequest.params = { id: enrollmentId };
      mockRequest.validatedBody = {
        finalScore: 85,
        completedAt: new Date().toISOString(),
      };

      readModelRepository.setMockData('Enrollment', enrollmentId, {
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        certification_id: '550e8400-e29b-41d4-a716-446655440002',
        status: 'ACTIVE',
      });

      const publishSpy = vi.spyOn(eventBus, 'publish');

      await controller.completeEnrollment(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(publishSpy).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('CertificationController', () => {
    let controller: CertificationController;
    let mockRequest: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;

    beforeEach(() => {
      controller = new CertificationController(
        eventBus,
        readModelRepository,
        logger
      );

      mockRequest = {
        correlationId: 'test-correlation-123',
        validatedBody: {},
      };

      mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };
    });

    it('should issue badge and publish event', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');

      mockRequest.validatedBody = {
        learnerId: '550e8400-e29b-41d4-a716-446655440000',
        enrollmentId: '550e8400-e29b-41d4-a716-446655440001',
        badgeId: '550e8400-e29b-41d4-a716-446655440002',
        certificationName: 'JavaScript Expert',
      };

      await controller.issueBadge(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(publishSpy).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(202);
    });

    it('should return 404 for missing certification progress', async () => {
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      await controller.getCertificationProgress(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 for enrollment not found on exam submit', async () => {
      mockRequest.validatedBody = {
        enrollmentId: '550e8400-e29b-41d4-a716-446655440000',
        examId: '550e8400-e29b-41d4-a716-446655440001',
        answers: { q1: 'a', q2: 'b' },
        score: 85,
      };

      await controller.submitExam(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
    });

    it('should submit exam and publish event', async () => {
      const enrollmentId = '550e8400-e29b-41d4-a716-446655440000';
      const learnerId = '550e8400-e29b-41d4-a716-446655440001';

      mockRequest.validatedBody = {
        enrollmentId,
        examId: '550e8400-e29b-41d4-a716-446655440002',
        answers: { q1: 'a', q2: 'b' },
        score: 85,
      };

      readModelRepository.setMockData('Enrollment', enrollmentId, {
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        certification_id: '550e8400-e29b-41d4-a716-446655440003',
      });

      const publishSpy = vi.spyOn(eventBus, 'publish');

      await controller.submitExam(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(publishSpy).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });

  describe('CommunityController', () => {
    let controller: CommunityController;
    let mockRequest: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;

    beforeEach(() => {
      controller = new CommunityController(readModelRepository, logger);

      mockRequest = {
        correlationId: 'test-correlation-123',
        validatedQuery: {},
      };

      mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };
    });

    it('should return 404 for missing member profile', async () => {
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      await controller.getMemberProfile(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(404);
    });

    it('should return member profile when found', async () => {
      const memberId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.params = { id: memberId };

      readModelRepository.setMockData('CommunityProfile', memberId, {
        learner_id: memberId,
        display_name: 'Test Member',
        bio: 'Learning TypeScript',
        avatar_url: null,
        badge_count: 5,
        reputation_score: 250,
        joined_at: new Date().toISOString(),
      });

      await controller.getMemberProfile(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should return paginated leaderboard', async () => {
      mockRequest.validatedQuery = {
        limit: 10,
        skip: 0,
      };

      await controller.getLeaderboard(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(200);
    });
  });
});

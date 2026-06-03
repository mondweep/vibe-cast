import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { Logger } from '../../src/shared/infrastructure/logging/Logger';
import { SupabaseReadModelRepository } from '../../src/shared/infrastructure/readmodels/SupabaseReadModelRepository';
import { ProjectorBootstrap } from '../../src/shared/infrastructure/bootstrap/ProjectorBootstrap';
import { LearnerProfileQueryService } from '../../src/learning/application/queries/LearnerProfileQueryService';
import { CertificationProgressQueryService } from '../../src/certification/application/queries/CertificationProgressQueryService';
import { CommunityProfileQueryService } from '../../src/community/application/queries/CommunityProfileQueryService';
import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { UUID } from '../../src/shared/domain/ValueObjects';

// Mock implementations for domain events
class TestEnrollmentCompletedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly enrollmentId: UUID,
    public readonly finalScore: number,
    public readonly completedAt: string
  ) {
    super('EnrollmentCompleted', uuidv4());
    this.correlationId = uuidv4();
  }

  getEventName(): string {
    return 'EnrollmentCompleted';
  }

  getId(): string {
    return this.id;
  }
}

class TestBadgeIssuedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly enrollmentId: UUID,
    public readonly badgeId: string,
    public readonly certificationName: string,
    public readonly issuedAt: string
  ) {
    super('BadgeIssued', uuidv4());
    this.correlationId = uuidv4();
  }

  getEventName(): string {
    return 'BadgeIssued';
  }

  getId(): string {
    return this.id;
  }
}

class TestExerciseCompletedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly skillId: string,
    public readonly skillName: string,
    public readonly score: number,
    public readonly completedAt: string
  ) {
    super('ExerciseCompleted', uuidv4());
    this.correlationId = uuidv4();
  }

  getEventName(): string {
    return 'ExerciseCompleted';
  }

  getId(): string {
    return this.id;
  }
}

class TestExamCompletedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly enrollmentId: UUID,
    public readonly examId: string,
    public readonly examScore: number,
    public readonly completedAt: string
  ) {
    super('ExamCompleted', uuidv4());
    this.correlationId = uuidv4();
  }

  getEventName(): string {
    return 'ExamCompleted';
  }

  getId(): string {
    return this.id;
  }
}

class TestBadgeEarnedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly badgeId: string,
    public readonly badgeName: string,
    public readonly issuedAt: string
  ) {
    super('BadgeEarned', uuidv4());
    this.correlationId = uuidv4();
  }

  getEventName(): string {
    return 'BadgeEarned';
  }

  getId(): string {
    return this.id;
  }
}

class TestSkillAchievedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly skillId: string,
    public readonly skillName: string,
    public readonly score: number,
    public readonly achievedAt: string
  ) {
    super('SkillAchieved', uuidv4());
    this.correlationId = uuidv4();
  }

  getEventName(): string {
    return 'SkillAchieved';
  }

  getId(): string {
    return this.id;
  }
}

describe('Query Model Synchronization Integration Tests', () => {
  let eventBus: EventBus;
  let logger: Logger;
  let readModelRepository: SupabaseReadModelRepository;
  let learnerProfileQueryService: LearnerProfileQueryService;
  let certificationProgressQueryService: CertificationProgressQueryService;
  let communityProfileQueryService: CommunityProfileQueryService;

  beforeEach(async () => {
    logger = new Logger();

    // Initialize Supabase client and repository (mocked in test environment)
    // readModelRepository = new SupabaseReadModelRepository(supabaseClient);

    eventBus = new EventBus(logger);

    // Register projectors with EventBus
    ProjectorBootstrap.registerProjectors(eventBus, readModelRepository);

    // Initialize query services
    learnerProfileQueryService = new LearnerProfileQueryService(readModelRepository);
    certificationProgressQueryService = new CertificationProgressQueryService(readModelRepository);
    communityProfileQueryService = new CommunityProfileQueryService(readModelRepository);
  });

  afterEach(() => {
    eventBus.shutdown();
  });

  describe('LearnerProfileProjector', () => {
    it('should project EnrollmentCompleted events into LearnerProfileReadModel', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const event = new TestEnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85,
        new Date().toISOString()
      );

      await eventBus.publish(event);

      // Wait for async handler to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const profile = await learnerProfileQueryService.getLearnerProfile(learnerId);
      expect(profile).toBeDefined();
      expect(profile?.total_enrollments).toBe(1);
      expect(profile?.completed_enrollment_count).toBe(1);
      expect(profile?.average_score).toBe(85);
    });

    it('should project BadgeIssued events into badges_earned array', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const badgeId = 'badge-001';
      const event = new TestBadgeIssuedEvent(
        learnerId,
        enrollmentId,
        badgeId,
        'TypeScript Mastery',
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const profile = await learnerProfileQueryService.getLearnerProfile(learnerId);
      expect(profile?.badges_earned).toContainEqual(
        expect.objectContaining({ badgeId })
      );
    });

    it('should prevent duplicate badges in profile', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const badgeId = 'badge-001';

      const event = new TestBadgeIssuedEvent(
        learnerId,
        enrollmentId,
        badgeId,
        'TypeScript Mastery',
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 50));

      // Publish same event again (idempotency test)
      event.id = uuidv4(); // Different event ID but same data
      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 50));

      const profile = await learnerProfileQueryService.getLearnerProfile(learnerId);
      const badgeCount = profile?.badges_earned.filter(b => b.badgeId === badgeId).length || 0;
      expect(badgeCount).toBe(1); // Should only have one instance
    });

    it('should calculate average score across multiple enrollments', async () => {
      const learnerId = uuidv4() as UUID;

      const event1 = new TestEnrollmentCompletedEvent(
        learnerId,
        uuidv4() as UUID,
        80,
        new Date().toISOString()
      );
      const event2 = new TestEnrollmentCompletedEvent(
        learnerId,
        uuidv4() as UUID,
        90,
        new Date().toISOString()
      );

      await eventBus.publish(event1);
      await new Promise(resolve => setTimeout(resolve, 50));
      await eventBus.publish(event2);
      await new Promise(resolve => setTimeout(resolve, 50));

      const profile = await learnerProfileQueryService.getLearnerProfile(learnerId);
      expect(profile?.average_score).toBe(85);
    });
  });

  describe('CertificationProgressProjector', () => {
    it('should project ExamCompleted events into exam_attempts array', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const examId = 'exam-001';
      const event = new TestExamCompletedEvent(
        learnerId,
        enrollmentId,
        examId,
        75,
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const progress = await certificationProgressQueryService.getEnrollmentProgress(enrollmentId);
      expect(progress?.exam_attempts).toContainEqual(
        expect.objectContaining({ examId, score: 75, status: 'PASSED' })
      );
    });

    it('should set enrollment_status to COMPLETED when exam score >= 70', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const event = new TestExamCompletedEvent(
        learnerId,
        enrollmentId,
        'exam-001',
        72,
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const progress = await certificationProgressQueryService.getEnrollmentProgress(enrollmentId);
      expect(progress?.enrollment_status).toBe('COMPLETED');
    });

    it('should set enrollment_status to FAILED when exam score < 70', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const event = new TestExamCompletedEvent(
        learnerId,
        enrollmentId,
        'exam-001',
        65,
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const progress = await certificationProgressQueryService.getEnrollmentProgress(enrollmentId);
      expect(progress?.enrollment_status).toBe('FAILED');
    });

    it('should calculate next_renewal_date as +1 year from badge issuance', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const issuedAt = new Date('2025-06-03').toISOString();
      const event = new TestBadgeIssuedEvent(
        learnerId,
        enrollmentId,
        'badge-001',
        'Certification',
        issuedAt
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const progress = await certificationProgressQueryService.getEnrollmentProgress(enrollmentId);
      const renewalDate = new Date(progress?.next_renewal_date || '');
      expect(renewalDate.getFullYear()).toBe(2026);
      expect(renewalDate.getMonth()).toBe(5); // June = 5 (0-indexed)
    });
  });

  describe('CommunityProfileProjector', () => {
    it('should project BadgeEarned events into community profile', async () => {
      const learnerId = uuidv4() as UUID;
      const badgeId = 'community-badge-001';
      const event = new TestBadgeEarnedEvent(
        learnerId,
        badgeId,
        'Community Champion',
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const profile = await communityProfileQueryService.getCommunityProfile(learnerId);
      expect(profile?.badges).toContainEqual(
        expect.objectContaining({ badgeId })
      );
      expect(profile?.badge_count).toBe(1);
    });

    it('should project SkillAchieved events into community profile', async () => {
      const learnerId = uuidv4() as UUID;
      const skillId = 'skill-001';
      const event = new TestSkillAchievedEvent(
        learnerId,
        skillId,
        'Advanced TypeScript',
        85,
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const profile = await communityProfileQueryService.getCommunityProfile(learnerId);
      expect(profile?.skills).toContainEqual(
        expect.objectContaining({ skillId })
      );
      expect(profile?.skill_count).toBe(1);
    });

    it('should calculate reputation_score as (badges * 50) + (skills * 10)', async () => {
      const learnerId = uuidv4() as UUID;

      // Add 2 badges
      const badge1 = new TestBadgeEarnedEvent(
        learnerId,
        'badge-001',
        'Badge 1',
        new Date().toISOString()
      );
      const badge2 = new TestBadgeEarnedEvent(
        learnerId,
        'badge-002',
        'Badge 2',
        new Date().toISOString()
      );

      // Add 3 skills
      const skill1 = new TestSkillAchievedEvent(
        learnerId,
        'skill-001',
        'Skill 1',
        80,
        new Date().toISOString()
      );
      const skill2 = new TestSkillAchievedEvent(
        learnerId,
        'skill-002',
        'Skill 2',
        85,
        new Date().toISOString()
      );
      const skill3 = new TestSkillAchievedEvent(
        learnerId,
        'skill-003',
        'Skill 3',
        90,
        new Date().toISOString()
      );

      await eventBus.publish(badge1);
      await new Promise(resolve => setTimeout(resolve, 50));
      await eventBus.publish(badge2);
      await new Promise(resolve => setTimeout(resolve, 50));
      await eventBus.publish(skill1);
      await new Promise(resolve => setTimeout(resolve, 50));
      await eventBus.publish(skill2);
      await new Promise(resolve => setTimeout(resolve, 50));
      await eventBus.publish(skill3);
      await new Promise(resolve => setTimeout(resolve, 50));

      const profile = await communityProfileQueryService.getCommunityProfile(learnerId);
      // Expected: (2 * 50) + (3 * 10) = 100 + 30 = 130
      expect(profile?.reputation_score).toBe(130);
    });
  });

  describe('Query Service Performance', () => {
    it('should retrieve learner profile within 100ms', async () => {
      const learnerId = uuidv4() as UUID;
      const event = new TestEnrollmentCompletedEvent(
        learnerId,
        uuidv4() as UUID,
        85,
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      const profile = await learnerProfileQueryService.getLearnerProfile(learnerId);
      const duration = Date.now() - startTime;

      expect(profile).toBeDefined();
      expect(duration).toBeLessThan(100);
    });

    it('should retrieve community profile within 100ms', async () => {
      const learnerId = uuidv4() as UUID;
      const event = new TestBadgeEarnedEvent(
        learnerId,
        'badge-001',
        'Test Badge',
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      const profile = await communityProfileQueryService.getCommunityProfile(learnerId);
      const duration = Date.now() - startTime;

      expect(profile).toBeDefined();
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate events without creating duplicate records', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const eventId = uuidv4();

      const event = new TestEnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85,
        new Date().toISOString()
      );
      event.id = eventId;

      // Publish twice with same event ID
      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 50));
      await eventBus.publish(event); // Should be skipped due to idempotency
      await new Promise(resolve => setTimeout(resolve, 50));

      const profile = await learnerProfileQueryService.getLearnerProfile(learnerId);
      expect(profile?.total_enrollments).toBe(1); // Should only count once
    });

    it('should track last_synced_event_id for idempotency', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const event = new TestEnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85,
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      const profile = await learnerProfileQueryService.getLearnerProfile(learnerId);
      expect(profile?.last_synced_event_id).toBe(event.id);
    });
  });

  describe('EventBus Integration', () => {
    it('should register all projectors with EventBus', () => {
      const subscriptionCount = eventBus.getSubscriptionCount();
      // Should have subscriptions for all projectors:
      // LearnerProfileProjector: EnrollmentCompleted, BadgeIssued, ExerciseCompleted
      // CertificationProgressProjector: ExamCompleted, BadgeIssued
      // CommunityProfileProjector: BadgeEarned, SkillAchieved
      // MetricsProjector: 6 events
      // Total: 3 + 2 + 2 + 6 = 13
      expect(subscriptionCount).toBeGreaterThanOrEqual(13);
    });

    it('should not add events to DLQ on successful projection', async () => {
      const event = new TestEnrollmentCompletedEvent(
        uuidv4() as UUID,
        uuidv4() as UUID,
        85,
        new Date().toISOString()
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(eventBus.getDeadLetterQueueSize()).toBe(0);
    });
  });
});

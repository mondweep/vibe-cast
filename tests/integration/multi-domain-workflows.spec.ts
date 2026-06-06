import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';
import { IReadModelRepository } from '../../src/shared/infrastructure/readmodels/IReadModelRepository';
import { ProjectorBootstrap } from '../../src/shared/infrastructure/bootstrap/ProjectorBootstrap';
import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { UUID } from '../../src/shared/domain/ValueObjects';

/**
 * Multi-Domain Workflow Integration Tests
 * Tests end-to-end event flow across domains: Learning → Certification → Community
 */

// Mock repository
class MockReadModelRepository implements IReadModelRepository {
  private learnerProfiles = new Map();
  private certificationProgress = new Map();
  private communityProfiles = new Map();
  private metricsData = new Map();

  async saveLearnerProfile(profile: any): Promise<void> {
    this.learnerProfiles.set(profile.learner_id, profile);
  }

  async findLearnerProfile(learnerId: UUID): Promise<any> {
    return this.learnerProfiles.get(learnerId) || null;
  }

  async findLearnerProfiles(learnerIds: UUID[]): Promise<any[]> {
    return learnerIds.map((id) => this.learnerProfiles.get(id)).filter((p) => p);
  }

  async findTopLearnersByActivity(limit: number): Promise<any[]> {
    return Array.from(this.learnerProfiles.values()).slice(0, limit);
  }

  async saveCertificationProgress(progress: any): Promise<void> {
    this.certificationProgress.set(progress.enrollment_id, progress);
  }

  async findCertificationProgress(enrollmentId: UUID): Promise<any> {
    return this.certificationProgress.get(enrollmentId) || null;
  }

  async findCertificationProgressByLearner(learnerId: UUID): Promise<any[]> {
    return Array.from(this.certificationProgress.values()).filter(
      (p) => p.learner_id === learnerId
    );
  }

  async findCompletedCertifications(learnerId: UUID): Promise<any[]> {
    return Array.from(this.certificationProgress.values()).filter(
      (p) => p.learner_id === learnerId && p.badge_status === 'ISSUED'
    );
  }

  async saveCommunityProfile(profile: any): Promise<void> {
    this.communityProfiles.set(profile.learner_id, profile);
  }

  async findCommunityProfile(learnerId: UUID): Promise<any> {
    return this.communityProfiles.get(learnerId) || null;
  }

  async findTopLearnersByReputation(limit: number): Promise<any[]> {
    return Array.from(this.communityProfiles.values())
      .sort((a, b) => b.reputation_score - a.reputation_score)
      .slice(0, limit);
  }

  async findTopLearnersByBadgeCount(limit: number): Promise<any[]> {
    return Array.from(this.communityProfiles.values())
      .sort((a, b) => b.badge_count - a.badge_count)
      .slice(0, limit);
  }

  async findLearnersByMinimumSkillCount(minimumSkills: number): Promise<any[]> {
    return Array.from(this.communityProfiles.values()).filter(
      (p) => p.skill_count >= minimumSkills
    );
  }

  async saveMetrics(metrics: any): Promise<void> {
    this.metricsData.set(metrics.metrics_id, metrics);
  }

  async findMetricsForPeriod(period: string, date: string): Promise<any> {
    const key = `${period}_${date}`;
    return this.metricsData.get(key) || null;
  }

  async findMetricsForDateRange(): Promise<any[]> {
    return Array.from(this.metricsData.values());
  }
}

// Test events
class EnrollmentCompletedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly enrollmentId: UUID,
    public readonly finalScore: number,
    public readonly completedAt: string = new Date().toISOString()
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return 'EnrollmentCompleted';
  }

  toPrimitives(): any {
    return {
      learnerId: this.learnerId,
      enrollmentId: this.enrollmentId,
      finalScore: this.finalScore,
      completedAt: this.completedAt,
    };
  }
}

class ExamCompletedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly enrollmentId: UUID,
    public readonly examId: UUID,
    public readonly examScore: number,
    public readonly completedAt: string = new Date().toISOString()
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return 'ExamCompleted';
  }

  toPrimitives(): any {
    return {
      learnerId: this.learnerId,
      enrollmentId: this.enrollmentId,
      examId: this.examId,
      examScore: this.examScore,
      completedAt: this.completedAt,
    };
  }
}

class BadgeIssuedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly enrollmentId: UUID,
    public readonly badgeId: UUID,
    public readonly certificationName: string,
    public readonly issuedAt: string = new Date().toISOString()
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return 'BadgeIssued';
  }

  toPrimitives(): any {
    return {
      learnerId: this.learnerId,
      enrollmentId: this.enrollmentId,
      badgeId: this.badgeId,
      certificationName: this.certificationName,
      issuedAt: this.issuedAt,
    };
  }
}

class BadgeEarnedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly badgeId: UUID,
    public readonly badgeName: string,
    public readonly issuedAt: string = new Date().toISOString()
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return 'BadgeEarned';
  }

  toPrimitives(): any {
    return {
      learnerId: this.learnerId,
      badgeId: this.badgeId,
      badgeName: this.badgeName,
      issuedAt: this.issuedAt,
    };
  }
}

// Projector handlers that simulate domain event processing
class LearnerProfileProjector {
  constructor(private repository: IReadModelRepository) {}

  async handle(event: DomainEvent): Promise<void> {
    if (event.getEventName() === 'EnrollmentCompleted') {
      const enrollment = event.toPrimitives();
      const profile = {
        learner_id: enrollment.learnerId,
        total_enrollments: 1,
        completed_enrollment_count: 1,
        average_score: enrollment.finalScore,
        last_activity_at: enrollment.completedAt,
      };
      await this.repository.saveLearnerProfile(profile);
    }
  }
}

class CertificationProgressProjector {
  constructor(private repository: IReadModelRepository) {}

  async handle(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();
    const data = event.toPrimitives();

    if (eventName === 'ExamCompleted') {
      const progress = {
        enrollment_id: data.enrollmentId,
        learner_id: data.learnerId,
        current_grade: data.examScore,
        exam_attempts: [{ exam_id: data.examId, score: data.examScore }],
        badge_status: 'NONE',
      };
      await this.repository.saveCertificationProgress(progress);
    } else if (eventName === 'BadgeIssued') {
      const progress = {
        enrollment_id: data.enrollmentId,
        learner_id: data.learnerId,
        badge_status: 'ISSUED',
        issued_badge_id: data.badgeId,
      };
      await this.repository.saveCertificationProgress(progress);
    }
  }
}

class CommunityProfileProjector {
  constructor(private repository: IReadModelRepository) {}

  async handle(event: DomainEvent): Promise<void> {
    if (event.getEventName() === 'BadgeEarned') {
      const data = event.toPrimitives();
      const profile = {
        learner_id: data.learnerId,
        display_name: `Learner-${data.learnerId.substring(0, 8)}`,
        badge_count: 1,
        skill_count: 0,
        reputation_score: 50,
        badges: [{ badge_id: data.badgeId, name: data.badgeName }],
      };
      await this.repository.saveCommunityProfile(profile);
    }
  }
}

describe('Multi-Domain Workflow Integration Tests', () => {
  let eventBus: EventBus;
  let repository: MockReadModelRepository;
  let logger: ConsoleLogger;
  let learnerProjector: LearnerProfileProjector;
  let certProjector: CertificationProgressProjector;
  let communityProjector: CommunityProfileProjector;

  beforeEach(() => {
    logger = new ConsoleLogger();
    repository = new MockReadModelRepository();
    eventBus = new EventBus(logger);

    learnerProjector = new LearnerProfileProjector(repository);
    certProjector = new CertificationProgressProjector(repository);
    communityProjector = new CommunityProfileProjector(repository);

    // Register projectors with EventBus
    eventBus.subscribe(learnerProjector, 'EnrollmentCompleted');
    eventBus.subscribe(certProjector, 'ExamCompleted');
    eventBus.subscribe(certProjector, 'BadgeIssued');
    eventBus.subscribe(communityProjector, 'BadgeEarned');
  });

  afterEach(() => {
    eventBus.shutdown();
  });

  describe('Learning → Certification → Community workflow', () => {
    it('should propagate enrollment completion to learner profile', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      const enrollmentEvent = new EnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85,
        new Date().toISOString()
      );

      await eventBus.publish(enrollmentEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const profile = await repository.findLearnerProfile(learnerId);
      expect(profile).toBeDefined();
      expect(profile.learner_id).toBe(learnerId);
      expect(profile.completed_enrollment_count).toBe(1);
    });

    it('should synchronize exam results to certification progress', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const examId = uuidv4() as UUID;

      const examEvent = new ExamCompletedEvent(
        learnerId,
        enrollmentId,
        examId,
        75,
        new Date().toISOString()
      );

      await eventBus.publish(examEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const progress = await repository.findCertificationProgress(enrollmentId);
      expect(progress).toBeDefined();
      expect(progress.current_grade).toBe(75);
    });

    it('should update community profile when badge earned', async () => {
      const learnerId = uuidv4() as UUID;
      const badgeId = uuidv4() as UUID;

      const badgeEarnedEvent = new BadgeEarnedEvent(
        learnerId,
        badgeId,
        'Master Badge',
        new Date().toISOString()
      );

      await eventBus.publish(badgeEarnedEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const communityProfile = await repository.findCommunityProfile(learnerId);
      expect(communityProfile).toBeDefined();
      expect(communityProfile.badge_count).toBe(1);
      expect(communityProfile.reputation_score).toBe(50);
    });

    it('should handle complete enrollment → exam → badge workflow', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const examId = uuidv4() as UUID;
      const badgeId = uuidv4() as UUID;

      const enrollmentEvent = new EnrollmentCompletedEvent(learnerId, enrollmentId, 85);
      await eventBus.publish(enrollmentEvent);

      const examEvent = new ExamCompletedEvent(learnerId, enrollmentId, examId, 85);
      await eventBus.publish(examEvent);

      const badgeIssuedEvent = new BadgeIssuedEvent(
        learnerId,
        enrollmentId,
        badgeId,
        'JavaScript Developer'
      );
      await eventBus.publish(badgeIssuedEvent);

      const badgeEarnedEvent = new BadgeEarnedEvent(
        learnerId,
        badgeId,
        'JavaScript Developer'
      );
      await eventBus.publish(badgeEarnedEvent);

      await new Promise(resolve => setTimeout(resolve, 50));

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      const certProgress = await repository.findCertificationProgress(enrollmentId);
      const communityProfile = await repository.findCommunityProfile(learnerId);

      expect(learnerProfile).toBeDefined();
      expect(certProgress).toBeDefined();
      expect(communityProfile).toBeDefined();
      expect(certProgress.badge_status).toBe('ISSUED');
    });

    it('should handle multiple learners in parallel workflows', async () => {
      const learner1Id = uuidv4() as UUID;
      const learner2Id = uuidv4() as UUID;
      const enrollment1Id = uuidv4() as UUID;
      const enrollment2Id = uuidv4() as UUID;

      const event1 = new EnrollmentCompletedEvent(learner1Id, enrollment1Id, 85);
      const event2 = new EnrollmentCompletedEvent(learner2Id, enrollment2Id, 90);

      await Promise.all([eventBus.publish(event1), eventBus.publish(event2)]);
      await new Promise(resolve => setTimeout(resolve, 50));

      const profile1 = await repository.findLearnerProfile(learner1Id);
      const profile2 = await repository.findLearnerProfile(learner2Id);

      expect(profile1).toBeDefined();
      expect(profile2).toBeDefined();
      expect(profile1.learner_id).toBe(learner1Id);
      expect(profile2.learner_id).toBe(learner2Id);
    });

    it('should not add successful events to DLQ', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      const event = new EnrollmentCompletedEvent(learnerId, enrollmentId, 85);
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toBe(0);
    });
  });

  describe('Domain boundaries and ACL', () => {
    it('should translate certification → community badge issuance', async () => {
      const learnerId = uuidv4() as UUID;
      const badgeId = uuidv4() as UUID;

      const badgeIssuedEvent = new BadgeIssuedEvent(
        learnerId,
        uuidv4() as UUID,
        badgeId,
        'Master Badge'
      );

      await eventBus.publish(badgeIssuedEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const certProgress = await repository.findCertificationProgress(badgeIssuedEvent.toPrimitives().enrollmentId);
      expect(certProgress).toBeDefined();
      expect(certProgress.badge_status).toBe('ISSUED');
    });

    it('should complete learning → certification enrollment transition', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      const enrollmentEvent = new EnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85
      );

      await eventBus.publish(enrollmentEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      expect(learnerProfile).toBeDefined();
      expect(learnerProfile.completed_enrollment_count).toBe(1);
    });
  });

  describe('Cross-domain data consistency', () => {
    it('should maintain consistent learner ID across all domains', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      const enrollmentEvent = new EnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85
      );

      await eventBus.publish(enrollmentEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      expect(learnerProfile.learner_id).toBe(learnerId);
    });

    it('should handle badge count consistency after multiple awards', async () => {
      const learnerId = uuidv4() as UUID;
      const badgeId1 = uuidv4() as UUID;
      const badgeId2 = uuidv4() as UUID;

      const event1 = new BadgeEarnedEvent(learnerId, badgeId1, 'Badge 1');
      const event2 = new BadgeEarnedEvent(learnerId, badgeId2, 'Badge 2');

      await eventBus.publish(event1);
      await new Promise(resolve => setTimeout(resolve, 25));
      await eventBus.publish(event2);
      await new Promise(resolve => setTimeout(resolve, 25));

      const communityProfile = await repository.findCommunityProfile(learnerId);
      expect(communityProfile.badge_count).toBe(1);
      expect(communityProfile.badges).toBeDefined();
    });

    it('should preserve timestamp consistency across events', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const timestamp = new Date().toISOString();

      const event = new EnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85,
        timestamp
      );

      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 50));

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      expect(learnerProfile.last_activity_at).toBe(timestamp);
    });
  });

  describe('Error recovery across domains', () => {
    it('should not place successful events in DLQ', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      const event = new EnrollmentCompletedEvent(learnerId, enrollmentId, 85);
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toBe(0);
    });

    it('should maintain DLQ for tracking potential failures', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      const event = new EnrollmentCompletedEvent(learnerId, enrollmentId, 85);
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      expect(Array.isArray(dlq)).toBe(true);
    });
  });

  describe('Eventual consistency', () => {
    it('should eventually reflect badge in community profile', async () => {
      const learnerId = uuidv4() as UUID;
      const badgeId = uuidv4() as UUID;

      const badgeEarnedEvent = new BadgeEarnedEvent(
        learnerId,
        badgeId,
        'Master',
        new Date().toISOString()
      );

      await eventBus.publish(badgeEarnedEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const communityProfile = await repository.findCommunityProfile(learnerId);
      expect(communityProfile).toBeDefined();
      expect(communityProfile.badges).toContainEqual({
        badge_id: badgeId,
        name: 'Master',
      });
    });

    it('should synchronize read models after multi-step workflow', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      const event = new EnrollmentCompletedEvent(learnerId, enrollmentId, 85);
      await eventBus.publish(event);
      await new Promise(resolve => setTimeout(resolve, 50));

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      expect(learnerProfile).toBeDefined();
      expect(learnerProfile.completed_enrollment_count).toBe(1);
    });

    it('should handle out-of-order event arrival gracefully', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const badgeId = uuidv4() as UUID;

      const badgeEvent = new BadgeIssuedEvent(
        learnerId,
        enrollmentId,
        badgeId,
        'Badge'
      );
      const enrollmentEvent = new EnrollmentCompletedEvent(
        learnerId,
        enrollmentId,
        85
      );

      await eventBus.publish(badgeEvent);
      await eventBus.publish(enrollmentEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      const certProgress = await repository.findCertificationProgress(enrollmentId);

      expect(learnerProfile).toBeDefined();
      expect(certProgress).toBeDefined();
    });
  });
});

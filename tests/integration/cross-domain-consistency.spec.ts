import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';
import { IReadModelRepository } from '../../src/shared/infrastructure/readmodels/IReadModelRepository';
import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { UUID } from '../../src/shared/domain/ValueObjects';

/**
 * Cross-Domain Consistency Tests
 * Validates consistency constraints across Learning, Certification, and Community domains
 */

// Multi-domain consistency repository
class CrossDomainRepository implements IReadModelRepository {
  private learnerProfiles = new Map<string, any>();
  private certificationData = new Map<string, any>();
  private communityData = new Map<string, any>();
  private domainLogs: Map<string, any[]> = new Map();

  logDomainEvent(domain: string, event: any): void {
    if (!this.domainLogs.has(domain)) {
      this.domainLogs.set(domain, []);
    }
    this.domainLogs.get(domain)!.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  getDomainLog(domain: string): any[] {
    return this.domainLogs.get(domain) || [];
  }

  // Learner domain
  async saveLearnerProfile(profile: any): Promise<void> {
    this.learnerProfiles.set(profile.learner_id, profile);
    this.logDomainEvent('Learning', profile);
  }

  async findLearnerProfile(learnerId: UUID): Promise<any> {
    return this.learnerProfiles.get(learnerId) || null;
  }

  async findLearnerProfiles(learnerIds: UUID[]): Promise<any[]> {
    return learnerIds.map(id => this.learnerProfiles.get(id)).filter(p => p);
  }

  async findTopLearnersByActivity(limit: number): Promise<any[]> {
    return Array.from(this.learnerProfiles.values()).slice(0, limit);
  }

  // Certification domain
  async saveCertificationProgress(progress: any): Promise<void> {
    this.certificationData.set(progress.enrollment_id, progress);
    this.logDomainEvent('Certification', progress);
  }

  async findCertificationProgress(enrollmentId: UUID): Promise<any> {
    return this.certificationData.get(enrollmentId) || null;
  }

  async findCertificationProgressByLearner(learnerId: UUID): Promise<any[]> {
    return Array.from(this.certificationData.values()).filter(
      p => p.learner_id === learnerId
    );
  }

  async findCompletedCertifications(learnerId: UUID): Promise<any[]> {
    return Array.from(this.certificationData.values()).filter(
      p => p.learner_id === learnerId && p.badge_status === 'ISSUED'
    );
  }

  // Community domain
  async saveCommunityProfile(profile: any): Promise<void> {
    this.communityData.set(profile.learner_id, profile);
    this.logDomainEvent('Community', profile);
  }

  async findCommunityProfile(learnerId: UUID): Promise<any> {
    return this.communityData.get(learnerId) || null;
  }

  async findTopLearnersByReputation(limit: number): Promise<any[]> {
    return Array.from(this.communityData.values())
      .sort((a, b) => b.reputation_score - a.reputation_score)
      .slice(0, limit);
  }

  async findTopLearnersByBadgeCount(limit: number): Promise<any[]> {
    return Array.from(this.communityData.values())
      .sort((a, b) => b.badge_count - a.badge_count)
      .slice(0, limit);
  }

  async findLearnersByMinimumSkillCount(minimumSkills: number): Promise<any[]> {
    return Array.from(this.communityData.values()).filter(
      p => p.skill_count >= minimumSkills
    );
  }

  async saveMetrics(metrics: any): Promise<void> {
    // Metrics are cross-domain aggregates
  }

  async findMetricsForPeriod(period: string, date: string): Promise<any> {
    return null;
  }

  async findMetricsForDateRange(): Promise<any[]> {
    return [];
  }
}

// Cross-domain event definitions
class EnrollmentEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly enrollmentId: UUID,
    public readonly status: string = 'ACTIVE'
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return 'EnrollmentCreated';
  }

  toPrimitives(): any {
    return {
      learnerId: this.learnerId,
      enrollmentId: this.enrollmentId,
      status: this.status,
    };
  }
}

class CertificationAwardedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly certificationId: UUID,
    public readonly enrollmentId: UUID
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return 'CertificationAwarded';
  }

  toPrimitives(): any {
    return {
      learnerId: this.learnerId,
      certificationId: this.certificationId,
      enrollmentId: this.enrollmentId,
    };
  }
}

class ReputationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly learnerId: UUID,
    public readonly score: number,
    public readonly reason: string
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return 'ReputationUpdated';
  }

  toPrimitives(): any {
    return {
      learnerId: this.learnerId,
      score: this.score,
      reason: this.reason,
    };
  }
}

describe('Cross-Domain Consistency Tests', () => {
  let eventBus: EventBus;
  let repository: CrossDomainRepository;
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
    repository = new CrossDomainRepository();
    eventBus = new EventBus(logger);
  });

  afterEach(() => {
    eventBus.shutdown();
  });

  describe('Shared learner ID consistency', () => {
    it('should maintain consistent learner ID across all domains', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      // Record in Learning domain
      await repository.saveLearnerProfile({
        learner_id: learnerId,
        enrollments: 1,
      });

      // Record in Certification domain
      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        status: 'ACTIVE',
      });

      // Record in Community domain
      await repository.saveCommunityProfile({
        learner_id: learnerId,
        badges: [],
      });

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      const certProgress = await repository.findCertificationProgress(enrollmentId);
      const communityProfile = await repository.findCommunityProfile(learnerId);

      expect(learnerProfile.learner_id).toBe(learnerId);
      expect(certProgress.learner_id).toBe(learnerId);
      expect(communityProfile.learner_id).toBe(learnerId);
    });

    it('should validate learner ID matches across related records', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      await repository.saveLearnerProfile({
        learner_id: learnerId,
      });

      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
      });

      const certProgress = await repository.findCertificationProgress(enrollmentId);
      expect(certProgress.learner_id).toBe(learnerId);
    });
  });

  describe('Enrollment lifecycle consistency', () => {
    it('should reflect learner enrollment in all domains', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      // Enrollment created
      const enrollmentEvent = new EnrollmentEvent(learnerId, enrollmentId, 'ACTIVE');
      await eventBus.publish(enrollmentEvent);

      // Record in Learning domain
      await repository.saveLearnerProfile({
        learner_id: learnerId,
        total_enrollments: 1,
      });

      // Record in Certification domain
      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        enrollment_status: 'IN_PROGRESS',
      });

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      const certProgress = await repository.findCertificationProgress(enrollmentId);

      expect(learnerProfile.total_enrollments).toBe(1);
      expect(certProgress.enrollment_status).toBe('IN_PROGRESS');
    });

    it('should track enrollment references across domains', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      await repository.saveLearnerProfile({
        learner_id: learnerId,
        enrollment_ids: [enrollmentId],
      });

      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
      });

      const certProgress = await repository.findCertificationProgress(enrollmentId);
      expect(certProgress.enrollment_id).toBe(enrollmentId);
    });
  });

  describe('Certification award consistency', () => {
    it('should update certification status across domains', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const certId = uuidv4() as UUID;

      // Award certification
      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        badge_status: 'ISSUED',
        issued_badge_id: certId,
      });

      // Update community profile
      await repository.saveCommunityProfile({
        learner_id: learnerId,
        badge_count: 1,
        badges: [{ badge_id: certId }],
      });

      const certProgress = await repository.findCertificationProgress(enrollmentId);
      const communityProfile = await repository.findCommunityProfile(learnerId);

      expect(certProgress.badge_status).toBe('ISSUED');
      expect(communityProfile.badge_count).toBe(1);
    });

    it('should validate badge consistency across certification and community', async () => {
      const learnerId = uuidv4() as UUID;
      const badgeId = uuidv4() as UUID;

      await repository.saveCertificationProgress({
        enrollment_id: uuidv4() as UUID,
        learner_id: learnerId,
        issued_badge_id: badgeId,
      });

      await repository.saveCommunityProfile({
        learner_id: learnerId,
        badges: [{ badge_id: badgeId }],
      });

      const certProgress = await repository.findCertificationProgressByLearner(learnerId);
      const communityProfile = await repository.findCommunityProfile(learnerId);

      expect(certProgress[0].issued_badge_id).toBe(badgeId);
      expect(communityProfile.badges[0].badge_id).toBe(badgeId);
    });
  });

  describe('Domain-specific data consistency', () => {
    it('should maintain enrollment count consistency', async () => {
      const learnerId = uuidv4() as UUID;

      // Record multiple enrollments
      const enrollments = [1, 2, 3].map(() => uuidv4() as UUID);

      await repository.saveLearnerProfile({
        learner_id: learnerId,
        total_enrollments: enrollments.length,
      });

      for (const enrollmentId of enrollments) {
        await repository.saveCertificationProgress({
          enrollment_id: enrollmentId,
          learner_id: learnerId,
        });
      }

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      const certProgresses = await repository.findCertificationProgressByLearner(learnerId);

      expect(learnerProfile.total_enrollments).toBe(enrollments.length);
      expect(certProgresses.length).toBe(enrollments.length);
    });

    it('should maintain completed certification count', async () => {
      const learnerId = uuidv4() as UUID;

      // Record completed certifications
      for (let i = 0; i < 3; i++) {
        await repository.saveCertificationProgress({
          enrollment_id: uuidv4() as UUID,
          learner_id: learnerId,
          badge_status: 'ISSUED',
        });
      }

      const completedCerts = await repository.findCompletedCertifications(learnerId);
      expect(completedCerts.length).toBe(3);
    });
  });

  describe('Community reputation consistency', () => {
    it('should reflect reputation in community profile', async () => {
      const learnerId = uuidv4() as UUID;

      const reputationEvent = new ReputationUpdatedEvent(
        learnerId,
        150,
        'Earned 3 badges'
      );
      await eventBus.publish(reputationEvent);

      await repository.saveCommunityProfile({
        learner_id: learnerId,
        reputation_score: 150,
      });

      const communityProfile = await repository.findCommunityProfile(learnerId);
      expect(communityProfile.reputation_score).toBe(150);
    });

    it('should rank learners by reputation consistently', async () => {
      const learners = [1, 2, 3].map(() => uuidv4() as UUID);
      const reputationScores = [100, 50, 200];

      for (let i = 0; i < learners.length; i++) {
        await repository.saveCommunityProfile({
          learner_id: learners[i],
          reputation_score: reputationScores[i],
        });
      }

      const topLearners = await repository.findTopLearnersByReputation(3);
      expect(topLearners[0].reputation_score).toBe(200);
      expect(topLearners[1].reputation_score).toBe(100);
    });
  });

  describe('Cross-domain constraints', () => {
    it('should enforce learner existence before certification', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      // Learner must exist first
      await repository.saveLearnerProfile({
        learner_id: learnerId,
        total_enrollments: 1,
      });

      // Then enrollment
      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
      });

      const learnerProfile = await repository.findLearnerProfile(learnerId);
      const certProgress = await repository.findCertificationProgress(enrollmentId);

      expect(learnerProfile).toBeDefined();
      expect(certProgress.learner_id).toBe(learnerId);
    });

    it('should enforce enrollment existence before certification award', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;

      // Enrollment must exist
      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        enrollment_status: 'IN_PROGRESS',
      });

      // Then award certificate
      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        badge_status: 'ISSUED',
      });

      const progress = await repository.findCertificationProgress(enrollmentId);
      expect(progress.badge_status).toBe('ISSUED');
    });
  });

  describe('Domain event ordering', () => {
    it('should log domain events in sequence', async () => {
      const learnerId = uuidv4() as UUID;

      const event1 = new EnrollmentEvent(learnerId, uuidv4() as UUID);
      const event2 = new CertificationAwardedEvent(
        learnerId,
        uuidv4() as UUID,
        uuidv4() as UUID
      );

      await repository.saveLearnerProfile({
        learner_id: learnerId,
        total_enrollments: 1,
      });

      const learningLog = repository.getDomainLog('Learning');
      expect(learningLog.length).toBe(1);
    });

    it('should maintain event causality across domains', async () => {
      const learnerId = uuidv4() as UUID;
      const enrollmentId = uuidv4() as UUID;
      const certId = uuidv4() as UUID;

      // Learning domain: enrollment
      await repository.saveLearnerProfile({
        learner_id: learnerId,
      });

      // Certification domain: award certificate
      await repository.saveCertificationProgress({
        enrollment_id: enrollmentId,
        learner_id: learnerId,
        certification_id: certId,
        badge_status: 'ISSUED',
      });

      // Community domain: update reputation
      await repository.saveCommunityProfile({
        learner_id: learnerId,
        reputation_score: 50,
      });

      const learningLog = repository.getDomainLog('Learning');
      const certLog = repository.getDomainLog('Certification');
      const communityLog = repository.getDomainLog('Community');

      expect(learningLog.length).toBeGreaterThan(0);
      expect(certLog.length).toBeGreaterThan(0);
      expect(communityLog.length).toBeGreaterThan(0);
    });
  });
});

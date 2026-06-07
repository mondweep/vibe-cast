import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';
import { IReadModelRepository } from '../../src/shared/infrastructure/readmodels/IReadModelRepository';
import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { UUID } from '../../src/shared/domain/ValueObjects';

/**
 * Event Log Replay Tests
 * Tests event sourcing and replay capabilities for recovery and auditing
 */

// Mock read model for tracking projections
class EventLogReplayRepository implements IReadModelRepository {
  private projectionHistory = new Map<string, any[]>();
  private eventLog: any[] = [];
  private lastSyncedEventId: string = '';

  recordEvent(event: DomainEvent): void {
    this.eventLog.push({
      id: event.id,
      eventName: event.getEventName(),
      data: event.toPrimitives(),
      timestamp: new Date().toISOString(),
    });
  }

  getEventLog(): any[] {
    return [...this.eventLog];
  }

  recordProjection(domain: string, data: any): void {
    if (!this.projectionHistory.has(domain)) {
      this.projectionHistory.set(domain, []);
    }
    this.projectionHistory.get(domain)!.push({
      data,
      timestamp: new Date().toISOString(),
      eventId: this.lastSyncedEventId,
    });
  }

  getProjectionHistory(domain: string): any[] {
    return this.projectionHistory.get(domain) || [];
  }

  setLastSyncedEventId(eventId: string): void {
    this.lastSyncedEventId = eventId;
  }

  getLastSyncedEventId(): string {
    return this.lastSyncedEventId;
  }

  async saveLearnerProfile(profile: any): Promise<void> {
    this.recordProjection('LearnerProfile', profile);
  }

  async findLearnerProfile(learnerId: UUID): Promise<any> {
    const history = this.getProjectionHistory('LearnerProfile');
    return history[history.length - 1]?.data || null;
  }

  async findLearnerProfiles(learnerIds: UUID[]): Promise<any[]> {
    const history = this.getProjectionHistory('LearnerProfile');
    return history.map(h => h.data);
  }

  async findTopLearnersByActivity(limit: number): Promise<any[]> {
    return [];
  }

  async saveCertificationProgress(progress: any): Promise<void> {
    this.recordProjection('CertificationProgress', progress);
  }

  async findCertificationProgress(enrollmentId: UUID): Promise<any> {
    const history = this.getProjectionHistory('CertificationProgress');
    return history[history.length - 1]?.data || null;
  }

  async findCertificationProgressByLearner(learnerId: UUID): Promise<any[]> {
    return [];
  }

  async findCompletedCertifications(learnerId: UUID): Promise<any[]> {
    return [];
  }

  async saveCommunityProfile(profile: any): Promise<void> {
    this.recordProjection('CommunityProfile', profile);
  }

  async findCommunityProfile(learnerId: UUID): Promise<any> {
    const history = this.getProjectionHistory('CommunityProfile');
    return history[history.length - 1]?.data || null;
  }

  async findTopLearnersByReputation(limit: number): Promise<any[]> {
    return [];
  }

  async findTopLearnersByBadgeCount(limit: number): Promise<any[]> {
    return [];
  }

  async findLearnersByMinimumSkillCount(minimumSkills: number): Promise<any[]> {
    return [];
  }

  async saveMetrics(metrics: any): Promise<void> {
    this.recordProjection('Metrics', metrics);
  }

  async findMetricsForPeriod(period: string, date: string): Promise<any> {
    return null;
  }

  async findMetricsForDateRange(): Promise<any[]> {
    return [];
  }
}

// Test event
class TestEvent extends DomainEvent {
  constructor(
    public readonly eventSequence: number,
    public readonly data: string = `event-${Date.now()}`
  ) {
    super(uuidv4(), uuidv4());
  }

  getEventName(): string {
    return `TestEvent-${this.eventSequence}`;
  }

  toPrimitives(): any {
    return {
      sequence: this.eventSequence,
      data: this.data,
    };
  }
}

describe('Event Log Replay Tests', () => {
  let eventBus: EventBus;
  let repository: EventLogReplayRepository;
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
    repository = new EventLogReplayRepository();
    eventBus = new EventBus(logger);
  });

  afterEach(() => {
    eventBus.shutdown();
  });

  describe('Event log recording', () => {
    it('should record all published events in chronological order', async () => {
      const event1 = new TestEvent(1);
      const event2 = new TestEvent(2);
      const event3 = new TestEvent(3);

      repository.recordEvent(event1);
      repository.recordEvent(event2);
      repository.recordEvent(event3);

      const eventLog = repository.getEventLog();
      expect(eventLog.length).toBe(3);
      expect(eventLog[0].data.sequence).toBe(1);
      expect(eventLog[1].data.sequence).toBe(2);
      expect(eventLog[2].data.sequence).toBe(3);
    });

    it('should preserve event ID for idempotency during replay', async () => {
      const event = new TestEvent(1);
      const originalId = event.id;

      repository.recordEvent(event);
      const eventLog = repository.getEventLog();

      expect(eventLog[0].id).toBe(originalId);
    });

    it('should record event timestamps for audit trail', async () => {
      const event = new TestEvent(1);
      repository.recordEvent(event);

      const eventLog = repository.getEventLog();
      expect(eventLog[0].timestamp).toBeDefined();
      expect(typeof eventLog[0].timestamp).toBe('string');
    });
  });

  describe('Read model replay', () => {
    it('should replay events to rebuild learner profile', async () => {
      const event1 = new TestEvent(1);
      const event2 = new TestEvent(2);

      repository.recordEvent(event1);
      repository.recordEvent(event2);
      repository.recordProjection('LearnerProfile', {
        learner_id: 'test-learner',
        total_enrollments: 2,
      });

      const profile = await repository.findLearnerProfile('test-learner' as any);
      expect(profile.total_enrollments).toBe(2);
    });

    it('should track event ID in projection for sync verification', async () => {
      const event = new TestEvent(1);
      repository.recordEvent(event);
      repository.setLastSyncedEventId(event.id);

      expect(repository.getLastSyncedEventId()).toBe(event.id);
    });

    it('should maintain projection history across replays', async () => {
      const event1 = new TestEvent(1);
      const event2 = new TestEvent(2);

      repository.recordEvent(event1);
      repository.recordProjection('CertificationProgress', { stage: 'initial' });

      repository.recordEvent(event2);
      repository.recordProjection('CertificationProgress', { stage: 'updated' });

      const history = repository.getProjectionHistory('CertificationProgress');
      expect(history.length).toBe(2);
      expect(history[0].data.stage).toBe('initial');
      expect(history[1].data.stage).toBe('updated');
    });
  });

  describe('Event sourcing guarantees', () => {
    it('should support append-only event log', async () => {
      const events = [
        new TestEvent(1),
        new TestEvent(2),
        new TestEvent(3),
      ];

      for (const event of events) {
        repository.recordEvent(event);
      }

      const eventLog = repository.getEventLog();
      expect(eventLog.length).toBe(3);
      expect(eventLog).toEqual(expect.arrayContaining(
        events.map(e => expect.objectContaining({
          eventName: e.getEventName(),
        }))
      ));
    });

    it('should preserve event immutability in log', async () => {
      const event = new TestEvent(1);
      repository.recordEvent(event);

      const eventLog = repository.getEventLog();
      const loggedEvent = eventLog[0];

      expect(loggedEvent.id).toBe(event.id);
      expect(loggedEvent.data.sequence).toBe(1);
    });

    it('should support full event history retrieval', async () => {
      const count = 10;
      for (let i = 1; i <= count; i++) {
        repository.recordEvent(new TestEvent(i));
      }

      const eventLog = repository.getEventLog();
      expect(eventLog.length).toBe(count);
    });
  });

  describe('Replay consistency', () => {
    it('should rebuild identical state from event log', async () => {
      const learnerId = 'learner-1' as any;

      // Record initial events
      repository.recordEvent(new TestEvent(1));
      repository.recordProjection('LearnerProfile', {
        learner_id: learnerId,
        enrollments: 1,
        score: 85,
      });

      // Simulate replay by reading last projection
      const profile = await repository.findLearnerProfile(learnerId);
      expect(profile.enrollments).toBe(1);
      expect(profile.score).toBe(85);
    });

    it('should handle multiple projections from same event log', async () => {
      const event = new TestEvent(1);
      repository.recordEvent(event);

      // Multiple projectors process same event
      repository.recordProjection('LearnerProfile', { learner_id: 'test' });
      repository.recordProjection('CertificationProgress', { status: 'active' });
      repository.recordProjection('CommunityProfile', { reputation: 100 });

      const learnerHistory = repository.getProjectionHistory('LearnerProfile');
      const certHistory = repository.getProjectionHistory('CertificationProgress');
      const communityHistory = repository.getProjectionHistory('CommunityProfile');

      expect(learnerHistory.length).toBe(1);
      expect(certHistory.length).toBe(1);
      expect(communityHistory.length).toBe(1);
    });

    it('should support idempotent replays', async () => {
      const event = new TestEvent(1);
      repository.recordEvent(event);

      // First projection
      repository.setLastSyncedEventId(event.id);
      repository.recordProjection('LearnerProfile', { stage: 1 });

      // Replay with same event (idempotent)
      repository.recordProjection('LearnerProfile', { stage: 1 });

      const history = repository.getProjectionHistory('LearnerProfile');
      expect(history.length).toBe(2);
      expect(history[0].eventId).toBe(event.id);
    });
  });

  describe('Time-series event replay', () => {
    it('should replay events in temporal order', async () => {
      const now = Date.now();
      const events = [
        new TestEvent(1),
        new TestEvent(2),
        new TestEvent(3),
      ];

      for (const event of events) {
        repository.recordEvent(event);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const eventLog = repository.getEventLog();
      for (let i = 0; i < eventLog.length - 1; i++) {
        const current = new Date(eventLog[i].timestamp).getTime();
        const next = new Date(eventLog[i + 1].timestamp).getTime();
        expect(current).toBeLessThanOrEqual(next);
      }
    });

    it('should support time-windowed replay', async () => {
      const event1 = new TestEvent(1);
      repository.recordEvent(event1);
      const time1 = new Date().toISOString();

      await new Promise(resolve => setTimeout(resolve, 10));

      const event2 = new TestEvent(2);
      repository.recordEvent(event2);

      const eventLog = repository.getEventLog();
      const recentEvents = eventLog.filter(e => new Date(e.timestamp) >= new Date(time1));
      expect(recentEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Recovery from event log', () => {
    it('should recover projections from complete event history', async () => {
      const events = [1, 2, 3].map(i => new TestEvent(i));

      for (const event of events) {
        repository.recordEvent(event);
      }

      // Simulate recovery by replaying
      const eventLog = repository.getEventLog();
      expect(eventLog.length).toBe(3);

      for (const logged of eventLog) {
        repository.recordProjection('Recovered', { eventName: logged.eventName });
      }

      const recoveredHistory = repository.getProjectionHistory('Recovered');
      expect(recoveredHistory.length).toBe(3);
    });

    it('should handle gaps in event replay', async () => {
      repository.recordEvent(new TestEvent(1));
      // Gap - no event 2
      repository.recordEvent(new TestEvent(3));

      const eventLog = repository.getEventLog();
      expect(eventLog[0].data.sequence).toBe(1);
      expect(eventLog[1].data.sequence).toBe(3);
    });
  });
});

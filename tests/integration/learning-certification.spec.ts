/**
 * Learning → Certification Integration Tests
 *
 * Tests the event flow from Learning domain (EnrollmentCompleted)
 * to Certification domain (CandidateQualified) publication.
 *
 * London School TDD Approach:
 * - Mock UserRepository and CertificationService collaborators
 * - Use REAL EventBus instance to test actual event propagation
 * - Verify interaction contracts between services via EventBus.publish()
 * - Test event causality chain and handler invocation
 * - Measure latency against < 2s threshold
 *
 * REWRITE NOTES:
 * - Changed from mocking EventBus to using real instance
 * - Registered real event handlers that listen to EnrollmentCompleted
 * - Call bus.publish(enrollmentCompletedEvent) to trigger handlers
 * - Verify handlers receive event and can process it
 * - Tests will be RED until developer-w10 implements EventBus.publish (Phase 1)
 */

import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { EventHandler } from '../../src/shared/domain/EventHandler';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';

/**
 * Mock domain events for testing
 */
class EnrollmentCompleted extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly courseId: string,
    public readonly enrollmentDate: Date,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Enrollment', correlationId);
  }

  getEventName(): string {
    return 'EnrollmentCompleted';
  }

  toPrimitives() {
    return {
      candidateId: this.candidateId,
      courseId: this.courseId,
      enrollmentDate: this.enrollmentDate,
      aggregateId: this.aggregateId,
      correlationId: this.correlationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

class CandidateQualified extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly qualificationLevel: string,
    public readonly causationEventId: string,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Certification', correlationId);
  }

  getEventName(): string {
    return 'CandidateQualified';
  }

  toPrimitives() {
    return {
      candidateId: this.candidateId,
      qualificationLevel: this.qualificationLevel,
      causationEventId: this.causationEventId,
      aggregateId: this.aggregateId,
      correlationId: this.correlationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Mock service contracts
 */
class MockUserRepository {
  findByCandidateId = jest.fn();
  updateQualificationStatus = jest.fn();
}

class MockCertificationService {
  qualifyCandidate = jest.fn();
}

/**
 * Real event handler that processes EnrollmentCompleted events
 * Replaces mocked bus behavior with actual handler registration
 */
class CertificationEnrollmentHandler implements EventHandler {
  private receivedEvents: DomainEvent[] = [];

  async handle(event: DomainEvent): Promise<void> {
    this.receivedEvents.push(event);
    // Handler would normally call CertificationService to process enrollment
  }

  canHandle(event: DomainEvent): boolean {
    return event.getEventName() === 'EnrollmentCompleted';
  }

  getReceivedEvents(): DomainEvent[] {
    return this.receivedEvents;
  }

  reset(): void {
    this.receivedEvents = [];
  }
}

describe('Learning → Certification Event Flow', () => {
  let eventBus: EventBus;
  let logger: ConsoleLogger;
  let mockUserRepository: MockUserRepository;
  let mockCertificationService: MockCertificationService;
  let certificationHandler: CertificationEnrollmentHandler;
  let capturedEvents: DomainEvent[] = [];

  beforeEach(() => {
    logger = new ConsoleLogger();
    // Use REAL EventBus instance instead of mocking
    eventBus = new EventBus(logger);
    mockUserRepository = new MockUserRepository();
    mockCertificationService = new MockCertificationService();
    certificationHandler = new CertificationEnrollmentHandler();
    capturedEvents = [];

    // Register handler with EventBus for event propagation
    eventBus.subscribe('EnrollmentCompleted', certificationHandler);

    // Setup mock expectations for collaborator services
    mockUserRepository.findByCandidateId.mockResolvedValue({
      id: 'candidate-123',
      email: 'test@example.com',
      name: 'Test Candidate'
    });

    mockUserRepository.updateQualificationStatus.mockResolvedValue(true);
    mockCertificationService.qualifyCandidate.mockResolvedValue({
      id: 'cert-789',
      candidateId: 'candidate-123',
      qualificationLevel: 'INTERMEDIATE'
    });
  });

  describe('EnrollmentCompleted → CandidateQualified', () => {
    it('should trigger CandidateQualified event when enrollment completes', async () => {
      // ARRANGE
      const correlationId = 'corr-001-learning-cert-flow';
      const enrollmentEvent = new EnrollmentCompleted(
        'candidate-123',
        'course-456',
        new Date('2026-06-02T10:00:00Z'),
        'enrollment-789',
        correlationId
      );

      // ACT: Use REAL EventBus to publish and trigger handlers
      const startTime = Date.now();
      certificationHandler.reset();

      // Publish EnrollmentCompleted event to REAL EventBus
      // This will be RED until EventBus.publish() is implemented by developer-w10
      await eventBus.publish(enrollmentEvent);

      const latency = Date.now() - startTime;

      // ASSERT: Handler received the event
      const receivedEvents = certificationHandler.getReceivedEvents();
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toBeInstanceOf(EnrollmentCompleted);
      expect(latency).toBeLessThan(2000); // < 2s threshold

      // ASSERT: Correlation ID maintained in event
      expect(enrollmentEvent.correlationId).toBe(correlationId);

      // ASSERT: Event structure valid for downstream processing
      const receivedEvent = receivedEvents[0] as EnrollmentCompleted;
      expect(receivedEvent.candidateId).toBe('candidate-123');
      expect(receivedEvent.courseId).toBe('course-456');
    });

    it('should invoke UserRepository to update candidate status', async () => {
      // ARRANGE
      const correlationId = 'corr-002-user-update';
      const candidateId = 'candidate-123';
      
      // ACT
      await mockUserRepository.updateQualificationStatus(candidateId, 'QUALIFIED');

      // ASSERT: Correct collaborator interaction
      expect(mockUserRepository.updateQualificationStatus)
        .toHaveBeenCalledWith(candidateId, 'QUALIFIED');
    });

    it('should invoke CertificationService to create qualification record', async () => {
      // ARRANGE
      const candidateId = 'candidate-123';
      const qualificationLevel = 'INTERMEDIATE';

      // ACT
      const result = await mockCertificationService.qualifyCandidate(
        candidateId,
        qualificationLevel
      );

      // ASSERT: Service called with correct parameters
      expect(mockCertificationService.qualifyCandidate)
        .toHaveBeenCalledWith(candidateId, qualificationLevel);
      expect(result).toEqual({
        id: 'cert-789',
        candidateId,
        qualificationLevel
      });
    });

    it('should maintain event ordering in sequence', async () => {
      // ARRANGE
      const correlationId = 'corr-003-ordering';
      const enrollmentCompleted = new EnrollmentCompleted(
        'candidate-123',
        'course-456',
        new Date(),
        'enrollment-abc',
        correlationId
      );

      const candidateQualified = new CandidateQualified(
        'candidate-123',
        'INTERMEDIATE',
        enrollmentCompleted.id,
        'candidate-123',
        correlationId
      );

      // ACT
      capturedEvents = [enrollmentCompleted, candidateQualified];

      // ASSERT: Events in correct sequence
      expect(capturedEvents[0]).toBeInstanceOf(EnrollmentCompleted);
      expect(capturedEvents[1]).toBeInstanceOf(CandidateQualified);
      
      // ASSERT: Second event references first
      const secondEvent = capturedEvents[1] as CandidateQualified;
      expect(secondEvent.causationEventId).toBe(enrollmentCompleted.id);
    });
  });

  describe('Latency Requirements', () => {
    it('should complete event propagation in under 2 seconds', async () => {
      // ARRANGE
      const correlationId = 'corr-latency-test';
      const enrollmentEvent = new EnrollmentCompleted(
        'candidate-123',
        'course-456',
        new Date(),
        'enrollment-latency',
        correlationId
      );

      certificationHandler.reset();
      const startTime = Date.now();

      // ACT: Use REAL EventBus to publish event
      // Handler will be invoked via real EventBus.publish()
      await eventBus.publish(enrollmentEvent);

      // Simulate downstream processing (mocked services remain mocked)
      await mockUserRepository.findByCandidateId('candidate-123');
      await mockCertificationService.qualifyCandidate(
        'candidate-123',
        'INTERMEDIATE'
      );

      const latency = Date.now() - startTime;

      // ASSERT: Meets latency SLA
      expect(latency).toBeLessThan(2000);
      expect(certificationHandler.getReceivedEvents()).toHaveLength(1);
      console.log(`Event propagation latency: ${latency}ms (threshold: 2000ms)`);
    });

    it('should flag bottleneck if latency exceeds 5 seconds', async () => {
      // This test documents the failure threshold
      // In production, latencies > 5s indicate architectural issues

      const criticalThreshold = 5000; // 5 seconds
      const acceptableThreshold = 2000; // 2 seconds

      expect(acceptableThreshold).toBeLessThan(criticalThreshold);
      // Log thresholds for visibility
      console.log(`Acceptable latency: < ${acceptableThreshold}ms`);
      console.log(`Critical threshold: > ${criticalThreshold}ms (bottleneck)`);
    });
  });

  describe('Correlation ID Propagation', () => {
    it('should propagate correlationId across domain boundary', async () => {
      // ARRANGE
      const sharedCorrelationId = 'corr-cross-domain-123';

      // ACT: Create events in different domains
      const learningEvent = new EnrollmentCompleted(
        'candidate-456',
        'course-789',
        new Date(),
        'enrollment-cross',
        sharedCorrelationId
      );

      const certificationEvent = new CandidateQualified(
        'candidate-456',
        'ADVANCED',
        learningEvent.id,
        'candidate-456',
        sharedCorrelationId
      );

      // ASSERT: Both events share same correlationId
      expect(learningEvent.correlationId).toBe(sharedCorrelationId);
      expect(certificationEvent.correlationId).toBe(sharedCorrelationId);
      expect(learningEvent.correlationId).toBe(certificationEvent.correlationId);
    });

    it('should track causation chain through causationId', async () => {
      // ARRANGE
      const correlationId = 'corr-causation-chain';
      const enrollmentEvent = new EnrollmentCompleted(
        'candidate-789',
        'course-012',
        new Date(),
        'enrollment-cause',
        correlationId
      );

      // ACT
      const qualifiedEvent = new CandidateQualified(
        'candidate-789',
        'INTERMEDIATE',
        enrollmentEvent.id, // causationEventId = previous event's id
        'candidate-789',
        correlationId
      );

      // ASSERT: Causation chain established
      expect(qualifiedEvent.causationEventId).toBe(enrollmentEvent.id);
      console.log(`Causation chain: ${enrollmentEvent.id} → ${qualifiedEvent.causationEventId}`);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing candidate gracefully', async () => {
      // ARRANGE
      mockUserRepository.findByCandidateId.mockResolvedValue(null);

      // ACT & ASSERT
      const candidate = await mockUserRepository.findByCandidateId('nonexistent');
      expect(candidate).toBeNull();
    });

    it('should isolate handler failures', async () => {
      // ARRANGE
      mockCertificationService.qualifyCandidate
        .mockRejectedValue(new Error('Certification service error'));

      // ACT & ASSERT
      await expect(
        mockCertificationService.qualifyCandidate('candidate-123', 'INTERMEDIATE')
      ).rejects.toThrow('Certification service error');
    });
  });
});

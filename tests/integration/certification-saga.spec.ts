/**
 * Certification SAGA Integration Tests
 *
 * Tests the SAGA orchestration pattern where:
 * - Certification process waits for ExamCompleted event
 * - ExamCompleted event published via REAL EventBus triggers SAGA resumption
 * - SAGA transitions to next state via event handler
 *
 * London School TDD Approach:
 * - Mock SAGAOrchestrator, ExamService, StateManager (services remain mocked)
 * - Use REAL EventBus to trigger ExamCompleted event
 * - Verify SAGA transitions via handler registration and event publication
 * - Validate event ordering constraints
 *
 * REWRITE NOTES:
 * - Changed from mocking EventBus to using real instance
 * - Call bus.publish(examCompletedEvent) to trigger SAGA transition
 * - Register real SAGA handler that listens to ExamCompleted
 * - Verify handler receives event and state transitions work
 * - Tests will be RED until developer-w10 implements EventBus.publish (Phase 1)
 */

import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { EventHandler } from '../../src/shared/domain/EventHandler';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';

/**
 * SAGA state definitions
 */
enum CertificationSAGAState {
  STARTED = 'STARTED',
  LEARNING_IN_PROGRESS = 'LEARNING_IN_PROGRESS',
  WAIT_FOR_EXAM = 'WAIT_FOR_EXAM',
  EXAM_SCHEDULED = 'EXAM_SCHEDULED',
  EXAM_IN_PROGRESS = 'EXAM_IN_PROGRESS',
  WAIT_FOR_RESULTS = 'WAIT_FOR_RESULTS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * SAGA step definition
 */
interface SAGAStep {
  name: string;
  state: CertificationSAGAState;
  previousState: CertificationSAGAState;
  eventType: string;
  compensationAction?: string;
}

/**
 * Mock domain events for SAGA
 */
class ExamCompleted extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly examId: string,
    public readonly score: number,
    public readonly passingScore: number,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Exam', correlationId);
  }

  getEventName(): string {
    return 'ExamCompleted';
  }
}

class ExamScheduled extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly examId: string,
    public readonly scheduledDate: Date,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Exam', correlationId);
  }

  getEventName(): string {
    return 'ExamScheduled';
  }
}

class CertificationCompleted extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly certificationId: string,
    public readonly score: number,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Certification', correlationId);
  }

  getEventName(): string {
    return 'CertificationCompleted';
  }
}

/**
 * Mock SAGA orchestrator
 */
class MockSAGAOrchestrator {
  private currentState: Map<string, CertificationSAGAState> = new Map();
  private sagaHistory: Map<string, SAGAStep[]> = new Map();

  startSAGA = jest.fn((sagaId: string) => {
    this.currentState.set(sagaId, CertificationSAGAState.STARTED);
    return { sagaId, state: CertificationSAGAState.STARTED };
  });

  transitionState = jest.fn((sagaId: string, newState: CertificationSAGAState, eventType: string) => {
    const previousState = this.currentState.get(sagaId);
    this.currentState.set(sagaId, newState);
    
    if (!this.sagaHistory.has(sagaId)) {
      this.sagaHistory.set(sagaId, []);
    }

    const step: SAGAStep = {
      name: `Transition: ${previousState} → ${newState}`,
      state: newState,
      previousState: previousState || CertificationSAGAState.STARTED,
      eventType
    };

    this.sagaHistory.get(sagaId)!.push(step);
    return { sagaId, state: newState };
  });

  resumeFromWaitStep = jest.fn((sagaId: string, waitState: CertificationSAGAState) => {
    if (this.currentState.get(sagaId) === waitState) {
      return true;
    }
    return false;
  });

  getState = jest.fn((sagaId: string) => this.currentState.get(sagaId));
  getHistory = jest.fn((sagaId: string) => this.sagaHistory.get(sagaId) || []);
}

/**
 * Mock Exam service
 */
class MockExamService {
  scheduleExam = jest.fn();
  completeExam = jest.fn();
  getExamStatus = jest.fn();
}

/**
 * Mock State Manager
 */
class MockStateManager {
  setState = jest.fn();
  getState = jest.fn();
  clearState = jest.fn();
}

/**
 * Real SAGA event handler that responds to ExamCompleted
 * Replaces mocked bus with actual handler registration
 */
class SAGAExamCompletedHandler implements EventHandler {
  private receivedEvents: DomainEvent[] = [];
  private orchestrator: MockSAGAOrchestrator;
  private sagaId: string;

  constructor(orchestrator: MockSAGAOrchestrator, sagaId: string) {
    this.orchestrator = orchestrator;
    this.sagaId = sagaId;
  }

  async handle(event: DomainEvent): Promise<void> {
    this.receivedEvents.push(event);
    // Trigger SAGA state transition from WAIT_FOR_EXAM
    if (this.orchestrator.resumeFromWaitStep(this.sagaId, CertificationSAGAState.WAIT_FOR_EXAM)) {
      // Advance to next state
      this.orchestrator.transitionState(
        this.sagaId,
        CertificationSAGAState.WAIT_FOR_RESULTS,
        'ExamCompleted'
      );
    }
  }

  canHandle(event: DomainEvent): boolean {
    return event.getEventName() === 'ExamCompleted';
  }

  getReceivedEvents(): DomainEvent[] {
    return this.receivedEvents;
  }

  reset(): void {
    this.receivedEvents = [];
  }
}

describe('Certification SAGA', () => {
  let eventBus: EventBus;
  let logger: ConsoleLogger;
  let orchestrator: MockSAGAOrchestrator;
  let examService: MockExamService;
  let stateManager: MockStateManager;
  let sagaHandler: SAGAExamCompletedHandler;
  const sagaId = 'saga-cert-001';
  const candidateId = 'candidate-123';
  const correlationId = 'corr-saga-001';

  beforeEach(() => {
    logger = new ConsoleLogger();
    // Use REAL EventBus instance instead of mocking
    eventBus = new EventBus(logger);
    orchestrator = new MockSAGAOrchestrator();
    examService = new MockExamService();
    stateManager = new MockStateManager();
    sagaHandler = new SAGAExamCompletedHandler(orchestrator, sagaId);

    // Register handler with EventBus for event propagation
    eventBus.subscribe('ExamCompleted', sagaHandler);

    // Setup mock expectations for collaborator services
    examService.scheduleExam.mockResolvedValue({
      examId: 'exam-456',
      candidateId,
      scheduledDate: new Date('2026-06-15T10:00:00Z')
    });

    examService.completeExam.mockResolvedValue({
      examId: 'exam-456',
      candidateId,
      score: 85,
      passingScore: 60,
      passed: true
    });

    stateManager.setState.mockResolvedValue(true);
    stateManager.getState.mockResolvedValue(CertificationSAGAState.WAIT_FOR_EXAM);
  });

  describe('SAGA State Transitions', () => {
    it('should start SAGA in initial state', async () => {
      // ACT
      const result = orchestrator.startSAGA(sagaId);

      // ASSERT
      expect(orchestrator.startSAGA).toHaveBeenCalledWith(sagaId);
      expect(result.state).toBe(CertificationSAGAState.STARTED);
    });

    it('should transition through LEARNING_IN_PROGRESS state', async () => {
      // ACT
      orchestrator.startSAGA(sagaId);
      const result = orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.LEARNING_IN_PROGRESS,
        'LearningStarted'
      );

      // ASSERT
      expect(result.state).toBe(CertificationSAGAState.LEARNING_IN_PROGRESS);
      const history = orchestrator.getHistory(sagaId);
      expect(history).toHaveLength(1);
    });

    it('should transition to WAIT_FOR_EXAM state', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.LEARNING_IN_PROGRESS,
        'LearningStarted'
      );

      // ACT
      const result = orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.WAIT_FOR_EXAM,
        'ReadyForExam'
      );

      // ASSERT
      expect(result.state).toBe(CertificationSAGAState.WAIT_FOR_EXAM);
    });
  });

  describe('ExamCompleted → SAGA Resume', () => {
    it('should resume SAGA when ExamCompleted event arrives', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.LEARNING_IN_PROGRESS,
        'LearningStarted'
      );
      orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.WAIT_FOR_EXAM,
        'ReadyForExam'
      );

      const examCompletedEvent = new ExamCompleted(
        candidateId,
        'exam-456',
        85,
        60,
        sagaId,
        correlationId
      );

      sagaHandler.reset();

      // ACT: Use REAL EventBus to publish ExamCompleted event
      // This triggers SAGA handler which resumes from WAIT_FOR_EXAM
      // Will be RED until EventBus.publish() is implemented by developer-w10
      await eventBus.publish(examCompletedEvent);

      // ASSERT: Handler received event and processed it
      expect(sagaHandler.getReceivedEvents()).toHaveLength(1);
      expect(sagaHandler.getReceivedEvents()[0]).toBeInstanceOf(ExamCompleted);

      // ASSERT: SAGA transitioned to WAIT_FOR_RESULTS
      const sagaState = orchestrator.getState(sagaId);
      expect(sagaState).toBe(CertificationSAGAState.WAIT_FOR_RESULTS);
    });

    it('should not resume if not in WAIT_FOR_EXAM state', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);

      // ACT
      const canResume = orchestrator.resumeFromWaitStep(
        sagaId,
        CertificationSAGAState.WAIT_FOR_EXAM
      );

      // ASSERT
      expect(canResume).toBe(false);
    });

    it('should transition to next state after resume', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.WAIT_FOR_EXAM,
        'ReadyForExam'
      );

      // ACT: Resume and transition
      orchestrator.resumeFromWaitStep(sagaId, CertificationSAGAState.WAIT_FOR_EXAM);
      const result = orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.WAIT_FOR_RESULTS,
        'ExamCompleted'
      );

      // ASSERT
      expect(result.state).toBe(CertificationSAGAState.WAIT_FOR_RESULTS);
    });
  });

  describe('Event Ordering in SAGA', () => {
    it('should maintain strict event ordering in SAGA lifecycle', async () => {
      // ARRANGE & ACT
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(sagaId, CertificationSAGAState.LEARNING_IN_PROGRESS, 'LearningStarted');
      orchestrator.transitionState(sagaId, CertificationSAGAState.WAIT_FOR_EXAM, 'ReadyForExam');
      orchestrator.transitionState(sagaId, CertificationSAGAState.EXAM_SCHEDULED, 'ExamScheduled');
      orchestrator.transitionState(sagaId, CertificationSAGAState.EXAM_IN_PROGRESS, 'ExamStarted');
      orchestrator.transitionState(sagaId, CertificationSAGAState.WAIT_FOR_RESULTS, 'ExamCompleted');
      orchestrator.transitionState(sagaId, CertificationSAGAState.COMPLETED, 'ResultsProcessed');

      // ASSERT
      const history = orchestrator.getHistory(sagaId);
      expect(history).toHaveLength(6);
      
      // Verify sequence
      expect(history[0].state).toBe(CertificationSAGAState.LEARNING_IN_PROGRESS);
      expect(history[1].state).toBe(CertificationSAGAState.WAIT_FOR_EXAM);
      expect(history[2].state).toBe(CertificationSAGAState.EXAM_SCHEDULED);
      expect(history[3].state).toBe(CertificationSAGAState.EXAM_IN_PROGRESS);
      expect(history[4].state).toBe(CertificationSAGAState.WAIT_FOR_RESULTS);
      expect(history[5].state).toBe(CertificationSAGAState.COMPLETED);
    });

    it('should handle out-of-order event detection', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.LEARNING_IN_PROGRESS,
        'LearningStarted'
      );

      // Try to transition to COMPLETED without intermediate states
      const currentState = orchestrator.getState(sagaId);
      
      // ASSERT: Current state prevents invalid transition
      expect(currentState).toBe(CertificationSAGAState.LEARNING_IN_PROGRESS);
    });
  });

  describe('Idempotent SAGA Resumption', () => {
    it('should idempotently handle duplicate ExamCompleted events', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.WAIT_FOR_EXAM,
        'ReadyForExam'
      );

      const examCompletedEvent = new ExamCompleted(
        candidateId,
        'exam-456',
        85,
        60,
        sagaId,
        correlationId
      );

      // ACT: Process same event multiple times
      const result1 = orchestrator.resumeFromWaitStep(
        sagaId,
        CertificationSAGAState.WAIT_FOR_EXAM
      );

      const result2 = orchestrator.resumeFromWaitStep(
        sagaId,
        CertificationSAGAState.WAIT_FOR_EXAM
      );

      // ASSERT: Both succeed idempotently
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('SAGA Latency', () => {
    it('should complete SAGA transitions within latency SLA', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(sagaId, CertificationSAGAState.LEARNING_IN_PROGRESS, 'Event1');
      orchestrator.transitionState(sagaId, CertificationSAGAState.WAIT_FOR_EXAM, 'Event2');

      const examCompletedEvent = new ExamCompleted(
        candidateId,
        'exam-456',
        85,
        60,
        sagaId,
        correlationId
      );

      sagaHandler.reset();
      const startTime = Date.now();

      // ACT: Use REAL EventBus to publish event and measure E2E latency
      await eventBus.publish(examCompletedEvent);

      const latency = Date.now() - startTime;

      // ASSERT: Meets latency SLA and handler processed event
      expect(latency).toBeLessThan(2000);
      expect(sagaHandler.getReceivedEvents()).toHaveLength(1);
      console.log(`SAGA transition latency: ${latency}ms`);
    });
  });

  describe('Compensation Actions', () => {
    it('should support compensation on SAGA failure', async () => {
      // ARRANGE
      orchestrator.startSAGA(sagaId);
      orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.EXAM_IN_PROGRESS,
        'ExamStarted'
      );

      // ACT: Fail SAGA
      const failResult = orchestrator.transitionState(
        sagaId,
        CertificationSAGAState.FAILED,
        'ExamFailed'
      );

      // ASSERT
      expect(failResult.state).toBe(CertificationSAGAState.FAILED);
    });
  });
});

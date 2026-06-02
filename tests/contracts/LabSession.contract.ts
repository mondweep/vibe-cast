/**
 * LabSession Mock Contract Definition
 * London School TDD - Mock contracts for LabSession Aggregate
 *
 * Defines interactions with:
 * - Exercise repository (load exercises)
 * - Outcome validators (track submission outcomes)
 * - EventBus (publish LabSessionStarted, LabSessionCompleted)
 */

import { Exercise } from '../../src/skill-lab/domain/models/Exercise';

/**
 * Mock LabSession Outcome interface
 * Represents the result of a code submission validation
 */
export interface MockLabOutcome {
  id: string;
  labSessionId: string;
  exerciseId: string;
  submissionCode: string;
  passed: boolean;
  testsPassed: number;
  testsTotal: number;
  executionTime: number; // ms
  feedback: string;
  timestamp: Date;
}

/**
 * Mock Outcome Validator contract
 * Validates that submission results meet requirements
 */
export interface MockOutcomeValidator {
  validateTestResults: jest.MockedFunction<(testsPassed: number, testsTotal: number) => boolean>;
  validateExecutionTime: jest.MockedFunction<(ms: number) => boolean>;
  validateFeedback: jest.MockedFunction<(feedback: string) => boolean>;
  calculateSuccessRate: jest.MockedFunction<(testsPassed: number, testsTotal: number) => number>;
}

/**
 * Factory for creating mock Outcome validator
 */
export function createMockOutcomeValidator(): MockOutcomeValidator {
  return {
    validateTestResults: jest.fn().mockReturnValue(true),
    validateExecutionTime: jest.fn().mockReturnValue(true),
    validateFeedback: jest.fn().mockReturnValue(true),
    calculateSuccessRate: jest.fn().mockReturnValue(0.85),
  };
}

/**
 * Mock LabSession Repository contract
 * Defines how LabSession persists and retrieves session data
 */
export interface MockLabSessionRepository {
  save: jest.MockedFunction<(session: any) => Promise<any>>;
  findById: jest.MockedFunction<(id: string) => Promise<any | null>>;
  findByLearner: jest.MockedFunction<(learnerId: string) => Promise<any[]>>;
  findActive: jest.MockedFunction<(learnerId: string) => Promise<any | null>>;
  recordOutcome: jest.MockedFunction<(outcome: MockLabOutcome) => Promise<void>>;
  getOutcomes: jest.MockedFunction<(labSessionId: string) => Promise<MockLabOutcome[]>>;
}

/**
 * Factory for creating mock LabSession repository
 */
export function createMockLabSessionRepository(): MockLabSessionRepository {
  return {
    save: jest.fn().mockResolvedValue({
      id: `lab-${Date.now()}`,
      learnerId: 'learner-123',
      exerciseId: 'ex-123',
      startedAt: new Date(),
      status: 'IN_PROGRESS',
    }),
    findById: jest.fn().mockResolvedValue(null),
    findByLearner: jest.fn().mockResolvedValue([]),
    findActive: jest.fn().mockResolvedValue(null),
    recordOutcome: jest.fn().mockResolvedValue(undefined),
    getOutcomes: jest.fn().mockResolvedValue([]),
  };
}

/**
 * LabSession Test Builder
 * Fluent API for constructing test LabSession instances
 */
export class LabSessionTestBuilder {
  private id: string = `lab-${Date.now()}`;
  private learnerId: string = 'learner-123';
  private exerciseId: string = 'ex-123';
  private exercise: Exercise | null = null;
  private startedAt: Date = new Date();
  private completedAt: Date | null = null;
  private status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' = 'IN_PROGRESS';
  private outcomes: MockLabOutcome[] = [];
  private totalAttempts: number = 0;

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withLearner(learnerId: string): this {
    this.learnerId = learnerId;
    return this;
  }

  withExercise(exercise: Exercise): this {
    this.exercise = exercise;
    this.exerciseId = exercise.getId();
    return this;
  }

  withExerciseId(exerciseId: string): this {
    this.exerciseId = exerciseId;
    return this;
  }

  completed(): this {
    this.status = 'COMPLETED';
    this.completedAt = new Date();
    return this;
  }

  abandoned(): this {
    this.status = 'ABANDONED';
    return this;
  }

  withOutcomes(outcomes: MockLabOutcome[]): this {
    this.outcomes = outcomes;
    return this;
  }

  withAttempts(count: number): this {
    this.totalAttempts = count;
    return this;
  }

  build(): any {
    return {
      id: this.id,
      learnerId: this.learnerId,
      exerciseId: this.exerciseId,
      exercise: this.exercise,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      status: this.status,
      outcomes: this.outcomes,
      totalAttempts: this.totalAttempts,
    };
  }

  static aLabSession(): LabSessionTestBuilder {
    return new LabSessionTestBuilder();
  }
}

/**
 * Mock collaboration verification for LabSession
 * Verifies correct interaction sequence with Exercise and Outcome validator
 */
export interface LabSessionInteractionSequence {
  /**
   * Step 1: Load exercise from repository
   */
  exerciseLoaded: {
    method: 'findById';
    exerciseId: string;
  };

  /**
   * Step 2: Verify exercise is published
   */
  exerciseValidated: {
    method: 'isPublished';
    result: boolean;
  };

  /**
   * Step 3: Record submission outcome
   */
  outcomeRecorded: {
    method: 'recordOutcome';
    outcome: MockLabOutcome;
  };

  /**
   * Step 4: Emit appropriate event
   */
  eventEmitted: {
    eventType: 'LabSessionStarted' | 'OutcomeRecorded' | 'LabSessionCompleted';
    labSessionId: string;
  };
}

/**
 * SAGA Contract: LabSession Completion → Metrics & Certification
 */
export interface LabSessionCompletionSagaContract {
  /**
   * Trigger: LabSession records successful outcome
   */
  trigger: {
    eventType: 'OutcomeRecorded';
    successRate: number; // % of tests passed
  };

  /**
   * Step 1: Get all outcomes for this session
   */
  fetchOutcomes: {
    method: 'getOutcomes';
    labSessionId: string;
  };

  /**
   * Step 2: Calculate aggregate success rate
   */
  calculateAggregate: {
    method: 'calculateSuccessRate';
    testsPassed: number;
    testsTotal: number;
  };

  /**
   * Step 3: Check if session is complete (>= 75% success)
   */
  completionCheck: {
    successThreshold: 0.75;
    isComplete: boolean;
  };

  /**
   * Step 4: Emit LabSessionCompleted → triggers Certification & Metrics SAGAs
   */
  events: {
    LabSessionCompleted: {
      labSessionId: string;
      learnerId: string;
      exerciseId: string;
      successRate: number;
      totalAttempts: number;
    };
  };
}

/**
 * EventBus Contract: LabSession domain events
 */
export interface LabSessionDomainEventContract {
  LabSessionStarted: {
    aggregateId: string;
    aggregateType: 'LabSession';
    eventType: 'LabSessionStarted';
    payload: {
      labSessionId: string;
      learnerId: string;
      exerciseId: string;
      startedAt: Date;
    };
  };

  OutcomeRecorded: {
    aggregateId: string;
    aggregateType: 'LabSession';
    eventType: 'OutcomeRecorded';
    payload: {
      labSessionId: string;
      exerciseId: string;
      testsPassed: number;
      testsTotal: number;
      successRate: number;
      attemptNumber: number;
    };
  };

  LabSessionCompleted: {
    aggregateId: string;
    aggregateType: 'LabSession';
    eventType: 'LabSessionCompleted';
    payload: {
      labSessionId: string;
      learnerId: string;
      exerciseId: string;
      finalSuccessRate: number;
      totalAttempts: number;
      completedAt: Date;
    };
  };

  LabSessionAbandoned: {
    aggregateId: string;
    aggregateType: 'LabSession';
    eventType: 'LabSessionAbandoned';
    payload: {
      labSessionId: string;
      learnerId: string;
      reason: string;
    };
  };
}

/**
 * Mock Lab Outcome factory for test data
 */
export function createMockLabOutcome(
  labSessionId: string,
  exerciseId: string,
  testsPassed: number = 3,
  testsTotal: number = 4
): MockLabOutcome {
  return {
    id: `outcome-${Date.now()}`,
    labSessionId,
    exerciseId,
    submissionCode: 'function solution() { return true; }',
    passed: testsPassed === testsTotal,
    testsPassed,
    testsTotal,
    executionTime: 245,
    feedback: 'Good attempt! Keep practicing.',
    timestamp: new Date(),
  };
}

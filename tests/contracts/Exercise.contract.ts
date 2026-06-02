/**
 * Exercise Mock Contract Definition
 * London School TDD - Mock definitions for Exercise Aggregate
 *
 * This contract defines the expected interactions and behavior when:
 * - ExerciseRepository saves/retrieves exercises
 * - Exercise validators verify value object invariants
 * - LabSession collaborates with Exercise
 *
 * Coverage targets: ExerciseRepository methods, validators, aggregates
 */

import { Exercise, ExerciseStatus } from '../../src/skill-lab/domain/models/Exercise';
import { DifficultyLevel } from '../../src/skill-lab/domain/value-objects/ExerciseDifficulty';

/**
 * Mock IExerciseRepository interface contract
 * Defines expected interactions when LabSession saves/retrieves exercises
 */
export interface MockExerciseRepository {
  save: jest.MockedFunction<(exercise: Exercise) => Promise<Exercise>>;
  findById: jest.MockedFunction<(id: string) => Promise<Exercise | null>>;
  findByDifficulty: jest.MockedFunction<(difficulty: DifficultyLevel) => Promise<Exercise[]>>;
  findPublished: jest.MockedFunction<() => Promise<Exercise[]>>;
  update: jest.MockedFunction<(exercise: Exercise) => Promise<void>>;
  delete: jest.MockedFunction<(id: string) => Promise<void>>;
}

/**
 * Factory for creating mock ExerciseRepository
 * Used by LabSession and Metrics domains
 */
export function createMockExerciseRepository(): MockExerciseRepository {
  return {
    save: jest.fn().mockResolvedValue(
      Exercise.create(
        'Test Exercise',
        'A test exercise for mocking',
        'beginner',
        30,
        'Complete this exercise'
      )
    ),
    findById: jest.fn().mockResolvedValue(null),
    findByDifficulty: jest.fn().mockResolvedValue([]),
    findPublished: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock Exercise Validator interface contract
 * Validates Exercise invariants before persistence
 */
export interface MockExerciseValidator {
  validateTitle: jest.MockedFunction<(title: string) => void>;
  validateDescription: jest.MockedFunction<(description: string) => void>;
  validateTimeLimit: jest.MockedFunction<(minutes: number) => void>;
  validateInstructions: jest.MockedFunction<(instructions: string) => void>;
  validateDifficulty: jest.MockedFunction<(difficulty: string) => DifficultyLevel>;
  validatePublishableStatus: jest.MockedFunction<(exercise: Exercise) => boolean>;
}

/**
 * Factory for creating mock Exercise validators
 * Used to verify Exercise aggregate invariants
 */
export function createMockExerciseValidator(): MockExerciseValidator {
  return {
    validateTitle: jest.fn(),
    validateDescription: jest.fn(),
    validateTimeLimit: jest.fn(),
    validateInstructions: jest.fn(),
    validateDifficulty: jest.fn().mockReturnValue('beginner'),
    validatePublishableStatus: jest.fn().mockReturnValue(true),
  };
}

/**
 * Exercise Test Data Builder
 * Fluent API for constructing test Exercise instances
 */
export class ExerciseTestBuilder {
  private id: string = `ex-${Date.now()}`;
  private title: string = 'Test Exercise';
  private description: string = 'A test exercise';
  private difficulty: DifficultyLevel = 'beginner';
  private timeLimit: number = 30;
  private instructions: string = 'Complete this task';
  private status: ExerciseStatus = ExerciseStatus.DRAFT;
  private createdAt: Date = new Date();
  private updatedAt: Date = new Date();
  private publishedAt: Date | null = null;

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  withDifficulty(difficulty: DifficultyLevel): this {
    this.difficulty = difficulty;
    return this;
  }

  withTimeLimit(minutes: number): this {
    this.timeLimit = minutes;
    return this;
  }

  withInstructions(instructions: string): this {
    this.instructions = instructions;
    return this;
  }

  published(): this {
    this.status = ExerciseStatus.PUBLISHED;
    this.publishedAt = new Date();
    return this;
  }

  archived(): this {
    this.status = ExerciseStatus.ARCHIVED;
    return this;
  }

  build(): Exercise {
    return Exercise.fromPersistence(
      this.id,
      this.title,
      this.description,
      this.difficulty,
      this.timeLimit,
      this.instructions,
      this.status,
      this.createdAt,
      this.updatedAt,
      this.publishedAt
    );
  }

  static anExercise(): ExerciseTestBuilder {
    return new ExerciseTestBuilder();
  }
}

/**
 * Mock Exercise value object validators
 * Contracts for ExerciseDifficulty, TimeLimit, etc.
 */
export interface MockDifficultyValidator {
  isValidLevel: jest.MockedFunction<(level: string) => boolean>;
  isMoreDifficultThan: jest.MockedFunction<(a: DifficultyLevel, b: DifficultyLevel) => boolean>;
}

export function createMockDifficultyValidator(): MockDifficultyValidator {
  return {
    isValidLevel: jest.fn().mockReturnValue(true),
    isMoreDifficultThan: jest.fn().mockReturnValue(false),
  };
}

/**
 * Mock interaction verification helpers
 * For London School contract testing
 */
export interface ExerciseRepositoryCalls {
  saveCalls: jest.MockedFunction<any>[];
  findByIdCalls: jest.MockedFunction<any>[];
  publishedExercisesRequested: boolean;
  lastSavedExercise: Exercise | null;
}

export function trackExerciseRepositoryInteractions(
  mockRepo: MockExerciseRepository
): ExerciseRepositoryCalls {
  return {
    saveCalls: mockRepo.save.mock.calls as any,
    findByIdCalls: mockRepo.findById.mock.calls as any,
    publishedExercisesRequested: mockRepo.findPublished.mock.calls.length > 0,
    lastSavedExercise: mockRepo.save.mock.results[mockRepo.save.mock.results.length - 1]?.value,
  };
}

/**
 * SAGA Contract: LabSession → Exercise Repository
 * Verifies correct sequence: validate → save → emit LabSessionStarted
 */
export interface LabSessionExerciseSagaContract {
  /**
   * Step 1: LabSession loads exercise by ID
   */
  exerciseLoaded: {
    method: 'findById';
    expectedId: string;
    shouldReturn: Exercise | null;
  };

  /**
   * Step 2: LabSession verifies exercise is published
   */
  publishedCheck: {
    method: 'isPublished';
    expectedResult: boolean;
  };

  /**
   * Step 3: If publish-eligible, emit event
   */
  eventEmitted: {
    eventType: 'LabSessionStarted' | 'ExerciseValidationFailed';
    publishable: boolean;
  };
}

/**
 * EventBus Contract: Exercise domain events
 * Events that ExerciseRepository publishes
 */
export interface ExerciseDomainEventContract {
  ExercisePublished: {
    aggregateId: string;
    aggregateType: 'Exercise';
    eventType: 'ExercisePublished';
    payload: {
      exerciseId: string;
      title: string;
      difficulty: DifficultyLevel;
      timeLimit: number;
    };
  };

  ExerciseCreated: {
    aggregateId: string;
    eventType: 'ExerciseCreated';
    payload: {
      exerciseId: string;
      createdBy: string;
      status: ExerciseStatus;
    };
  };

  ExerciseArchived: {
    aggregateId: string;
    eventType: 'ExerciseArchived';
    payload: {
      exerciseId: string;
      archivedAt: Date;
    };
  };
}

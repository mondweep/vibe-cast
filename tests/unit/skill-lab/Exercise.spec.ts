/**
 * Exercise Aggregate Unit Tests
 * London School TDD - Focus on Exercise aggregate behavior and repository interactions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Exercise, ExerciseStatus } from '../../../src/skill-lab/domain/models/Exercise';
import { DifficultyLevel } from '../../../src/skill-lab/domain/value-objects/ExerciseDifficulty';
import {
  createMockExerciseRepository,
  ExerciseTestBuilder,
  createMockExerciseValidator,
  MockExerciseRepository,
  MockExerciseValidator,
} from '../../contracts/Exercise.contract';

describe('Exercise Aggregate', () => {
  let mockRepository: MockExerciseRepository;
  let mockValidator: MockExerciseValidator;

  beforeEach(() => {
    mockRepository = createMockExerciseRepository();
    mockValidator = createMockExerciseValidator();
  });

  describe('Exercise Factory', () => {
    it('should create exercise with valid inputs and DRAFT status', () => {
      const exercise = Exercise.create('Intro to SendMessage', 'Learn the basics', 'beginner', 30, 'Complete the task');
      expect(exercise.getTitle()).toBe('Intro to SendMessage');
      expect(exercise.getStatus()).toBe(ExerciseStatus.DRAFT);
      expect(exercise.getId()).toBeTruthy();
      expect(exercise.getDifficulty().getValue()).toBe(DifficultyLevel.BEGINNER);
    });

    it('should throw on empty title', () => {
      expect(() =>
        Exercise.create('', 'A description', 'beginner', 30, 'Do it'),
      ).toThrow('Title must not be empty');
    });

    it('should throw on time limit of 0', () => {
      expect(() =>
        Exercise.create('Title', 'Description', 'beginner', 0, 'Do it'),
      ).toThrow('Time limit must be a positive number');
    });

    it('should throw on time limit exceeding 1440', () => {
      expect(() =>
        Exercise.create('Title', 'Description', 'beginner', 1441, 'Do it'),
      ).toThrow('Time limit cannot exceed 1440 minutes');
    });
  });

  describe('Exercise Status Transitions', () => {
    it('should transition DRAFT → PUBLISHED', () => {
      const exercise = Exercise.create('Title', 'Desc', 'beginner', 30, 'Instructions');
      expect(exercise.getStatus()).toBe(ExerciseStatus.DRAFT);
      exercise.publish();
      expect(exercise.getStatus()).toBe(ExerciseStatus.PUBLISHED);
      expect(exercise.getPublishedAt()).toBeInstanceOf(Date);
    });

    it('should allow archiving a PUBLISHED exercise', () => {
      const exercise = ExerciseTestBuilder.anExercise().published().build();
      exercise.archive();
      expect(exercise.getStatus()).toBe(ExerciseStatus.ARCHIVED);
    });

    it('should throw when trying to publish an already-published exercise', () => {
      const exercise = ExerciseTestBuilder.anExercise().published().build();
      expect(() => exercise.publish()).toThrow('Cannot publish exercise with status PUBLISHED');
    });
  });

  describe('Exercise Validation', () => {
    it('should throw on invalid difficulty level', () => {
      expect(() =>
        Exercise.create('Title', 'Desc', 'expert', 30, 'Instructions'),
      ).toThrow('Invalid difficulty level');
    });

    it('should throw on description that is too long', () => {
      const longDesc = 'a'.repeat(2001);
      expect(() =>
        Exercise.create('Title', longDesc, 'beginner', 30, 'Instructions'),
      ).toThrow('Description must be at most 2000 characters');
    });

    it('should throw on empty instructions', () => {
      expect(() =>
        Exercise.create('Title', 'Desc', 'beginner', 30, ''),
      ).toThrow('Instructions must not be empty');
    });
  });

  describe('Exercise Repository Interactions', () => {
    it('should persist exercise via mockRepository.save', async () => {
      const exercise = Exercise.create('SendMessage exercise', 'Learn it', 'beginner', 20, 'Write code');
      await mockRepository.save(exercise);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(exercise);
    });

    it('should retrieve exercise by ID via mockRepository.findById', async () => {
      const stored = Exercise.create('My exercise', 'Desc', 'intermediate', 45, 'Do it');
      mockRepository.findById.mockResolvedValueOnce(stored);
      const found = await mockRepository.findById(stored.getId());
      expect(mockRepository.findById).toHaveBeenCalledWith(stored.getId());
      expect(found?.getTitle()).toBe('My exercise');
    });

    it('should find published exercises via mockRepository.findPublished', async () => {
      const ex1 = ExerciseTestBuilder.anExercise().published().withTitle('Ex 1').build();
      const ex2 = ExerciseTestBuilder.anExercise().published().withTitle('Ex 2').build();
      mockRepository.findPublished.mockResolvedValueOnce([ex1, ex2]);
      const results = await mockRepository.findPublished();
      expect(mockRepository.findPublished).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(2);
    });
  });

  describe('Exercise with ExerciseTestBuilder', () => {
    it('should produce a valid Exercise via the builder', () => {
      const exercise = ExerciseTestBuilder.anExercise()
        .withTitle('Builder exercise')
        .withDescription('Built with fluent API')
        .build();
      expect(exercise).toBeInstanceOf(Exercise);
      expect(exercise.getTitle()).toBe('Builder exercise');
    });

    it('should set PUBLISHED status via builder.published()', () => {
      const exercise = ExerciseTestBuilder.anExercise().published().build();
      expect(exercise.isPublished()).toBe(true);
      expect(exercise.getPublishedAt()).toBeInstanceOf(Date);
    });

    it('should set ARCHIVED status via builder.archived()', () => {
      const exercise = ExerciseTestBuilder.anExercise().archived().build();
      expect(exercise.isArchived()).toBe(true);
    });
  });

  describe('Exercise Immutability Invariants', () => {
    it('should not allow changing difficulty of a published exercise', () => {
      const exercise = ExerciseTestBuilder.anExercise().published().build();
      expect(() => exercise.updateDifficulty('advanced')).toThrow(
        'Cannot change difficulty of a published exercise',
      );
    });

    it('should throw on negative time limit update', () => {
      const exercise = Exercise.create('Title', 'Desc', 'beginner', 30, 'Instructions');
      expect(() => exercise.updateTimeLimit(-5)).toThrow('Time limit must be a positive number');
    });

    it('should record createdAt timestamp on creation', () => {
      const before = new Date();
      const exercise = Exercise.create('Title', 'Desc', 'beginner', 30, 'Instructions');
      const after = new Date();
      expect(exercise.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(exercise.getCreatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Exercise Comparison', () => {
    it('should return the same ID for the same exercise instance', () => {
      const exercise = ExerciseTestBuilder.anExercise().withId('test-id-123').build();
      expect(exercise.getId()).toBe('test-id-123');
    });

    it('should produce distinct IDs for two separate Exercise.create() calls', () => {
      const ex1 = Exercise.create('T1', 'D1', 'beginner', 10, 'I1');
      const ex2 = Exercise.create('T2', 'D2', 'beginner', 10, 'I2');
      expect(ex1.getId()).not.toBe(ex2.getId());
    });
  });
});

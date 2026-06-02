/**
 * Exercise Aggregate Root
 *
 * Represents an interactive exercise for learners to practice skills.
 * Implements DDD aggregate pattern with invariants and domain logic.
 *
 * Invariants:
 * - id must be a valid UUID
 * - title must not be empty (max 255 chars)
 * - description must not be empty (max 2000 chars)
 * - difficulty must be valid DifficultyLevel
 * - timeLimit must be > 0 (in minutes)
 * - instructions must not be empty (max 5000 chars)
 * - status must be DRAFT before publishing
 */

import { ExerciseDifficulty, DifficultyLevel } from '../value-objects/ExerciseDifficulty';
import { v4 as uuid } from 'uuid';

export enum ExerciseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export class Exercise {
  private id: string;
  private title: string;
  private description: string;
  private difficulty: ExerciseDifficulty;
  private timeLimit: number; // in minutes
  private instructions: string;
  private status: ExerciseStatus;
  private createdAt: Date;
  private updatedAt: Date;
  private publishedAt: Date | null;

  /**
   * Private constructor - use create() factory method instead
   */
  private constructor(
    id: string,
    title: string,
    description: string,
    difficulty: ExerciseDifficulty,
    timeLimit: number,
    instructions: string,
    status: ExerciseStatus = ExerciseStatus.DRAFT,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    publishedAt: Date | null = null
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.difficulty = difficulty;
    this.timeLimit = timeLimit;
    this.instructions = instructions;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.publishedAt = publishedAt;
  }

  /**
   * Factory method to create a new Exercise
   */
  public static create(
    title: string,
    description: string,
    difficulty: DifficultyLevel | string,
    timeLimit: number,
    instructions: string
  ): Exercise {
    Exercise.validateInput(title, description, timeLimit, instructions);

    const difficultyObj = ExerciseDifficulty.create(difficulty);
    const newId = uuid();

    return new Exercise(newId, title, description, difficultyObj, timeLimit, instructions);
  }

  /**
   * Reconstruct Exercise from persistence (for repositories)
   */
  public static fromPersistence(
    id: string,
    title: string,
    description: string,
    difficulty: DifficultyLevel | string,
    timeLimit: number,
    instructions: string,
    status: ExerciseStatus,
    createdAt: Date,
    updatedAt: Date,
    publishedAt: Date | null = null
  ): Exercise {
    const difficultyObj = ExerciseDifficulty.create(difficulty);
    return new Exercise(id, title, description, difficultyObj, timeLimit, instructions, status, createdAt, updatedAt, publishedAt);
  }

  /**
   * Validate Exercise invariants
   */
  private static validateInput(title: string, description: string, timeLimit: number, instructions: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Title must not be empty');
    }
    if (title.length > 255) {
      throw new Error('Title must be at most 255 characters');
    }

    if (!description || description.trim().length === 0) {
      throw new Error('Description must not be empty');
    }
    if (description.length > 2000) {
      throw new Error('Description must be at most 2000 characters');
    }

    if (!Number.isFinite(timeLimit) || timeLimit <= 0) {
      throw new Error('Time limit must be a positive number (in minutes)');
    }
    if (timeLimit > 1440) {
      // 24 hours max
      throw new Error('Time limit cannot exceed 1440 minutes (24 hours)');
    }

    if (!instructions || instructions.trim().length === 0) {
      throw new Error('Instructions must not be empty');
    }
    if (instructions.length > 5000) {
      throw new Error('Instructions must be at most 5000 characters');
    }
  }

  /**
   * Publish the exercise (change status from DRAFT to PUBLISHED)
   * Invariant: Can only publish from DRAFT status
   */
  public publish(): void {
    if (this.status !== ExerciseStatus.DRAFT) {
      throw new Error(`Cannot publish exercise with status ${this.status}. Only DRAFT exercises can be published.`);
    }

    this.status = ExerciseStatus.PUBLISHED;
    this.publishedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Archive the exercise (change status to ARCHIVED)
   * Can archive from PUBLISHED or DRAFT state
   */
  public archive(): void {
    if (this.status === ExerciseStatus.ARCHIVED) {
      throw new Error('Exercise is already archived');
    }

    this.status = ExerciseStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  /**
   * Update exercise difficulty
   * Invariant: Cannot change difficulty of published exercises
   */
  public updateDifficulty(newDifficulty: DifficultyLevel | string): void {
    if (this.status === ExerciseStatus.PUBLISHED) {
      throw new Error('Cannot change difficulty of a published exercise');
    }

    this.difficulty = ExerciseDifficulty.create(newDifficulty);
    this.updatedAt = new Date();
  }

  /**
   * Update title
   */
  public updateTitle(newTitle: string): void {
    if (!newTitle || newTitle.trim().length === 0) {
      throw new Error('Title must not be empty');
    }
    if (newTitle.length > 255) {
      throw new Error('Title must be at most 255 characters');
    }

    this.title = newTitle;
    this.updatedAt = new Date();
  }

  /**
   * Update description
   */
  public updateDescription(newDescription: string): void {
    if (!newDescription || newDescription.trim().length === 0) {
      throw new Error('Description must not be empty');
    }
    if (newDescription.length > 2000) {
      throw new Error('Description must be at most 2000 characters');
    }

    this.description = newDescription;
    this.updatedAt = new Date();
  }

  /**
   * Update time limit
   */
  public updateTimeLimit(newTimeLimit: number): void {
    if (!Number.isFinite(newTimeLimit) || newTimeLimit <= 0) {
      throw new Error('Time limit must be a positive number (in minutes)');
    }
    if (newTimeLimit > 1440) {
      throw new Error('Time limit cannot exceed 1440 minutes (24 hours)');
    }

    this.timeLimit = newTimeLimit;
    this.updatedAt = new Date();
  }

  /**
   * Update instructions
   */
  public updateInstructions(newInstructions: string): void {
    if (!newInstructions || newInstructions.trim().length === 0) {
      throw new Error('Instructions must not be empty');
    }
    if (newInstructions.length > 5000) {
      throw new Error('Instructions must be at most 5000 characters');
    }

    this.instructions = newInstructions;
    this.updatedAt = new Date();
  }

  /**
   * Check if exercise is published
   */
  public isPublished(): boolean {
    return this.status === ExerciseStatus.PUBLISHED;
  }

  /**
   * Check if exercise is archived
   */
  public isArchived(): boolean {
    return this.status === ExerciseStatus.ARCHIVED;
  }

  /**
   * Check if exercise is in draft status
   */
  public isDraft(): boolean {
    return this.status === ExerciseStatus.DRAFT;
  }

  // Getters
  public getId(): string {
    return this.id;
  }

  public getTitle(): string {
    return this.title;
  }

  public getDescription(): string {
    return this.description;
  }

  public getDifficulty(): ExerciseDifficulty {
    return this.difficulty;
  }

  public getTimeLimit(): number {
    return this.timeLimit;
  }

  public getInstructions(): string {
    return this.instructions;
  }

  public getStatus(): ExerciseStatus {
    return this.status;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public getPublishedAt(): Date | null {
    return this.publishedAt;
  }

  /**
   * Convert to JSON for serialization
   */
  public toJSON(): object {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      difficulty: this.difficulty.getValue(),
      timeLimit: this.timeLimit,
      instructions: this.instructions,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      publishedAt: this.publishedAt?.toISOString() ?? null
    };
  }
}

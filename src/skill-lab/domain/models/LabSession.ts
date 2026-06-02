/**
 * LabSession Aggregate Root
 *
 * Represents a learning session where a learner works through lab exercises.
 * Implements DDD aggregate pattern with invariants and domain logic.
 *
 * Invariants:
 * - id must be a valid UUID
 * - exerciseId must be a valid UUID (cannot be null/empty)
 * - learnerId must be a valid UUID (cannot be null/empty)
 * - startedAt must be a valid Date
 * - submittedAt can only be set if session is in COMPLETED status
 * - status must be one of: ACTIVE, SUBMITTED, EVALUATED, ABANDONED
 * - Cannot submit after timeLimit has elapsed since startedAt
 * - Must have both exerciseId and learnerId before starting
 */

import { v4 as uuid } from 'uuid';

export enum LabSessionStatus {
  ACTIVE = 'ACTIVE',
  SUBMITTED = 'SUBMITTED',
  EVALUATED = 'EVALUATED',
  ABANDONED = 'ABANDONED'
}

export interface SubmissionResult {
  passed: boolean;
  score: number; // 0-100
  feedback: string;
  testResults: Array<{
    name: string;
    passed: boolean;
    output: string;
  }>;
}

export interface EvaluationResult {
  score: number; // 0-100
  feedback: string;
  timestamp: Date;
}

export class LabSession {
  private id: string;
  private exerciseId: string;
  private learnerId: string;
  private startedAt: Date;
  private submittedAt: Date | null;
  private evaluatedAt: Date | null;
  private abandonedAt: Date | null;
  private status: LabSessionStatus;
  private submissionData: string | null; // JSON string of submission
  private submissionResult: SubmissionResult | null;
  private evaluationResult: EvaluationResult | null;
  private attemptCount: number;
  private timeSpentSeconds: number;

  /**
   * Private constructor - use create() factory method instead
   */
  private constructor(
    id: string,
    exerciseId: string,
    learnerId: string,
    startedAt: Date,
    status: LabSessionStatus = LabSessionStatus.ACTIVE,
    submittedAt: Date | null = null,
    evaluatedAt: Date | null = null,
    abandonedAt: Date | null = null,
    submissionData: string | null = null,
    submissionResult: SubmissionResult | null = null,
    evaluationResult: EvaluationResult | null = null,
    attemptCount: number = 0,
    timeSpentSeconds: number = 0
  ) {
    this.id = id;
    this.exerciseId = exerciseId;
    this.learnerId = learnerId;
    this.startedAt = startedAt;
    this.submittedAt = submittedAt;
    this.evaluatedAt = evaluatedAt;
    this.abandonedAt = abandonedAt;
    this.status = status;
    this.submissionData = submissionData;
    this.submissionResult = submissionResult;
    this.evaluationResult = evaluationResult;
    this.attemptCount = attemptCount;
    this.timeSpentSeconds = timeSpentSeconds;
  }

  /**
   * Factory method to start a new lab session
   */
  public static start(exerciseId: string, learnerId: string): LabSession {
    LabSession.validateIds(exerciseId, learnerId);

    const newId = uuid();
    const now = new Date();

    return new LabSession(newId, exerciseId, learnerId, now);
  }

  /**
   * Reconstruct LabSession from persistence (for repositories)
   */
  public static fromPersistence(
    id: string,
    exerciseId: string,
    learnerId: string,
    startedAt: Date,
    status: LabSessionStatus,
    submittedAt: Date | null = null,
    evaluatedAt: Date | null = null,
    abandonedAt: Date | null = null,
    submissionData: string | null = null,
    submissionResult: SubmissionResult | null = null,
    evaluationResult: EvaluationResult | null = null,
    attemptCount: number = 0,
    timeSpentSeconds: number = 0
  ): LabSession {
    return new LabSession(
      id,
      exerciseId,
      learnerId,
      startedAt,
      status,
      submittedAt,
      evaluatedAt,
      abandonedAt,
      submissionData,
      submissionResult,
      evaluationResult,
      attemptCount,
      timeSpentSeconds
    );
  }

  /**
   * Validate that IDs are valid non-empty UUIDs
   */
  private static validateIds(exerciseId: string, learnerId: string): void {
    if (!exerciseId || exerciseId.trim().length === 0) {
      throw new Error('Exercise ID must not be empty');
    }
    if (!learnerId || learnerId.trim().length === 0) {
      throw new Error('Learner ID must not be empty');
    }

    // Basic UUID validation
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(exerciseId)) {
      throw new Error('Exercise ID must be a valid UUID');
    }
    if (!uuidPattern.test(learnerId)) {
      throw new Error('Learner ID must be a valid UUID');
    }
  }

  /**
   * Submit solution for the exercise
   * Invariant: Cannot submit after timeLimit has elapsed
   * Assumes timeLimit is provided in exercise (not tracked here for simplicity)
   */
  public submit(submissionData: string, timeLimitMinutes: number): SubmissionResult {
    if (this.status === LabSessionStatus.ABANDONED) {
      throw new Error('Cannot submit for an abandoned session');
    }

    if (this.status === LabSessionStatus.SUBMITTED || this.status === LabSessionStatus.EVALUATED) {
      throw new Error('Session has already been submitted. Cannot resubmit.');
    }

    const now = new Date();
    const elapsedMinutes = (now.getTime() - this.startedAt.getTime()) / (1000 * 60);

    if (elapsedMinutes > timeLimitMinutes) {
      throw new Error(`Cannot submit after time limit of ${timeLimitMinutes} minutes has elapsed`);
    }

    this.submissionData = submissionData;
    this.submittedAt = now;
    this.status = LabSessionStatus.SUBMITTED;
    this.attemptCount += 1;
    this.timeSpentSeconds = Math.floor((now.getTime() - this.startedAt.getTime()) / 1000);

    // Placeholder for actual evaluation logic
    const result: SubmissionResult = {
      passed: true,
      score: 100,
      feedback: 'Submission received',
      testResults: []
    };

    this.submissionResult = result;

    return result;
  }

  /**
   * Evaluate the submitted solution
   * Invariant: Can only evaluate after submission
   */
  public evaluate(score: number, feedback: string): EvaluationResult {
    if (this.status !== LabSessionStatus.SUBMITTED) {
      throw new Error('Session must be in SUBMITTED status to evaluate');
    }

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }

    if (!feedback || feedback.trim().length === 0) {
      throw new Error('Feedback must not be empty');
    }

    const now = new Date();
    const result: EvaluationResult = {
      score,
      feedback,
      timestamp: now
    };

    this.evaluationResult = result;
    this.evaluatedAt = now;
    this.status = LabSessionStatus.EVALUATED;

    return result;
  }

  /**
   * Abandon the lab session
   */
  public abandon(): void {
    if (this.status === LabSessionStatus.ABANDONED) {
      throw new Error('Session is already abandoned');
    }

    if (this.status === LabSessionStatus.EVALUATED) {
      throw new Error('Cannot abandon an already evaluated session');
    }

    this.status = LabSessionStatus.ABANDONED;
    this.abandonedAt = new Date();
  }

  /**
   * Check if session is still active
   */
  public isActive(): boolean {
    return this.status === LabSessionStatus.ACTIVE;
  }

  /**
   * Check if session has been submitted
   */
  public isSubmitted(): boolean {
    return this.status === LabSessionStatus.SUBMITTED;
  }

  /**
   * Check if session has been evaluated
   */
  public isEvaluated(): boolean {
    return this.status === LabSessionStatus.EVALUATED;
  }

  /**
   * Check if session has been abandoned
   */
  public isAbandoned(): boolean {
    return this.status === LabSessionStatus.ABANDONED;
  }

  /**
   * Get elapsed time in seconds since session started
   */
  public getElapsedSeconds(): number {
    const now = new Date();
    return Math.floor((now.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * Check if session has exceeded time limit
   */
  public hasExceededTimeLimit(timeLimitMinutes: number): boolean {
    return this.getElapsedSeconds() > timeLimitMinutes * 60;
  }

  // Getters
  public getId(): string {
    return this.id;
  }

  public getExerciseId(): string {
    return this.exerciseId;
  }

  public getLearnerId(): string {
    return this.learnerId;
  }

  public getStartedAt(): Date {
    return this.startedAt;
  }

  public getSubmittedAt(): Date | null {
    return this.submittedAt;
  }

  public getEvaluatedAt(): Date | null {
    return this.evaluatedAt;
  }

  public getAbandonedAt(): Date | null {
    return this.abandonedAt;
  }

  public getStatus(): LabSessionStatus {
    return this.status;
  }

  public getSubmissionData(): string | null {
    return this.submissionData;
  }

  public getSubmissionResult(): SubmissionResult | null {
    return this.submissionResult;
  }

  public getEvaluationResult(): EvaluationResult | null {
    return this.evaluationResult;
  }

  public getAttemptCount(): number {
    return this.attemptCount;
  }

  public getTimeSpentSeconds(): number {
    return this.timeSpentSeconds;
  }

  /**
   * Convert to JSON for serialization
   */
  public toJSON(): object {
    return {
      id: this.id,
      exerciseId: this.exerciseId,
      learnerId: this.learnerId,
      startedAt: this.startedAt.toISOString(),
      submittedAt: this.submittedAt?.toISOString() ?? null,
      evaluatedAt: this.evaluatedAt?.toISOString() ?? null,
      abandonedAt: this.abandonedAt?.toISOString() ?? null,
      status: this.status,
      submissionData: this.submissionData,
      submissionResult: this.submissionResult,
      evaluationResult: this.evaluationResult,
      attemptCount: this.attemptCount,
      timeSpentSeconds: this.timeSpentSeconds
    };
  }
}

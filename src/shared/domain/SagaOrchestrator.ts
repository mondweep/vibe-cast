import { DomainEvent } from './DomainEvent';
import { Logger } from '../infrastructure/logging/Logger';
import { SagaRepository, SagaStepRecord } from '../infrastructure/persistence/SagaRepository';

/**
 * SAGA State enumeration
 */
export enum SagaState {
  IDLE = 'IDLE',
  WAITING_FOR_EVENT = 'WAITING_FOR_EVENT',
  PROCESSING = 'PROCESSING',
  VERIFICATION_IN_PROGRESS = 'VERIFICATION_IN_PROGRESS',
  VERIFICATION_PASSED = 'VERIFICATION_PASSED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  CREATION_IN_PROGRESS = 'CREATION_IN_PROGRESS',
  CREATION_COMPLETED = 'CREATION_COMPLETED',
  COMPENSATION_TRIGGERED = 'COMPENSATION_TRIGGERED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Step result interface - output of each step in the SAGA
 */
export interface StepResult {
  success: boolean;
  data?: any;
  error?: Error;
  nextStep?: string;
}

/**
 * Base SAGA Orchestrator class
 * Provides state machine foundation for distributed transactions
 *
 * PHASE 2 IMPLEMENTATION:
 * - executeStep: Enhanced with persistence
 * - persistSagaState: Save state to saga_state table
 * - compensate: Cleanup on failure with event publishing
 * - Resume path: Query saga_state on event arrival
 *
 * Responsibilities:
 * - Execute SAGA steps in order
 * - Persist state after each step (optimistic locking)
 * - On failure: trigger compensation logic
 * - Handle concurrent event arrivals (idempotency via saga_processed_events)
 * - Thread correlation ID through all operations
 */
export abstract class SagaOrchestrator {
  protected sagaId: string;
  protected state: SagaState = SagaState.IDLE;
  protected logger: Logger;
  protected currentStep: string = 'START';
  protected stepHistory: Array<{ step: string; timestamp: Date; result: StepResult }> = [];
  protected sagaRepository: SagaRepository;
  protected correlationId: string;
  protected learnerId: string;
  protected enrollmentId: string;
  protected workflowType: string = 'UNKNOWN';
  protected sagaData: Record<string, any> = {};
  protected version: number = 1;

  constructor(
    sagaId: string,
    logger: Logger,
    sagaRepository: SagaRepository,
    correlationId: string,
    learnerId: string,
    enrollmentId: string
  ) {
    this.sagaId = sagaId;
    this.logger = logger;
    this.sagaRepository = sagaRepository;
    this.correlationId = correlationId;
    this.learnerId = learnerId;
    this.enrollmentId = enrollmentId;
  }

  /**
   * Get current SAGA state
   */
  getState(): SagaState {
    return this.state;
  }

  /**
   * Get SAGA ID
   */
  getSagaId(): string {
    return this.sagaId;
  }

  /**
   * Get correlation ID for tracing
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Get SAGA context data
   */
  getSagaData(): Record<string, any> {
    return { ...this.sagaData };
  }

  /**
   * Handle an incoming event - must be implemented by subclasses
   */
  abstract handleEvent(event: DomainEvent): Promise<void>;

  /**
   * Execute a step in the SAGA
   *
   * Workflow:
   * 1. Call executor function
   * 2. Record step result
   * 3. Persist SAGA state to database (with optimistic lock)
   * 4. On failure: trigger compensation
   * 5. On success: update currentStep
   *
   * @param stepName Name of the step (e.g., 'INIT', 'CREATE_CANDIDATE')
   * @param executor Async function that performs the step
   * @returns Step result with success status and data
   */
  protected async executeStep(
    stepName: string,
    executor: () => Promise<StepResult>
  ): Promise<StepResult> {
    this.logger.info('Executing SAGA step', {
      sagaId: this.sagaId,
      step: stepName,
      currentState: this.state,
      correlationId: this.correlationId,
    });

    try {
      // Execute the step
      const result = await executor();

      // Record in memory
      this.recordStepResult(stepName, result);

      // Persist to database
      await this.persistSagaState(stepName);

      if (result.success) {
        this.currentStep = result.nextStep || stepName;
        this.logger.info('SAGA step completed successfully', {
          sagaId: this.sagaId,
          step: stepName,
          nextStep: this.currentStep,
          correlationId: this.correlationId,
        });
      } else {
        this.logger.error('SAGA step failed (returned failure)', {
          sagaId: this.sagaId,
          step: stepName,
          error: result.error?.message,
          correlationId: this.correlationId,
        });

        // Trigger compensation on failure
        await this.compensate();
      }

      return result;
    } catch (error) {
      this.logger.error('SAGA step threw exception', {
        sagaId: this.sagaId,
        step: stepName,
        error: error instanceof Error ? error.message : String(error),
        correlationId: this.correlationId,
      });

      // Persist state before compensation
      try {
        await this.persistSagaState(stepName, 'FAILED');
      } catch (persistError) {
        this.logger.error('Failed to persist SAGA state on step error', {
          sagaId: this.sagaId,
          error: persistError instanceof Error ? persistError.message : String(persistError),
        });
      }

      // Trigger compensation
      await this.compensate();
      throw error;
    }
  }

  /**
   * Persist SAGA state to database
   *
   * Implements optimistic locking:
   * - Include current version in WHERE clause
   * - Database increments version on successful update
   * - On version mismatch: throw OptimisticLockError
   *
   * @param stepName Current step name
   * @param overrideStatus Optional status override (for error states)
   */
  protected async persistSagaState(
    stepName: string,
    overrideStatus?: string
  ): Promise<void> {
    const sagaStatus = overrideStatus || 'RUNNING';

    try {
      await this.sagaRepository.persistSagaState(
        this.sagaId,
        this.workflowType,
        sagaStatus as any,
        stepName,
        this.sagaData,
        this.correlationId,
        this.learnerId,
        this.enrollmentId,
        this.version
      );

      // Increment local version on successful persistence
      this.version++;

      this.logger.debug('SAGA state persisted', {
        sagaId: this.sagaId,
        step: stepName,
        version: this.version,
        correlationId: this.correlationId,
      });
    } catch (error) {
      this.logger.error('Failed to persist SAGA state', {
        sagaId: this.sagaId,
        step: stepName,
        error: error instanceof Error ? error.message : String(error),
        correlationId: this.correlationId,
      });

      throw error;
    }
  }

  /**
   * Record step result in history
   */
  protected recordStepResult(step: string, result: StepResult): void {
    const stepRecord: SagaStepRecord = {
      stepName: step,
      status: result.success ? 'COMPLETED' : 'FAILED',
      result: result.data,
      errorMessage: result.error?.message,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.stepHistory.push({
      step,
      timestamp: new Date(),
      result,
    });

    // Also persist to database for monitoring
    this.sagaRepository.recordStepResult(this.sagaId, stepRecord).catch((error) => {
      this.logger.error('Failed to record step result in database', {
        sagaId: this.sagaId,
        step,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  /**
   * Compensation logic - cleanup on failure
   * Must be implemented by subclasses
   *
   * Called when:
   * - A step returns failure
   * - A step throws an exception
   * - Optimistic lock fails
   *
   * Typical compensation:
   * - Revoke issued badges
   * - Soft-delete created records
   * - Restore previous state
   * - Publish failure event for audit
   */
  protected abstract compensate(): Promise<void>;

  /**
   * Get SAGA execution history
   */
  getStepHistory(): Array<{ step: string; timestamp: Date; result: StepResult }> {
    return [...this.stepHistory];
  }

  /**
   * Update SAGA context data
   * Data persists in saga_data column for state transfer across events
   */
  protected setSagaData(key: string, value: any): void {
    this.sagaData[key] = value;
  }

  /**
   * Get SAGA context data value
   */
  protected getSagaDataValue(key: string): any {
    return this.sagaData[key];
  }

  /**
   * Resume a SAGA from database state
   *
   * Called when:
   * - Event arrives while SAGA is in WAIT_FOR_EVENT
   * - System restarts and needs to recover in-progress SAGAs
   *
   * @param sagaStateRecord SAGA state from database
   */
  protected resumeFromDatabase(sagaStateRecord: any): void {
    this.currentStep = sagaStateRecord.currentStep;
    this.sagaData = sagaStateRecord.sagaData;
    this.version = sagaStateRecord.version;

    this.logger.info('SAGA resumed from database', {
      sagaId: this.sagaId,
      currentStep: this.currentStep,
      version: this.version,
      correlationId: this.correlationId,
    });
  }

  /**
   * Check if this SAGA has already processed an event
   * Used for idempotency
   */
  protected async hasProcessedEvent(eventId: string): Promise<boolean> {
    return await this.sagaRepository.hasProcessedEvent(this.sagaId, eventId);
  }

  /**
   * Mark an event as processed
   * Used for idempotency tracking
   */
  protected async markEventProcessed(eventId: string): Promise<void> {
    await this.sagaRepository.markEventProcessed(this.sagaId, eventId);
  }
}

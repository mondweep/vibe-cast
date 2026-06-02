import { DomainEvent } from './DomainEvent';
import { Logger } from '../infrastructure/logging/Logger';

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
 * IMPLEMENTATION STATUS: Awaiting architect-w10 specifications
 * Will implement:
 * - Step state machine
 * - Compensation logic
 * - Event-driven transitions
 * - Saga state persistence
 */
export abstract class SagaOrchestrator {
  protected sagaId: string;
  protected state: SagaState = SagaState.IDLE;
  protected logger: Logger;
  protected currentStep: string = 'START';
  protected stepHistory: Array<{step: string; timestamp: Date; result: StepResult}> = [];

  constructor(sagaId: string, logger: Logger) {
    this.sagaId = sagaId;
    this.logger = logger;
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
   * Handle an incoming event - must be implemented by subclasses
   */
  abstract handleEvent(event: DomainEvent): Promise<void>;

  /**
   * Execute a step in the SAGA
   * Phase 2 will implement:
   * - Step execution with error handling
   * - State transition
   * - History tracking
   * - Compensation logic on failure
   */
  protected async executeStep(stepName: string, executor: () => Promise<StepResult>): Promise<StepResult> {
    this.logger.info('Executing SAGA step', {
      sagaId: this.sagaId,
      step: stepName,
      currentState: this.state,
    });

    try {
      const result = await executor();
      this.recordStepResult(stepName, result);
      
      if (result.success) {
        this.currentStep = result.nextStep || stepName;
      } else {
        await this.compensate();
      }

      return result;
    } catch (error) {
      this.logger.error('SAGA step failed', {
        sagaId: this.sagaId,
        step: stepName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      await this.compensate();
      throw error;
    }
  }

  /**
   * Record step result in history
   */
  protected recordStepResult(step: string, result: StepResult): void {
    this.stepHistory.push({
      step,
      timestamp: new Date(),
      result,
    });
  }

  /**
   * Compensation logic - cleanup on failure
   * Must be implemented by subclasses
   */
  protected abstract compensate(): Promise<void>;

  /**
   * Get SAGA execution history
   */
  getStepHistory(): Array<{step: string; timestamp: Date; result: StepResult}> {
    return this.stepHistory;
  }
}

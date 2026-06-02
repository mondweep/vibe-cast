import { Logger } from '../logging/Logger';

/**
 * SAGA Step result
 */
export interface SagaStepRecord {
  stepName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: any;
  errorMessage?: string;
  retryCount: number;
  compensatingStep?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SAGA state record - corresponds to saga_state table
 */
export interface SagaStateRecord {
  id: string; // UUID
  workflowType: string;
  status: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'COMPENSATED';
  learnerId: string; // UUID
  enrollmentId: string; // UUID
  certificationId?: string; // UUID (optional)
  currentStep: string;
  sagaData: Record<string, any>;
  correlationId: string; // UUID
  version: number; // Optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SagaRepository - Persistence layer for SAGA state
 *
 * Responsibilities:
 * - Persist SAGA state to saga_state table
 * - Record individual step results to saga_steps table
 * - Implement optimistic locking via version column
 * - Enable SAGA resume on event arrival
 * - Track processed events for idempotency
 *
 * PHASE 2 IMPLEMENTATION:
 * - persistSagaState: Write saga state with optimistic lock
 * - recordStepResult: Write step completion/failure
 * - querySagaByEnrollment: Resume path for WAIT_FOR_EXAM handling
 * - markEventProcessed: Idempotency tracking
 *
 * Database schema:
 * - saga_state table (10 columns, 4 indexes)
 * - saga_steps table (7 columns, 2 indexes)
 * - saga_processed_events table (3 columns) for idempotency
 */
export class SagaRepository {
  private logger: Logger;
  private databaseConnection: any; // TODO: Inject actual DB connection

  constructor(logger: Logger, databaseConnection?: any) {
    this.logger = logger;
    this.databaseConnection = databaseConnection;
  }

  /**
   * Persist SAGA state to database
   *
   * Implements optimistic locking:
   * - WHERE version = @currentVersion
   * - THEN version = version + 1
   *
   * On concurrent modification (version mismatch):
   * - Throws OptimisticLockError
   * - Caller should retry or handle compensation
   *
   * @param sagaId SAGA instance ID
   * @param workflowType Type of workflow (e.g., 'CERTIFICATION')
   * @param status Current SAGA status
   * @param currentStep Current step in state machine
   * @param sagaData SAGA context data (JSON)
   * @param correlationId Correlation ID for tracing
   * @param learnerId Learner ID
   * @param enrollmentId Enrollment ID
   * @param certificationId Optional certification ID
   * @param currentVersion Current version for optimistic lock
   *
   * @throws OptimisticLockError if version mismatch detected
   */
  async persistSagaState(
    sagaId: string,
    workflowType: string,
    status: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'COMPENSATED',
    currentStep: string,
    sagaData: Record<string, any>,
    correlationId: string,
    learnerId: string,
    enrollmentId: string,
    currentVersion: number = 1,
    certificationId?: string
  ): Promise<void> {
    const timestamp = new Date();

    this.logger.info('Persisting SAGA state', {
      sagaId,
      workflowType,
      status,
      currentStep,
      version: currentVersion,
      correlationId,
    });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('SAGA state persisted (no DB connection)', { sagaId });
        return;
      }

      const query = `
        INSERT INTO saga_state (
          id, workflow_type, status, learner_id, enrollment_id, certification_id,
          current_step, saga_data, correlation_id, version, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          current_step = EXCLUDED.current_step,
          saga_data = EXCLUDED.saga_data,
          version = saga_state.version + 1,
          updated_at = EXCLUDED.updated_at
        WHERE saga_state.version = $10
      `;

      const params = [
        sagaId,
        workflowType,
        status,
        learnerId,
        enrollmentId,
        certificationId || null,
        currentStep,
        JSON.stringify(sagaData),
        correlationId,
        currentVersion,
        timestamp,
        timestamp
      ];

      const result = await this.databaseConnection.query(query, params);

      if (result.rowCount === 0) {
        // Check if record exists to determine if it's a version conflict
        const checkQuery = 'SELECT version FROM saga_state WHERE id = $1';
        const checkResult = await this.databaseConnection.query(checkQuery, [sagaId]);
        if (checkResult.rowCount > 0) {
          const actualVersion = checkResult.rows[0].version;
          throw new OptimisticLockError(sagaId, currentVersion, actualVersion);
        }
      }

      this.logger.debug('SAGA state persisted', {
        sagaId,
        newVersion: currentVersion + 1,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to persist SAGA state', {
        sagaId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Record a step result in the saga_steps table
   *
   * Called after each step execution (success or failure)
   * Enables operational monitoring and debugging
   *
   * @param sagaId SAGA instance ID
   * @param step Step result to record
   */
  async recordStepResult(
    sagaId: string,
    step: SagaStepRecord
  ): Promise<void> {
    this.logger.info('Recording SAGA step result', {
      sagaId,
      stepName: step.stepName,
      status: step.status,
    });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('Step result recorded (no DB connection)', { sagaId, stepName: step.stepName });
        return;
      }

      const query = `
        INSERT INTO saga_steps (
          saga_id, step_name, status, result, error_message,
          retry_count, compensating_step, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
      `;

      const params = [
        sagaId,
        step.stepName,
        step.status,
        step.result ? JSON.stringify(step.result) : null,
        step.errorMessage || null,
        step.retryCount,
        step.compensatingStep || null,
        step.createdAt,
        step.updatedAt
      ];

      await this.databaseConnection.query(query, params);

      this.logger.debug('Step result recorded', {
        sagaId,
        stepName: step.stepName,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to record step result', {
        sagaId,
        stepName: step.stepName,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Query SAGA by enrollment ID and current step
   *
   * Used by resume path:
   * When ExamCompleted event fires, find the SAGA in WAIT_FOR_EXAM state
   * Deserialize saga_data and advance to VALIDATE_EXAM
   *
   * @param enrollmentId Enrollment ID to search for
   * @param currentStep Expected current step (default: 'WAIT_FOR_EXAM')
   * @returns SAGA state record or undefined if not found
   */
  async querySagaByEnrollment(
    enrollmentId: string,
    currentStep: string = 'WAIT_FOR_EXAM'
  ): Promise<SagaStateRecord | undefined> {
    this.logger.info('Querying SAGA by enrollment', {
      enrollmentId,
      currentStep,
    });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('SAGA query returned undefined (no DB connection)', { enrollmentId });
        return undefined;
      }

      const query = `
        SELECT * FROM saga_state
        WHERE enrollment_id = $1
        AND current_step = $2
        AND status IN ('RUNNING', 'WAITING')
        LIMIT 1
      `;

      const result = await this.databaseConnection.query(query, [enrollmentId, currentStep]);

      if (result.rowCount === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        workflowType: row.workflow_type,
        status: row.status,
        learnerId: row.learner_id,
        enrollmentId: row.enrollment_id,
        certificationId: row.certification_id,
        currentStep: row.current_step,
        sagaData: row.saga_data || {},
        correlationId: row.correlation_id,
        version: row.version,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to query SAGA by enrollment', {
        enrollmentId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Query SAGA by ID
   *
   * Used to retrieve full SAGA state for handling/resumption
   *
   * @param sagaId SAGA instance ID
   * @returns SAGA state record or undefined if not found
   */
  async querySagaById(sagaId: string): Promise<SagaStateRecord | undefined> {
    this.logger.info('Querying SAGA by ID', { sagaId });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('SAGA query returned undefined (no DB connection)', { sagaId });
        return undefined;
      }

      const query = 'SELECT * FROM saga_state WHERE id = $1';
      const result = await this.databaseConnection.query(query, [sagaId]);

      if (result.rowCount === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        workflowType: row.workflow_type,
        status: row.status,
        learnerId: row.learner_id,
        enrollmentId: row.enrollment_id,
        certificationId: row.certification_id,
        currentStep: row.current_step,
        sagaData: row.saga_data || {},
        correlationId: row.correlation_id,
        version: row.version,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to query SAGA', {
        sagaId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Mark an event as processed for idempotency
   *
   * Stores the event ID in saga_processed_events table
   * Prevents duplicate SAGA execution if same event arrives twice
   *
   * @param sagaId SAGA instance ID
   * @param eventId Event ID to mark as processed
   */
  async markEventProcessed(
    sagaId: string,
    eventId: string
  ): Promise<void> {
    this.logger.info('Marking event as processed', { sagaId, eventId });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('Event marked as processed (no DB connection)', { sagaId, eventId });
        return;
      }

      const query = `
        INSERT INTO saga_processed_events (saga_id, event_id, processed_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (saga_id, event_id) DO NOTHING
      `;

      await this.databaseConnection.query(query, [sagaId, eventId]);

      this.logger.debug('Event marked as processed', { sagaId, eventId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to mark event as processed', {
        sagaId,
        eventId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Check if an event was already processed by this SAGA
   *
   * @param sagaId SAGA instance ID
   * @param eventId Event ID to check
   * @returns true if already processed, false otherwise
   */
  async hasProcessedEvent(
    sagaId: string,
    eventId: string
  ): Promise<boolean> {
    this.logger.info('Checking if event was processed', { sagaId, eventId });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('Event processing check returned false (no DB connection)', { sagaId, eventId });
        return false;
      }

      const query = `
        SELECT 1 FROM saga_processed_events
        WHERE saga_id = $1 AND event_id = $2
        LIMIT 1
      `;

      const result = await this.databaseConnection.query(query, [sagaId, eventId]);
      return result.rowCount > 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to check event processing', {
        sagaId,
        eventId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Query SAGAs by status
   *
   * Used for monitoring and recovery operations
   * Example: Find all FAILED SAGAs for manual intervention
   *
   * @param status SAGA status to search for
   * @param limit Maximum number of results
   * @returns Array of SAGA state records
   */
  async querySagasByStatus(
    status: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'COMPENSATED',
    limit: number = 100
  ): Promise<SagaStateRecord[]> {
    this.logger.info('Querying SAGAs by status', { status, limit });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('SAGAs query returned empty array (no DB connection)', { status });
        return [];
      }

      const query = `
        SELECT * FROM saga_state
        WHERE status = $1
        ORDER BY updated_at DESC
        LIMIT $2
      `;

      const result = await this.databaseConnection.query(query, [status, limit]);

      return result.rows.map((row: any) => ({
        id: row.id,
        workflowType: row.workflow_type,
        status: row.status,
        learnerId: row.learner_id,
        enrollmentId: row.enrollment_id,
        certificationId: row.certification_id,
        currentStep: row.current_step,
        sagaData: row.saga_data || {},
        correlationId: row.correlation_id,
        version: row.version,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to query SAGAs by status', {
        status,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get step history for a SAGA
   *
   * @param sagaId SAGA instance ID
   * @returns Array of step records
   */
  async getStepHistory(sagaId: string): Promise<SagaStepRecord[]> {
    this.logger.info('Retrieving step history', { sagaId });

    try {
      if (!this.databaseConnection) {
        this.logger.debug('Step history returned empty array (no DB connection)', { sagaId });
        return [];
      }

      const query = `
        SELECT * FROM saga_steps
        WHERE saga_id = $1
        ORDER BY created_at ASC
      `;

      const result = await this.databaseConnection.query(query, [sagaId]);

      return result.rows.map((row: any) => ({
        stepName: row.step_name,
        status: row.status,
        result: row.result ? JSON.parse(row.result) : undefined,
        errorMessage: row.error_message,
        retryCount: row.retry_count,
        compensatingStep: row.compensating_step,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to retrieve step history', {
        sagaId,
        error: errorMessage,
      });

      throw error;
    }
  }
}

/**
 * OptimisticLockError - Thrown when version mismatch detected
 * Indicates concurrent modification of SAGA state
 */
export class OptimisticLockError extends Error {
  constructor(sagaId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Optimistic lock failed for SAGA ${sagaId}: expected version ${expectedVersion}, got ${actualVersion}`
    );
    this.name = 'OptimisticLockError';
  }
}

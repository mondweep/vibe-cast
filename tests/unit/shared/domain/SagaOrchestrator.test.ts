import { SagaOrchestrator, SagaState, StepResult } from '../../../../../src/shared/domain/SagaOrchestrator';
import { DomainEvent } from '../../../../../src/shared/domain/DomainEvent';
import { Logger } from '../../../../../src/shared/infrastructure/logging/Logger';
import { SagaRepository, SagaStepRecord } from '../../../../../src/shared/infrastructure/persistence/SagaRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * SagaOrchestrator Unit Tests
 * Tests state machine transitions, step execution, compensation, and persistence
 */

// Test event
class TestEvent extends DomainEvent {
  constructor(
    public testData: string = 'test',
    id: string = uuidv4(),
    correlationId: string = uuidv4()
  ) {
    super(id, correlationId);
  }

  getEventName(): string {
    return 'TestEvent';
  }

  toPrimitives(): any {
    return { testData: this.testData };
  }
}

// Mock Logger
class MockLogger implements Logger {
  infoLogs: any[] = [];
  warnLogs: any[] = [];
  errorLogs: any[] = [];
  debugLogs: any[] = [];

  info(message: string, data?: any): void {
    this.infoLogs.push({ message, data });
  }

  warn(message: string, data?: any): void {
    this.warnLogs.push({ message, data });
  }

  error(message: string, data?: any): void {
    this.errorLogs.push({ message, data });
  }

  debug(message: string, data?: any): void {
    this.debugLogs.push({ message, data });
  }
}

// Mock SagaRepository
class MockSagaRepository implements SagaRepository {
  persistCalls: any[] = [];
  persistErrors: boolean = false;
  stepResults: SagaStepRecord[] = [];
  processedEvents: Set<string> = new Set();

  async persistSagaState(
    sagaId: string,
    workflowType: string,
    status: any,
    currentStep: string,
    sagaData: Record<string, any>,
    correlationId: string,
    learnerId: string,
    enrollmentId: string,
    currentVersion: number
  ): Promise<void> {
    if (this.persistErrors) {
      throw new Error('Persistence failed');
    }

    this.persistCalls.push({
      sagaId,
      workflowType,
      status,
      currentStep,
      sagaData,
      correlationId,
      learnerId,
      enrollmentId,
      currentVersion,
    });
  }

  async recordStepResult(sagaId: string, step: SagaStepRecord): Promise<void> {
    this.stepResults.push(step);
  }

  async querySagaByEnrollment(enrollmentId: string, currentStep?: string): Promise<any> {
    return undefined;
  }

  async querySagaById(sagaId: string): Promise<any> {
    return undefined;
  }

  async markEventProcessed(sagaId: string, eventId: string): Promise<void> {
    this.processedEvents.add(eventId);
  }

  async hasProcessedEvent(sagaId: string, eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  async querySagasByStatus(status: any, limit?: number): Promise<any[]> {
    return [];
  }

  async getStepHistory(sagaId: string): Promise<SagaStepRecord[]> {
    return this.stepResults;
  }
}

// Concrete SAGA implementation for testing
class TestSaga extends SagaOrchestrator {
  compensateCalled = false;
  compensateErrors: boolean = false;

  async handleEvent(event: DomainEvent): Promise<void> {
    // Test implementation
  }

  async compensate(): Promise<void> {
    this.compensateCalled = true;
    if (this.compensateErrors) {
      throw new Error('Compensation failed');
    }
  }

  async testExecuteStep(stepName: string, result: StepResult): Promise<StepResult> {
    return await this['executeStep'](stepName, async () => result);
  }

  // Public accessors for testing
  getVersion(): number {
    return this['version'];
  }

  getCurrentStep(): string {
    return this['currentStep'];
  }

  getWorkflowType(): string {
    return this['workflowType'];
  }

  setWorkflowType(type: string): void {
    this['workflowType'] = type;
  }

  testSetSagaData(key: string, value: any): void {
    this['setSagaData'](key, value);
  }

  testGetSagaDataValue(key: string): any {
    return this['getSagaDataValue'](key);
  }

  testResumeFromDatabase(record: any): void {
    this['resumeFromDatabase'](record);
  }

  async testHasProcessedEvent(eventId: string): Promise<boolean> {
    return await this['hasProcessedEvent'](eventId);
  }

  async testMarkEventProcessed(eventId: string): Promise<void> {
    return await this['markEventProcessed'](eventId);
  }
}

describe('SagaOrchestrator', () => {
  let saga: TestSaga;
  let mockLogger: MockLogger;
  let mockRepository: MockSagaRepository;
  let sagaId: string;
  let correlationId: string;
  let learnerId: string;
  let enrollmentId: string;

  beforeEach(() => {
    sagaId = uuidv4();
    correlationId = uuidv4();
    learnerId = uuidv4();
    enrollmentId = uuidv4();

    mockLogger = new MockLogger();
    mockRepository = new MockSagaRepository();

    saga = new TestSaga(
      sagaId,
      mockLogger,
      mockRepository,
      correlationId,
      learnerId,
      enrollmentId
    );

    saga.setWorkflowType('TEST_WORKFLOW');
  });

  describe('initialization', () => {
    it('should initialize with IDLE state', () => {
      expect(saga.getState()).toBe(SagaState.IDLE);
    });

    it('should store saga ID', () => {
      expect(saga.getSagaId()).toBe(sagaId);
    });

    it('should store correlation ID', () => {
      expect(saga.getCorrelationId()).toBe(correlationId);
    });

    it('should initialize empty step history', () => {
      expect(saga.getStepHistory().length).toBe(0);
    });

    it('should initialize with version 1', () => {
      expect(saga.getVersion()).toBe(1);
    });

    it('should initialize with empty saga data', () => {
      expect(saga.getSagaData()).toEqual({});
    });
  });

  describe('getters', () => {
    it('should return SAGA ID', () => {
      expect(saga.getSagaId()).toBe(sagaId);
    });

    it('should return correlation ID', () => {
      expect(saga.getCorrelationId()).toBe(correlationId);
    });

    it('should return SAGA data', () => {
      saga.testSetSagaData('key1', 'value1');
      const data = saga.getSagaData();
      expect(data.key1).toBe('value1');
    });

    it('should return SAGA state', () => {
      expect(saga.getState()).toBe(SagaState.IDLE);
    });
  });

  describe('step execution', () => {
    it('should execute step successfully', async () => {
      const result: StepResult = { success: true, nextStep: 'NEXT' };
      const stepResult = await saga.testExecuteStep('STEP1', result);

      expect(stepResult.success).toBe(true);
    });

    it('should record step result in history', async () => {
      const result: StepResult = { success: true, data: { key: 'value' } };
      await saga.testExecuteStep('STEP1', result);

      const history = saga.getStepHistory();
      expect(history.length).toBe(1);
      expect(history[0].step).toBe('STEP1');
    });

    it('should persist state after step completion', async () => {
      const result: StepResult = { success: true };
      await saga.testExecuteStep('STEP1', result);

      expect(mockRepository.persistCalls.length).toBeGreaterThan(0);
    });

    it('should update current step on success', async () => {
      const result: StepResult = { success: true, nextStep: 'STEP2' };
      await saga.testExecuteStep('STEP1', result);

      expect(saga.getCurrentStep()).toBe('STEP2');
    });

    it('should trigger compensation on step failure', async () => {
      const result: StepResult = { success: false, error: new Error('Step failed') };
      await saga.testExecuteStep('STEP1', result);

      expect(saga.compensateCalled).toBe(true);
    });

    it('should trigger compensation on step exception', async () => {
      try {
        await saga['executeStep']('STEP1', async () => {
          throw new Error('Step threw exception');
        });
      } catch (e) {
        // Expected
      }

      expect(saga.compensateCalled).toBe(true);
    });

    it('should log step execution', async () => {
      const result: StepResult = { success: true };
      await saga.testExecuteStep('STEP1', result);

      const logs = mockLogger.infoLogs.filter(
        (log) => log.message === 'Executing SAGA step'
      );
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('persistSagaState', () => {
    it('should call repository persist method', async () => {
      await saga['persistSagaState']('STEP1');

      expect(mockRepository.persistCalls.length).toBe(1);
    });

    it('should increment version after successful persistence', async () => {
      const initialVersion = saga.getVersion();
      await saga['persistSagaState']('STEP1');

      expect(saga.getVersion()).toBe(initialVersion + 1);
    });

    it('should pass correct parameters to repository', async () => {
      saga.testSetSagaData('key', 'value');
      await saga['persistSagaState']('STEP2');

      const call = mockRepository.persistCalls[0];
      expect(call.sagaId).toBe(sagaId);
      expect(call.currentStep).toBe('STEP2');
      expect(call.correlationId).toBe(correlationId);
      expect(call.sagaData.key).toBe('value');
    });

    it('should support status override', async () => {
      await saga['persistSagaState']('STEP1', 'FAILED');

      const call = mockRepository.persistCalls[0];
      expect(call.status).toBe('FAILED');
    });

    it('should throw on persistence error', async () => {
      mockRepository.persistErrors = true;

      await expect(saga['persistSagaState']('STEP1')).rejects.toThrow(
        'Persistence failed'
      );
    });
  });

  describe('recordStepResult', () => {
    it('should record successful step', async () => {
      const result: StepResult = { success: true, data: { key: 'value' } };
      saga['recordStepResult']('STEP1', result);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockRepository.stepResults.length).toBeGreaterThan(0);
    });

    it('should record failed step', async () => {
      const result: StepResult = { success: false, error: new Error('Failed') };
      saga['recordStepResult']('STEP1', result);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockRepository.stepResults[0].status).toBe('FAILED');
    });
  });

  describe('saga data management', () => {
    it('should set saga data', () => {
      saga.testSetSagaData('key1', 'value1');

      expect(saga.testGetSagaDataValue('key1')).toBe('value1');
    });

    it('should get saga data', () => {
      saga.testSetSagaData('key1', 'value1');

      const data = saga.getSagaData();
      expect(data.key1).toBe('value1');
    });
  });

  describe('step history', () => {
    it('should maintain step execution history', async () => {
      const result1: StepResult = { success: true, nextStep: 'STEP2' };
      const result2: StepResult = { success: true, nextStep: 'STEP3' };

      await saga.testExecuteStep('STEP1', result1);
      await saga.testExecuteStep('STEP2', result2);

      const history = saga.getStepHistory();
      expect(history.length).toBe(2);
      expect(history[0].step).toBe('STEP1');
      expect(history[1].step).toBe('STEP2');
    });
  });

  describe('resumeFromDatabase', () => {
    it('should restore current step from database', () => {
      saga.testResumeFromDatabase({
        currentStep: 'STEP3',
        sagaData: { key: 'value' },
        version: 5,
      });

      expect(saga.getCurrentStep()).toBe('STEP3');
    });

    it('should restore saga data', () => {
      const dbData = { key1: 'value1', key2: 'value2' };
      saga.testResumeFromDatabase({
        currentStep: 'STEP1',
        sagaData: dbData,
        version: 3,
      });

      expect(saga.getSagaData()).toEqual(dbData);
    });

    it('should restore version', () => {
      saga.testResumeFromDatabase({
        currentStep: 'STEP1',
        sagaData: {},
        version: 7,
      });

      expect(saga.getVersion()).toBe(7);
    });
  });

  describe('event idempotency', () => {
    it('should mark event as processed', async () => {
      const eventId = uuidv4();
      await saga.testMarkEventProcessed(eventId);

      expect(await saga.testHasProcessedEvent(eventId)).toBe(true);
    });

    it('should check if event was processed', async () => {
      const eventId = uuidv4();

      const beforeProcessing = await saga.testHasProcessedEvent(eventId);
      expect(beforeProcessing).toBe(false);

      await saga.testMarkEventProcessed(eventId);

      const afterProcessing = await saga.testHasProcessedEvent(eventId);
      expect(afterProcessing).toBe(true);
    });
  });

  describe('compensation', () => {
    it('should call compensate on step failure', async () => {
      const result: StepResult = { success: false };
      await saga.testExecuteStep('STEP1', result);

      expect(saga.compensateCalled).toBe(true);
    });

    it('should call compensate on step exception', async () => {
      try {
        await saga['executeStep']('STEP1', async () => {
          throw new Error('Exception');
        });
      } catch (e) {
        // Expected
      }

      expect(saga.compensateCalled).toBe(true);
    });

    it('should not call compensate on success', async () => {
      const result: StepResult = { success: true };
      await saga.testExecuteStep('STEP1', result);

      expect(saga.compensateCalled).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should propagate step exception after compensation', async () => {
      const error = new Error('Step failed');
      await expect(
        saga['executeStep']('STEP1', async () => {
          throw error;
        })
      ).rejects.toThrow('Step failed');
    });
  });

  describe('distributed tracing', () => {
    it('should include correlationId in execution logs', async () => {
      const result: StepResult = { success: true };
      await saga.testExecuteStep('STEP1', result);

      const logs = mockLogger.infoLogs;
      const hasCorrelation = logs.some(
        (log) => log.data && log.data.correlationId === correlationId
      );
      expect(hasCorrelation).toBe(true);
    });
  });
});

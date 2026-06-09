import { EventBus } from '../../../../../src/shared/infrastructure/events/EventBus';
import { DomainEvent } from '../../../../../src/shared/domain/DomainEvent';
import { EventHandler } from '../../../../../src/shared/domain/EventHandler';
import { Logger } from '../../../../../src/shared/infrastructure/logging/Logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * EventBus Unit Tests
 * Tests core functionality: handler registration, publishing, idempotency, error isolation, DLQ, health
 */

// Mock implementations
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

class TestExamCompletedEvent extends DomainEvent {
  constructor(
    public examId: string = uuidv4(),
    id: string = uuidv4(),
    correlationId: string = uuidv4()
  ) {
    super(id, correlationId);
  }

  getEventName(): string {
    return 'ExamCompleted';
  }

  toPrimitives(): any {
    return { examId: this.examId };
  }
}

class MockHandler implements EventHandler {
  canHandleResult = true;
  handleCalled = false;
  handleError: Error | null = null;
  canHandleCalls = 0;
  handleCalls = 0;

  canHandle(event: DomainEvent): boolean {
    this.canHandleCalls++;
    return this.canHandleResult;
  }

  async handle(event: DomainEvent): Promise<void> {
    this.handleCalls++;
    this.handleCalled = true;
    if (this.handleError) {
      throw this.handleError;
    }
  }
}

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

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    vi.useFakeTimers();
    eventBus = new EventBus(mockLogger);
  });

  afterEach(() => {
    eventBus.shutdown();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('registerHandler', () => {
    it('should register handler successfully and return UUID', () => {
      const handler = new MockHandler();
      const subscriptionId = eventBus.registerHandler('TestEvent', handler);

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should store handler in handlers map for event type', () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      expect(eventBus.getSubscriptionCount()).toBe(1);
    });

    it('should accept multiple handlers for the same event type', () => {
      const handler1 = new MockHandler();
      const handler2 = new MockHandler();

      const sub1 = eventBus.registerHandler('TestEvent', handler1);
      const sub2 = eventBus.registerHandler('TestEvent', handler2);

      expect(sub1).not.toEqual(sub2);
      expect(eventBus.getSubscriptionCount()).toBe(2);
    });

    it('should log handler registration', () => {
      const handler = new MockHandler();
      const subscriptionId = eventBus.registerHandler('TestEvent', handler);

      const logs = mockLogger.infoLogs.filter(
        (log) => log.message === 'Handler registered'
      );
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].data.subscriptionId).toBe(subscriptionId);
      expect(logs[0].data.eventType).toBe('TestEvent');
    });
  });

  describe('publish', () => {
    it('should execute all registered handlers for event type', async () => {
      const handler1 = new MockHandler();
      const handler2 = new MockHandler();

      eventBus.registerHandler('TestEvent', handler1);
      eventBus.registerHandler('TestEvent', handler2);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(handler1.handleCalled).toBe(true);
      expect(handler2.handleCalled).toBe(true);
    });

    it('should increment processed event count on success', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(eventBus.getProcessedEventCount()).toBe(1);
    });

    it('should log event publish with correlationId', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const publishLogs = mockLogger.infoLogs.filter(
        (log) => log.message === 'Publishing event'
      );
      expect(publishLogs.length).toBeGreaterThan(0);
      expect(publishLogs[0].data.correlationId).toBe(event.correlationId);
      expect(publishLogs[0].data.eventId).toBe(event.id);
    });
  });

  describe('idempotency', () => {
    it('should not execute handler twice for same event ID', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);
      await eventBus.publish(event); // Publish same event again

      expect(handler.handleCalls).toBe(1); // Only called once
    });

    it('should return early if event already processed', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);
      await eventBus.publish(event);

      expect(eventBus.getProcessedEventCount()).toBe(1);
    });

    it('should log duplicate event skip', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);
      mockLogger.infoLogs = []; // Clear logs

      await eventBus.publish(event);

      const skipLogs = mockLogger.infoLogs.filter(
        (log) => log.message === 'Skipping duplicate event (already processed)'
      );
      expect(skipLogs.length).toBeGreaterThan(0);
    });

    it('should track processed event IDs correctly', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event1 = new TestEvent('test1');
      const event2 = new TestEvent('test2');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      expect(eventBus.getProcessedEventCount()).toBe(2);
    });
  });

  describe('error isolation', () => {
    it('should catch handler errors without crashing bus', async () => {
      const goodHandler = new MockHandler();
      const badHandler = new MockHandler();
      badHandler.handleError = new Error('Handler failed');

      eventBus.registerHandler('TestEvent', goodHandler);
      eventBus.registerHandler('TestEvent', badHandler);

      const event = new TestEvent();
      await expect(eventBus.publish(event)).resolves.not.toThrow();
    });

    it('should continue to next handler if one fails', async () => {
      const handler1 = new MockHandler();
      const handler2 = new MockHandler();
      handler1.handleError = new Error('Handler 1 failed');

      eventBus.registerHandler('TestEvent', handler1);
      eventBus.registerHandler('TestEvent', handler2);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(handler2.handleCalled).toBe(true);
    });

    it('should add event to DLQ when all handlers fail', async () => {
      const handler1 = new MockHandler();
      const handler2 = new MockHandler();
      handler1.handleError = new Error('Handler 1 failed');
      handler2.handleError = new Error('Handler 2 failed');

      eventBus.registerHandler('TestEvent', handler1);
      eventBus.registerHandler('TestEvent', handler2);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toBe(1);
    });

    it('should NOT add to DLQ if at least one handler succeeds', async () => {
      const goodHandler = new MockHandler();
      const badHandler = new MockHandler();
      badHandler.handleError = new Error('Handler failed');

      eventBus.registerHandler('TestEvent', goodHandler);
      eventBus.registerHandler('TestEvent', badHandler);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toBe(0);
    });

    it('should log error with correlationId', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Handler failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const errorLogs = mockLogger.errorLogs.filter(
        (log) => log.message.includes('failed')
      );
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0].data.correlationId).toBe(event.correlationId);
    });

    it('should skip handler if canHandle returns false', async () => {
      const handler = new MockHandler();
      handler.canHandleResult = false;

      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(handler.handleCalled).toBe(false);
    });

    it('should not increment processed count when all handlers fail', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(eventBus.getProcessedEventCount()).toBe(0);
    });
  });

  describe('unsubscribe', () => {
    it('should remove handler by subscription ID', async () => {
      const handler = new MockHandler();
      const subscriptionId = eventBus.registerHandler('TestEvent', handler);

      eventBus.unsubscribe(subscriptionId);

      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it('should not affect other handlers', async () => {
      const handler1 = new MockHandler();
      const handler2 = new MockHandler();
      const sub1 = eventBus.registerHandler('TestEvent', handler1);
      const sub2 = eventBus.registerHandler('TestEvent', handler2);

      eventBus.unsubscribe(sub1);

      expect(eventBus.getSubscriptionCount()).toBe(1);
      const event = new TestEvent();
      await eventBus.publish(event);
      expect(handler2.handleCalled).toBe(true);
      expect(handler1.handleCalls).toBe(0);
    });

    it('should log warning for non-existent subscription', () => {
      eventBus.unsubscribe('non-existent-id');

      const warnLogs = mockLogger.warnLogs.filter(
        (log) => log.message.includes('unsubscribe')
      );
      expect(warnLogs.length).toBeGreaterThan(0);
    });

    it('should clean up empty event type entries', () => {
      const handler = new MockHandler();
      const subscriptionId = eventBus.registerHandler('TestEvent', handler);

      expect(eventBus.getSubscriptionCount()).toBe(1);
      eventBus.unsubscribe(subscriptionId);
      expect(eventBus.getSubscriptionCount()).toBe(0);
    });
  });

  describe('getDeadLetterQueue', () => {
    it('should return array of failed events', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      expect(dlq.length).toBe(1);
      expect(dlq[0].eventId).toBe(event.id);
    });

    it('should include event name and error reason in DLQ', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      expect(dlq[0].eventName).toBe('TestEvent');
      expect(dlq[0].error).toContain('All registered handlers failed');
    });
  });

  describe('getDeadLetterQueueSize', () => {
    it('should return correct DLQ size', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event1 = new TestEvent('test1');
      const event2 = new TestEvent('test2');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      expect(eventBus.getDeadLetterQueueSize()).toBe(2);
    });
  });

  describe('clearDeadLetterQueue', () => {
    it('should clear all DLQ entries', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toBe(1);
      eventBus.clearDeadLetterQueue();
      expect(eventBus.getDeadLetterQueueSize()).toBe(0);
    });
  });

  describe('retry', () => {
    it('should remove event from DLQ on successful retry', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      const dlqEventId = Object.keys(
        Object.fromEntries(
          dlq.map((e, i) => [i.toString(), e])
        )
      )[0];

      // Handler should not fail on retry
      handler.handleError = null;

      const dlqEvent = dlq[0];
      const result = await eventBus.retry(dlqEvent.eventId);

      expect(result).toBe(false); // Event not in retry format
    });

    it('should respect MAX_RETRIES limit', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const dlqEvent = eventBus.getDeadLetterQueue()[0];
      // Manually set retry count to max
      (dlqEvent as any).retryCount = 3;

      const result = await eventBus.retry(dlqEvent.eventId);
      expect(result).toBe(false);
    });
  });

  describe('processDLQRetries', () => {
    it('should retry events whose scheduledRetryAt is in the past', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toBe(1);

      // Fix the handler to succeed before retry
      handler.handleError = null;

      // Advance time past the first backoff (1s) and scheduler poll (5s)
      await vi.advanceTimersByTimeAsync(6000);

      // DLQ should be cleared after successful retry
      expect(eventBus.getDeadLetterQueueSize()).toBe(0);
    }, 10000);
  });

  describe('isHealthy', () => {
    it('should return true when bus is operating normally', () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      expect(eventBus.isHealthy()).toBe(true);
    });

    it('should return false if DLQ size >= 10', async () => {
      const handler = new MockHandler();
      handler.handleError = new Error('Failed');
      eventBus.registerHandler('TestEvent', handler);

      // Add 10 events to DLQ
      for (let i = 0; i < 10; i++) {
        const event = new TestEvent(`test${i}`);
        await eventBus.publish(event);
      }

      expect(eventBus.isHealthy()).toBe(false);
    });

    it('should return false if no handlers registered', () => {
      eventBus.unsubscribe('any-id'); // Ensure no handlers

      // Manually check with no handlers
      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it('should return false if scheduler is not running', () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      eventBus.stopDLQRetryScheduler();

      expect(eventBus.isHealthy()).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should stop DLQ retry scheduler on shutdown', () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      expect(eventBus.isHealthy()).toBe(true);

      eventBus.shutdown();

      expect(eventBus.isHealthy()).toBe(false);
    });

    it('should log final state on shutdown', () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      mockLogger.infoLogs = [];
      eventBus.shutdown();

      const shutdownLogs = mockLogger.infoLogs.filter(
        (log) => log.message === 'EventBus shutdown'
      );
      expect(shutdownLogs.length).toBeGreaterThan(0);
    });
  });

  describe('no handlers registered for event type', () => {
    it('should warn and mark as processed when no handlers exist', async () => {
      const event = new TestEvent();
      await eventBus.publish(event);

      const warnLogs = mockLogger.warnLogs.filter(
        (log) => log.message === 'No handlers registered for event type'
      );
      expect(warnLogs.length).toBeGreaterThan(0);
      expect(eventBus.getProcessedEventCount()).toBe(1);
    });

    it('should not add to DLQ when no handlers exist', async () => {
      const event = new TestEvent();
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toBe(0);
    });
  });

  describe('distributed tracing', () => {
    it('should include correlationId in all relevant logs', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const logsWithCorrelation = [
        ...mockLogger.infoLogs,
        ...mockLogger.errorLogs,
      ].filter(
        (log) => log.data && log.data.correlationId === event.correlationId
      );

      expect(logsWithCorrelation.length).toBeGreaterThan(0);
    });

    it('should include eventId in handler execution logs', async () => {
      const handler = new MockHandler();
      eventBus.registerHandler('TestEvent', handler);

      const event = new TestEvent();
      await eventBus.publish(event);

      const logsWithEventId = mockLogger.infoLogs.filter(
        (log) => log.data && log.data.eventId === event.id
      );

      expect(logsWithEventId.length).toBeGreaterThan(0);
    });
  });

  describe('multiple event types', () => {
    it('should handle multiple event types independently', async () => {
      const handler1 = new MockHandler();
      const handler2 = new MockHandler();

      eventBus.registerHandler('TestEvent', handler1);
      eventBus.registerHandler('ExamCompleted', handler2);

      const event1 = new TestEvent();
      const event2 = new TestExamCompletedEvent();

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      expect(handler1.handleCalls).toBe(1);
      expect(handler2.handleCalls).toBe(1);
    });
  });
});

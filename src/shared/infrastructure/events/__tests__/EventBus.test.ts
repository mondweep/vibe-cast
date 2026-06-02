/**
 * EventBus.test.ts
 *
 * Unit tests for EventBus pub/sub and dead-letter queue
 * Testing Strategy: London School (mocks at boundaries)
 */

import { EventBus, DeadLetterEvent } from '../EventBus';
import { DomainEvent, EventMetadata } from '../DomainEvent';

/**
 * Test event class
 */
class TestEvent extends DomainEvent {
  readonly eventType = 'TestEvent';
  readonly version = 'v1';
  readonly domain = 'Testing';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    metadata: EventMetadata,
    readonly testData: string,
  ) {
    super(aggregateId, aggregateVersion, metadata);
  }

  static fromJSON(json: any): TestEvent {
    return new TestEvent(
      json.aggregateId,
      json.aggregateVersion,
      json.metadata,
      json.testData,
    );
  }
}

describe('EventBus', () => {
  let eventBus: EventBus;
  let metadata: EventMetadata;

  beforeEach(() => {
    eventBus = new EventBus();
    metadata = {
      correlationId: 'test-correlation-123',
      userId: 'user-456',
    };
  });

  describe('publish and subscribe', () => {
    it('should deliver published event to subscribers', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should deliver to multiple subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('TestEvent', handler2);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should not deliver to unrelated subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('OtherEvent', handler2);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle async handlers', async () => {
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should stop delivering after unsubscribe', async () => {
      const handler = jest.fn();
      const subId = eventBus.subscribe('TestEvent', handler);

      eventBus.unsubscribe(subId);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('should reject duplicate events by ID', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');

      await eventBus.publish(event);
      await eventBus.publish(event); // Same event, same ID

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should catch handler errors and add to DLQ', async () => {
      const error = new Error('Handler failed');
      const handler = jest.fn().mockRejectedValue(error);

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      expect(dlq.length).toEqual(1);
      expect(dlq[0].error).toContain('Handler failed');
      expect(dlq[0].eventId).toEqual(event.getId());
    });

    it('should not let one handler failure block other handlers', async () => {
      const handler1 = jest.fn().mockRejectedValue(new Error('Failed'));
      const handler2 = jest.fn();

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('TestEvent', handler2);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled(); // Should still be called despite handler1 failure
    });

    it('should include stack trace in DLQ event', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      expect(dlq[0].stack).toBeDefined();
    });
  });

  describe('dead-letter queue', () => {
    it('should store failed event in DLQ', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      expect(dlq.length).toEqual(1);
      expect(dlq[0].eventId).toEqual(event.getId());
      expect(dlq[0].event).toEqual(event);
    });

    it('should track retry count and last retry time', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Failed'));
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      const dlq = eventBus.getDeadLetterQueue();
      expect(dlq[0].retryCount).toEqual(0);
      expect(dlq[0].lastRetryAt).toBeUndefined();

      // After retry attempt
      await eventBus.retry(dlq[0].id);
      const dlqAfterRetry = eventBus.getDeadLetterQueue();
      expect(dlqAfterRetry[0].retryCount).toBeGreaterThanOrEqual(1);
    });

    it('should clear DLQ', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Failed'));
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toEqual(1);

      eventBus.clearDeadLetterQueue();

      expect(eventBus.getDeadLetterQueueSize()).toEqual(0);
    });

    it('should get DLQ size', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Failed'));
      eventBus.subscribe('TestEvent', handler);

      const event1 = new TestEvent('agg-1', 1, metadata, 'test');
      const event2 = new TestEvent('agg-2', 1, metadata, 'test');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      expect(eventBus.getDeadLetterQueueSize()).toEqual(2);
    });
  });

  describe('retry', () => {
    it('should retry failed event from DLQ', async () => {
      let callCount = 0;
      const handler = jest.fn(async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('First attempt fails');
        }
      });

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      expect(eventBus.getDeadLetterQueueSize()).toEqual(1);

      const dlqEvent = eventBus.getDeadLetterQueue()[0];
      const success = await eventBus.retry(dlqEvent.id);

      expect(success).toEqual(true);
      expect(eventBus.getDeadLetterQueueSize()).toEqual(0); // Removed from DLQ
    });

    it('should return false if retry fails', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Always fails'));
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      const dlqEvent = eventBus.getDeadLetterQueue()[0];
      const success = await eventBus.retry(dlqEvent.id);

      expect(success).toEqual(false);
      expect(eventBus.getDeadLetterQueueSize()).toEqual(1); // Still in DLQ
    });

    it('should return false if DLQ event not found', async () => {
      const success = await eventBus.retry('nonexistent-dlq-id');
      expect(success).toEqual(false);
    });

    it('should increment retry count on failed retry', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Always fails'));
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      let dlqEvent = eventBus.getDeadLetterQueue()[0];
      expect(dlqEvent.retryCount).toEqual(0);

      await eventBus.retry(dlqEvent.id);

      dlqEvent = eventBus.getDeadLetterQueue()[0];
      expect(dlqEvent.retryCount).toEqual(1);
    });

    it('should exceed max retries', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Always fails'));
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test data');
      await eventBus.publish(event);

      let dlqEvent = eventBus.getDeadLetterQueue()[0];

      // Retry more than max retries (max is 3)
      for (let i = 0; i < 5; i++) {
        await eventBus.retry(dlqEvent.id);
        dlqEvent = eventBus.getDeadLetterQueue()[0];
      }

      expect(dlqEvent.retryCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('metrics and health', () => {
    it('should track processed event count', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      const event1 = new TestEvent('agg-1', 1, metadata, 'test1');
      const event2 = new TestEvent('agg-2', 1, metadata, 'test2');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      expect(eventBus.getProcessedEventCount()).toEqual(2);
    });

    it('should track subscription count', () => {
      expect(eventBus.getSubscriptionCount()).toEqual(0);

      eventBus.subscribe('TestEvent', async () => {});
      expect(eventBus.getSubscriptionCount()).toEqual(1);

      eventBus.subscribe('TestEvent', async () => {});
      expect(eventBus.getSubscriptionCount()).toEqual(2);

      eventBus.subscribe('OtherEvent', async () => {});
      expect(eventBus.getSubscriptionCount()).toEqual(3);
    });

    it('should report health as healthy when DLQ is small', async () => {
      expect(eventBus.isHealthy()).toEqual(true);
    });

    it('should report health as unhealthy when DLQ overflows', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Failed'));
      eventBus.subscribe('TestEvent', handler);

      // Add many failed events to DLQ
      for (let i = 0; i < 1001; i++) {
        const event = new TestEvent(`agg-${i}`, 1, metadata, 'test');
        await eventBus.publish(event);
      }

      expect(eventBus.isHealthy()).toEqual(false);
    });
  });

  describe('no subscribers', () => {
    it('should handle events with no subscribers gracefully', async () => {
      const event = new TestEvent('agg-1', 1, metadata, 'test data');

      // Should not throw
      await expect(eventBus.publish(event)).resolves.toBeUndefined();

      expect(eventBus.getDeadLetterQueueSize()).toEqual(0);
    });
  });
});

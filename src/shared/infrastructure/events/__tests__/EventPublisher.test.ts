/**
 * EventPublisher.test.ts
 *
 * Unit tests for EventPublisher service
 * Testing Strategy: London School (mocks at boundaries)
 */

import {
  EventPublisher,
  EventSourcedAggregate,
  PublishOptions,
} from '../EventPublisher';
import { EventBus } from '../EventBus';
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
    readonly data: string,
  ) {
    super(aggregateId, aggregateVersion, metadata);
  }

  static fromJSON(json: any): TestEvent {
    return new TestEvent(
      json.aggregateId,
      json.aggregateVersion,
      json.metadata,
      json.data,
    );
  }
}

/**
 * Mock aggregate for testing
 */
class MockAggregate implements EventSourcedAggregate {
  private unpublishedEvents: DomainEvent[] = [];
  private version = 1;

  constructor(private id: string) {}

  getId(): string {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  addEvent(event: DomainEvent): void {
    this.unpublishedEvents.push(event);
    this.version++;
  }

  getUnpublishedEvents(): DomainEvent[] {
    return [...this.unpublishedEvents];
  }

  clearUnpublishedEvents(): void {
    this.unpublishedEvents = [];
  }
}

describe('EventPublisher', () => {
  let eventBus: EventBus;
  let publisher: EventPublisher;
  let aggregate: MockAggregate;
  let metadata: EventMetadata;

  beforeEach(() => {
    eventBus = new EventBus();
    publisher = new EventPublisher(eventBus);
    aggregate = new MockAggregate('agg-1');
    metadata = {
      correlationId: 'test-correlation-123',
      userId: 'user-456',
    };
  });

  describe('publishEventsFrom', () => {
    it('should publish all unpublished events from aggregate', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      const event1 = new TestEvent('agg-1', 1, metadata, 'event1');
      const event2 = new TestEvent('agg-1', 2, metadata, 'event2');

      aggregate.addEvent(event1);
      aggregate.addEvent(event2);

      const count = await publisher.publishEventsFrom(aggregate);

      expect(count).toEqual(2);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should clear unpublished events after publishing', async () => {
      const event = new TestEvent('agg-1', 1, metadata, 'event1');
      aggregate.addEvent(event);

      expect(aggregate.getUnpublishedEvents().length).toEqual(1);

      await publisher.publishEventsFrom(aggregate);

      expect(aggregate.getUnpublishedEvents().length).toEqual(0);
    });

    it('should return 0 if no unpublished events', async () => {
      const count = await publisher.publishEventsFrom(aggregate);

      expect(count).toEqual(0);
    });

    it('should enrich events with correlation ID', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const correlationId = 'custom-correlation-123';
      const event = new TestEvent('agg-1', 1, metadata, 'event1');
      aggregate.addEvent(event);

      await publisher.publishEventsFrom(aggregate, { correlationId });

      expect(publishedEvents[0].metadata.correlationId).toEqual(
        correlationId,
      );
    });

    it('should enrich events with user ID', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const userId = 'user-789';
      const event = new TestEvent('agg-1', 1, metadata, 'event1');
      aggregate.addEvent(event);

      await publisher.publishEventsFrom(aggregate, { userId });

      expect(publishedEvents[0].metadata.userId).toEqual(userId);
    });

    it('should preserve existing metadata', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const existingMetadata: EventMetadata = {
        correlationId: 'existing-123',
        userId: 'existing-user',
      };
      const event = new TestEvent('agg-1', 1, existingMetadata, 'event1');
      aggregate.addEvent(event);

      // Should preserve existing metadata if not overridden
      await publisher.publishEventsFrom(aggregate, {});

      expect(publishedEvents[0].metadata.userId).toEqual('existing-user');
    });

    it('should support causation ID', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const causationId = 'command-123';
      const event = new TestEvent('agg-1', 1, metadata, 'event1');
      aggregate.addEvent(event);

      await publisher.publishEventsFrom(aggregate, { causationId });

      expect(publishedEvents[0].metadata.causationId).toEqual(causationId);
    });

    it('should maintain event order', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const event1 = new TestEvent('agg-1', 1, metadata, 'first');
      const event2 = new TestEvent('agg-1', 2, metadata, 'second');
      const event3 = new TestEvent('agg-1', 3, metadata, 'third');

      aggregate.addEvent(event1);
      aggregate.addEvent(event2);
      aggregate.addEvent(event3);

      await publisher.publishEventsFrom(aggregate);

      expect((publishedEvents[0] as TestEvent).data).toEqual('first');
      expect((publishedEvents[1] as TestEvent).data).toEqual('second');
      expect((publishedEvents[2] as TestEvent).data).toEqual('third');
    });

    it('should be idempotent', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'event1');
      aggregate.addEvent(event);

      await publisher.publishEventsFrom(aggregate);
      expect(handler).toHaveBeenCalledTimes(1);

      // Second call should publish nothing (events cleared)
      await publisher.publishEventsFrom(aggregate);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should generate correlation ID if not provided', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const event = new TestEvent('agg-1', 1, metadata, 'event1');
      aggregate.addEvent(event);

      await publisher.publishEventsFrom(aggregate, {});

      expect(publishedEvents[0].metadata.correlationId).toBeDefined();
      expect(publishedEvents[0].metadata.correlationId.length).toBeGreaterThan(
        0,
      );
    });
  });

  describe('publishEvent (direct)', () => {
    it('should publish a single event directly', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'direct event');

      await publisher.publishEvent(event, {});

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should enrich metadata on direct publish', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const event = new TestEvent('agg-1', 1, metadata, 'direct event');
      const userId = 'direct-user';

      await publisher.publishEvent(event, { userId });

      expect(publishedEvents[0].metadata.userId).toEqual(userId);
    });
  });

  describe('getEventBus', () => {
    it('should return the underlying EventBus', () => {
      const bus = publisher.getEventBus();

      expect(bus).toBe(eventBus);
    });

    it('should allow direct subscription on returned bus', async () => {
      const bus = publisher.getEventBus();
      const handler = jest.fn();

      bus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 1, metadata, 'test');
      await bus.publish(event);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('should publish events after aggregate state change', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      // Simulate domain operation
      const event = new TestEvent('agg-1', 1, metadata, 'new enrollment');
      aggregate.addEvent(event);

      // Publish after state persisted
      await publisher.publishEventsFrom(aggregate);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle multiple events in single publish', async () => {
      const handler = jest.fn();
      eventBus.subscribe('TestEvent', handler);

      // Multiple events from one operation
      const event1 = new TestEvent('agg-1', 1, metadata, 'event1');
      const event2 = new TestEvent('agg-1', 2, metadata, 'event2');

      aggregate.addEvent(event1);
      aggregate.addEvent(event2);

      await publisher.publishEventsFrom(aggregate);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should maintain causation chain with correlation ID', async () => {
      const publishedEvents: DomainEvent[] = [];
      eventBus.subscribe('TestEvent', async (event) => {
        publishedEvents.push(event);
      });

      const correlationId = 'workflow-123';
      const causationId = 'command-456';

      const event1 = new TestEvent('agg-1', 1, metadata, 'event1');
      aggregate.addEvent(event1);

      await publisher.publishEventsFrom(aggregate, {
        correlationId,
        causationId,
      });

      expect(publishedEvents[0].metadata.correlationId).toEqual(correlationId);
      expect(publishedEvents[0].metadata.causationId).toEqual(causationId);
    });
  });
});

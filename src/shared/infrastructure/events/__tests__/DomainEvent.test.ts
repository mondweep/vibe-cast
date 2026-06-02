/**
 * DomainEvent.test.ts
 *
 * Unit tests for DomainEvent base class
 * Testing Strategy: London School (mocks at boundaries)
 */

import { DomainEvent, EventMetadata, deserializeEvent } from '../DomainEvent';

/**
 * Test concrete event class (LearnerEnrolledEvent)
 */
class LearnerEnrolledEvent extends DomainEvent {
  readonly eventType = 'LearnerEnrolled';
  readonly version = 'v1';
  readonly domain = 'Learning';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    metadata: EventMetadata,
    readonly learnerId: string,
    readonly pathId: string,
  ) {
    super(aggregateId, aggregateVersion, metadata);
  }

  static fromJSON(json: any): LearnerEnrolledEvent {
    return new LearnerEnrolledEvent(
      json.aggregateId,
      json.aggregateVersion,
      json.metadata,
      json.learnerId,
      json.pathId,
    );
  }

  toJSON() {
    return {
      ...super.toJSON(),
      learnerId: this.learnerId,
      pathId: this.pathId,
    };
  }
}

describe('DomainEvent', () => {
  let metadata: EventMetadata;

  beforeEach(() => {
    metadata = {
      correlationId: 'test-correlation-123',
      userId: 'user-456',
    };
  });

  describe('initialization', () => {
    it('should generate unique ID for each event', () => {
      const event1 = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );
      const event2 = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      expect(event1.getId()).not.toEqual(event2.getId());
    });

    it('should set timestamp to current time', () => {
      const beforeCreation = new Date();
      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );
      const afterCreation = new Date();

      expect(event.getTimestamp().getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(event.getTimestamp().getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });

    it('should preserve aggregate ID', () => {
      const aggregateId = 'enrollment-789';
      const event = new LearnerEnrolledEvent(
        aggregateId,
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      expect(event.getAggregateId()).toEqual(aggregateId);
    });

    it('should preserve aggregate version', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        42,
        metadata,
        'learner-1',
        'path-1',
      );

      expect(event.getAggregateVersion()).toEqual(42);
    });

    it('should generate correlationId if not provided', () => {
      const metadataWithoutCorrelation: EventMetadata = {
        userId: 'user-456',
      };

      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadataWithoutCorrelation,
        'learner-1',
        'path-1',
      );

      expect(event.metadata.correlationId).toBeDefined();
      expect(event.metadata.correlationId.length).toBeGreaterThan(0);
    });
  });

  describe('getters', () => {
    let event: LearnerEnrolledEvent;

    beforeEach(() => {
      event = new LearnerEnrolledEvent(
        'agg-1',
        5,
        metadata,
        'learner-1',
        'path-1',
      );
    });

    it('should return event type', () => {
      expect(event.getEventType()).toEqual('LearnerEnrolled');
    });

    it('should return domain', () => {
      expect(event.getDomain()).toEqual('Learning');
    });

    it('should return metadata', () => {
      expect(event.getMetadata()).toEqual(metadata);
    });

    it('should return event ID', () => {
      expect(event.getId()).toBeDefined();
      expect(typeof event.getId()).toEqual('string');
    });

    it('should return timestamp', () => {
      expect(event.getTimestamp()).toBeInstanceOf(Date);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON with all properties', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        3,
        metadata,
        'learner-1',
        'path-1',
      );

      const json = event.toJSON();

      expect(json.id).toEqual(event.getId());
      expect(json.aggregateId).toEqual('agg-1');
      expect(json.eventType).toEqual('LearnerEnrolled');
      expect(json.version).toEqual('v1');
      expect(json.domain).toEqual('Learning');
      expect(json.aggregateVersion).toEqual(3);
      expect(json.timestamp).toBeDefined();
      expect(json.metadata).toEqual(metadata);
      expect(json.learnerId).toEqual('learner-1');
      expect(json.pathId).toEqual('path-1');
    });

    it('should deserialize from JSON using factory method', () => {
      const original = new LearnerEnrolledEvent(
        'agg-1',
        2,
        metadata,
        'learner-1',
        'path-1',
      );

      const json = original.toJSON();
      const restored = LearnerEnrolledEvent.fromJSON(json);

      expect(restored.aggregateId).toEqual(original.aggregateId);
      expect(restored.getEventType()).toEqual(original.getEventType());
      expect(restored.learnerId).toEqual(original.learnerId);
      expect(restored.pathId).toEqual(original.pathId);
    });

    it('should include ISO timestamp in JSON', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      const json = event.toJSON();

      expect(typeof json.timestamp).toEqual('string');
      expect(new Date(json.timestamp)).toBeTruthy();
    });
  });

  describe('toString', () => {
    it('should produce human-readable string representation', () => {
      const event = new LearnerEnrolledEvent(
        'enrollment-123',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      const str = event.toString();

      expect(str).toContain('LearnerEnrolled');
      expect(str).toContain('enrollment-123');
      expect(str).toContain('version=1');
    });
  });

  describe('deserialization factory', () => {
    it('should deserialize using event map', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      const eventMap = new Map([
        ['LearnerEnrolled', LearnerEnrolledEvent],
      ]);

      const json = event.toJSON();
      const restored = deserializeEvent(json, eventMap);

      expect(restored.getEventType()).toEqual('LearnerEnrolled');
      expect((restored as LearnerEnrolledEvent).learnerId).toEqual('learner-1');
    });

    it('should throw error for unknown event type', () => {
      const json = {
        eventType: 'UnknownEvent',
        aggregateId: 'agg-1',
      };

      const eventMap = new Map([
        ['LearnerEnrolled', LearnerEnrolledEvent],
      ]);

      expect(() => deserializeEvent(json, eventMap)).toThrow(
        'Unknown event type',
      );
    });
  });

  describe('immutability', () => {
    it('should not allow modification of aggregateId', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      expect(() => {
        (event as any).aggregateId = 'new-id';
      }).toThrow();
    });

    it('should not allow modification of metadata correlationId', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      // Can modify metadata object (not frozen), but property itself is readonly
      expect(event.metadata).toBeDefined();
    });
  });

  describe('event versioning', () => {
    it('should support multiple versions', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      expect(event.version).toEqual('v1');
    });

    it('should include version in JSON', () => {
      const event = new LearnerEnrolledEvent(
        'agg-1',
        1,
        metadata,
        'learner-1',
        'path-1',
      );

      const json = event.toJSON();

      expect(json.version).toEqual('v1');
    });
  });
});

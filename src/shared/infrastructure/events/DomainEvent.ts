/**
 * DomainEvent.ts
 *
 * Abstract base class for all domain events in the Vibe-Cast system.
 * Implements the Domain Event pattern from Event-Driven Architecture.
 *
 * Constraints:
 * - All events must be immutable (readonly properties)
 * - Events must have unique IDs for idempotency
 * - Events include version for schema evolution (v1, v2, etc.)
 * - Timestamps in UTC ISO-8601 format
 * - aggregateId enables event sourcing & audit trails
 *
 * Week 9 Deliverable: Core event infrastructure for all domains
 * Event Versioning Strategy: v1 namespace for Week 9 events
 * Upgrade Path: v2 namespace in Week 10 if schema changes needed
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Represents metadata about an event's source and origin
 */
export interface EventMetadata {
  /** User ID who triggered this event (if applicable) */
  userId?: string;

  /** Correlation ID for tracing related events across domains */
  correlationId: string;

  /** Causation ID: ID of command that caused this event */
  causationId?: string;

  /** IP address of request origin (for audit trail) */
  ipAddress?: string;

  /** User agent of request origin (for audit trail) */
  userAgent?: string;
}

/**
 * Abstract base class for all domain events
 *
 * Subclasses must:
 * 1. Define event-specific properties as readonly
 * 2. Call super() with aggregateId, eventType, metadata
 * 3. Implement static factory methods for deserialization
 *
 * Example:
 * ```typescript
 * class LearnerEnrolledEvent extends DomainEvent {
 *   readonly eventType = 'LearnerEnrolled';
 *   readonly version = 'v1';
 *
 *   constructor(
 *     aggregateId: string,
 *     readonly learnerId: string,
 *     readonly pathId: string,
 *     readonly enrolledAt: Date,
 *     metadata: EventMetadata,
 *   ) {
 *     super(aggregateId, 'LearnerEnrolled', 'v1', metadata);
 *   }
 *
 *   static fromJSON(json: any): LearnerEnrolledEvent {
 *     return new LearnerEnrolledEvent(
 *       json.aggregateId,
 *       json.learnerId,
 *       json.pathId,
 *       new Date(json.enrolledAt),
 *       json.metadata,
 *     );
 *   }
 * }
 * ```
 */
export abstract class DomainEvent {
  /** Unique ID for this event (for idempotency & deduplication) */
  readonly id: string = uuidv4();

  /** Aggregate (root) that produced this event */
  readonly aggregateId: string;

  /** Event type (e.g., "LearnerEnrolled", "CourseCompleted") */
  abstract readonly eventType: string;

  /** Event schema version (e.g., "v1", "v2") for schema evolution */
  abstract readonly version: string;

  /** UTC timestamp when event occurred */
  readonly timestamp: Date = new Date();

  /** Version of the aggregate at time of event (for ordering) */
  readonly aggregateVersion: number;

  /** Source domain of this event (e.g., "Learning", "Certification") */
  abstract readonly domain: string;

  /** Event metadata (correlation, user info, audit trail) */
  readonly metadata: EventMetadata;

  /**
   * Initialize a domain event
   *
   * @param aggregateId - UUID of aggregate root that produced event
   * @param eventType - Name of event (e.g., "PathCreated")
   * @param version - Schema version (v1, v2, etc.)
   * @param aggregateVersion - Version of aggregate when event occurred
   * @param metadata - Event metadata for tracing & audit
   */
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    metadata: EventMetadata,
  ) {
    this.aggregateId = aggregateId;
    this.aggregateVersion = aggregateVersion;
    this.metadata = metadata;

    // Ensure correlationId always exists (generate if needed)
    if (!this.metadata.correlationId) {
      this.metadata.correlationId = uuidv4();
    }
  }

  /**
   * Get the ID of the aggregate that produced this event
   * Used for: event sourcing, aggregate reconstruction, audit trails
   */
  getAggregateId(): string {
    return this.aggregateId;
  }

  /**
   * Get the type of this event
   * Used for: event routing, subscription filtering, SAGA step matching
   */
  getEventType(): string {
    return this.eventType;
  }

  /**
   * Get the domain this event belongs to
   * Used for: ACL translation, cross-domain routing
   */
  getDomain(): string {
    return this.domain;
  }

  /**
   * Get the version of the aggregate when event was created
   * Used for: detecting concurrent modifications, optimistic locking
   */
  getAggregateVersion(): number {
    return this.aggregateVersion;
  }

  /**
   * Get unique event ID (for idempotency)
   * Used for: deduplication, exactly-once processing
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get event timestamp (UTC)
   * Used for: event ordering, time-series queries
   */
  getTimestamp(): Date {
    return this.timestamp;
  }

  /**
   * Get event metadata
   * Used for: correlation, audit trails, request tracing
   */
  getMetadata(): EventMetadata {
    return this.metadata;
  }

  /**
   * Serialize event to JSON for storage/transmission
   * Base implementation; override in subclasses for custom serialization
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      version: this.version,
      domain: this.domain,
      timestamp: this.timestamp.toISOString(),
      aggregateVersion: this.aggregateVersion,
      metadata: this.metadata,
    };
  }

  /**
   * Create human-readable string representation for logging
   */
  toString(): string {
    return (
      `${this.eventType}(id=${this.id}, aggregateId=${this.aggregateId}, ` +
      `version=${this.aggregateVersion}, timestamp=${this.timestamp.toISOString()})`
    );
  }
}

/**
 * Factory function to deserialize events from JSON
 * Used by EventBus to reconstruct events from storage
 *
 * Example:
 * ```typescript
 * const eventMap = {
 *   'LearnerEnrolled': LearnerEnrolledEvent,
 *   'CourseCompleted': CourseCompletedEvent,
 * };
 * const event = deserializeEvent(json, eventMap);
 * ```
 */
export type EventConstructor<T extends DomainEvent> = {
  fromJSON(json: any): T;
};

export function deserializeEvent<T extends DomainEvent>(
  json: any,
  eventMap: Map<string, EventConstructor<T>>,
): T {
  const EventClass = eventMap.get(json.eventType);
  if (!EventClass) {
    throw new Error(
      `Unknown event type: ${json.eventType}. ` +
      `Registered events: ${Array.from(eventMap.keys()).join(', ')}`,
    );
  }
  return EventClass.fromJSON(json);
}

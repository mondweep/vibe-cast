/**
 * EventPublisher.ts
 *
 * Service for publishing domain events from aggregates with transactional consistency.
 *
 * Core Responsibility:
 * - Collect events produced by aggregates during a business operation
 * - Persist aggregate state changes to database (transactional)
 * - Publish events AFTER domain model state is saved (ensures consistency)
 * - Handle event serialization & metadata enrichment
 *
 * Transaction Pattern:
 * 1. Domain model executes command (modifies state, collects events)
 * 2. Application service calls repository.save(aggregate)
 * 3. Repository saves aggregate state to database (in same transaction)
 * 4. After commit succeeds, EventPublisher.publishEventsFrom(aggregate)
 * 5. EventBus publishes events to subscribers
 *
 * This ensures: if state persists, events will eventually publish
 * (no orphaned events, no state without events)
 */

import { DomainEvent, EventMetadata } from './DomainEvent';
import { EventBus } from './EventBus';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for aggregates that produce domain events
 * All aggregate roots must implement this
 */
export interface EventSourcedAggregate {
  /** Get all unpublished events from this aggregate */
  getUnpublishedEvents(): DomainEvent[];

  /** Clear the unpublished events list (after publishing) */
  clearUnpublishedEvents(): void;

  /** Get the aggregate root ID (for tracing) */
  getId(): string;

  /** Get the current version of this aggregate (for optimistic locking) */
  getVersion(): number;
}

/**
 * Options for publishing events
 */
export interface PublishOptions {
  /** User ID who triggered the operation (for audit trail) */
  userId?: string;

  /** Correlation ID for tracing related events (generated if not provided) */
  correlationId?: string;

  /** IP address of the request (for security audit) */
  ipAddress?: string;

  /** User agent of the request (for security audit) */
  userAgent?: string;

  /** Causation ID: the command/operation ID that caused these events */
  causationId?: string;
}

/**
 * EventPublisher service
 *
 * Publishes domain events to the EventBus with proper metadata & sequencing.
 */
export class EventPublisher {
  /**
   * Initialize the EventPublisher with an EventBus
   *
   * @param eventBus - EventBus instance for publishing
   */
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Publish all unpublished events from an aggregate
   *
   * Flow:
   * 1. Get unpublished events from aggregate
   * 2. For each event, enrich with metadata & publish to bus
   * 3. Clear unpublished events list
   * 4. Return count of events published
   *
   * @param aggregate - Aggregate with unpublished events
   * @param options - Publishing options (userId, correlation ID, etc.)
   * @returns Count of events published
   */
  async publishEventsFrom(
    aggregate: EventSourcedAggregate,
    options: PublishOptions = {},
  ): Promise<number> {
    const events = aggregate.getUnpublishedEvents();

    if (events.length === 0) {
      return 0;
    }

    // Enrich with default metadata if not provided
    const correlationId = options.correlationId || uuidv4();
    const causationId = options.causationId;

    let publishedCount = 0;

    // Publish each event sequentially (maintains ordering per aggregate)
    for (const event of events) {
      await this.publishEvent(event, {
        ...options,
        correlationId,
        causationId,
      });
      publishedCount++;
    }

    // Clear the unpublished events list (idempotency)
    aggregate.clearUnpublishedEvents();

    return publishedCount;
  }

  /**
   * Publish a single event with metadata enrichment
   *
   * @param event - Domain event to publish
   * @param options - Publishing options for metadata
   */
  async publishEvent(
    event: DomainEvent,
    options: PublishOptions = {},
  ): Promise<void> {
    // Enrich metadata - override with options values where provided
    if (options.userId) {
      event.metadata.userId = options.userId;
    }
    if (options.ipAddress) {
      event.metadata.ipAddress = options.ipAddress;
    }
    if (options.userAgent) {
      event.metadata.userAgent = options.userAgent;
    }
    if (options.causationId) {
      event.metadata.causationId = options.causationId;
    }
    if (options.correlationId) {
      event.metadata.correlationId = options.correlationId;
    }

    await this.eventBus.publish(event);

    console.debug(
      `[EventPublisher] Published event: ${event.eventType} ` +
      `(correlationId=${event.metadata.correlationId})`,
    );
  }

  /**
   * Get the underlying EventBus instance
   * Used for subscription management in application services
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }
}

/**
 * Event Publishing Hook for Repositories
 */
export interface EventPublishingHook {
  /**
   * Called after repository operation succeeds
   * Publishes any events that were generated
   */
  publishEvents(
    aggregate: EventSourcedAggregate,
    options?: PublishOptions,
  ): Promise<void>;
}

/**
 * Outbox Pattern Helper (for future RabbitMQ upgrade)
 */
export interface OutboxEvent {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, any>;
  publishedAt?: Date;
  createdAt: Date;
}

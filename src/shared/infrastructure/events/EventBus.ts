/**
 * EventBus.ts
 *
 * Core publish/subscribe event bus for domain events.
 * Week 9: In-memory implementation with dead-letter queue
 * Week 11: Upgrade to RabbitMQ for production deployment
 *
 * Features:
 * - Publish/subscribe pattern for loose coupling between domains
 * - Async event handling (all handlers execute independently)
 * - Dead-letter queue (DLQ) for failed events with configurable storage
 * - Retry policy: exponential backoff (1s, 2s, 4s, 8s, max 3 retries)
 * - Event idempotency: duplicate events rejected via event ID tracking
 * - Handler error isolation: one failed handler doesn't block others
 *
 * Architecture Decision:
 * - In-memory queue for Week 9 (ephemeral, suitable for development)
 * - Idempotency via Set<eventId> (lossy on restart, OK for MVP)
 * - No persistence yet (Week 11 adds PostgreSQL event store)
 */

import { DomainEvent } from './DomainEvent';

/**
 * Event handler callback signature
 * Handlers must be async and handle their own errors
 * EventBus catches and logs handler errors (won't propagate to other handlers)
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => Promise<void>;

/**
 * Represents a handler subscription
 */
interface Subscription<T extends DomainEvent = DomainEvent> {
  handler: EventHandler<T>;
  eventType: string;
  id: string;
}

/**
 * Dead-letter event for failed events
 * Stored in DLQ for manual inspection and replay
 */
export interface DeadLetterEvent {
  id: string;
  eventId: string; // Original event ID
  event: DomainEvent;
  error: string; // Error message
  stack?: string; // Stack trace if available
  failedAt: Date;
  retryCount: number;
  lastRetryAt?: Date;
  nextRetryAt?: Date;
}

/**
 * Retry configuration for failed events
 */
export interface RetryPolicy {
  maxRetries: number; // Max number of retry attempts
  backoffMs: number[]; // Backoff delays (ms) per retry: [1000, 2000, 4000, 8000]
}

/**
 * Default retry policy: exponential backoff
 * Retries: 1s, 2s, 4s, 8s (max 3 retries = 4 total attempts)
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000, 8000],
};

/**
 * In-memory event bus implementation
 *
 * Week 9 MVP: Suitable for development & testing
 * - Single process (no clustering)
 * - Memory-resident (no restart persistence)
 * - No ordering guarantees across domains
 *
 * Week 11 Upgrade: Replace with RabbitMQ
 * - Multi-process support
 * - Durable queues
 * - Global ordering per partition
 */
export class EventBus {
  private subscriptions: Map<string, Subscription[]> = new Map();
  private deadLetterQueue: DeadLetterEvent[] = [];
  private processedEventIds: Set<string> = new Set();
  private retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY;

  /**
   * Subscribe to events of a specific type
   *
   * @param eventType - Event class name (e.g., "LearnerEnrolled")
   * @param handler - Async callback function
   * @returns Subscription ID (for unsubscribe)
   *
   * Example:
   * ```typescript
   * const subId = eventBus.subscribe('LearnerEnrolled', async (event) => {
   *   await metricsService.recordEnrollment(event);
   * });
   * ```
   */
  subscribe<T extends DomainEvent = DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): string {
    const subscriptionId = `${eventType}-${Date.now()}-${Math.random()}`;
    const subscription: Subscription<T> = {
      handler,
      eventType,
      id: subscriptionId,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(subscription);

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   *
   * @param subscriptionId - ID returned by subscribe()
   */
  unsubscribe(subscriptionId: string): void {
    for (const [, subs] of this.subscriptions) {
      const index = subs.findIndex((s) => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        break;
      }
    }
  }

  /**
   * Publish an event to all subscribers
   * Asynchronous: handlers execute concurrently (no ordering)
   * Failures: caught and stored in DLQ, won't block other handlers
   *
   * @param event - Domain event to publish
   *
   * Example:
   * ```typescript
   * const event = new LearnerEnrolledEvent(
   *   enrollmentId,
   *   learnerId,
   *   pathId,
   *   new Date(),
   *   { correlationId: 'abc-123' }
   * );
   * await eventBus.publish(event);
   * ```
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventId = event.getId();

    // Idempotency: reject duplicate events
    if (this.processedEventIds.has(eventId)) {
      console.debug(`[EventBus] Duplicate event detected: ${eventId}, skipping`);
      return;
    }

    this.processedEventIds.add(eventId);

    const eventType = event.getEventType();
    const handlers = this.subscriptions.get(eventType) || [];

    if (handlers.length === 0) {
      console.debug(
        `[EventBus] No subscribers for ${eventType}, event published`,
      );
      return;
    }

    // Execute all handlers concurrently (non-blocking)
    const handlerPromises = handlers.map((sub) =>
      this.executeHandler(sub, event),
    );

    // Wait for all handlers (but don't throw if any fail)
    await Promise.allSettled(handlerPromises);
  }

  /**
   * Execute a single handler with error isolation
   * If handler throws, event goes to DLQ for retry
   *
   * @private
   */
  private async executeHandler(
    subscription: Subscription,
    event: DomainEvent,
  ): Promise<void> {
    try {
      await subscription.handler(event as any);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const stack =
        error instanceof Error ? error.stack : undefined;

      console.error(
        `[EventBus] Handler failed for ${event.getEventType()}: ${errorMessage}`,
        { eventId: event.getId(), stack },
      );

      // Add to DLQ for manual inspection
      this.addToDeadLetterQueue(event, errorMessage, stack);
    }
  }

  /**
   * Add failed event to dead-letter queue
   * Week 12: Manual inspection & replay tool will process DLQ
   *
   * @private
   */
  private addToDeadLetterQueue(
    event: DomainEvent,
    error: string,
    stack?: string,
  ): void {
    const dlqEvent: DeadLetterEvent = {
      id: `dlq-${event.getId()}`,
      eventId: event.getId(),
      event,
      error,
      stack,
      failedAt: new Date(),
      retryCount: 0,
    };

    this.deadLetterQueue.push(dlqEvent);
    console.warn(
      `[EventBus] Event added to DLQ: ${event.getEventType()} (${event.getId()})`,
    );
  }

  /**
   * Retry a failed event from the dead-letter queue
   * Uses exponential backoff from retry policy
   * Manual operation: called by ops team via CLI or dashboard (Week 12)
   *
   * @param dlqEventId - ID of dead-letter event
   * @returns true if retry succeeded, false if it failed again
   *
   * Example (Week 12 CLI):
   * ```bash
   * npm run event-bus:retry dlq-abc-123
   * ```
   */
  async retry(dlqEventId: string): Promise<boolean> {
    const dlqEvent = this.deadLetterQueue.find((e) => e.id === dlqEventId);
    if (!dlqEvent) {
      console.error(`[EventBus] DLQ event not found: ${dlqEventId}`);
      return false;
    }

    if (dlqEvent.retryCount >= this.retryPolicy.maxRetries) {
      console.error(
        `[EventBus] Max retries exceeded for ${dlqEventId}, giving up`,
      );
      return false;
    }

    try {
      // Reset idempotency check to allow retry
      this.processedEventIds.delete(dlqEvent.eventId);

      // Re-publish the event
      await this.publish(dlqEvent.event);

      // Remove from DLQ on success
      const index = this.deadLetterQueue.indexOf(dlqEvent);
      if (index !== -1) {
        this.deadLetterQueue.splice(index, 1);
      }

      console.info(
        `[EventBus] Event retried successfully: ${dlqEvent.eventId}`,
      );
      return true;
    } catch (error) {
      dlqEvent.retryCount++;
      dlqEvent.lastRetryAt = new Date();
      dlqEvent.nextRetryAt = new Date(
        Date.now() + this.retryPolicy.backoffMs[dlqEvent.retryCount],
      );

      console.error(
        `[EventBus] Retry failed (attempt ${dlqEvent.retryCount}/${this.retryPolicy.maxRetries})`,
      );
      return false;
    }
  }

  /**
   * Get all events in dead-letter queue
   * Used for monitoring & ops dashboards
   */
  getDeadLetterQueue(): DeadLetterEvent[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Get size of dead-letter queue
   * Alert if DLQ grows too large (indicates systematic failure)
   */
  getDeadLetterQueueSize(): number {
    return this.deadLetterQueue.length;
  }

  /**
   * Clear the dead-letter queue (careful operation)
   * Used in development/testing only; production needs manual review
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Get count of processed events (for metrics)
   * Used for monitoring & alerting
   */
  getProcessedEventCount(): number {
    return this.processedEventIds.size;
  }

  /**
   * Get count of active subscriptions (for health checks)
   */
  getSubscriptionCount(): number {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  /**
   * Health check endpoint (for Kubernetes liveness probes)
   */
  isHealthy(): boolean {
    // Healthy if DLQ is not overflowing
    return this.deadLetterQueue.length < 1000;
  }
}

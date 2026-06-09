import { DomainEvent } from '../../domain/DomainEvent';
import { EventHandler } from '../../domain/EventHandler';

/**
 * Dead Letter Event - event that failed processing
 */
export interface DeadLetterEvent {
  id: string;
  eventId: string;
  eventName: string;
  event: DomainEvent;
  retryCount: number;
  error: string;
  stack?: string;
  scheduledRetryAt: Date;
  firstFailedAt: Date;
  lastRetryAt?: Date;
}

/**
 * IEventBus Interface - contract for event publishing and subscription
 *
 * Implemented by:
 * - InMemoryEventBus (Weeks 9-13)
 * - RabbitMQEventBus (Week 14+)
 *
 * Provides:
 * - Handler registration/unsubscription
 * - Event publishing with idempotency
 * - Error isolation via Dead Letter Queue
 * - Exponential backoff retry mechanism
 * - Health monitoring and statistics
 */
export interface IEventBus {
  /**
   * Publish an event to all registered handlers
   *
   * Features:
   * - Idempotency check via event ID
   * - Error isolation (handler failure does not crash bus)
   * - DLQ fallback on handler error
   * - Correlation ID tracing
   *
   * @param event Domain event to publish
   * @throws Never throws - failures added to DLQ
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Subscribe a handler for a specific event type (supports plain functions)
   *
   * @param eventType Event name to subscribe to (e.g., 'EnrollmentCompleted')
   * @param handler Event handler (plain function or EventHandler)
   * @returns Unique subscription ID for later unsubscription
   */
  subscribe(
    eventType: string,
    handler: EventHandler | ((event: any) => void | Promise<void>)
  ): string;

  /**
   * Register a typed event handler for a specific event type
   *
   * @param eventType Event name to subscribe to (e.g., 'EnrollmentCompleted')
   * @param handler Event handler implementation
   * @returns Unique subscription ID for later unsubscription
   */
  registerHandler(
    eventType: string,
    handler: EventHandler
  ): string;

  /**
   * Unregister a handler
   *
   * @param subscriptionId Subscription ID from subscribe()
   */
  unsubscribe(subscriptionId: string): void;

  /**
   * Retry a dead-lettered event
   * Used by DLQ retry scheduler for exponential backoff
   *
   * @param dlqEventId Dead letter event ID
   * @returns true if retry successful, false if max retries exceeded
   */
  retry(dlqEventId: string): Promise<boolean>;

  /**
   * Get all dead-lettered events
   * Events that failed all handler attempts
   *
   * @returns Array of failed events with retry metadata
   */
  getDeadLetterQueue(): DeadLetterEvent[];

  /**
   * Get dead-letter queue size
   * Used for health monitoring
   *
   * @returns Number of events in DLQ
   */
  getDeadLetterQueueSize(): number;

  /**
   * Clear the dead-letter queue
   * Used for operational maintenance
   */
  clearDeadLetterQueue(): void;

  /**
   * Get count of successfully processed events
   * Used for metrics and health checks
   *
   * @returns Number of events published without errors
   */
  getProcessedEventCount(): number;

  /**
   * Get count of active subscriptions
   * Used for health monitoring
   *
   * @returns Number of registered handlers
   */
  getSubscriptionCount(): number;

  /**
   * Health check
   * Returns true if bus is operating normally
   *
   * Considers:
   * - DLQ size (should be small)
   * - Active handlers (should be > 0)
   * - Recent scheduler errors (none)
   *
   * @returns true if healthy, false if degraded
   */
  isHealthy(): boolean;
}

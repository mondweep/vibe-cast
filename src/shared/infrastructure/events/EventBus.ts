import { DomainEvent } from '../../domain/DomainEvent';
import { EventHandler } from '../../domain/EventHandler';
import { Logger, ConsoleLogger } from '../logging/Logger';
import { IEventBus } from './IEventBus';
import { v4 as uuidv4 } from 'uuid';

/**
 * Dead Letter Event - event that failed processing
 * Exported directly from EventBus for convenience
 */
export interface DeadLetterEvent {
  id: string;           // Unique DLQ event ID
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
 * EventBus - Central event publishing and handling mechanism
 *
 * Features:
 * - Handler registration and management with subscription IDs
 * - Error isolation (handlers don't crash the bus)
 * - Event idempotency tracking (prevent duplicate handler execution)
 * - Structured logging with correlationId
 * - Dead Letter Queue (DLQ) with exponential backoff retry
 * - DLQRetryScheduler for asynchronous retry attempts
 * - Health monitoring
 *
 * PHASE 1 IMPLEMENTATION:
 * - registerHandler: returns subscriptionId
 * - subscribe: alias that wraps plain functions as handlers
 * - publish: idempotency + error isolation + DLQ fallback
 * - DLQ retry: exponential backoff [1s, 2s, 4s, 8s] with max 3 retries
 * - Correlation ID threading for distributed tracing
 * - No mutation of event objects
 */
export class EventBus implements IEventBus {
  private handlers: Map<string, Map<string, EventHandler>> = new Map();
  private logger: Logger;
  private deadLetterQueue: Map<string, DeadLetterEvent> = new Map();
  private processedEventIds: Set<string> = new Set();
  private processedEventCount: number = 0;
  private dlqRetryScheduler: NodeJS.Timeout | null = null;

  // Exponential backoff delays in milliseconds
  private readonly BACKOFF_DELAYS = [1000, 2000, 4000, 8000]; // 1s, 2s, 4s, 8s
  private readonly MAX_RETRIES = 3;
  private readonly DLQ_RETRY_POLL_INTERVAL = 5000; // Poll every 5 seconds

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger();
    this.startDLQRetryScheduler();
  }

  /**
   * Get the event name from an event object
   * Handles both domain DomainEvent (getEventName()) and infrastructure DomainEvent (eventType)
   */
  private getEventName(event: any): string {
    if (typeof event.getEventName === 'function') {
      return event.getEventName();
    }
    if (typeof event.eventType === 'string') {
      return event.eventType;
    }
    return 'UnknownEvent';
  }

  /**
   * Get the correlationId from an event
   * Handles both domain DomainEvent (event.correlationId) and infrastructure DomainEvent (event.metadata.correlationId)
   */
  private getCorrelationId(event: any): string | undefined {
    if (typeof event.correlationId === 'string') {
      return event.correlationId;
    }
    if (event.metadata && typeof event.metadata.correlationId === 'string') {
      return event.metadata.correlationId;
    }
    return event.correlationId; // may be undefined - return actual value
  }

  /**
   * Subscribe a plain function handler for a specific event type
   * This is an alias for registerHandler that accepts plain functions
   *
   * @param eventType Event name to subscribe to
   * @param handler Plain function handler (event) => void | Promise<void>
   * @returns Unique subscription ID for later unsubscription
   */
  subscribe(eventType: string, handler: (event: any) => void | Promise<void>): string {
    const wrappedHandler: EventHandler = {
      canHandle: () => true,
      handle: async (event: DomainEvent) => {
        await handler(event as any);
      },
    };
    return this.registerHandler(eventType, wrappedHandler);
  }

  /**
   * Register a handler for a specific event type
   * Returns a unique subscription ID for later unsubscription
   */
  registerHandler(eventType: string, handler: EventHandler): string {
    const subscriptionId = uuidv4();

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
    }

    const eventHandlers = this.handlers.get(eventType)!;
    eventHandlers.set(subscriptionId, handler);

    this.logger.info('Handler registered', {
      eventType,
      subscriptionId,
      totalHandlers: eventHandlers.size,
    });

    return subscriptionId;
  }

  /**
   * Unregister a handler by subscription ID
   */
  unsubscribe(subscriptionId: string): void {
    let found = false;
    for (const [eventType, handlers] of this.handlers.entries()) {
      if (handlers.has(subscriptionId)) {
        handlers.delete(subscriptionId);
        found = true;

        this.logger.info('Handler unregistered', {
          eventType,
          subscriptionId,
          remainingHandlers: handlers.size,
        });

        // Clean up empty event type entries
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
        break;
      }
    }

    if (!found) {
      this.logger.warn('Attempted to unsubscribe non-existent handler', {
        subscriptionId,
      });
    }
  }

  /**
   * Publish an event to all registered handlers
   *
   * Workflow:
   * 1. Idempotency check: return if event already processed
   * 2. Get all handlers for event type
   * 3. Execute each handler with error isolation
   * 4. On handler error: add to DLQ with retry metadata
   * 5. On all handlers error: add to DLQ if no handlers exist
   *
   * Error isolation ensures handler failures do not crash bus or prevent
   * other handlers from executing.
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventId = event.id;
    const eventName = this.getEventName(event);
    const correlationId = this.getCorrelationId(event);

    this.logger.info('Publishing event', {
      eventId,
      eventName,
      correlationId,
      timestamp: new Date().toISOString(),
    });

    // IDEMPOTENCY CHECK: if we've seen this event before, skip it
    if (this.processedEventIds.has(eventId)) {
      this.logger.info('Skipping duplicate event (already processed)', {
        eventId,
        eventName,
        correlationId,
      });
      return;
    }

    const handlers = this.handlers.get(eventName) || new Map();

    // If no handlers exist, mark as processed and return
    if (handlers.size === 0) {
      this.logger.warn('No handlers registered for event type', {
        eventName,
        eventId,
        correlationId,
      });
      this.processedEventIds.add(eventId);
      this.processedEventCount++;
      return;
    }

    // Execute all handlers with error isolation
    const handlerResults = await Promise.allSettled(
      Array.from(handlers.entries()).map(([subscriptionId, handler]) =>
        this.executeHandlerWithErrorIsolation(
          event,
          handler,
          subscriptionId,
          eventName,
          correlationId
        )
      )
    );

    // Check if all handlers failed
    const allFailed = handlerResults.every(
      (result) => result.status === 'rejected'
    );

    if (allFailed) {
      this.logger.error('All handlers failed for event', {
        eventId,
        eventName,
        correlationId,
        handlerCount: handlers.size,
      });

      // Collect all error messages
      const errors = handlerResults
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason instanceof Error ? r.reason.message : String(r.reason));
      const firstError = handlerResults[0].status === 'rejected'
        ? handlerResults[0].reason
        : null;
      const errorMessage = `All registered handlers failed: ${errors.join('; ')}`;
      const errorStack = firstError instanceof Error ? firstError.stack : undefined;

      // Add to DLQ with retry metadata
      this.addToDLQ(event, errorMessage, errorStack);
    } else {
      // At least one handler succeeded
      this.logger.info('Event published successfully', {
        eventId,
        eventName,
        correlationId,
        successCount: handlerResults.filter(
          (r) => r.status === 'fulfilled'
        ).length,
        failureCount: handlerResults.filter((r) => r.status === 'rejected')
          .length,
      });

      // Mark as processed only if at least one handler succeeded
      this.processedEventIds.add(eventId);
      this.processedEventCount++;
    }
  }

  /**
   * Execute a single handler with error isolation
   * Handler failures do not propagate to other handlers
   */
  private async executeHandlerWithErrorIsolation(
    event: DomainEvent,
    handler: EventHandler,
    subscriptionId: string,
    eventName: string,
    correlationId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if handler can handle this event
      if (!handler.canHandle(event)) {
        this.logger.debug('Handler skipped (cannot handle)', {
          subscriptionId,
          eventName,
          eventId: event.id,
          correlationId,
        });
        return;
      }

      // Execute handler
      await handler.handle(event);

      const executionTime = Date.now() - startTime;
      this.logger.info('Handler executed successfully', {
        subscriptionId,
        eventName,
        eventId: event.id,
        correlationId,
        executionTime: `${executionTime}ms`,
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Handler execution failed', {
        subscriptionId,
        eventName,
        eventId: event.id,
        correlationId,
        executionTime: `${executionTime}ms`,
        error: errorMessage,
      });

      // Re-throw to be caught by Promise.allSettled
      throw error;
    }
  }

  /**
   * Retry a dead-lettered event
   * Called by DLQ retry scheduler
   *
   * Returns true if retry successful and event was removed from DLQ
   * Returns false if max retries exceeded (event stays in DLQ for manual intervention)
   */
  async retry(dlqEventId: string): Promise<boolean> {
    const dlqEvent = this.deadLetterQueue.get(dlqEventId);

    if (!dlqEvent) {
      this.logger.warn('DLQ retry: event not found', { dlqEventId });
      return false;
    }

    if (dlqEvent.retryCount >= this.MAX_RETRIES) {
      this.logger.error('DLQ retry: max retries exceeded', {
        dlqEventId,
        retryCount: dlqEvent.retryCount,
        maxRetries: this.MAX_RETRIES,
        eventId: dlqEvent.eventId,
      });
      return false;
    }

    this.logger.info('DLQ retry: attempting retry', {
      dlqEventId,
      retryCount: dlqEvent.retryCount,
      eventId: dlqEvent.eventId,
      eventName: dlqEvent.eventName,
      correlationId: this.getCorrelationId(dlqEvent.event),
    });

    // Clear idempotency check to allow retry
    this.processedEventIds.delete(dlqEvent.eventId);

    // Re-run handlers directly (without going through publish to avoid re-adding to DLQ)
    const eventName = dlqEvent.eventName;
    const handlers = this.handlers.get(eventName) || new Map();

    if (handlers.size === 0) {
      // No handlers - increment retry and return false
      dlqEvent.retryCount++;
      dlqEvent.lastRetryAt = new Date();
      return false;
    }

    const correlationId = this.getCorrelationId(dlqEvent.event);
    const handlerResults = await Promise.allSettled(
      Array.from(handlers.entries()).map(([subscriptionId, handler]) =>
        this.executeHandlerWithErrorIsolation(
          dlqEvent.event,
          handler,
          subscriptionId,
          eventName,
          correlationId
        )
      )
    );

    const allFailed = handlerResults.every(
      (result) => result.status === 'rejected'
    );

    if (allFailed) {
      // Retry failed - increment retry count and stay in DLQ
      dlqEvent.retryCount++;
      dlqEvent.lastRetryAt = new Date();

      this.logger.error('DLQ retry: failed', {
        dlqEventId,
        eventId: dlqEvent.eventId,
        retryCount: dlqEvent.retryCount,
      });

      return false;
    } else {
      // At least one handler succeeded - remove from DLQ
      this.processedEventIds.add(dlqEvent.eventId);
      this.processedEventCount++;
      this.deadLetterQueue.delete(dlqEventId);

      this.logger.info('DLQ retry: successful', {
        dlqEventId,
        eventId: dlqEvent.eventId,
        eventName: dlqEvent.eventName,
      });

      return true;
    }
  }

  /**
   * Add event to dead letter queue with retry metadata
   */
  private addToDLQ(event: DomainEvent, reason: string, stack?: string): void {
    const dlqEventId = uuidv4();
    const dlqEvent: DeadLetterEvent = {
      id: dlqEventId,
      eventId: event.id,
      eventName: this.getEventName(event),
      event, // Store the original event for retry
      retryCount: 0,
      error: reason,
      stack,
      scheduledRetryAt: new Date(
        Date.now() + this.BACKOFF_DELAYS[0] // Schedule first retry
      ),
      firstFailedAt: new Date(),
      lastRetryAt: undefined,
    };

    this.deadLetterQueue.set(dlqEventId, dlqEvent);

    this.logger.error('Event added to Dead Letter Queue', {
      dlqEventId,
      eventId: event.id,
      eventName: this.getEventName(event),
      correlationId: this.getCorrelationId(event),
      reason,
      dlqSize: this.deadLetterQueue.size,
    });
  }

  /**
   * Get dead letter queue contents
   */
  getDeadLetterQueue(): DeadLetterEvent[] {
    return Array.from(this.deadLetterQueue.values());
  }

  /**
   * Get dead letter queue size
   */
  getDeadLetterQueueSize(): number {
    return this.deadLetterQueue.size;
  }

  /**
   * Clear the dead letter queue
   * Use with caution - clears all failed events
   */
  clearDeadLetterQueue(): void {
    const previousSize = this.deadLetterQueue.size;
    this.deadLetterQueue.clear();

    this.logger.info('Dead Letter Queue cleared', {
      clearedCount: previousSize,
    });
  }

  /**
   * Get count of successfully processed events
   */
  getProcessedEventCount(): number {
    return this.processedEventCount;
  }

  /**
   * Get count of active subscriptions (handlers)
   */
  getSubscriptionCount(): number {
    let count = 0;
    for (const handlers of this.handlers.values()) {
      count += handlers.size;
    }
    return count;
  }

  /**
   * Health check
   * Returns true if bus is operating normally
   */
  isHealthy(): boolean {
    const dlqSizeThreshold = 10; // Flag as unhealthy if DLQ >= 10

    const isDLQHealthy = this.deadLetterQueue.size < dlqSizeThreshold;
    const schedulerRunning = this.dlqRetryScheduler !== null;

    const healthy = isDLQHealthy && schedulerRunning;

    if (!healthy) {
      this.logger.warn('EventBus health check failed', {
        dlqSize: this.deadLetterQueue.size,
        dlqSizeThreshold,
        isDLQHealthy,
        subscriberCount: this.getSubscriptionCount(),
        schedulerRunning,
      });
    }

    return healthy;
  }

  /**
   * Start DLQ retry scheduler
   * Polls every 5 seconds for events ready to retry
   * Uses exponential backoff: [1s, 2s, 4s, 8s]
   */
  private startDLQRetryScheduler(): void {
    this.dlqRetryScheduler = setInterval(() => {
      this.processDLQRetries();
    }, this.DLQ_RETRY_POLL_INTERVAL);

    this.logger.info('DLQ Retry Scheduler started', {
      pollIntervalMs: this.DLQ_RETRY_POLL_INTERVAL,
      backoffDelays: this.BACKOFF_DELAYS,
      maxRetries: this.MAX_RETRIES,
    });
  }

  /**
   * Process DLQ retries
   * Executes for events whose scheduledRetryAt is in the past
   */
  private async processDLQRetries(): Promise<void> {
    const now = new Date();
    const eventsToRetry: string[] = [];

    // Find events ready to retry
    for (const [dlqEventId, dlqEvent] of this.deadLetterQueue.entries()) {
      if (dlqEvent.scheduledRetryAt <= now) {
        eventsToRetry.push(dlqEventId);
      }
    }

    if (eventsToRetry.length === 0) {
      return; // No retries scheduled
    }

    this.logger.debug('Processing DLQ retries', {
      eventsToRetryCount: eventsToRetry.length,
      dlqSize: this.deadLetterQueue.size,
    });

    // Attempt to retry each event
    for (const dlqEventId of eventsToRetry) {
      const dlqEvent = this.deadLetterQueue.get(dlqEventId);
      if (!dlqEvent) continue;

      const retrySuccessful = await this.retry(dlqEventId);

      if (!retrySuccessful && this.deadLetterQueue.has(dlqEventId)) {
        const updatedDlqEvent = this.deadLetterQueue.get(dlqEventId)!;
        if (updatedDlqEvent.retryCount < this.MAX_RETRIES) {
          // Schedule next retry with exponential backoff
          const nextBackoffDelay =
            this.BACKOFF_DELAYS[
              Math.min(updatedDlqEvent.retryCount, this.BACKOFF_DELAYS.length - 1)
            ];

          updatedDlqEvent.scheduledRetryAt = new Date(Date.now() + nextBackoffDelay);

          this.logger.info('DLQ event rescheduled for retry', {
            dlqEventId,
            eventId: updatedDlqEvent.eventId,
            retryCount: updatedDlqEvent.retryCount,
            nextRetryIn: `${nextBackoffDelay}ms`,
          });
        }
      }
    }
  }

  /**
   * Stop the DLQ retry scheduler
   * Should be called during application shutdown
   */
  stopDLQRetryScheduler(): void {
    if (this.dlqRetryScheduler) {
      clearInterval(this.dlqRetryScheduler);
      this.dlqRetryScheduler = null;

      this.logger.info('DLQ Retry Scheduler stopped');
    }
  }

  /**
   * Shutdown the event bus
   * Cleans up resources and stops background tasks
   */
  shutdown(): void {
    this.stopDLQRetryScheduler();
    this.logger.info('EventBus shutdown', {
      processedEventCount: this.processedEventCount,
      dlqSize: this.deadLetterQueue.size,
      subscriptionCount: this.getSubscriptionCount(),
    });
  }
}

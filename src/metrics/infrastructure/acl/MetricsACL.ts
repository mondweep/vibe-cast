import { IEventBus } from '../../../shared/infrastructure/events/IEventBus';
import { EventHandler } from '../../../shared/domain/EventHandler';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { Logger } from '../../../shared/infrastructure/logging/Logger';
import { MetricsRecorded } from '../../domain/events/MetricsRecorded';

/**
 * MetricsACL
 *
 * Anti-Corruption Layer for all domain events → Metrics tracking
 *
 * Subscribes to ALL domain events and publishes MetricsRecorded
 * Enables analytics, reporting, and monitoring across all domains
 *
 * Tracked events:
 * - EnrollmentCompleted (Learning)
 * - CandidateQualified (Certification)
 * - BadgeIssued (Certification)
 * - ExamCompleted (Certification)
 * - ExerciseCompleted (SkillLab)
 * - BadgeEarned (Community)
 * - SkillAchieved (Community)
 *
 * Features:
 * - Event subscription to all domain event types
 * - Idempotency tracking via Set<eventId>
 * - Correlation ID propagation (unchanged)
 * - Causation ID tracking (source event ID)
 * - Full metadata preservation for analytics
 * - Structured logging with correlationId
 *
 * Idempotency: In-memory Set<eventId> sufficient for Week 10 single-process
 */
export class MetricsACL implements EventHandler {
  private eventBus: IEventBus;
  private logger: Logger;
  private seen: Set<string> = new Set();
  private eventTypes: string[] = [
    'EnrollmentCompleted',
    'CandidateQualified',
    'BadgeIssued',
    'ExamCompleted',
    'ExerciseCompleted',
    'BadgeEarned',
    'SkillAchieved',
  ];

  constructor(eventBus: IEventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Subscribe this ACL to the event bus
   * Registers handlers for all domain events
   */
  subscribe(): string[] {
    const subscriptionIds: string[] = [];

    for (const eventType of this.eventTypes) {
      const subscriptionId = this.eventBus.subscribe(eventType, this);
      subscriptionIds.push(subscriptionId);
    }

    this.logger.info('MetricsACL subscribed to all domain events', {
      eventTypeCount: this.eventTypes.length,
      subscriptionIds,
    });

    return subscriptionIds;
  }

  /**
   * Check if this handler can process the event
   * MetricsACL handles all domain events
   */
  canHandle(event: DomainEvent): boolean {
    const eventName = event.getEventName();
    return this.eventTypes.includes(eventName);
  }

  /**
   * Handle any domain event
   *
   * Workflow:
   * 1. Check idempotency: return if already processed
   * 2. Extract event metadata
   * 3. Transform to MetricsRecorded
   * 4. Propagate correlationId unchanged
   * 5. Set causationId = source event ID
   * 6. Publish to EventBus
   */
  async handle(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();

    if (!this.canHandle(event)) {
      this.logger.warn('MetricsACL: cannot handle event type', {
        eventName,
        eventId: event.id,
      });
      return;
    }

    const eventId = event.id;

    // IDEMPOTENCY CHECK
    if (this.seen.has(eventId)) {
      this.logger.debug('MetricsACL: skipping duplicate event', {
        eventName,
        eventId,
        correlationId: event.correlationId,
      });
      return;
    }

    // Mark as seen
    this.seen.add(eventId);

    this.logger.info('MetricsACL: recording metrics for event', {
      eventName,
      eventId,
      correlationId: event.correlationId,
    });

    try {
      // Get learnerId from event (available in all domain events)
      const learnerId = event.aggregateId;

      // Extract event metadata
      const metadata = event instanceof DomainEvent
        ? {
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            timestamp: event.timestamp,
            ...this.extractEventData(event),
          }
        : {};

      // Transform event
      const metricsRecorded = new MetricsRecorded({
        eventType: eventName,
        eventId: eventId,
        learnerId: learnerId,
        correlationId: event.correlationId,
        metadata,
      });

      // Publish to EventBus
      await this.eventBus.publish(metricsRecorded);

      this.logger.info('MetricsACL: published MetricsRecorded', {
        sourceEventName: eventName,
        sourceEventId: eventId,
        metricsEventId: metricsRecorded.id,
        correlationId: event.correlationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('MetricsACL: failed to record metrics', {
        eventName,
        eventId,
        error: errorMessage,
        correlationId: event.correlationId,
      });

      throw error;
    }
  }

  /**
   * Extract event data from various domain event types
   * Returns a plain object with event properties
   */
  private extractEventData(event: any): Record<string, any> {
    const data: Record<string, any> = {};

    // Copy all enumerable properties (avoid private/protected)
    for (const key in event) {
      if (
        event.hasOwnProperty(key) &&
        !key.startsWith('_') &&
        typeof event[key] !== 'function'
      ) {
        data[key] = event[key];
      }
    }

    return data;
  }

  /**
   * Get idempotency tracking statistics
   */
  getProcessedCount(): number {
    return this.seen.size;
  }

  /**
   * Clear idempotency tracking
   */
  clearProcessedEvents(): void {
    const previousSize = this.seen.size;
    this.seen.clear();

    this.logger.warn('MetricsACL: cleared processed events', {
      clearedCount: previousSize,
    });
  }
}

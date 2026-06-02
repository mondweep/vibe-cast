import { IEventBus } from '../../shared/infrastructure/events/IEventBus';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { AggregateRoot } from '../../shared/domain/AggregateRoot';
import { DomainEvent } from '../../shared/domain/DomainEvent';

/**
 * MetricsService
 *
 * Application Service for Metrics domain
 * Responsible for:
 * - Publishing domain events after database transaction commits
 * - Coordinating metrics and analytics workflows
 * - Publishing MetricsRecorded events
 *
 * PHASE 5 IMPLEMENTATION:
 * - Injects IEventBus for event publishing
 * - Implements publishEventsFrom() to publish aggregate events
 * - Called AFTER database transaction successfully commits
 */
export class MetricsService {
  constructor(
    private eventBus: IEventBus,
    private logger: Logger
  ) {}

  /**
   * Publish domain events from an aggregate
   *
   * Workflow:
   * 1. Get uncommitted events from aggregate
   * 2. For each event, publish to EventBus
   * 3. Mark events as committed
   * 4. Log all published events with correlationId
   *
   * Called AFTER database commit succeeds
   */
  async publishEventsFrom(aggregate: AggregateRoot): Promise<void> {
    const events = aggregate.getUncommittedEvents();

    if (events.length === 0) {
      return;
    }

    this.logger.debug('MetricsService: publishing domain events', {
      aggregateId: aggregate.getId(),
      eventCount: events.length,
    });

    try {
      // Publish each event to the EventBus
      for (const event of events) {
        await this.publishEvent(event);
      }

      // Mark events as committed after all are published
      aggregate.markEventsAsCommitted();

      this.logger.info('MetricsService: all domain events published', {
        aggregateId: aggregate.getId(),
        eventCount: events.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('MetricsService: failed to publish domain events', {
        aggregateId: aggregate.getId(),
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Publish a single domain event
   * Handles event publishing with error logging
   */
  private async publishEvent(event: DomainEvent): Promise<void> {
    this.logger.debug('MetricsService: publishing event', {
      eventName: event.getEventName(),
      eventId: event.id,
      correlationId: event.correlationId,
    });

    await this.eventBus.publish(event);

    this.logger.debug('MetricsService: event published', {
      eventName: event.getEventName(),
      eventId: event.id,
      correlationId: event.correlationId,
    });
  }
}

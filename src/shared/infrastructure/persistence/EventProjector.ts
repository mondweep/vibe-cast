import { DomainEvent } from '../../domain/DomainEvent';
import { AggregateRoot } from '../../domain/AggregateRoot';
import { Logger } from '../logging/Logger';
import { EventStore } from './EventStore';
import { StoredEvent, EventSnapshot } from './EventStore';

/**
 * EventProjector - Reconstructs aggregate state from event history
 *
 * Responsibilities:
 * - Deserialize stored events back to DomainEvent instances
 * - Replay events to reconstruct aggregate state
 * - Optimize replay using snapshots (start from snapshot + replay newer events)
 * - Support both full and incremental reconstruction
 *
 * Design:
 * - Event deserializer registry maps event types to constructor functions
 * - Assumes aggregates have an applyEvent(event: DomainEvent) method for replay
 * - Snapshots store the serialized aggregate state at a known version
 * - Replay is linear and ordered by sequence_number
 */
export interface EventDeserializer {
  (primitives: Record<string, any>): DomainEvent;
}

export class EventProjector {
  private deserializers: Map<string, EventDeserializer> = new Map();

  constructor(
    private logger: Logger,
    private eventStore: EventStore
  ) {}

  /**
   * Register an event deserializer for a specific event type
   *
   * @param eventType Event type identifier (from eventType column)
   * @param deserializer Function that converts primitives to DomainEvent
   */
  registerDeserializer(eventType: string, deserializer: EventDeserializer): void {
    this.deserializers.set(eventType, deserializer);
    this.logger.debug('Event deserializer registered', { eventType });
  }

  /**
   * Register multiple deserializers at once
   *
   * @param deserializers Map of eventType -> deserializer function
   */
  registerDeserializers(deserializers: Record<string, EventDeserializer>): void {
    Object.entries(deserializers).forEach(([eventType, deserializer]) => {
      this.registerDeserializer(eventType, deserializer);
    });
  }

  /**
   * Reconstruct aggregate state from events
   *
   * Process:
   * 1. Load latest snapshot for aggregate (if exists)
   * 2. Retrieve events after snapshot point
   * 3. Deserialize events
   * 4. Replay events to aggregate state
   * 5. Return reconstructed aggregate
   *
   * @param aggregateId ID of aggregate to reconstruct
   * @param aggregateFactory Function that creates empty aggregate instance
   * @returns Reconstructed aggregate with state at current version
   */
  async projectAggregate<T extends AggregateRoot>(
    aggregateId: string,
    aggregateFactory: (id: string) => T
  ): Promise<T> {
    this.logger.info('Projecting aggregate from events', { aggregateId });

    try {
      // Create empty aggregate instance
      const aggregate = aggregateFactory(aggregateId);

      // Load latest snapshot (if exists)
      const snapshot = await this.eventStore.getLatestSnapshot(aggregateId);

      let fromSequence = 0;
      if (snapshot) {
        this.logger.debug('Using snapshot for optimization', {
          aggregateId,
          snapshotVersion: snapshot.aggregateVersion,
          lastEventSequence: snapshot.lastEventSequence,
        });

        // Restore aggregate state from snapshot
        this.restoreFromSnapshot(aggregate, snapshot);

        // Replay events only after snapshot
        fromSequence = snapshot.lastEventSequence;
      }

      // Get all events after snapshot point
      const events = await this.eventStore.getEventsByAggregateId(aggregateId, fromSequence);

      // Deserialize and apply events
      for (const storedEvent of events) {
        const domainEvent = this.deserializeEvent(storedEvent);
        if (domainEvent) {
          this.applyEventToAggregate(aggregate, domainEvent);
        }
      }

      this.logger.debug('Aggregate projected', {
        aggregateId,
        version: aggregate.getVersion(),
        eventCount: events.length,
      });

      return aggregate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to project aggregate', {
        aggregateId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get events for correlation ID (distributed tracing)
   *
   * @param correlationId Correlation ID to retrieve events for
   * @returns Array of deserialized domain events
   */
  async getEventsByCorrelation(correlationId: string): Promise<DomainEvent[]> {
    this.logger.info('Retrieving events by correlation', { correlationId });

    try {
      const storedEvents = await this.eventStore.getEventsByCorrelationId(correlationId);

      return storedEvents
        .map(storedEvent => this.deserializeEvent(storedEvent))
        .filter((event): event is DomainEvent => event !== undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to get events by correlation', {
        correlationId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get event count for an aggregate
   *
   * Used to determine if snapshot strategy should trigger
   * (e.g., snapshot every 100 events)
   *
   * @param aggregateId Aggregate ID
   * @returns Number of events persisted
   */
  async getEventCount(aggregateId: string): Promise<number> {
    return this.eventStore.getEventCount(aggregateId);
  }

  /**
   * Deserialize a stored event to a DomainEvent instance
   *
   * Looks up deserializer for event type and reconstructs event.
   * Returns undefined if no deserializer registered (logs warning).
   *
   * @param storedEvent Event from database
   * @returns DomainEvent instance or undefined if deserializer not found
   */
  private deserializeEvent(storedEvent: StoredEvent): DomainEvent | undefined {
    try {
      const deserializer = this.deserializers.get(storedEvent.eventType);

      if (!deserializer) {
        this.logger.warn('No deserializer for event type', {
          eventType: storedEvent.eventType,
          eventId: storedEvent.id,
        });
        return undefined;
      }

      return deserializer(storedEvent.eventData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to deserialize event', {
        eventId: storedEvent.id,
        eventType: storedEvent.eventType,
        error: errorMessage,
      });

      return undefined;
    }
  }

  /**
   * Restore aggregate state from snapshot
   *
   * Assumes snapshot.snapshotData contains serialized aggregate state.
   * Implementation depends on aggregate type - override in subclass if needed.
   *
   * @param aggregate Aggregate to restore state to
   * @param snapshot Snapshot containing state
   */
  private restoreFromSnapshot<T extends AggregateRoot>(
    aggregate: T,
    snapshot: EventSnapshot
  ): void {
    // Base implementation: assume aggregate has method to restore from state
    // Subclasses can override for custom restoration logic
    if (typeof (aggregate as any).restoreFromSnapshot === 'function') {
      (aggregate as any).restoreFromSnapshot(snapshot.snapshotData);
    }

    // Update version to snapshot version for accurate replay point tracking
    for (let i = 0; i < snapshot.aggregateVersion; i++) {
      (aggregate as any).incrementVersion?.();
    }
  }

  /**
   * Apply event to aggregate for replay
   *
   * Assumes aggregate has applyEvent(event: DomainEvent) method
   * Returns early if aggregate doesn't support event application
   *
   * @param aggregate Aggregate to apply event to
   * @param event Event to apply
   */
  private applyEventToAggregate<T extends AggregateRoot>(
    aggregate: T,
    event: DomainEvent
  ): void {
    if (typeof (aggregate as any).applyEvent === 'function') {
      (aggregate as any).applyEvent(event);
      (aggregate as any).incrementVersion?.();
    } else {
      this.logger.warn('Aggregate does not support applyEvent', {
        aggregateId: aggregate.getId(),
        eventType: event.constructor.name,
      });
    }
  }
}

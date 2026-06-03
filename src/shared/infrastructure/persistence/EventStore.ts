import { DomainEvent } from '../../domain/DomainEvent';
import { Logger } from '../logging/Logger';
import { DatabaseAdapter } from './DatabaseAdapter';

/**
 * Stored event record from event_log table
 */
export interface StoredEvent {
  sequenceNumber: number;
  id: string; // UUID
  eventType: string;
  eventName: string;
  aggregateId: string; // UUID
  aggregateType: string;
  eventData: Record<string, any>;
  metadata: Record<string, any>;
  correlationId: string; // UUID
  causationId?: string; // UUID
  occurredAt: Date;
  recordedAt: Date;
  learnerId: string; // UUID
  aggregateVersion: number;
}

/**
 * Event snapshot record
 */
export interface EventSnapshot {
  id: string; // UUID
  aggregateId: string; // UUID
  aggregateType: string;
  snapshotData: Record<string, any>;
  aggregateVersion: number;
  createdAt: Date;
  lastEventSequence: number;
}

/**
 * EventStore - Append-only event log for event sourcing
 *
 * Responsibilities:
 * - Persist domain events to event_log table (immutable)
 * - Query event history for specific aggregates
 * - Retrieve events for replay and reconstruction
 * - Manage event snapshots for performance optimization
 * - Support temporal queries and correlation tracking
 *
 * Key Design:
 * - Events are append-only (INSERT only, never UPDATE/DELETE)
 * - sequence_number ensures event ordering
 * - Snapshots reduce replay time for large event histories
 * - Supports multi-domain event tracing via correlationId
 */
export class EventStore {
  constructor(
    private logger: Logger,
    private db: DatabaseAdapter
  ) {}

  /**
   * Append an event to the event log
   *
   * Events are immutable once persisted. sequence_number is auto-assigned
   * by the database, ensuring strict ordering even with concurrent writes.
   *
   * @param event Domain event to persist
   * @param aggregateType Type of aggregate (e.g., 'Certification', 'Enrollment')
   * @param aggregateId ID of the aggregate instance
   * @param learnerId Learner ID for multi-tenant filtering
   * @returns Sequence number assigned to this event
   * @throws Error if persistence fails
   */
  async appendEvent(
    event: DomainEvent,
    aggregateType: string,
    aggregateId: string,
    learnerId: string,
    aggregateVersion: number = 1
  ): Promise<number> {
    this.logger.info('Appending event to event log', {
      eventType: event.eventType,
      eventId: event.getId(),
      aggregateId,
      aggregateType,
      learnerId,
    });

    try {
      const query = `
        INSERT INTO event_log (
          id, event_type, event_name, aggregate_id, aggregate_type,
          event_data, metadata, correlation_id, causation_id,
          occurred_at, recorded_at, learner_id, aggregate_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING sequence_number
      `;

      const result = await this.db.query(query, [
        event.getId(),
        event.eventType,
        event.getEventName(),
        aggregateId,
        aggregateType,
        JSON.stringify(event.toPrimitives()),
        JSON.stringify({
          source: 'domain-event',
          publishedAt: new Date().toISOString(),
        }),
        event.correlationId,
        event.causationId || null,
        event.timestamp || new Date(),
        new Date(),
        learnerId,
        aggregateVersion,
      ]);

      const sequenceNumber = result.rows[0].sequence_number;

      this.logger.debug('Event persisted to log', {
        eventId: event.getId(),
        sequenceNumber,
        aggregateId,
      });

      return sequenceNumber;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to append event to log', {
        eventId: event.getId(),
        aggregateId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get all events for a specific aggregate
   *
   * Used for replay: retrieve events in order and reconstruct aggregate state
   *
   * @param aggregateId ID of the aggregate to load
   * @param fromSequence Start from this sequence number (default: 0 = from beginning)
   * @returns Array of events in order
   */
  async getEventsByAggregateId(
    aggregateId: string,
    fromSequence: number = 0
  ): Promise<StoredEvent[]> {
    this.logger.info('Retrieving events for aggregate', {
      aggregateId,
      fromSequence,
    });

    try {
      const query = `
        SELECT
          sequence_number,
          id,
          event_type,
          event_name,
          aggregate_id,
          aggregate_type,
          event_data,
          metadata,
          correlation_id,
          causation_id,
          occurred_at,
          recorded_at,
          learner_id,
          aggregate_version
        FROM event_log
        WHERE aggregate_id = $1
        AND sequence_number > $2
        ORDER BY sequence_number ASC
      `;

      const result = await this.db.query(query, [aggregateId, fromSequence]);

      return result.rows.map((row: any) => ({
        sequenceNumber: row.sequence_number,
        id: row.id,
        eventType: row.event_type,
        eventName: row.event_name,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventData: row.event_data || {},
        metadata: row.metadata || {},
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        occurredAt: new Date(row.occurred_at),
        recordedAt: new Date(row.recorded_at),
        learnerId: row.learner_id,
        aggregateVersion: row.aggregate_version,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to retrieve aggregate events', {
        aggregateId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get events of a specific type
   *
   * Used for filtering events by domain or event class
   *
   * @param eventType Event type to filter by
   * @param limit Maximum number of events to return
   * @returns Array of events
   */
  async getEventsByType(
    eventType: string,
    limit: number = 100
  ): Promise<StoredEvent[]> {
    this.logger.info('Retrieving events by type', { eventType, limit });

    try {
      const query = `
        SELECT
          sequence_number,
          id,
          event_type,
          event_name,
          aggregate_id,
          aggregate_type,
          event_data,
          metadata,
          correlation_id,
          causation_id,
          occurred_at,
          recorded_at,
          learner_id,
          aggregate_version
        FROM event_log
        WHERE event_type = $1
        ORDER BY sequence_number DESC
        LIMIT $2
      `;

      const result = await this.db.query(query, [eventType, limit]);

      return result.rows.map((row: any) => ({
        sequenceNumber: row.sequence_number,
        id: row.id,
        eventType: row.event_type,
        eventName: row.event_name,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventData: row.event_data || {},
        metadata: row.metadata || {},
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        occurredAt: new Date(row.occurred_at),
        recordedAt: new Date(row.recorded_at),
        learnerId: row.learner_id,
        aggregateVersion: row.aggregate_version,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to retrieve events by type', {
        eventType,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get the latest snapshot for an aggregate
   *
   * @param aggregateId ID of the aggregate
   * @returns Latest snapshot or undefined if none exists
   */
  async getLatestSnapshot(
    aggregateId: string
  ): Promise<EventSnapshot | undefined> {
    this.logger.info('Retrieving latest snapshot', { aggregateId });

    try {
      const query = `
        SELECT
          id,
          aggregate_id,
          aggregate_type,
          snapshot_data,
          aggregate_version,
          created_at,
          last_event_sequence
        FROM event_snapshots
        WHERE aggregate_id = $1
        ORDER BY aggregate_version DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [aggregateId]);

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        snapshotData: row.snapshot_data || {},
        aggregateVersion: row.aggregate_version,
        createdAt: new Date(row.created_at),
        lastEventSequence: row.last_event_sequence,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to retrieve snapshot', {
        aggregateId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Store a snapshot of aggregate state
   *
   * Snapshots optimize replay by allowing us to start from a known state
   * instead of replaying from event 1.
   *
   * @param aggregateId ID of the aggregate
   * @param aggregateType Type of the aggregate
   * @param aggregateVersion Version (revision) of the aggregate
   * @param snapshotData Serialized state of the aggregate
   * @param lastEventSequence Sequence number of the event that created this state
   * @returns Snapshot ID
   */
  async saveSnapshot(
    aggregateId: string,
    aggregateType: string,
    aggregateVersion: number,
    snapshotData: Record<string, any>,
    lastEventSequence: number
  ): Promise<string> {
    this.logger.info('Saving snapshot', {
      aggregateId,
      aggregateType,
      aggregateVersion,
    });

    try {
      const snapshotId = crypto.randomUUID();

      const query = `
        INSERT INTO event_snapshots (
          id, aggregate_id, aggregate_type, snapshot_data,
          aggregate_version, last_event_sequence, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (aggregate_id, aggregate_version) DO NOTHING
      `;

      await this.db.query(query, [
        snapshotId,
        aggregateId,
        aggregateType,
        JSON.stringify(snapshotData),
        aggregateVersion,
        lastEventSequence,
      ]);

      this.logger.debug('Snapshot saved', { aggregateId, snapshotId });

      return snapshotId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to save snapshot', {
        aggregateId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get event count for an aggregate
   *
   * Used to determine if snapshot strategy should be triggered
   * (e.g., snapshot every 100 events)
   *
   * @param aggregateId ID of the aggregate
   * @returns Total event count
   */
  async getEventCount(aggregateId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM event_log WHERE aggregate_id = $1
      `;

      const result = await this.db.query(query, [aggregateId]);
      return result.rows[0]?.count || 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to get event count', {
        aggregateId,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get events by correlation ID
   *
   * Used for distributed tracing and audit trails across domains
   *
   * @param correlationId Correlation ID to search for
   * @returns Array of events with this correlation ID
   */
  async getEventsByCorrelationId(
    correlationId: string
  ): Promise<StoredEvent[]> {
    this.logger.info('Retrieving events by correlation ID', { correlationId });

    try {
      const query = `
        SELECT
          sequence_number,
          id,
          event_type,
          event_name,
          aggregate_id,
          aggregate_type,
          event_data,
          metadata,
          correlation_id,
          causation_id,
          occurred_at,
          recorded_at,
          learner_id,
          aggregate_version
        FROM event_log
        WHERE correlation_id = $1
        ORDER BY sequence_number ASC
      `;

      const result = await this.db.query(query, [correlationId]);

      return result.rows.map((row: any) => ({
        sequenceNumber: row.sequence_number,
        id: row.id,
        eventType: row.event_type,
        eventName: row.event_name,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventData: row.event_data || {},
        metadata: row.metadata || {},
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        occurredAt: new Date(row.occurred_at),
        recordedAt: new Date(row.recorded_at),
        learnerId: row.learner_id,
        aggregateVersion: row.aggregate_version,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to retrieve events by correlation ID', {
        correlationId,
        error: errorMessage,
      });

      throw error;
    }
  }
}

import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * MetricsRecorded Event
 *
 * Published by MetricsACL for every domain event
 * Signals that an event has been recorded for analytics
 * Triggers Metrics domain workflow (analytics, reporting, etc.)
 *
 * Source: Any domain event (EnrollmentCompleted, BadgeIssued, etc.)
 * Causation: Source event ID
 */
export class MetricsRecorded extends DomainEvent {
  public readonly eventType: string; // Name of source event
  public readonly eventId: string; // ID of source event
  public readonly learnerId: string;
  public readonly metadata: Record<string, any>; // Full source event data
  public readonly causationId: string; // Source event ID

  constructor(data: {
    eventType: string;
    eventId: string;
    learnerId: string;
    correlationId: string;
    metadata: Record<string, any>;
    timestamp?: Date;
    id?: string;
  }) {
    super(
      data.learnerId,
      'metrics.event',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.eventType = data.eventType;
    this.eventId = data.eventId;
    this.learnerId = data.learnerId;
    this.metadata = data.metadata;
    this.causationId = data.eventId; // Source event ID
  }

  getEventName(): string {
    return 'MetricsRecorded';
  }

  toPrimitives(): Record<string, any> {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      learnerId: this.learnerId,
      correlationId: this.correlationId,
      metadata: this.metadata,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

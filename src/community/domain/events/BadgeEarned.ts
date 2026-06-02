import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * BadgeEarned Event
 *
 * Published by ACL when BadgeIssued is received
 * Signals that a community member earned a badge
 * Triggers Community domain workflow (reputation, notifications, etc.)
 *
 * Source: BadgeIssued (Certification)
 * Causation: BadgeIssued event ID
 */
export class BadgeEarned extends DomainEvent {
  public readonly badgeId: string;
  public readonly learnerId: string;
  public readonly causationId: string; // Source event ID

  constructor(data: {
    badgeId: string;
    learnerId: string;
    correlationId: string;
    causationId: string; // From BadgeIssued.id
    id?: string;
    timestamp?: Date;
  }) {
    super(
      data.learnerId,
      'community.badge',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.badgeId = data.badgeId;
    this.learnerId = data.learnerId;
    this.causationId = data.causationId;
  }

  getEventName(): string {
    return 'BadgeEarned';
  }

  toPrimitives(): Record<string, any> {
    return {
      badgeId: this.badgeId,
      learnerId: this.learnerId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

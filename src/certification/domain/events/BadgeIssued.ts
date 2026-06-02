import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * BadgeIssued Event
 *
 * Published by Certification domain after badge issuance
 * Triggers Certification → Community workflow
 *
 * Causation: CertificationOrchestrator SAGA completion
 * Effect: BadgeEarned (ACL transforms)
 */
export class BadgeIssued extends DomainEvent {
  public readonly badgeId: string;
  public readonly learnerId: string;
  public readonly certificationName: string;
  public readonly issuedAt: string; // ISO8601
  public readonly causationId?: string;

  constructor(data: {
    badgeId: string;
    learnerId: string;
    certificationName: string;
    issuedAt: string;
    correlationId: string;
    causationId?: string;
    id?: string;
    timestamp?: Date;
  }) {
    super(
      data.learnerId,
      'certification.badge',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.badgeId = data.badgeId;
    this.learnerId = data.learnerId;
    this.certificationName = data.certificationName;
    this.issuedAt = data.issuedAt;
    this.causationId = data.causationId;
  }

  getEventName(): string {
    return 'BadgeIssued';
  }

  toPrimitives(): Record<string, any> {
    return {
      badgeId: this.badgeId,
      learnerId: this.learnerId,
      certificationName: this.certificationName,
      issuedAt: this.issuedAt,
      correlationId: this.correlationId,
      causationId: this.causationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

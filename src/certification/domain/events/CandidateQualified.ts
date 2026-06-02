import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * CandidateQualified Event
 *
 * Published by ACL when EnrollmentCompleted is received
 * Signals that a learner qualifies for certification
 * Triggers Certification domain workflow
 *
 * Source: EnrollmentCompleted (Learning)
 * Causation: EnrollmentCompleted event ID
 */
export class CandidateQualified extends DomainEvent {
  public readonly enrollmentId: string;
  public readonly learnerId: string;
  public readonly causationId: string; // Source event ID

  constructor(data: {
    enrollmentId: string;
    learnerId: string;
    correlationId: string;
    causationId: string; // From EnrollmentCompleted.id
    id?: string;
    timestamp?: Date;
  }) {
    super(
      data.learnerId,
      'certification.candidate',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.enrollmentId = data.enrollmentId;
    this.learnerId = data.learnerId;
    this.causationId = data.causationId;
  }

  getEventName(): string {
    return 'CandidateQualified';
  }

  toPrimitives(): Record<string, any> {
    return {
      enrollmentId: this.enrollmentId,
      learnerId: this.learnerId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

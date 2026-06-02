import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * EnrollmentCompleted Event
 *
 * Published by Learning domain when a learner completes enrollment
 * Triggers Learning → Certification workflow
 *
 * Causation: EnrollmentCompleted (source)
 * Effect: CandidateQualified (ACL transforms)
 */
export class EnrollmentCompleted extends DomainEvent {
  public readonly enrollmentId: string;
  public readonly learnerId: string;
  public readonly pathId: string;
  public readonly finalScore: number;
  public readonly completedAt: string; // ISO8601
  public readonly causationId?: string;

  constructor(data: {
    enrollmentId: string;
    learnerId: string;
    pathId: string;
    finalScore: number;
    completedAt: string;
    correlationId: string;
    causationId?: string;
    id?: string;
    timestamp?: Date;
  }) {
    super(
      data.learnerId,
      'learning.enrollment',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.enrollmentId = data.enrollmentId;
    this.learnerId = data.learnerId;
    this.pathId = data.pathId;
    this.finalScore = data.finalScore;
    this.completedAt = data.completedAt;
    this.causationId = data.causationId;
  }

  getEventName(): string {
    return 'EnrollmentCompleted';
  }

  toPrimitives(): Record<string, any> {
    return {
      enrollmentId: this.enrollmentId,
      learnerId: this.learnerId,
      pathId: this.pathId,
      finalScore: this.finalScore,
      completedAt: this.completedAt,
      correlationId: this.correlationId,
      causationId: this.causationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

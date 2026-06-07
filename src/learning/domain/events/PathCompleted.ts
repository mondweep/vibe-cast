import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * PathCompleted Event
 *
 * Published when a learner finishes every lesson in a path (PRD §9).
 * Consumed by the Certification context (LearningToCertificationACL) to
 * check certification eligibility, and unlocks the next path (PRD §4.1).
 */
export class PathCompleted extends DomainEvent {
  public readonly learnerId: string;
  public readonly pathId: string;
  public readonly completedAt: string; // ISO8601

  constructor(data: {
    learnerId: string;
    pathId: string;
    completedAt: string;
    correlationId: string;
    id?: string;
    timestamp?: Date;
  }) {
    super(data.learnerId, 'learning.path', data.correlationId, data.id, data.timestamp);
    this.learnerId = data.learnerId;
    this.pathId = data.pathId;
    this.completedAt = data.completedAt;
  }

  getEventName(): string {
    return 'PathCompleted';
  }

  toPrimitives(): Record<string, any> {
    return {
      learnerId: this.learnerId,
      pathId: this.pathId,
      completedAt: this.completedAt,
      correlationId: this.correlationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * LearnerEnrolledInPath Event
 *
 * Published when a learner starts a learning path (PRD §4.1 "learner.path_started").
 * Listed in PRD §9 as LearnerEnrolled(learnerId, pathId).
 */
export class LearnerEnrolledInPath extends DomainEvent {
  public readonly learnerId: string;
  public readonly pathId: string;
  public readonly totalLessons: number;

  constructor(data: {
    learnerId: string;
    pathId: string;
    totalLessons: number;
    correlationId: string;
    id?: string;
    timestamp?: Date;
  }) {
    super(data.learnerId, 'learning.path', data.correlationId, data.id, data.timestamp);
    this.learnerId = data.learnerId;
    this.pathId = data.pathId;
    this.totalLessons = data.totalLessons;
  }

  getEventName(): string {
    return 'LearnerEnrolledInPath';
  }

  toPrimitives(): Record<string, any> {
    return {
      learnerId: this.learnerId,
      pathId: this.pathId,
      totalLessons: this.totalLessons,
      correlationId: this.correlationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

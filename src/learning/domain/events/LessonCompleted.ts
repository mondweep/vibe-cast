import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * LessonCompleted Event
 *
 * Published when a learner completes a lesson within a path (PRD §9).
 */
export class LessonCompleted extends DomainEvent {
  public readonly learnerId: string;
  public readonly pathId: string;
  public readonly lessonId: string;
  public readonly progressPercent: number;

  constructor(data: {
    learnerId: string;
    pathId: string;
    lessonId: string;
    progressPercent: number;
    correlationId: string;
    id?: string;
    timestamp?: Date;
  }) {
    super(data.learnerId, 'learning.path', data.correlationId, data.id, data.timestamp);
    this.learnerId = data.learnerId;
    this.pathId = data.pathId;
    this.lessonId = data.lessonId;
    this.progressPercent = data.progressPercent;
  }

  getEventName(): string {
    return 'LessonCompleted';
  }

  toPrimitives(): Record<string, any> {
    return {
      learnerId: this.learnerId,
      pathId: this.pathId,
      lessonId: this.lessonId,
      progressPercent: this.progressPercent,
      correlationId: this.correlationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

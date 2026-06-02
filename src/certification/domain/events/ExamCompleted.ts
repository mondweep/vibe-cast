import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * ExamCompleted Event
 *
 * Published by Certification domain when exam is graded
 * Triggers resume of SAGA waiting in WAIT_FOR_EXAM state
 *
 * Causation: Exam entity lifecycle
 */
export class ExamCompleted extends DomainEvent {
  public readonly examId: string;
  public readonly learnerId: string;
  public readonly enrollmentId: string;
  public readonly examScore: number;
  public readonly completedAt: string; // ISO8601
  public readonly causationId?: string;

  constructor(data: {
    examId: string;
    learnerId: string;
    enrollmentId: string;
    examScore: number;
    completedAt: string;
    correlationId: string;
    causationId?: string;
    id?: string;
    timestamp?: Date;
  }) {
    super(
      data.learnerId,
      'certification.exam',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.examId = data.examId;
    this.learnerId = data.learnerId;
    this.enrollmentId = data.enrollmentId;
    this.examScore = data.examScore;
    this.completedAt = data.completedAt;
    this.causationId = data.causationId;
  }

  getEventName(): string {
    return 'ExamCompleted';
  }

  toPrimitives(): Record<string, any> {
    return {
      examId: this.examId,
      learnerId: this.learnerId,
      enrollmentId: this.enrollmentId,
      examScore: this.examScore,
      completedAt: this.completedAt,
      correlationId: this.correlationId,
      causationId: this.causationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

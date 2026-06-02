import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * ExerciseCompleted Event
 *
 * Published by SkillLab domain when a learner completes an exercise
 * Triggers SkillLab → Community workflow
 *
 * Causation: Exercise entity lifecycle
 * Effect: SkillAchieved (ACL transforms)
 */
export class ExerciseCompleted extends DomainEvent {
  public readonly exerciseId: string;
  public readonly learnerId: string;
  public readonly skillId: string;
  public readonly score: number;
  public readonly completedAt: string; // ISO8601
  public readonly causationId?: string;

  constructor(data: {
    exerciseId: string;
    learnerId: string;
    skillId: string;
    score: number;
    completedAt: string;
    correlationId: string;
    causationId?: string;
    id?: string;
    timestamp?: Date;
  }) {
    super(
      data.learnerId,
      'skilllab.exercise',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.exerciseId = data.exerciseId;
    this.learnerId = data.learnerId;
    this.skillId = data.skillId;
    this.score = data.score;
    this.completedAt = data.completedAt;
    this.causationId = data.causationId;
  }

  getEventName(): string {
    return 'ExerciseCompleted';
  }

  toPrimitives(): Record<string, any> {
    return {
      exerciseId: this.exerciseId,
      learnerId: this.learnerId,
      skillId: this.skillId,
      score: this.score,
      completedAt: this.completedAt,
      correlationId: this.correlationId,
      causationId: this.causationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

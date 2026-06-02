import { DomainEvent } from '../../../shared/domain/DomainEvent';

/**
 * SkillAchieved Event
 *
 * Published by ACL when ExerciseCompleted is received
 * Signals that a community member achieved a skill
 * Triggers Community domain workflow (reputation, notifications, etc.)
 *
 * Source: ExerciseCompleted (SkillLab)
 * Causation: ExerciseCompleted event ID
 */
export class SkillAchieved extends DomainEvent {
  public readonly skillId: string;
  public readonly learnerId: string;
  public readonly causationId: string; // Source event ID

  constructor(data: {
    skillId: string;
    learnerId: string;
    correlationId: string;
    causationId: string; // From ExerciseCompleted.id
    id?: string;
    timestamp?: Date;
  }) {
    super(
      data.learnerId,
      'community.skill',
      data.correlationId,
      data.id,
      data.timestamp
    );

    this.skillId = data.skillId;
    this.learnerId = data.learnerId;
    this.causationId = data.causationId;
  }

  getEventName(): string {
    return 'SkillAchieved';
  }

  toPrimitives(): Record<string, any> {
    return {
      skillId: this.skillId,
      learnerId: this.learnerId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

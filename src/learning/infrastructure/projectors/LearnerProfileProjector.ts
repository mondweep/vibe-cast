import { EventHandler } from '../../../shared/infrastructure/events/EventHandler';
import { DomainEvent } from '../../../shared/domain/events/DomainEvent';
import { IReadModelRepository } from '../../../shared/infrastructure/readmodels/IReadModelRepository';
import { LearnerProfileReadModel, BadgeSnapshot, SkillSnapshot } from '../../../shared/infrastructure/readmodels/ReadModels';
import { UUID } from '../../../shared/domain/ValueObjects';
import { v4 as uuidv4 } from 'uuid';

export class LearnerProfileProjector implements EventHandler<DomainEvent> {
  constructor(private readModelRepository: IReadModelRepository) {}

  async handle(event: DomainEvent): Promise<void> {
    const learnerId = (event as any).learnerId;
    if (!learnerId) return; // Skip events without learnerId

    // Load current read model or create empty
    let profile = await this.readModelRepository.findLearnerProfile(learnerId);
    if (!profile) {
      profile = this.createEmptyLearnerProfile(learnerId);
    }

    // Update based on event type
    if (event.constructor.name === 'EnrollmentCompleted') {
      this.updateFromEnrollmentCompleted(profile, event);
    } else if (event.constructor.name === 'BadgeIssued') {
      this.updateFromBadgeIssued(profile, event);
    } else if (event.constructor.name === 'ExerciseCompleted') {
      this.updateFromExerciseCompleted(profile, event);
    }

    profile.last_synced_event_id = event.getId();
    profile.updated_at = new Date().toISOString();

    // Persist updated read model
    await this.readModelRepository.saveLearnerProfile(profile);
  }

  private createEmptyLearnerProfile(learnerId: UUID): LearnerProfileReadModel {
    return {
      learner_id: learnerId,
      enrollment_ids: [],
      completed_enrollment_count: 0,
      total_enrollments: 0,
      average_score: 0,
      badges_earned: [],
      skills_achieved: [],
      last_activity_at: new Date().toISOString(),
      projection_version: 1,
      last_synced_event_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private updateFromEnrollmentCompleted(profile: LearnerProfileReadModel, event: DomainEvent): void {
    const enrollmentId = (event as any).enrollmentId;
    const finalScore = (event as any).finalScore;
    const completedAt = (event as any).completedAt;

    if (!profile.enrollment_ids.includes(enrollmentId)) {
      profile.enrollment_ids.push(enrollmentId);
      profile.total_enrollments++;
    }

    profile.completed_enrollment_count++;
    profile.last_activity_at = completedAt;
    profile.average_score = this.calculateAverageScore(profile, finalScore);
  }

  private updateFromBadgeIssued(profile: LearnerProfileReadModel, event: DomainEvent): void {
    const badgeId = (event as any).badgeId;
    const certificationName = (event as any).certificationName;
    const issuedAt = (event as any).issuedAt;

    const badge: BadgeSnapshot = {
      badgeId,
      certificationName,
      issuedAt,
      status: 'ACTIVE'
    };

    // Avoid duplicates
    if (!profile.badges_earned.some(b => b.badgeId === badgeId)) {
      profile.badges_earned.push(badge);
    }

    profile.last_activity_at = issuedAt;
  }

  private updateFromExerciseCompleted(profile: LearnerProfileReadModel, event: DomainEvent): void {
    const skillId = (event as any).skillId;
    const score = (event as any).score;
    const completedAt = (event as any).completedAt;
    const skillName = (event as any).skillName || `Skill ${skillId}`;

    const skill: SkillSnapshot = {
      skillId,
      skillName,
      score,
      achievedAt: completedAt
    };

    // Avoid duplicates
    if (!profile.skills_achieved.some(s => s.skillId === skillId)) {
      profile.skills_achieved.push(skill);
    }

    profile.last_activity_at = completedAt;
  }

  private calculateAverageScore(profile: LearnerProfileReadModel, newScore: number): number {
    if (profile.completed_enrollment_count === 0) {
      return newScore;
    }

    // Simple average: (previous_total + new_score) / (count + 1)
    const previousTotal = profile.average_score * profile.completed_enrollment_count;
    const newTotal = previousTotal + newScore;
    return newTotal / (profile.completed_enrollment_count + 1);
  }
}

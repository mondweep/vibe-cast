import { EventHandler } from '../../../shared/domain/EventHandler';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { IReadModelRepository } from '../../../shared/infrastructure/readmodels/IReadModelRepository';
import { CommunityProfileReadModel, BadgeDetail, SkillDetail } from '../../../shared/infrastructure/readmodels/ReadModels';
import { UUID } from '../../../shared/domain/ValueObjects';

export class CommunityProfileProjector implements EventHandler {
  constructor(private readModelRepository: IReadModelRepository) {}

  canHandle(event: DomainEvent): boolean {
    const eventType = event.getEventName();
    return eventType === 'BadgeEarned' || eventType === 'SkillAchieved';
  }

  async handle(event: DomainEvent): Promise<void> {
    const learnerId = (event as any).learnerId;
    if (!learnerId) return;

    let profile = await this.readModelRepository.findCommunityProfile(learnerId);
    if (!profile) {
      profile = this.createEmptyCommunityProfile(learnerId);
    }

    const eventType = event.getEventName();
    if (eventType === 'BadgeEarned') {
      this.updateFromBadgeEarned(profile, event);
    } else if (eventType === 'SkillAchieved') {
      this.updateFromSkillAchieved(profile, event);
    }

    profile.last_activity_at = new Date().toISOString();
    await this.readModelRepository.saveCommunityProfile(profile);
  }

  private updateFromBadgeEarned(profile: CommunityProfileReadModel, event: DomainEvent): void {
    const badgeId = (event as any).badgeId;
    const badgeName = (event as any).badgeName || (event as any).certificationName || 'Badge';
    const issuedAt = (event as any).issuedAt;

    // Avoid duplicates
    if (!profile.badges.some(b => b.badgeId === badgeId)) {
      const badge: BadgeDetail = {
        badgeId,
        badgeName,
        issuedAt,
        displayOrder: profile.badges.length
      };
      profile.badges.push(badge);
      profile.badge_count++;
    }

    this.recalculateReputationScore(profile);
  }

  private updateFromSkillAchieved(profile: CommunityProfileReadModel, event: DomainEvent): void {
    const skillId = (event as any).skillId;
    const skillName = (event as any).skillName || `Skill ${skillId}`;
    const score = (event as any).score || (event as any).proficiencyLevel || 0;
    const achievedAt = (event as any).achievedAt || (event as any).completedAt;

    // Avoid duplicates
    if (!profile.skills.some(s => s.skillId === skillId)) {
      const skill: SkillDetail = {
        skillId,
        skillName,
        proficiencyLevel: Math.min(score, 100),
        achievedAt
      };
      profile.skills.push(skill);
      profile.skill_count++;
    }

    this.recalculateReputationScore(profile);
  }

  private recalculateReputationScore(profile: CommunityProfileReadModel): void {
    // Reputation = badges * 50 + skills * 10
    profile.reputation_score = (profile.badge_count * 50) + (profile.skill_count * 10);
  }

  private createEmptyCommunityProfile(learnerId: UUID): CommunityProfileReadModel {
    return {
      learner_id: learnerId,
      display_name: null,
      badge_count: 0,
      skill_count: 0,
      reputation_score: 0,
      badges: [],
      skills: [],
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

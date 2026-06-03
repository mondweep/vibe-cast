import { UUID } from '../../../shared/domain/ValueObjects';
import { IReadModelRepository } from '../../../shared/infrastructure/readmodels/IReadModelRepository';
import { CommunityProfileReadModel } from '../../../shared/infrastructure/readmodels/ReadModels';

export class CommunityProfileQueryService {
  constructor(private readModelRepository: IReadModelRepository) {}

  async getCommunityProfile(learnerId: UUID): Promise<CommunityProfileReadModel | null> {
    return this.readModelRepository.findCommunityProfile(learnerId);
  }

  async getTopLearnersByReputation(limit: number): Promise<CommunityProfileReadModel[]> {
    return this.readModelRepository.findTopLearnersByReputation(limit);
  }

  async getTopLearnersByBadgeCount(limit: number): Promise<CommunityProfileReadModel[]> {
    return this.readModelRepository.findTopLearnersByBadgeCount(limit);
  }

  async getLearnersByMinimumSkillCount(minimumSkills: number): Promise<CommunityProfileReadModel[]> {
    return this.readModelRepository.findLearnersByMinimumSkillCount(minimumSkills);
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{
    learnerId: UUID;
    displayName: string | null;
    reputationScore: number;
    badgeCount: number;
    skillCount: number;
    lastActivityAt: string;
  }>> {
    const profiles = await this.readModelRepository.findTopLearnersByReputation(limit);
    return profiles.map(p => ({
      learnerId: p.learner_id,
      displayName: p.display_name,
      reputationScore: p.reputation_score,
      badgeCount: p.badge_count,
      skillCount: p.skill_count,
      lastActivityAt: p.last_activity_at
    }));
  }

  async getReputationScore(learnerId: UUID): Promise<number | null> {
    const profile = await this.readModelRepository.findCommunityProfile(learnerId);
    return profile?.reputation_score ?? null;
  }

  async getProfileSummary(learnerId: UUID): Promise<{
    displayName: string | null;
    badgeCount: number;
    skillCount: number;
    reputationScore: number;
    reputationBreakdown: {
      fromBadges: number;
      fromSkills: number;
    };
    lastActivityAt: string;
  } | null> {
    const profile = await this.readModelRepository.findCommunityProfile(learnerId);
    if (!profile) return null;

    const reputationFromBadges = profile.badge_count * 50;
    const reputationFromSkills = profile.skill_count * 10;

    return {
      displayName: profile.display_name,
      badgeCount: profile.badge_count,
      skillCount: profile.skill_count,
      reputationScore: profile.reputation_score,
      reputationBreakdown: {
        fromBadges: reputationFromBadges,
        fromSkills: reputationFromSkills
      },
      lastActivityAt: profile.last_activity_at
    };
  }

  async hasBadge(learnerId: UUID, badgeId: string): Promise<boolean> {
    const profile = await this.readModelRepository.findCommunityProfile(learnerId);
    if (!profile) return false;
    return profile.badges.some(b => b.badgeId === badgeId);
  }

  async hasSkill(learnerId: UUID, skillId: string): Promise<boolean> {
    const profile = await this.readModelRepository.findCommunityProfile(learnerId);
    if (!profile) return false;
    return profile.skills.some(s => s.skillId === skillId);
  }

  async getMaxProficiencyLevel(learnerId: UUID): Promise<number | null> {
    const profile = await this.readModelRepository.findCommunityProfile(learnerId);
    if (!profile || profile.skills.length === 0) return null;
    return Math.max(...profile.skills.map(s => s.proficiencyLevel));
  }
}

import { UUID } from '../../../shared/domain/ValueObjects';
import { IReadModelRepository } from '../../../shared/infrastructure/readmodels/IReadModelRepository';
import { LearnerProfileReadModel } from '../../../shared/infrastructure/readmodels/ReadModels';

export class LearnerProfileQueryService {
  constructor(private readModelRepository: IReadModelRepository) {}

  async getLearnerProfile(learnerId: UUID): Promise<LearnerProfileReadModel | null> {
    return this.readModelRepository.findLearnerProfile(learnerId);
  }

  async getMultipleLearnerProfiles(learnerIds: UUID[]): Promise<LearnerProfileReadModel[]> {
    return this.readModelRepository.findLearnerProfiles(learnerIds);
  }

  async getTopLearnersByActivity(limit: number): Promise<LearnerProfileReadModel[]> {
    return this.readModelRepository.findTopLearnersByActivity(limit);
  }

  async getLearnerProgressSummary(learnerId: UUID): Promise<{
    totalEnrollments: number;
    completedEnrollments: number;
    averageScore: number;
    badgesEarned: number;
    skillsAchieved: number;
    completionRate: number;
  } | null> {
    const profile = await this.readModelRepository.findLearnerProfile(learnerId);
    if (!profile) return null;

    const completionRate = profile.total_enrollments > 0
      ? (profile.completed_enrollment_count / profile.total_enrollments) * 100
      : 0;

    return {
      totalEnrollments: profile.total_enrollments,
      completedEnrollments: profile.completed_enrollment_count,
      averageScore: Math.round(profile.average_score * 100) / 100,
      badgesEarned: profile.badges_earned.length,
      skillsAchieved: profile.skills_achieved.length,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }

  async hasSkillAchieved(learnerId: UUID, skillId: string): Promise<boolean> {
    const profile = await this.readModelRepository.findLearnerProfile(learnerId);
    if (!profile) return false;
    return profile.skills_achieved.some(s => s.skillId === skillId);
  }

  async getBadgesEarnedSince(learnerId: UUID, sinceDate: Date): Promise<number> {
    const profile = await this.readModelRepository.findLearnerProfile(learnerId);
    if (!profile) return 0;
    const sinceDateStr = sinceDate.toISOString();
    return profile.badges_earned.filter(b => b.issuedAt >= sinceDateStr).length;
  }
}

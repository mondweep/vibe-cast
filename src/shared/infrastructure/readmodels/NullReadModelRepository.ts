import { UUID } from '../../../shared/domain/ValueObjects';
import { IReadModelRepository } from './IReadModelRepository';
import {
  LearnerProfileReadModel,
  CertificationProgressReadModel,
  CommunityProfileReadModel,
  MetricsReadModel,
} from './ReadModels';

/**
 * NullReadModelRepository - fallback for when Supabase is not configured
 * Returns null/empty for all read operations, no-ops for writes
 */
export class NullReadModelRepository implements IReadModelRepository {
  async findLearnerProfile(_learnerId: UUID): Promise<LearnerProfileReadModel | null> {
    return null;
  }

  async saveLearnerProfile(_profile: LearnerProfileReadModel): Promise<void> {}

  async findLearnerProfiles(_learnerIds?: UUID[]): Promise<LearnerProfileReadModel[]> {
    return [];
  }

  async findTopLearnersByActivity(_limit: number): Promise<LearnerProfileReadModel[]> {
    return [];
  }

  async findCertificationProgress(_enrollmentId: UUID): Promise<CertificationProgressReadModel | null> {
    return null;
  }

  async saveCertificationProgress(_progress: CertificationProgressReadModel): Promise<void> {}

  async findCertificationProgressByLearner(_learnerId: UUID): Promise<CertificationProgressReadModel[]> {
    return [];
  }

  async findCompletedCertifications(_learnerId: UUID): Promise<CertificationProgressReadModel[]> {
    return [];
  }

  async findCommunityProfile(_learnerId: UUID): Promise<CommunityProfileReadModel | null> {
    return null;
  }

  async saveCommunityProfile(_profile: CommunityProfileReadModel): Promise<void> {}

  async findTopLearnersByReputation(_limit: number): Promise<CommunityProfileReadModel[]> {
    return [];
  }

  async findTopLearnersByBadgeCount(_limit: number): Promise<CommunityProfileReadModel[]> {
    return [];
  }

  async findLearnersByMinimumSkillCount(_minimumSkills: number): Promise<CommunityProfileReadModel[]> {
    return [];
  }

  async findMetricsForPeriod(_period: 'DAILY' | 'WEEKLY' | 'MONTHLY', _date: string): Promise<MetricsReadModel | null> {
    return null;
  }

  async saveMetrics(_metrics: MetricsReadModel): Promise<void> {}

  async findMetricsForDateRange(_period: string, _startDate: string, _endDate: string): Promise<MetricsReadModel[]> {
    return [];
  }
}

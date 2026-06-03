import { UUID } from '../../../shared/domain/ValueObjects';
import {
  LearnerProfileReadModel,
  CertificationProgressReadModel,
  CommunityProfileReadModel,
  MetricsReadModel
} from './ReadModels';

export interface IReadModelRepository {
  // Learner Profile
  findLearnerProfile(learnerId: UUID): Promise<LearnerProfileReadModel | null>;
  saveLearnerProfile(profile: LearnerProfileReadModel): Promise<void>;
  findLearnerProfiles(learnerIds?: UUID[]): Promise<LearnerProfileReadModel[]>;
  findTopLearnersByActivity(limit: number): Promise<LearnerProfileReadModel[]>;

  // Certification Progress
  findCertificationProgress(enrollmentId: UUID): Promise<CertificationProgressReadModel | null>;
  saveCertificationProgress(progress: CertificationProgressReadModel): Promise<void>;
  findCertificationProgressByLearner(learnerId: UUID): Promise<CertificationProgressReadModel[]>;
  findCompletedCertifications(learnerId: UUID): Promise<CertificationProgressReadModel[]>;

  // Community Profile
  findCommunityProfile(learnerId: UUID): Promise<CommunityProfileReadModel | null>;
  saveCommunityProfile(profile: CommunityProfileReadModel): Promise<void>;
  findTopLearnersByReputation(limit: number): Promise<CommunityProfileReadModel[]>;
  findTopLearnersByBadgeCount(limit: number): Promise<CommunityProfileReadModel[]>;
  findLearnersByMinimumSkillCount(minimumSkills: number): Promise<CommunityProfileReadModel[]>;

  // Metrics
  findMetricsForPeriod(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', date: string): Promise<MetricsReadModel | null>;
  saveMetrics(metrics: MetricsReadModel): Promise<void>;
  findMetricsForDateRange(period: string, startDate: string, endDate: string): Promise<MetricsReadModel[]>;
}

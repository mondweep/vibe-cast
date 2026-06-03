import { UUID } from '../../../shared/domain/ValueObjects';
import { IReadModelRepository } from '../../../shared/infrastructure/readmodels/IReadModelRepository';
import { CertificationProgressReadModel } from '../../../shared/infrastructure/readmodels/ReadModels';

export class CertificationProgressQueryService {
  constructor(private readModelRepository: IReadModelRepository) {}

  async getEnrollmentProgress(enrollmentId: UUID): Promise<CertificationProgressReadModel | null> {
    return this.readModelRepository.findCertificationProgress(enrollmentId);
  }

  async getLearnerCertifications(learnerId: UUID): Promise<CertificationProgressReadModel[]> {
    return this.readModelRepository.findCertificationProgressByLearner(learnerId);
  }

  async getCompletedCertifications(learnerId: UUID): Promise<CertificationProgressReadModel[]> {
    return this.readModelRepository.findCompletedCertifications(learnerId);
  }

  async getEnrollmentSummary(enrollmentId: UUID): Promise<{
    enrollmentStatus: string;
    examsPassed: number;
    examsFailed: number;
    currentGrade: number | null;
    badgeStatus: string;
    nextRenewalDate: string | null;
  } | null> {
    const progress = await this.readModelRepository.findCertificationProgress(enrollmentId);
    if (!progress) return null;

    const examsPassed = progress.exam_attempts.filter(a => a.status === 'PASSED').length;
    const examsFailed = progress.exam_attempts.filter(a => a.status === 'FAILED').length;

    return {
      enrollmentStatus: progress.enrollment_status,
      examsPassed,
      examsFailed,
      currentGrade: progress.current_grade,
      badgeStatus: progress.badge_status,
      nextRenewalDate: progress.next_renewal_date
    };
  }

  async getExamHistory(enrollmentId: UUID): Promise<Array<{
    examId: string;
    attemptNumber: number;
    score: number;
    status: string;
    completedAt: string;
  }> | null> {
    const progress = await this.readModelRepository.findCertificationProgress(enrollmentId);
    if (!progress) return null;
    return progress.exam_attempts;
  }

  async hasPassed(enrollmentId: UUID): Promise<boolean> {
    const progress = await this.readModelRepository.findCertificationProgress(enrollmentId);
    if (!progress) return false;
    return progress.enrollment_status === 'COMPLETED' && progress.badge_status === 'ISSUED';
  }

  async isExpiring(enrollmentId: UUID, withinDays: number = 30): Promise<boolean> {
    const progress = await this.readModelRepository.findCertificationProgress(enrollmentId);
    if (!progress || !progress.next_renewal_date) return false;

    const renewalDate = new Date(progress.next_renewal_date);
    const now = new Date();
    const daysUntilRenewal = (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilRenewal <= withinDays;
  }
}

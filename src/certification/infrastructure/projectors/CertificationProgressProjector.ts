import { EventHandler } from '../../../shared/domain/EventHandler';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { IReadModelRepository } from '../../../shared/infrastructure/readmodels/IReadModelRepository';
import { CertificationProgressReadModel, ExamAttemptSnapshot } from '../../../shared/infrastructure/readmodels/ReadModels';
import { UUID } from '../../../shared/domain/ValueObjects';

export class CertificationProgressProjector implements EventHandler {
  constructor(private readModelRepository: IReadModelRepository) {}

  canHandle(event: DomainEvent): boolean {
    const eventType = event.getEventName();
    return eventType === 'ExamCompleted' || eventType === 'BadgeIssued';
  }

  async handle(event: DomainEvent): Promise<void> {
    const eventType = event.getEventName();
    if (eventType === 'ExamCompleted') {
      await this.handleExamCompleted(event);
    } else if (eventType === 'BadgeIssued') {
      await this.handleBadgeIssued(event);
    }
  }

  private async handleExamCompleted(event: DomainEvent): Promise<void> {
    const enrollmentId = (event as any).enrollmentId;
    const learnerId = (event as any).learnerId;
    const examId = (event as any).examId;
    const examScore = (event as any).examScore;
    const completedAt = (event as any).completedAt;

    let progress = await this.readModelRepository.findCertificationProgress(enrollmentId);
    if (!progress) {
      progress = this.createEmptyCertificationProgress(enrollmentId, learnerId);
    }

    // Add exam attempt
    const attemptNumber = progress.exam_attempts.length + 1;
    const attempt: ExamAttemptSnapshot = {
      examId,
      attemptNumber,
      score: examScore,
      completedAt,
      status: examScore >= 70 ? 'PASSED' : 'FAILED'
    };

    // Avoid duplicates
    if (!progress.exam_attempts.some(a => a.examId === examId)) {
      progress.exam_attempts.push(attempt);
    }

    progress.current_grade = examScore;

    // If passed, update enrollment status to WAITING_FOR_BADGE
    if (examScore >= 70) {
      progress.enrollment_status = 'COMPLETED';
    } else {
      progress.enrollment_status = 'FAILED';
    }

    progress.last_synced_event_id = event.getId();
    progress.updated_at = new Date().toISOString();

    await this.readModelRepository.saveCertificationProgress(progress);
  }

  private async handleBadgeIssued(event: DomainEvent): Promise<void> {
    const enrollmentId = (event as any).enrollmentId;
    const learnerId = (event as any).learnerId;
    const badgeId = (event as any).badgeId;
    const issuedAt = (event as any).issuedAt;

    let progress = await this.readModelRepository.findCertificationProgress(enrollmentId);
    if (!progress) {
      progress = this.createEmptyCertificationProgress(enrollmentId, learnerId);
    }

    progress.badge_status = 'ISSUED';
    progress.issued_badge_id = badgeId;

    // Set next renewal date to 1 year from issuance
    const renewalDate = new Date(issuedAt);
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    progress.next_renewal_date = renewalDate.toISOString();

    progress.enrollment_status = 'COMPLETED';
    progress.last_synced_event_id = event.getId();
    progress.updated_at = new Date().toISOString();

    await this.readModelRepository.saveCertificationProgress(progress);
  }

  private createEmptyCertificationProgress(enrollmentId: UUID, learnerId: UUID): CertificationProgressReadModel {
    return {
      enrollment_id: enrollmentId,
      learner_id: learnerId,
      certification_id: '' as UUID, // Will be updated from event
      enrollment_status: 'IN_PROGRESS',
      exam_attempts: [],
      current_grade: null,
      badge_status: 'NONE',
      issued_badge_id: null,
      next_renewal_date: null,
      last_synced_event_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

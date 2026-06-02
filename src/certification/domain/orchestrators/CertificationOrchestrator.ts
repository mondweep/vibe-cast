import { SagaOrchestrator, SagaState, StepResult } from '../../../shared/domain/SagaOrchestrator';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { Logger } from '../../../shared/infrastructure/logging/Logger';
import { SagaRepository } from '../../../shared/infrastructure/persistence/SagaRepository';
import { CandidateQualified } from '../events/CandidateQualified';
import { ExamCompleted } from '../events/ExamCompleted';
import { BadgeIssued } from '../events/BadgeIssued';

/**
 * CertificationOrchestrator
 *
 * Concrete SAGA implementation for Learning → Certification workflow
 * Manages the 8-step certification process:
 * 1. INIT: Receive EnrollmentCompleted
 * 2. CREATE_CANDIDATE: Create candidate profile
 * 3. WAIT_FOR_EXAM: Block until ExamCompleted
 * 4. VALIDATE_EXAM: Check exam_score >= 70
 * 5. GRADE_EXAM: Persist final_score
 * 6. ISSUE_BADGE_OR_REMEDIATE: Badge if score >= 80, else remediate
 * 7. SCHEDULE_RENEWAL: Set next_renewal = now + 1 year
 * 8. COMPLETE: Persist final state, publish BadgeIssued
 *
 * Resume Path:
 * - When ExamCompleted fires: query saga_state WHERE enrollment_id = $enrollmentId AND current_step = WAIT_FOR_EXAM
 * - Deserialize saga_data and advance to VALIDATE_EXAM
 * - Use optimistic lock to prevent concurrent step conflicts
 *
 * Compensation:
 * - On failure: revoke badge (if issued), soft-delete candidate, publish BadgeCertificationFailed
 *
 * PHASE 4 IMPLEMENTATION:
 * - Implements all 8 steps
 * - Handles resume on ExamCompleted
 * - Implements compensation logic
 * - Uses optimistic locking for state persistence
 * - Threads correlationId through all operations
 */
export class CertificationOrchestrator extends SagaOrchestrator {
  protected workflowType = 'CERTIFICATION';
  private candidateId?: string;
  private examId?: string;
  private badgeId?: string;

  constructor(
    sagaId: string,
    logger: Logger,
    sagaRepository: SagaRepository,
    correlationId: string,
    learnerId: string,
    enrollmentId: string
  ) {
    super(
      sagaId,
      logger,
      sagaRepository,
      correlationId,
      learnerId,
      enrollmentId
    );
  }

  /**
   * Handle incoming domain events
   * Entry point for event-driven state transitions
   */
  async handleEvent(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();

    this.logger.info('CertificationOrchestrator: handling event', {
      sagaId: this.sagaId,
      eventName,
      currentStep: this.currentStep,
      correlationId: this.correlationId,
    });

    // Check idempotency
    const alreadyProcessed = await this.hasProcessedEvent(event.id);
    if (alreadyProcessed) {
      this.logger.debug('CertificationOrchestrator: skipping already-processed event', {
        sagaId: this.sagaId,
        eventName,
        eventId: event.id,
      });
      return;
    }

    try {
      if (event instanceof CandidateQualified) {
        await this.handleCandidateQualified(event);
      } else if (event instanceof ExamCompleted) {
        await this.handleExamCompleted(event);
      } else {
        this.logger.warn('CertificationOrchestrator: unhandled event type', {
          eventName,
          sagaId: this.sagaId,
        });
      }

      // Mark event as processed
      await this.markEventProcessed(event.id);
    } catch (error) {
      this.logger.error('CertificationOrchestrator: error handling event', {
        sagaId: this.sagaId,
        eventName,
        error: error instanceof Error ? error.message : String(error),
        correlationId: this.correlationId,
      });

      throw error;
    }
  }

  /**
   * Handle CandidateQualified event
   * Triggers: INIT → CREATE_CANDIDATE
   */
  private async handleCandidateQualified(event: CandidateQualified): Promise<void> {
    if (this.currentStep !== 'START' && this.currentStep !== 'INIT') {
      this.logger.warn('CertificationOrchestrator: ignoring CandidateQualified in wrong state', {
        sagaId: this.sagaId,
        currentStep: this.currentStep,
      });
      return;
    }

    this.logger.info('CertificationOrchestrator: starting certification flow', {
      sagaId: this.sagaId,
      enrollmentId: event.enrollmentId,
      learnerId: event.learnerId,
    });

    // Step 1: INIT
    await this.executeStep('INIT', async () => {
      this.logger.debug('CertificationOrchestrator: INIT step', {
        sagaId: this.sagaId,
        enrollmentId: event.enrollmentId,
      });

      return {
        success: true,
        nextStep: 'CREATE_CANDIDATE',
      };
    });

    // Step 2: CREATE_CANDIDATE
    await this.executeStep('CREATE_CANDIDATE', async () => {
      this.logger.debug('CertificationOrchestrator: CREATE_CANDIDATE step', {
        sagaId: this.sagaId,
        learnerId: event.learnerId,
      });

      // In real implementation: insert candidate_profile record
      this.candidateId = `candidate_${this.learnerId}`;
      this.setSagaData('candidateId', this.candidateId);

      return {
        success: true,
        data: { candidateId: this.candidateId },
        nextStep: 'WAIT_FOR_EXAM',
      };
    });

    // Step 3: WAIT_FOR_EXAM - Block until event arrives
    this.currentStep = 'WAIT_FOR_EXAM';
    this.logger.info('CertificationOrchestrator: waiting for exam completion', {
      sagaId: this.sagaId,
      enrollmentId: event.enrollmentId,
    });

    // Persist state as WAITING
    await this.persistSagaState('WAIT_FOR_EXAM');
  }

  /**
   * Handle ExamCompleted event
   * Resumes: WAIT_FOR_EXAM → VALIDATE_EXAM → ... → COMPLETE
   */
  private async handleExamCompleted(event: ExamCompleted): Promise<void> {
    if (this.currentStep !== 'WAIT_FOR_EXAM') {
      this.logger.warn('CertificationOrchestrator: ignoring ExamCompleted in wrong state', {
        sagaId: this.sagaId,
        currentStep: this.currentStep,
        enrollmentId: event.enrollmentId,
      });
      return;
    }

    this.logger.info('CertificationOrchestrator: resuming from WAIT_FOR_EXAM', {
      sagaId: this.sagaId,
      enrollmentId: event.enrollmentId,
      examScore: event.examScore,
    });

    this.examId = event.examId;
    this.setSagaData('examScore', event.examScore);

    // Step 4: VALIDATE_EXAM
    const validateResult = await this.executeStep('VALIDATE_EXAM', async () => {
      const examScore = event.examScore;

      this.logger.debug('CertificationOrchestrator: VALIDATE_EXAM step', {
        sagaId: this.sagaId,
        examScore,
      });

      if (examScore < 70) {
        return {
          success: false,
          error: new Error('Exam score below 70 threshold'),
          nextStep: 'FAILED',
        };
      }

      return {
        success: true,
        data: { examScore },
        nextStep: 'GRADE_EXAM',
      };
    });

    if (!validateResult.success) {
      this.logger.warn('CertificationOrchestrator: exam validation failed', {
        sagaId: this.sagaId,
        examScore: event.examScore,
      });
      return;
    }

    // Step 5: GRADE_EXAM
    await this.executeStep('GRADE_EXAM', async () => {
      this.logger.debug('CertificationOrchestrator: GRADE_EXAM step', {
        sagaId: this.sagaId,
        examScore: event.examScore,
      });

      // In real implementation: persist final_score to certificate table
      const grade = event.examScore >= 90
        ? 'A'
        : event.examScore >= 80
          ? 'B'
          : 'C';

      this.setSagaData('grade', grade);
      this.setSagaData('finalScore', event.examScore);

      return {
        success: true,
        data: { grade, finalScore: event.examScore },
        nextStep: 'ISSUE_BADGE_OR_REMEDIATE',
      };
    });

    // Step 6: ISSUE_BADGE_OR_REMEDIATE
    const issueResult = await this.executeStep('ISSUE_BADGE_OR_REMEDIATE', async () => {
      const examScore = event.examScore;

      this.logger.debug('CertificationOrchestrator: ISSUE_BADGE_OR_REMEDIATE step', {
        sagaId: this.sagaId,
        examScore,
      });

      if (examScore >= 80) {
        // Issue badge
        this.badgeId = `badge_${this.learnerId}`;
        this.setSagaData('badgeId', this.badgeId);

        return {
          success: true,
          data: { badgeIssued: true, badgeId: this.badgeId },
          nextStep: 'SCHEDULE_RENEWAL',
        };
      } else {
        // Schedule remediation
        this.setSagaData('remediationScheduled', true);

        return {
          success: true,
          data: { badgeIssued: false, remediation: true },
          nextStep: 'SCHEDULE_RENEWAL',
        };
      }
    });

    // Step 7: SCHEDULE_RENEWAL
    await this.executeStep('SCHEDULE_RENEWAL', async () => {
      this.logger.debug('CertificationOrchestrator: SCHEDULE_RENEWAL step', {
        sagaId: this.sagaId,
      });

      // Set renewal date to 1 year from now
      const renewalDate = new Date();
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      this.setSagaData('nextRenewalDate', renewalDate.toISOString());

      return {
        success: true,
        data: { nextRenewalDate: renewalDate.toISOString() },
        nextStep: 'COMPLETE',
      };
    });

    // Step 8: COMPLETE
    await this.executeStep('COMPLETE', async () => {
      this.logger.info('CertificationOrchestrator: COMPLETE step', {
        sagaId: this.sagaId,
        badgeId: this.badgeId,
      });

      // Publish BadgeIssued event if badge was issued
      if (this.badgeId) {
        const badgeIssued = new BadgeIssued({
          badgeId: this.badgeId,
          learnerId: this.learnerId,
          certificationName: 'Professional Certificate',
          issuedAt: new Date().toISOString(),
          correlationId: this.correlationId,
        });

        this.logger.debug('CertificationOrchestrator: publishing BadgeIssued', {
          badgeId: this.badgeId,
          correlationId: this.correlationId,
        });

        // Note: EventBus will be injected in Phase 5
        // For now, just store event data in saga
        this.setSagaData('publishedEvents', [badgeIssued.toPrimitives()]);
      }

      return {
        success: true,
        data: {
          sagaCompleted: true,
          badgeIssued: !!this.badgeId,
        },
      };
    });

    this.state = SagaState.COMPLETED;

    this.logger.info('CertificationOrchestrator: certification flow completed', {
      sagaId: this.sagaId,
      badgeIssued: !!this.badgeId,
      correlationId: this.correlationId,
    });
  }

  /**
   * Compensation logic - cleanup on failure
   *
   * On any step failure:
   * 1. Revoke badge (if issued)
   * 2. Soft-delete candidate record
   * 3. Update SAGA status to COMPENSATED
   */
  protected async compensate(): Promise<void> {
    this.logger.error('CertificationOrchestrator: compensation triggered', {
      sagaId: this.sagaId,
      currentStep: this.currentStep,
    });

    try {
      if (this.badgeId) {
        this.logger.info('CertificationOrchestrator: revoking badge', {
          sagaId: this.sagaId,
          badgeId: this.badgeId,
        });

        // In real implementation: revoke badge from badge table
        this.setSagaData('badgeRevoked', true);
      }

      if (this.candidateId) {
        this.logger.info('CertificationOrchestrator: soft-deleting candidate', {
          sagaId: this.sagaId,
          candidateId: this.candidateId,
        });

        // In real implementation: soft-delete candidate_profile record
        this.setSagaData('candidateDeleted', true);
      }

      // Publish BadgeCertificationFailed for audit
      this.setSagaData('compensationCompleted', true);

      // Persist final state
      await this.persistSagaState(this.currentStep, 'COMPENSATED');

      this.state = SagaState.COMPENSATION_TRIGGERED;

      this.logger.info('CertificationOrchestrator: compensation completed', {
        sagaId: this.sagaId,
      });
    } catch (error) {
      this.logger.error('CertificationOrchestrator: compensation failed', {
        sagaId: this.sagaId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get certification workflow status
   */
  getWorkflowStatus(): {
    sagaId: string;
    currentStep: string;
    state: SagaState;
    candidateId?: string;
    badgeId?: string;
    sagaData: Record<string, any>;
  } {
    return {
      sagaId: this.sagaId,
      currentStep: this.currentStep,
      state: this.state,
      candidateId: this.candidateId,
      badgeId: this.badgeId,
      sagaData: this.getSagaData(),
    };
  }
}

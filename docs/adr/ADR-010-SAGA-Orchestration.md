# ADR-010: SAGA Orchestration Pattern — Choreography vs. Orchestration Decision

**Status:** ACCEPTED (2026-06-02)  
**Context:** Week 9 cross-domain workflows; certification pathway  
**Deciders:** Architecture team, Domain leads  

---

## Problem

Vibe-Cast has multi-step business processes spanning multiple bounded contexts:

### Example: Certification Pathway
```
User enrolls in Learning Path
    ↓
Completes all courses (weeks)
    ↓
Qualifies for Certification exam
    ↓
Schedules exam appointment
    ↓
Takes proctored exam (2 hours)
    ↓
Auto-graded (1 minute)
    ↓
Score >= 75% ?
    ├─ YES → Issue Badge, Unlock advanced paths, Update reputation
    └─ NO → Send remediation plan, Schedule coaching
```

**Challenges:**
1. **Atomicity:** All steps succeed or fail together (no partial certifications)
2. **Ordering:** Steps must occur in sequence (can't issue badge before exam)
3. **Visibility:** Operations team needs to see "stuck workflows" (user certified 5 days ago, badge not issued?)
4. **Failure recovery:** If exam service down, retry intelligently
5. **Compensation:** If badge issuance fails, undo earlier steps (refund reputation?)

**Two architectural approaches:**

### Choreography (Event-Driven)
```
Enrollment Service:
  Publishes: EnrollmentCompleted
    ↓
Certification Service (listens):
  Creates CertificationCandidate
  Publishes: CandidateQualified
    ↓
Scheduler Service (listens):
  Schedules exam
  Publishes: ExamScheduled
    ↓
... (5+ more services reacting independently)
```

**Pros:** Decoupled, scales well, simple code  
**Cons:** Hard to track overall workflow, nightmare debugging if step 7 fails, no retry logic

### Orchestration (Central Coordinator)
```
CertificationOrchestrator (owns workflow):
  1. Wait for EnrollmentCompleted event
  2. Create CertificationCandidate (call Cert service)
  3. Schedule exam (call Scheduler service)
  4. Wait for ExamCompleted event
  5. Check score; if pass → Issue badge
  6. Retry 3x if any step fails
  7. Alert admin if step fails 3x
```

**Pros:** Clear workflow, easy to debug, built-in retries  
**Cons:** Central coordinator is bottleneck, single point of failure

---

## Decision

**Use SAGA Pattern with ORCHESTRATION (Vibe-Cast specific)**

### Rationale
1. **Vibe-Cast complexity:** 3-6 steps per workflow; certification is high-stakes (trust-critical)
2. **Observability requirement:** "Why hasn't this learner's badge been issued?" must be answerable in <5 seconds
3. **Failure visibility:** Team must know workflow steps, not infer from scattered events
4. **Regulatory compliance:** Audit trail required for certifications; orchestrator logs each step
5. **Limited scale:** 500 learners = ~50 concurrent certification workflows; single orchestrator sufficient

### Architecture

```
┌──────────────────────────────────────────────────────┐
│         CertificationOrchestrator                    │
│  (Stateful workflow engine)                          │
└──────────────────────────────────────────────────────┘
         ↓              ↓              ↓
    Cert Service  Scheduler    Email Service
    (call sync)   (call sync)   (call sync)
         │              │              │
         └──────┬───────┴──────┬───────┘
                ↓              ↓
            (return)        (store results)
                │              │
         ┌──────┴──────────────┴────────┐
         ↓                              ↓
    Next step or     ┌─────────────────────────┐
    Failure/Retry    │  SAGA Log (audit trail) │
                     │  Step 1: OK             │
                     │  Step 2: RETRY 2/3      │
                     │  Step 3: WAIT for event │
                     └─────────────────────────┘
```

---

## SAGA Workflow Definition (Certification Example)

```typescript
// src/domain/certification/saga/CertificationSaga.ts

enum SagaStep {
  INIT = 'INIT',
  CREATE_CANDIDATE = 'CREATE_CANDIDATE',
  SEND_WELCOME_EMAIL = 'SEND_WELCOME_EMAIL',
  WAIT_FOR_EXAM = 'WAIT_FOR_EXAM',
  VALIDATE_EXAM = 'VALIDATE_EXAM',
  GRADE_EXAM = 'GRADE_EXAM',
  ISSUE_BADGE_OR_REMEDIATE = 'ISSUE_BADGE_OR_REMEDIATE',
  SCHEDULE_RENEWAL = 'SCHEDULE_RENEWAL',
  COMPLETE = 'COMPLETE'
}

interface SagaState {
  id: UUID;                         // Saga instance ID
  workflowType: 'CERTIFICATION';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: DateTime;
  completedAt?: DateTime;
  
  // Domain data
  learnerId: UUID;
  enrollmentId: UUID;
  certificationId: UUID;
  
  // Workflow tracking
  currentStep: SagaStep;
  stepHistory: SagaStepRecord[];    // Audit trail
  
  // Saga state
  candidate?: CertificationCandidate;
  examAttempt?: CertificationAttempt;
  examScore?: number;
  badge?: Badge;
  
  // Failure tracking
  lastError?: string;
  retryCount: number;
  nextRetryAt?: DateTime;
}

interface SagaStepRecord {
  step: SagaStep;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'COMPENSATED';
  startedAt: DateTime;
  completedAt?: DateTime;
  result?: any;
  errorMessage?: string;
  retries: number;
  compensatingAction?: SagaStep;  // For rollback
}

class CertificationSaga {
  
  async execute(enrollmentId: UUID): Promise<void> {
    const saga = SagaState.create({
      workflowType: 'CERTIFICATION',
      enrollmentId,
      learnerId: enrollment.learnerId,
      currentStep: SagaStep.INIT
    });
    
    try {
      await this.step_CreateCandidate(saga);
      await this.step_SendWelcomeEmail(saga);
      await this.step_WaitForExam(saga);          // Async wait
      await this.step_ValidateExam(saga);
      await this.step_GradeExam(saga);
      await this.step_IssueBadgeOrRemediate(saga);
      await this.step_ScheduleRenewal(saga);
      
      saga.status = 'COMPLETED';
      await this.sagaRepo.save(saga);
      
    } catch (error) {
      saga.status = 'FAILED';
      saga.lastError = error.message;
      await this.sagaRepo.save(saga);
      
      // Alert operations team
      await this.alertService.sendSlackAlert({
        severity: 'HIGH',
        message: `Certification workflow failed for learner ${saga.learnerId}`,
        saga_id: saga.id,
        step: saga.currentStep,
        error: error.message
      });
      
      // Attempt compensation (rollback)
      await this.compensate(saga);
    }
  }
  
  // Step 1: Create candidate
  private async step_CreateCandidate(saga: SagaState): Promise<void> {
    const step = saga.recordStep(SagaStep.CREATE_CANDIDATE, 'IN_PROGRESS');
    
    try {
      const candidate = CertificationCandidate.create({
        learnerId: saga.learnerId,
        certificationId: saga.certificationId,
        qualifiedAt: now()
      });
      
      saga.candidate = await this.certRepo.saveCandidate(candidate);
      saga.currentStep = SagaStep.SEND_WELCOME_EMAIL;
      
      step.status = 'SUCCESS';
      step.result = { candidateId: saga.candidate.id };
      
    } catch (error) {
      step.status = 'FAILED';
      step.errorMessage = error.message;
      step.compensatingAction = null; // Can't undo candidate creation (data integrity)
      
      throw error; // Stop saga
    }
  }
  
  // Step 2: Send email
  private async step_SendWelcomeEmail(saga: SagaState): Promise<void> {
    const step = saga.recordStep(SagaStep.SEND_WELCOME_EMAIL, 'IN_PROGRESS');
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.emailService.sendWelcomeEmail({
          recipientId: saga.learnerId,
          candidateId: saga.candidate.id,
          certificationName: saga.certification.name
        });
        
        saga.currentStep = SagaStep.WAIT_FOR_EXAM;
        step.status = 'SUCCESS';
        return;
        
      } catch (error) {
        if (attempt === maxRetries) {
          step.status = 'FAILED';
          step.errorMessage = `Email failed after ${maxRetries} retries`;
          step.compensatingAction = null; // Email non-critical, don't block
          step.retries = maxRetries;
          
          // Non-critical failure; log but continue
          this.logger.warn('Email send failed (non-critical)', { error, saga });
          saga.currentStep = SagaStep.WAIT_FOR_EXAM; // Continue
          return;
        }
        
        step.retries = attempt;
        step.status = 'RETRY';
        await wait(1000 * attempt); // Exponential backoff
      }
    }
  }
  
  // Step 3: Wait for exam (async)
  // Orchestrator subscribes to ExamCompleted event
  private async step_WaitForExam(saga: SagaState): Promise<void> {
    const step = saga.recordStep(SagaStep.WAIT_FOR_EXAM, 'PENDING');
    
    // Store saga in waiting state
    saga.currentStep = SagaStep.WAIT_FOR_EXAM;
    await this.sagaRepo.save(saga);
    
    // Pause orchestrator; ExamCompleted event handler will resume
    // (See event handler below)
  }
  
  // Triggered by ExamCompleted event
  async onExamCompleted(event: ExamCompletedEvent): Promise<void> {
    const saga = await this.sagaRepo.findByCandidateId(event.candidateId);
    if (!saga || saga.currentStep !== SagaStep.WAIT_FOR_EXAM) {
      return; // Not our saga
    }
    
    const step = saga.stepHistory.find(s => s.step === SagaStep.WAIT_FOR_EXAM);
    step!.status = 'SUCCESS';
    step!.completedAt = now();
    
    saga.examScore = event.score;
    saga.currentStep = SagaStep.VALIDATE_EXAM;
    
    // Resume orchestrator
    await this.execute_resume(saga);
  }
  
  // Step 4: Validate exam integrity
  private async step_ValidateExam(saga: SagaState): Promise<void> {
    const step = saga.recordStep(SagaStep.VALIDATE_EXAM, 'IN_PROGRESS');
    
    try {
      const isValid = await this.examValidator.validate({
        candidateId: saga.candidate.id,
        examAttemptId: saga.examAttempt.id,
        suspiciousFlags: saga.examAttempt.suspiciousFlags
      });
      
      if (!isValid) {
        throw new Error('Exam failed validation (suspected cheating)');
      }
      
      saga.currentStep = SagaStep.GRADE_EXAM;
      step.status = 'SUCCESS';
      
    } catch (error) {
      step.status = 'FAILED';
      step.errorMessage = error.message;
      step.compensatingAction = null; // Can't undo validation
      
      // Escalate to human review
      await this.alertService.createIncident({
        type: 'EXAM_VALIDATION_FAILED',
        severity: 'CRITICAL',
        saga_id: saga.id,
        message: error.message
      });
      
      throw error;
    }
  }
  
  // Step 5: Grade exam
  private async step_GradeExam(saga: SagaState): Promise<void> {
    const step = saga.recordStep(SagaStep.GRADE_EXAM, 'IN_PROGRESS');
    
    try {
      const grade = await this.examGrader.grade({
        examAttemptId: saga.examAttempt.id,
        responses: saga.examAttempt.responses
      });
      
      saga.examScore = grade.score;
      saga.currentStep = SagaStep.ISSUE_BADGE_OR_REMEDIATE;
      
      step.status = 'SUCCESS';
      step.result = { score: grade.score };
      
    } catch (error) {
      step.status = 'FAILED';
      step.errorMessage = error.message;
      throw error;
    }
  }
  
  // Step 6: Decision point
  private async step_IssueBadgeOrRemediate(saga: SagaState): Promise<void> {
    const step = saga.recordStep(SagaStep.ISSUE_BADGE_OR_REMEDIATE, 'IN_PROGRESS');
    
    try {
      if (saga.examScore >= 75) {
        // PASS: Issue badge
        const badge = Badge.create({
          learnerId: saga.learnerId,
          certificationId: saga.certificationId,
          issuedAt: now(),
          expiresAt: now().add(2, 'years')
        });
        
        saga.badge = await this.badgeRepo.save(badge);
        
        // Publish event for other domains
        await this.eventBus.publish(new BadgeIssuedEvent({
          badgeId: badge.id,
          learnerId: saga.learnerId,
          certificationId: saga.certificationId
        }));
        
        step.status = 'SUCCESS';
        step.result = { badgeId: badge.id, action: 'ISSUED' };
        
      } else {
        // FAIL: Send remediation plan
        await this.emailService.sendRemediationPlan({
          learnerId: saga.learnerId,
          score: saga.examScore,
          certificationId: saga.certificationId
        });
        
        step.status = 'SUCCESS';
        step.result = { action: 'REMEDIATED' };
      }
      
      saga.currentStep = SagaStep.SCHEDULE_RENEWAL;
      
    } catch (error) {
      step.status = 'FAILED';
      step.errorMessage = error.message;
      step.compensatingAction = SagaStep.ISSUE_BADGE_OR_REMEDIATE; // Retry
      
      // Retry logic
      saga.retryCount++;
      if (saga.retryCount < 3) {
        saga.nextRetryAt = now().add(30 + (saga.retryCount * 60), 'seconds');
        // Scheduler will resume saga at nextRetryAt
      } else {
        // Give up; alert admin
        throw error;
      }
    }
  }
  
  // Step 7: Schedule renewal reminder
  private async step_ScheduleRenewal(saga: SagaState): Promise<void> {
    const step = saga.recordStep(SagaStep.SCHEDULE_RENEWAL, 'IN_PROGRESS');
    
    try {
      await this.scheduler.schedule({
        eventType: 'CertificationRenewalReminder',
        scheduledFor: saga.badge.expiresAt.subtract(30, 'days'),
        payload: { badgeId: saga.badge.id, learnerId: saga.learnerId }
      });
      
      saga.currentStep = SagaStep.COMPLETE;
      step.status = 'SUCCESS';
      
    } catch (error) {
      step.status = 'FAILED';
      step.errorMessage = error.message;
      // Non-critical; continue
      saga.currentStep = SagaStep.COMPLETE;
    }
  }
  
  // Compensation logic (rollback on failure)
  private async compensate(saga: SagaState): Promise<void> {
    this.logger.warn(`Compensating saga: ${saga.id}`);
    
    // Walk backward through steps that succeeded
    for (const step of saga.stepHistory.reverse()) {
      if (step.status !== 'SUCCESS' || !step.compensatingAction) {
        continue;
      }
      
      this.logger.info(`Compensating step: ${step.step}`);
      
      switch (step.compensatingAction) {
        case null:
          // No compensation available
          break;
          
        case SagaStep.ISSUE_BADGE_OR_REMEDIATE:
          // If badge was issued, revoke it
          if (saga.badge) {
            await this.badgeRepo.revoke(saga.badge.id);
            
            // Publish event for other domains
            await this.eventBus.publish(new BadgeRevokedEvent({
              badgeId: saga.badge.id,
              learnerId: saga.learnerId,
              reason: 'Saga compensated'
            }));
          }
          break;
      }
    }
  }
}
```

---

## SAGA State Management

**Storage (PostgreSQL):**
```sql
CREATE TABLE sagas (
  id UUID PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,     -- RUNNING, COMPLETED, FAILED
  
  -- Domain context
  learner_id UUID NOT NULL,
  enrollment_id UUID NOT NULL,
  certification_id UUID NOT NULL,
  
  -- Workflow state
  current_step VARCHAR(50) NOT NULL,
  saga_state JSONB NOT NULL,       -- Serialized SagaState
  
  -- Tracking
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  FOREIGN KEY (learner_id) REFERENCES learners(id),
  INDEX idx_learner_id (learner_id),
  INDEX idx_current_step (current_step),
  INDEX idx_status (status),
  INDEX idx_next_retry_at (next_retry_at)  -- For retry scheduler
);

CREATE TABLE saga_steps (
  id UUID PRIMARY KEY,
  saga_id UUID NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT,
  retries INT DEFAULT 0,
  
  FOREIGN KEY (saga_id) REFERENCES sagas(id) ON DELETE CASCADE,
  INDEX idx_saga_id (saga_id)
);
```

---

## Event-Driven Resume (SAGA with Events)

**Hybrid approach:** Orchestrator handles "critical path"; events resume async steps

```typescript
// Learning domain publishes this when learner enrolls
export class LearnerEnrolledEvent extends DomainEvent {
  constructor(
    public enrollmentId: UUID,
    public learnerId: UUID,
    public pathId: UUID,
    public enrolledAt: DateTime
  ) {
    super();
  }
}

// Certification orchestrator subscribes
@EventHandler()
async onLearnerEnrolled(event: LearnerEnrolledEvent): Promise<void> {
  // Check if this enrollment triggers certification pathway
  const path = await this.learningRepo.findPath(event.pathId);
  const cert = await this.certRepo.findByLearningPath(event.pathId);
  
  if (!cert) return; // No certification required
  
  // Start new SAGA
  const saga = new CertificationSaga(
    learnerId: event.learnerId,
    enrollmentId: event.enrollmentId,
    certificationId: cert.id
  );
  
  // Execute synchronously until async wait point
  await saga.execute();
}
```

---

## Observability & Monitoring

**SAGA Dashboard Query:**
```sql
-- Find long-running sagas (possible stuck workflows)
SELECT 
  s.id,
  s.learner_id,
  s.current_step,
  EXTRACT(EPOCH FROM (NOW() - s.started_at)) as duration_seconds,
  s.status
FROM sagas s
WHERE s.status = 'RUNNING'
  AND NOW() - s.started_at > INTERVAL '4 hours'  -- Threshold
ORDER BY s.started_at ASC;

-- Audit trail for specific learner
SELECT 
  s.id as saga_id,
  ss.step_name,
  ss.status,
  ss.result,
  ss.error_message,
  ss.started_at,
  ss.completed_at
FROM sagas s
  JOIN saga_steps ss ON s.id = ss.saga_id
WHERE s.learner_id = ?
ORDER BY s.started_at DESC, ss.started_at ASC;

-- Step success rate
SELECT 
  current_step,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as successful,
  ROUND(100.0 * COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) / COUNT(*), 2) as success_rate
FROM saga_steps
WHERE saga_id IN (SELECT id FROM sagas WHERE completed_at > NOW() - INTERVAL '7 days')
GROUP BY current_step
ORDER BY success_rate DESC;
```

---

## Consequences

### Positive
✅ **Visibility:** Full workflow audit trail; easy to debug stuck workflows  
✅ **Reliability:** Explicit retry logic; failures don't cascade  
✅ **Compliance:** Step-by-step record for certification audits  
✅ **Scalability:** Stateless orchestrator (can run on multiple instances with shared DB)  

### Tradeoffs
⚠️ **Complexity:** More code than choreography; requires step definitions  
⚠️ **Bottleneck risk:** Single orchestrator can become bottleneck (mitigated: stateless)  
⚠️ **Distributed tracing:** Must propagate correlationId through all steps  
⚠️ **Testing:** SAGA tests are integration tests (slower, need real services)  

---

## Alternatives Considered

### 1. Pure Choreography (Events Only)
**Rejected:** No workflow visibility; "why hasn't badge been issued?" unanswerable  
Example: 5 services react to events independently; if step 4 fails, steps 1-3 done but step 5 never runs

### 2. Synchronous RPC (REST calls)
**Rejected:** Blocks on slow services; tight coupling  
Example: If email service slow (5 seconds), entire user waits; scales poorly

### 3. Temporal (Cadence/Temporal Workflow Orchestrator)
**Rejected:** Too heavy for Week 9; requires separate cluster  
Benefit: Better fault tolerance, but overkill for 50 concurrent workflows  
Cost: $1000+/month for managed Temporal

---

## Implementation Checklist (Week 9)

- [ ] Design SAGA state machine (steps, transitions)
- [ ] Create `SagaState`, `SagaStep` domain objects
- [ ] Create `CertificationOrchestrator` class
- [ ] Implement SAGA persistence (PostgreSQL)
- [ ] Implement step execution logic (with retries)
- [ ] Add event handlers to resume SAGAs (ExamCompleted → resume)
- [ ] Add compensation logic (rollback on failure)
- [ ] Create SAGA monitoring dashboard
- [ ] Write SAGA integration tests
- [ ] Document SAGA workflows (architecture diagram + sequence)

---

## Related Decisions
- **ADR-009:** EventBus (transport for SAGA events)
- **ADR-004:** Already decided orchestration vs. choreography; this ADR details implementation

---

**Approved by:** Architecture Lead  
**Date:** 2026-06-02  
**Review date:** 2026-09-02 (post-launch monitoring)

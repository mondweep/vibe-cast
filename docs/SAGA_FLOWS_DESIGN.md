# SAGA Flows Design - Phase 2 Implementation

**Version**: 1.0  
**Date**: June 2, 2026  
**Status**: DESIGN PHASE (Week 9)  
**Designed By**: SAGA Coordinator  

---

## Executive Summary

Three distributed SAGA flows coordinate complex, multi-domain transactions across Vibe-Cast's event-driven architecture:

| SAGA | Domains | Type | Duration | Compensation |
|------|---------|------|----------|--------------|
| **LabCompletion** | SkillLab → Metrics → Learning → Certification | Orchestrated | 500ms | Full revert |
| **PeerReview** | Community → Learning → Metrics | Choreography | 600ms | Partial revert |
| **DifficultyAdjustment** | Metrics → SkillLab → Learning | Asynchronous | N/A (async) | None (idempotent) |

---

## SAGA 1: LabCompletionSaga

### Business Context

When a learner completes a skill lab (submits all challenges), the system must:
1. Record completion metrics
2. Check exam eligibility prerequisites
3. Mark learner as eligible for certification exam
4. Award reputation in community

### Flow Diagram

```
Learner Submits Lab
        ↓
SkillLab.LabSubmitted event
        ↓
    [SAGA START]
        │
        ├─→ Step 1: Metrics.RecordLabCompletion (80ms)
        │           ├─ Track completion time
        │           ├─ Score lab quality
        │           └─ Publish: MetricsRecorded
        │
        ├─→ Step 2: Learning.CheckExamEligibility (60ms)
        │           ├─ Verify prerequisites met
        │           ├─ Check path completion status
        │           └─ Publish: EligibilityChecked
        │
        ├─→ Step 3: Certification.MarkEligible (70ms)
        │           ├─ Create CertificationCandidate record
        │           ├─ Trigger "Ready to certify" email
        │           └─ Publish: CandidateMarked
        │
        ├─→ Step 4: Community.AwardReputation (50ms)
        │           ├─ Add reputation points (10-30 based on score)
        │           ├─ Update profile
        │           └─ Publish: ReputationAwarded
        │
        └─→ SAGA COMPLETE (timeout: 500ms total)

FAILURE AT STEP 2 (CheckExamEligibility fails):
    ├─ COMPENSATE Step 1: Metrics.RevertLabCompletion
    └─ Rollback: Metrics state restored, saga fails

FAILURE AT STEP 3 (Certification.MarkEligible fails):
    ├─ COMPENSATE Step 2: Learning.RevertEligibilityCheck
    ├─ COMPENSATE Step 1: Metrics.RevertLabCompletion
    └─ Rollback: Learning & Metrics state restored

FAILURE AT STEP 4 (Community.AwardReputation fails):
    ├─ COMPENSATE Step 3: Certification.RevertCandidate
    ├─ COMPENSATE Step 2: Learning.RevertEligibilityCheck
    ├─ COMPENSATE Step 1: Metrics.RevertLabCompletion
    └─ Rollback: All state restored
```

### Event Contracts

```yaml
LabCompletionSaga.Start:
  Source: SkillLab domain
  Event: LabSessionCompleted
  Schema:
    sessionId: UUID
    learnerId: UUID
    labId: UUID
    finalScore: number (0-100)
    timeSpentSeconds: number
    challengesPassed: number
    totalChallenges: number
  
LabCompletionSaga.Step1.Request:
  Target: Metrics service
  Command: RecordLabCompletion
  Timeout: 80ms
  Retry: 3x with exponential backoff (50ms, 100ms, 200ms)
  
  Failure Scenarios:
    - Metrics service timeout → Reject saga
    - Database connection error → Retry
    - Invalid input → Reject saga (no compensation)
  
  Success Response:
    Event: LabCompletionRecorded
    Fields:
      metricsEventId: UUID
      learnerId: UUID
      score: number
      recordedAt: DateTime

LabCompletionSaga.Step2.Request:
  Target: Learning service
  Command: CheckExamEligibility
  Timeout: 60ms
  Prerequisites:
    - All required paths completed
    - Minimum score threshold met
    - No ongoing learning enrollment blocks
  
  Success Response:
    Event: EligibilityVerified
    Eligible: boolean
    Reason: string (if not eligible)

LabCompletionSaga.Step3.Request:
  Target: Certification service
  Command: MarkEligibleForExam
  Timeout: 70ms
  
  Idempotency: Use (learnerId, certificationId) as key
  If already marked: Return success (idempotent)
  
  Success Response:
    Event: CertificationCandidateCreated
    candidateId: UUID
    learnerId: UUID
    certificationId: UUID
    eligibleAt: DateTime

LabCompletionSaga.Step4.Request:
  Target: Community service
  Command: AwardReputation
  Timeout: 50ms
  Calculation:
    - Base: 10 points
    - Bonus: (finalScore - 50) / 2 if score > 50
    - Cap: max 30 points
  
  Success Response:
    Event: ReputationAwarded
    memberId: UUID
    points: number
    totalReputation: number
```

### Compensation Logic

```yaml
Compensation.Step3.RevertCandidate:
  Condition: Step 3 failed or timeout
  Action: DELETE CertificationCandidate
  Method: Soft delete (mark as reverted)
  Idempotency: Safe to call multiple times
  Timeout: 40ms
  
Compensation.Step2.RevertEligibility:
  Condition: Step 2 failed or timeout
  Action: Clear Learning.examEligibilityFlag
  Method: Update enrollmentId set flag = false
  Idempotency: Safe to call multiple times
  Timeout: 40ms

Compensation.Step1.RevertMetrics:
  Condition: Step 1 failed or timeout
  Action: Mark LabCompletionEvent as reverted
  Method: Soft delete event record
  Idempotency: Safe to call multiple times
  Timeout: 40ms
```

### Failure Scenarios & Responses

**Scenario 1: Metrics service down (Step 1 timeout)**
- Duration: 80ms timeout → immediate fail
- Status: Saga rejected before Learning check
- Recovery: Metrics service comes online, learner can re-submit lab
- Learner Impact: "Lab submission temporarily unavailable, please try again"

**Scenario 2: Learning service returns "not eligible" (Step 2 fails)**
- Duration: 60ms check completes, returns ineligible
- Status: Compensation triggers for Step 1 (Metrics reverted)
- Recovery: Learner must complete more prerequisites
- Learner Impact: "Not yet ready for exam. Complete path X to become eligible"

**Scenario 3: Certification service DB error (Step 3 fails after 2 retries)**
- Duration: 70ms timeout → retries → final failure
- Status: Compensate Steps 2 & 1
- Recovery: Retry SAGA from start (Learning & Metrics are clean)
- Learner Impact: "Processing error. Lab completion saved. Try again in 30 seconds"

**Scenario 4: Community service partial failure (Step 4 fails)**
- Duration: 50ms timeout
- Status: Compensate all previous steps
- Recovery: Learner manually award reputation via admin panel
- Learner Impact: "Lab completed. Reputation sync delayed, will be awarded shortly"

### Timeout & Retry Policy

```yaml
LabCompletionSaga.TimeoutPolicy:
  Total SAGA timeout: 500ms (non-negotiable)
  
  Step 1 (Metrics):
    Timeout: 80ms
    Retries: 3x
    Backoff: exponential (50ms, 100ms, 200ms)
    Total reserved: 350ms
  
  Step 2 (Learning):
    Timeout: 60ms
    Retries: 2x
    Backoff: exponential (40ms, 80ms)
    Total reserved: 180ms
  
  Step 3 (Certification):
    Timeout: 70ms
    Retries: 2x
    Backoff: exponential (45ms, 90ms)
    Total reserved: 225ms
  
  Step 4 (Community):
    Timeout: 50ms
    Retries: 1x
    Backoff: linear (40ms)
    Total reserved: 90ms
  
  Buffer: 50ms for coordination overhead
  
  If any step exceeds budget → fail fast, compensate
```

### Byzantine Failure Handling

**Network Partition: Metrics unreachable**
- Step 1 times out at 80ms
- No compensation needed yet
- Entire SAGA fails
- Result: Lab marked as "pending completion" (idempotent retry safe)

**Partial Failure: Certification DB reachable but slow**
- Step 3 takes 150ms (exceeds 70ms budget)
- Coordinator times out, triggers compensation
- Certification candidate creation never persisted (verify before retrying)
- Result: Safe to retry SAGA

**Cascading: Learning service crashes after Step 2 succeeds**
- Learning DB successfully committed eligibility
- Certification service never receives request
- Compensation Step 2 restores eligibility flag = false
- Result: Learning and Certification are inconsistent for 30 seconds (eventual consistency window)

---

## SAGA 2: PeerReviewSaga

### Business Context

When a community member submits a code review of another learner's lab solution:
1. Record review in Learning domain (for progress tracking)
2. Update reviewer reputation in Community
3. Index review for search/analytics in Metrics

### Flow Diagram

```
Reviewer Submits Code Review
        ↓
Community.ReviewSubmitted event
        ↓
    [SAGA START]
        │
        ├─→ Step 1: Learning.RecordReviewScore (80ms)
        │           ├─ Validate review authenticity
        │           ├─ Store review against solution
        │           └─ Publish: ReviewRecorded
        │
        ├─→ Step 2: Community.UpdateReputation (70ms)
        │           ├─ Calculate reputation: base 5 + quality bonus (0-15)
        │           ├─ Update reviewer's total reputation
        │           ├─ Update reviewed learner's feedback count
        │           └─ Publish: ReputationUpdated
        │
        ├─→ Step 3: Metrics.IndexReview (100ms)
        │           ├─ Ingest review event to ClickHouse
        │           ├─ Update reviewer contribution count
        │           ├─ Trigger leaderboard recalc
        │           └─ Publish: ReviewIndexed
        │
        └─→ SAGA COMPLETE (timeout: 600ms total)

FAILURE AT STEP 1 (Learning validation fails):
    └─ REJECT saga, no compensation needed
       (no state mutations yet)

FAILURE AT STEP 2 (Community.UpdateReputation fails):
    ├─ COMPENSATE Step 1: Learning.RevertReview
    └─ Rollback: Learning state restored

FAILURE AT STEP 3 (Metrics indexing fails):
    ├─ COMPENSATE Step 2: Community.RevertReputation
    ├─ COMPENSATE Step 1: Learning.RevertReview
    └─ Rollback: All state restored
```

### Event Contracts

```yaml
PeerReviewSaga.Start:
  Source: Community domain
  Event: ReviewSubmitted
  Schema:
    reviewId: UUID
    reviewerId: UUID
    solutionId: UUID
    labId: UUID
    content: string (max 5000 chars)
    qualityScore: number (1-5)
    submittedAt: DateTime
  
PeerReviewSaga.Step1.Request:
  Target: Learning service
  Command: ValidateAndRecordReview
  Timeout: 80ms
  Validation:
    - Reviewer must have completed same lab
    - Reviewer must be certified in domain (optional)
    - Solution must exist and belong to target learner
    - No duplicate reviews within 24h
  
  Success Response:
    Event: ReviewRecorded
    learningReviewId: UUID
    learnerId: UUID (reviewed learner)
    reviewScore: number (inferred from content NLP)
  
  Failure Response:
    Event: ReviewValidationFailed
    Reason: "user_not_qualified" | "solution_not_found" | "duplicate_review"

PeerReviewSaga.Step2.Request:
  Target: Community service
  Command: AwardReviewReputation
  Timeout: 70ms
  Calculation:
    reviewerReputation = 5 (base) + qualityScore*3
    reviewedLearnerReputation = 2 (for feedback received)
  
  Idempotency: Use reviewId as key
  If already awarded: Return existing state
  
  Success Response:
    Event: ReputationAwarded
    reviewerId: UUID
    reviewerNewTotal: number
    reviewedLearnerId: UUID
    feedbackCount: number

PeerReviewSaga.Step3.Request:
  Target: Metrics service
  Command: IndexReview
  Timeout: 100ms
  Data:
    reviewId: UUID
    reviewerId: UUID
    reviewedLearnerId: UUID
    labId: UUID
    qualityScore: number
    timestamp: DateTime
    reviewerReputationDelta: number
  
  Success Response:
    Event: ReviewIndexed
    metricsEventId: UUID
```

### Compensation Logic

```yaml
Compensation.Step2.RevertReputation:
  Condition: Step 2 failed or Step 3 failed
  Action: Subtract reputation points
  Method: UPDATE community_members SET reputation = reputation - delta
  Idempotency: Check if reputation was already awarded
  Timeout: 50ms

Compensation.Step1.RevertReview:
  Condition: Step 1 failed or any subsequent step failed
  Action: Soft delete review record
  Method: UPDATE learning_reviews SET deleted_at = NOW()
  Idempotency: Safe to call multiple times
  Timeout: 50ms
```

### Failure Scenarios & Responses

**Scenario 1: Learning validation fails (reviewer not qualified)**
- Duration: 30ms check completes
- Status: Saga rejected before Community update
- Recovery: Reviewer must complete domain certification first
- Reviewer Impact: "You must complete [Domain] certification to review"

**Scenario 2: Community reputation update times out**
- Duration: 70ms timeout after 2 retries
- Status: Compensate Step 1 (review deleted)
- Recovery: Metrics eventually processes review (idempotent insert)
- Reviewer Impact: "Review failed to publish. Retrying..."

**Scenario 3: Metrics indexing fails (ClickHouse down)**
- Duration: 100ms timeout
- Status: Compensate Steps 2 & 1
- Recovery: Dead-letter queue will retry when ClickHouse recovers
- Reviewer Impact: "Review published but leaderboard update delayed"

### Timeout & Retry Policy

```yaml
PeerReviewSaga.TimeoutPolicy:
  Total SAGA timeout: 600ms
  
  Step 1 (Learning):
    Timeout: 80ms
    Retries: 2x
    Backoff: exponential (50ms, 100ms)
    Total reserved: 230ms
  
  Step 2 (Community):
    Timeout: 70ms
    Retries: 2x
    Backoff: exponential (50ms, 100ms)
    Total reserved: 220ms
  
  Step 3 (Metrics):
    Timeout: 100ms
    Retries: 1x
    Backoff: linear (80ms)
    Total reserved: 180ms
  
  Buffer: 50ms
  
  Leeway: 600 - 230 - 220 - 180 - 50 = (unused)
  Strategy: Fail fast if any service slow
```

### Byzantine Failure Handling

**Network Partition: Learning service unreachable (Step 1)**
- Timeout at 80ms immediately
- No state mutations
- Safe to retry (idempotent validation)

**Cascading: Community service updates reputation, crashes during Metrics call**
- Reputation successfully persisted in Community
- Metrics never receives review
- Compensation reverts Community reputation
- Result: Reviewer loses 20 points temporarily (inconsistency window ~30s)

**Partial State: Metrics fails after Community succeeds**
- Compensation triggers revert of Community reputation
- Learning review already soft-deleted
- Metrics dead-letter queue will eventually index review
- Metrics will have review, but Community will not have reputation
- Mitigation: Batch reconciliation job runs hourly

---

## SAGA 3: DifficultyAdjustmentSaga

### Business Context

Asynchronous, fire-and-forget SAGA that adjusts lab exercise difficulty based on aggregate learner performance. Runs after lab completion but decoupled from critical path.

### Flow Diagram

```
[Triggered after 100 labs completed by learners]
        ↓
    [SAGA START - ASYNC, NO BLOCKING]
        │
        ├─→ Step 1: Metrics.AnalyzeLearnerPerformance (async)
        │           ├─ Query ClickHouse for pass rates
        │           ├─ Calculate: avg_success_rate, variance, learner_segments
        │           ├─ Generate recommendations: "increase difficulty", "simplify", "keep"
        │           └─ Publish: PerformanceAnalyzed (non-blocking event)
        │
        ├─→ Step 2: SkillLab.UpdateExerciseDifficulty (async)
        │           ├─ Apply recommendations to challenges
        │           ├─ Adjust test case difficulty/timeout
        │           ├─ Rollout: incremental (10% of next learners)
        │           └─ Publish: DifficultiesUpdated
        │
        ├─→ Step 3: Learning.UpdateNextPath (async)
        │           ├─ Recommend next learning path based on difficulty progression
        │           ├─ Update learner's "suggested next" in profile
        │           └─ Publish: PathsRecommended
        │
        └─→ SAGA COMPLETE (async, no timeout)
            └─ All steps idempotent (safe to retry)
            └─ No compensation (read-only adjustments)
            └─ Executes hourly in background

NO FAILURE SCENARIOS:
  - Step 1 failure: Analysis skipped, next hourly run will retry
  - Step 2 failure: Difficulty unchanged, learners continue with current
  - Step 3 failure: Path recommendation unchanged, learners see old suggestions
  - Result: Always safe, no rollback needed
```

### Event Contracts

```yaml
DifficultyAdjustmentSaga.Start:
  Source: Scheduler (cron: every 1 hour)
  Trigger: 
    - Time-based (hourly)
    - OR manual (admin override)
  
DifficultyAdjustmentSaga.Step1.Request:
  Target: Metrics service
  Command: AnalyzeLabPerformance
  Idempotency: Use analysis timestamp + lab ID
  
  Input:
    labId: UUID
    lookbackHours: 24 (analyze last 24h of data)
  
  Processing (async):
    SELECT success_rate, failure_rate FROM lab_completions
    WHERE lab_id = ? AND timestamp > NOW() - 24h
    GROUP BY challenge_id
    
    Success rate < 40% → "INCREASE_DIFFICULTY"
    Success rate 40-70% → "KEEP"
    Success rate > 70% → "DECREASE_DIFFICULTY"
  
  Response:
    Event: PerformanceAnalyzed (async, non-blocking)
    labId: UUID
    recommendations: {
      challengeId: UUID,
      currentDifficulty: number,
      recommendedDifficulty: number,
      rationale: string,
      confidence: number (0-1)
    }[]

DifficultyAdjustmentSaga.Step2.Request:
  Target: SkillLab service
  Command: UpdateChallengeDifficulty
  Idempotency: Use (labId, challengeId, version) key
  
  Async Update Strategy:
    - Apply changes incrementally (10% rollout)
    - Add feature flag: "use_adjusted_difficulty"
    - A/B test: 10% new difficulty vs 90% old
    - After 1 week: full rollout if metrics improve
  
  Changes Applied:
    - Timeout limits (increase/decrease by 10%)
    - Test case count (add/remove edge cases)
    - Validation strictness (linting rules)
  
  Response:
    Event: DifficultyUpdated (async)
    labId: UUID
    challengesUpdated: number
    rolloutPercentage: number

DifficultyAdjustmentSaga.Step3.Request:
  Target: Learning service
  Command: UpdateRecommendedPath
  Idempotency: Use (learnerId, recommendationId) key
  
  For each enrolled learner:
    IF completed_labs_count > 3:
      currentDifficulty = "INTERMEDIATE"
      recommendedPath = "Orchestration Advanced Patterns"
    ELSE IF completed_labs_count > 1:
      currentDifficulty = "BEGINNER"
      recommendedPath = "Orchestration Fundamentals"
  
  Response:
    Event: RecommendedPathUpdated (async)
    updateCount: number
```

### Idempotency Strategy (No Compensation)

```yaml
Key Design: All steps are read-only queries + idempotent inserts

Step 1 (Analysis):
  Idempotent Key: (labId, analysisTimestamp)
  If run twice: Same ClickHouse query → same results
  No updates to state

Step 2 (Difficulty Update):
  Idempotent Key: (labId, challengeId, versionNumber)
  If run twice: UPSERT challenge_difficulty
  Previous version kept, new version marked current
  Safe to retry

Step 3 (Path Recommendation):
  Idempotent Key: (learnerId, recommendationId)
  If run twice: UPDATE recommended_path WHERE learner_id = ?
  Overwrites with same value
  Safe to retry

Failure Recovery:
  No compensation needed
  Failures are transparent (non-critical path)
  Next hourly run will retry automatically
  If persists >3 hours: Alert admin, manual review
```

### Async Processing & Decoupling

```yaml
DifficultyAdjustmentSaga.ProcessingModel:
  Type: Asynchronous saga (completely decoupled)
  
  Execution:
    - Triggered: Every 1 hour by Scheduler
    - OR manually: Admin CLI "adjust-difficulty --lab-id X"
    - Runs: In background job queue (not critical path)
    - Timeout: None (eventually consistent)
  
  Event Flow:
    1. PerformanceAnalyzed published (non-blocking)
    2. SkillLab service picks up event async
    3. Updates difficulty incrementally
    4. DifficultyUpdated published
    5. Learning service picks up event async
    6. Updates recommended paths
    7. PathsRecommended published
  
  Learner Experience:
    - Learner submits lab, immediately gets feedback
    - No waiting for difficulty adjustments
    - Recommended path updates async (learner sees later)
    - Challenge difficulty changes affect future learners
  
  Dead-Letter Handling:
    IF Metrics service down during Step 1:
      Next hourly run retries
      Maximum backoff: 24 hours (then manual intervention)
    
    IF SkillLab service down during Step 2:
      Event queued in dead-letter
      Retry exponentially: 1h, 2h, 4h, 8h
    
    IF Learning service down during Step 3:
      Event queued in dead-letter
      Retry exponentially
```

---

## Cross-SAGA Coordination

### Event Bus Architecture

```
RabbitMQ/Kafka Event Bus
│
├─→ Topic: vibe-cast-events
│   ├─ Partition 0: Learning domain events
│   ├─ Partition 1: SkillLab domain events
│   ├─ Partition 2: Certification domain events
│   ├─ Partition 3: Community domain events
│   └─ Partition 4: Metrics domain events
│
├─→ Consumer Groups:
│   ├─ SagaOrchestrator (consumes all, runs SAGAs 1-2)
│   ├─ MetricsAggregator (consumes all, updates ClickHouse)
│   ├─ CommunityACL (translates events)
│   ├─ DifficultyAdjustmentScheduler (triggers SAGA 3)
│   └─ DeadLetterHandler (retries failed events)
│
└─→ Dead-Letter Queue: dlq.vibe-cast-events
    (Events that fail after 3 retries, max age 7 days)
```

### Idempotency Keys

All SAGA requests must include idempotency keys:

```yaml
LabCompletionSaga:
  Metrics.RecordLabCompletion:
    Key: sessionId + "metrics-record" → UUID
  
  Learning.CheckExamEligibility:
    Key: sessionId + "learning-check" → UUID
  
  Certification.MarkEligible:
    Key: learnerId + certificationId + "cert-mark" → UUID
  
  Community.AwardReputation:
    Key: sessionId + "community-reward" → UUID

PeerReviewSaga:
  Learning.RecordReviewScore:
    Key: reviewId + "learning-record" → UUID
  
  Community.UpdateReputation:
    Key: reviewId + "community-update" → UUID
  
  Metrics.IndexReview:
    Key: reviewId + "metrics-index" → UUID

DifficultyAdjustmentSaga:
  (All idempotent by design, key = timestamp + resource ID)
```

### Event Versioning

```yaml
Schema Evolution Strategy:

BadgeIssuedV1 (Phase 1):
  Fields: [badgeId, learnerId, certificationId]
  Status: CURRENT
  
BadgeIssuedV2 (Phase 2 - future):
  Fields: [badgeId, learnerId, certificationId, issuedByVerifierId, issuedAt]
  Status: PLANNED
  Compatibility: V1 → V2 auto-migrate (issuedByVerifierId = NULL)

LabSessionCompletedV1 (Phase 2 - now):
  Fields: [sessionId, learnerId, labId, finalScore, timeSpentSeconds]
  Status: CURRENT

Event Handler Pattern:
  @EventHandler('LabSessionCompleted')
  async onLabSessionCompleted(event: DomainEvent) {
    if (event.version === 'V1') {
      const v2Event = migrateV1toV2(event);
      return this.handleLabSessionCompletedV2(v2Event);
    } else if (event.version === 'V2') {
      return this.handleLabSessionCompletedV2(event);
    }
    throw new UnsupportedVersionError(event.version);
  }

Deprecation Timeline:
  Week 1: Support both V1 and V2
  Week 2: Publish new events as V2
  Week 3: Backfill historical V1 to V2
  Week 4: Deprecate V1 handler
  Week 5: V1 handler removed
```

---

## Infrastructure Requirements for SAGAs

### Eventual Consistency Guarantees

```yaml
Consistency Model: BASE (Basically Available, Soft state, Eventually consistent)

LabCompletionSaga:
  Consistency: Strong within each step, eventual across steps
  Window: 2-5 seconds (max event processing latency)
  Risk: Learner sees "Lab pending" for 2-5s before "Eligible for exam"
  Mitigation: Frontend poll every 1s for status updates

PeerReviewSaga:
  Consistency: Eventual
  Window: 30-60 seconds (metrics indexing lag)
  Risk: Reviewer doesn't immediately see reputation increase
  Mitigation: Real-time subscription to ReputationAwarded event

DifficultyAdjustmentSaga:
  Consistency: Eventually consistent by design
  Window: 1-24 hours (analysis + rollout)
  Risk: None (async, non-critical)
```

### Deployment Requirements

```yaml
Infrastructure:
  Message Queue: RabbitMQ (3+ replicas, durable exchanges)
  Database: PostgreSQL (ACID for saga state)
  Cache: Redis (saga execution tracking)
  Analytics: ClickHouse (metrics storage)
  Logging: ELK Stack (event audit trail)

SagaOrchestrator:
  Deployment: Kubernetes (2+ replicas, leader election)
  State: Distributed saga state in PostgreSQL
  Observability: Prometheus metrics + Grafana
  
  Metrics to Export:
    - saga_started_total (counter by saga type)
    - saga_completed_total (counter by saga type, status)
    - saga_duration_seconds (histogram)
    - saga_step_duration_seconds (histogram by step)
    - saga_failures_total (counter by reason)
    - saga_compensations_total (counter)

Monitoring Alerts:
  - saga_failure_rate > 1% → WARNING
  - saga_avg_duration > 600ms → WARNING
  - saga_compensation_triggered > 5 in 1h → WARNING
  - dead_letter_queue_size > 1000 → CRITICAL
```

---

## Testing Strategy (agentic-qe Integration)

### SAGA Contract Tests

```yaml
LabCompletionSaga.ContractTests:
  
  Test 1: Happy Path (all steps succeed)
    Given: LabSessionCompleted event with valid learner
    When: SagaOrchestrator processes event
    Then:
      - MetricsRecorded event published
      - EligibilityVerified event published (eligible=true)
      - CertificationCandidateCreated event published
      - ReputationAwarded event published
      - Status: SAGA_COMPLETED
  
  Test 2: Step 2 Failure (learner not eligible)
    Given: LabSessionCompleted event, but learner hasn't completed prerequisites
    When: SagaOrchestrator processes, Learning.CheckExamEligibility returns eligible=false
    Then:
      - MetricsRecorded event published
      - EligibilityVerified event published (eligible=false)
      - Compensation: Metrics.RevertLabCompletion called
      - Status: SAGA_FAILED_COMPENSATED
      - Learner notified: "Not yet eligible. Complete path X"
  
  Test 3: Step 3 Timeout (Certification service slow)
    Given: LabSessionCompleted event
    When: SagaOrchestrator awaits Certification.MarkEligible for 70ms
    Then: Certification.MarkEligible takes >70ms (simulated)
      - Timeout triggered
      - Compensation: Learning.RevertEligibilityCheck called
      - Compensation: Metrics.RevertLabCompletion called
      - Status: SAGA_FAILED_COMPENSATED
      - Event published: LabCompletionSagaFailed

PeerReviewSaga.ContractTests:
  
  Test 1: Happy Path
    Given: ReviewSubmitted event
    When: SagaOrchestrator processes
    Then:
      - ReviewRecorded event published
      - ReputationAwarded event published
      - ReviewIndexed event published
      - Status: SAGA_COMPLETED
  
  Test 2: Step 1 Validation Fails
    Given: ReviewSubmitted, but reviewer hasn't completed lab
    When: SagaOrchestrator calls Learning.ValidateAndRecordReview
    Then: Returns ReviewValidationFailed
      - No compensation (no state mutations)
      - Status: SAGA_REJECTED
  
  Test 3: Step 2 Reputation Update Fails
    Given: ReviewSubmitted, valid
    When: Step 1 succeeds, Step 2 times out
    Then:
      - ReviewRecorded event published
      - Compensation: Learning.RevertReview called
      - Status: SAGA_FAILED_COMPENSATED

DifficultyAdjustmentSaga.ContractTests:
  
  Test 1: Async Execution (no blocking)
    Given: DifficultyAdjustment scheduled
    When: SagaOrchestrator picks up from scheduler
    Then:
      - Returns immediately (non-blocking)
      - Events published asynchronously
      - Steps execute in background
  
  Test 2: Idempotent Retry
    Given: DifficultyAdjustment saga failed partway through
    When: Scheduler retries same saga
    Then:
      - Same recommendations generated (idempotent ClickHouse query)
      - Difficulty updates UPSERT (safe duplicate)
      - Path recommendations overwrites (idempotent)
      - Final state identical to first run
  
  Test 3: Partial Failure Recovery
    Given: All three steps running async
    When: Step 1 succeeds, Step 2 fails, Step 3 pending
    Then:
      - Step 1: Analysis completed (no state mutation)
      - Step 2: Difficulty unchanged (no state mutation)
      - Step 3: Pending (can run later)
      - No compensation needed
      - Status: SAGA_PARTIAL (will complete eventually)
```

---

## Week 9 Deliverables (This Document)

- [x] SAGA 1 Design: LabCompletionSaga (orchestrated, 500ms, compensating)
- [x] SAGA 2 Design: PeerReviewSaga (choreographed, 600ms, compensating)
- [x] SAGA 3 Design: DifficultyAdjustmentSaga (async, idempotent, no compensation)
- [x] Event contracts with versioning strategy
- [x] Failure scenarios with compensation logic for each SAGA
- [x] Timeout & retry policies
- [x] Byzantine failure handling
- [x] Infrastructure requirements (eventual consistency, deployment)
- [x] Testing strategy (agentic-qe contract tests)

---

## Week 10-13 Implementation Roadmap

```
Week 10:
  - Implement SagaOrchestrator.ts (380 lines)
  - Implement LabCompletionSaga (350 lines)
  - Implement compensation handlers for SAGA 1
  - agentic-qe: Generate 30+ contract tests

Week 11-12:
  - Implement PeerReviewSaga (320 lines)
  - Implement compensation handlers for SAGA 2
  - Implement DifficultyAdjustmentSaga (280 lines)
  - agentic-qe: Generate 40+ integration tests

Week 13:
  - Integration testing: All 3 SAGAs with real services
  - Failure scenario testing
  - Byzantine failure simulations
  - Load testing: 1000 concurrent SAGA executions
  - Go/No-Go decision for Phase 2 launch
```

---

**Document Version**: 1.0  
**Status**: APPROVED FOR IMPLEMENTATION (Week 10)  
**Next Review**: Week 13 (integration test results)  


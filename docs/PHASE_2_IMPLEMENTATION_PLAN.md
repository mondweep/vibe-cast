# Phase 2 Implementation Plan: Ruflow Learning Platform
## Weeks 9-16 MVP - Skill Lab + Community Launch

**Status**: Planning Complete | Ready for Development  
**Duration**: 8 weeks (Weeks 9-16)  
**Delivery Gate**: Week 14 Go/No-Go Decision  
**Target Launch**: Week 16 (Production-Ready)

---

## Executive Summary

Phase 2 delivers the **practice and engagement engines** of the Ruflow Learning Platform:
- **Skill Lab Domain**: Ephemeral sandbox environments for hands-on practice with Kubernetes orchestration
- **Community Domain**: Peer collaboration, reputation system, code reviews
- **Metrics Domain**: Real-time analytics with ClickHouse + Elasticsearch (CQRS)
- **Event Infrastructure**: Event-driven orchestration with SAGA pattern across 5 bounded contexts
- **agentic-qe Integration**: Automated test generation ensuring 80%+ coverage + integration testing

**Key Metrics**:
- 60+ implementation files (all <500 lines per constraint)
- 3 major SAGA orchestrations (Lab→Exam, Peer Review→Grade, Difficulty Adjustment)
- 150+ generated integration tests via agentic-qe
- 5 parallel development tracks per week (max 3 concurrent)
- 99.9% uptime target, <0.1% SAGA failure rate

---

## Part 1: Scope & Critical Dependencies

### Phase 2 Deliverables
1. **Skill Lab Domain** (Complete)
   - Exercise management with Kubernetes sandbox orchestration
   - Code validation via Ruflo agents
   - Real-time lab progress tracking
   - Performance analytics per learner

2. **Community Domain** (Complete)
   - Member profiles with reputation system
   - Discussion forums with Elasticsearch
   - Peer code reviews with grade integration
   - Leaderboards with Redis-backed queries

3. **Metrics Domain** (Complete)
   - CQRS read models with ClickHouse (columnar OLAP)
   - Real-time event indexing with Elasticsearch
   - Aggregation pipeline (hourly/daily/weekly)
   - Anomaly detection for learner disengagement

4. **Event Infrastructure Hardening**
   - Event sourcing for audit trails (Certification domain)
   - SAGA orchestration framework
   - Dead-letter queue with retry policies
   - Event versioning & compatibility

5. **agentic-qe Integration**
   - Automated test generation for all domains
   - SAGA contract testing (3 failure scenarios per flow)
   - Mock contract definitions (London School)
   - Full-stack integration test suite (150+ tests)

### Inter-Domain Dependencies Map

```
Week 9-10 (Foundation):
  Learning (Phase 1) [Already Complete]
    ↓
  Event Bus [BLOCKING - Week 9]
    ↓
  SkillLab + Community [Can parallelize - Week 9-10]

Week 11-12 (Scale):
  SkillLab + Community
    ↓
  Metrics Analytics [Consumes all domain events]
    ↓
  SAGA Orchestration [Week 12-13]

Week 13-14 (Integration):
  All 5 domains + SAGA flows
    ↓
  agentic-qe Full Test Suite [Week 14]
    ↓
  Integration Testing [Week 14]

Week 15-16 (Operations):
  Kubernetes Deployment [Week 15]
  Monitoring & Documentation [Week 15-16]
```

---

## Part 2: Weekly Breakdown & Parallel Tracks

### Week 9: Foundation (Parallel Tracks A, B, C)

**Track A: SkillLab Core Models** (40 hours)
- [ ] Exercise.ts aggregate (380 lines)
- [ ] LabSession.ts aggregate (420 lines)
- [ ] ExerciseRepository (300 lines)
- [ ] LabSessionRepository (350 lines)
- Domain event definitions & unit tests (agentic-qe generated)
- **Deliverable**: Skill Lab aggregates tested, 80% coverage

**Track B: Community Core Models** (30 hours)
- [ ] Member.ts aggregate (380 lines)
- [ ] Discussion.ts aggregate (420 lines)
- [ ] MemberRepository (300 lines)
- [ ] DiscussionRepository (340 lines)
- [ ] ACL translator for Learning domain (280 lines)
- **Deliverable**: Community domain model + event publishing

**Track C: Event Infrastructure** (35 hours)
- [ ] DomainEvent base class (280 lines)
- [ ] EventBus RabbitMQ implementation (350 lines)
- [ ] SagaOrchestrator framework skeleton (380 lines)
- [ ] Event versioning strategy
- [ ] Unit tests for event serialization/deserialization
- **Deliverable**: Event bus fully operational, all domains can publish

**Week 9 Checkpoint**: All tracks complete, no integration yet. Ready for Week 10 orchestration.

---

### Week 10: Orchestration & Sandbox (Parallel Tracks A, C)

**Track A: SkillLab Execution Engine** (45 hours)
- [ ] SandboxOrchestrator.ts (Kubernetes integration) (380 lines)
- [ ] RufloValidationService.ts (code validation) (400 lines)
- [ ] LabCompletionSaga.ts (SkillLab→Metrics) (350 lines)
- [ ] SandboxResourceSaga.ts (resource tracking) (300 lines)
- Integration tests: SkillLab + Kubernetes sandbox
- agentic-qe generated: Sandbox container lifecycle tests
- **Deliverable**: Learners can submit code → sandbox executes → feedback generated

**Track C: Event Hardening** (30 hours)
- [ ] DeadLetterHandler.ts for failed events (300 lines)
- [ ] Event retry policies with exponential backoff
- [ ] Event schema validation
- [ ] Monitoring & alerting for dead-letter queue
- [ ] PostgresEventStore.ts for event sourcing (360 lines)
- **Deliverable**: Event bus production-ready with fault tolerance

**Week 10 Checkpoint**: SkillLab can execute exercises end-to-end. Events flowing to Metrics.

---

### Week 11: Analytics Foundation (Parallel Tracks D, E, F)

**Track D: SkillLab Advanced** (35 hours)
- [ ] Multi-exercise lab sequences
- [ ] Performance analytics per learner
- [ ] Exercise recommendation engine (280 lines)
- [ ] Difficulty-adjusted lab paths
- Integration tests with Learning domain
- **Deliverable**: Labs adapt to learner performance

**Track E: Community Scale-Up** (40 hours)
- [ ] ReputationService.ts (360 lines)
- [ ] LeaderboardService.ts (Redis-backed) (280 lines)
- [ ] DiscussionRepository with Elasticsearch sync (340 lines)
- [ ] Real-time notification engine
- Integration tests: Community + Learning ACL
- **Deliverable**: Community engagement features operational

**Track F: Metrics Analytics** (45 hours)
- [ ] ClickHouseMetricsProjection.ts (380 lines)
- [ ] ElasticsearchEventIndex.ts (300 lines)
- [ ] MetricsAggregationPipeline.ts (380 lines)
- [ ] RealtimeAnalyticsService.ts (350 lines)
- [ ] Dashboard query models
- agentic-qe generated: CQRS eventual consistency tests
- **Deliverable**: Real-time analytics dashboards functional

**Week 11 Checkpoint**: 3 domains fully operational with event streaming to metrics.

---

### Week 12: SAGA Orchestration & Peer Review (Parallel Tracks D, E, F)

**Track D: SAGA Integration** (40 hours)
- [ ] LabCompletionSaga hardened (retries, compensation) (350 lines)
- [ ] SandboxResourceTracking SAGA (300 lines)
- [ ] agentic-qe SAGA contract tests (3 failure scenarios)
- [ ] Performance testing: <500ms SAGA completion
- **Deliverable**: Lab→Certification eligibility flow end-to-end

**Track E: Peer Review Workflow** (35 hours)
- [ ] CodeReview.ts aggregate (400 lines)
- [ ] PeerReviewService.ts (380 lines)
- [ ] Review submission validation
- [ ] Reviewer matching algorithm
- Integration: Community + SkillLab
- **Deliverable**: Peer review workflow ready

**Track F: Analytics Hardening** (30 hours)
- [ ] Anomaly detection algorithms
- [ ] Trending topics analysis
- [ ] Learner engagement scoring
- [ ] Performance bottleneck identification
- **Deliverable**: Analytics powering strategic decisions

**Week 12 Checkpoint**: All domains interconnected via SAGA. Analytics fully streaming.

---

### Week 13: Curriculum & Cross-Domain SAGAs (Parallel Tracks G, H, I)

**Track G: Learning Curriculum** (40 hours)
- [ ] Intermediate Path definition model
- [ ] Prerequisites validation engine
- [ ] Course sequencing rules
- [ ] Path recommendation algorithm
- Integration: Learning + SkillLab
- agentic-qe generated: Prerequisite validation tests
- **Deliverable**: Intermediate learning paths available

**Track H: Peer Review SAGA** (40 hours)
- [ ] PeerReviewSaga.ts (320 lines)
- [ ] Grade aggregation logic
- [ ] Reputation allocation from reviews
- Integration: Community + Learning + Metrics
- SAGA contract tests (5 scenarios)
- **Deliverable**: Complete peer review→grade update flow

**Track I: SAGA Framework** (45 hours)
- [ ] SagaOrchestrator hardened (380 lines)
- [ ] Saga execution persistence (event log)
- [ ] Compensation transaction executor
- [ ] Timeout handling & alerts
- [ ] Distributed tracing integration
- agentic-qe: Full SAGA integration test suite
- **Deliverable**: Enterprise-grade SAGA orchestration

**Week 13 Checkpoint**: 4 major SAGA flows operational. All domains integrated.

---

### Week 14: Integration Testing & Verification (Parallel Tracks J)

**Track J: Full-Stack Testing** (50 hours)
- [ ] Swarm coordination tests (all 5 domains together)
- [ ] Event-driven scenario testing
- [ ] Chaos engineering: simulate service failures
- [ ] Load testing: 500 concurrent learners
- [ ] agentic-qe: Full-stack integration test generation
- [ ] Coverage report: Target >80% per domain
- **Deliverable**: All critical paths tested end-to-end

**Week 14 GATE** (Go/No-Go Decision):
```
Technical Criteria:
✓ All 5 domains deployed to staging
✓ Unit test coverage >80% per domain
✓ Integration tests passing (3 SAGA flows)
✓ Event bus latency <100ms
✓ SAGA latency <500ms per flow
✓ Kubernetes deployment validated
✓ agentic-qe test suite: 150+ tests generated

Decision: PROCEED to Week 15 deployment OR DELAY for hardening
```

---

### Week 15: Kubernetes Deployment (Parallel Tracks K, L)

**Track K: Infrastructure as Code** (45 hours)
- [ ] Kubernetes manifests for 5 services
- [ ] Helm charts for configuration
- [ ] Service mesh (Istio) setup
- [ ] Database migration scripts
- [ ] Deployment validation tests
- **Deliverable**: Kubernetes-ready infrastructure

**Track L: Monitoring & Observability** (40 hours)
- [ ] Prometheus metrics collection
- [ ] Grafana dashboards (per domain + platform)
- [ ] Distributed tracing (Jaeger) setup
- [ ] Log aggregation (ELK stack)
- [ ] Alert rules for critical SLOs
- [ ] Runbooks for on-call teams
- **Deliverable**: Production monitoring operational

**Week 15 Checkpoint**: Infrastructure ready. Ready for staging deployment.

---

### Week 16: Documentation & Knowledge Transfer

**Documentation** (35 hours)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Event catalog (AsyncAPI)
- [ ] SAGA flow diagrams
- [ ] Troubleshooting guides
- [ ] Agent coordination guidelines (Ruflow)
- [ ] Deployment runbooks

**Knowledge Transfer** (25 hours)
- [ ] Engineering team training (4 sessions)
- [ ] Operations team training (SRE, monitoring)
- [ ] Product team training (feature usage)
- [ ] Customer success training (learner support)
- [ ] Video walk-throughs of key workflows

**Week 16 Checkpoint**: Phase 2 ready for production launch.

---

## Part 3: Critical File Inventory

### Skill Lab Domain (12 files)
```
/src/skill-lab/domain/models/
  Exercise.ts (380 lines)
  LabSession.ts (420 lines)
  LabPath.ts (300 lines)

/src/skill-lab/infrastructure/repositories/
  ExerciseRepository.ts (300 lines)
  LabSessionRepository.ts (350 lines)

/src/skill-lab/domain/services/
  RufloValidationService.ts (400 lines)
  ExerciseRecommendationService.ts (280 lines)

/src/skill-lab/infrastructure/services/
  SandboxOrchestrator.ts (380 lines)

/src/skill-lab/application/sagas/
  LabCompletionSaga.ts (350 lines)
  SandboxResourceSaga.ts (300 lines)

/src/skill-lab/api/controllers/
  ExerciseController.ts (320 lines)
  LabSessionController.ts (380 lines)
```

### Community Domain (12 files)
```
/src/community/domain/models/
  Member.ts (380 lines)
  Discussion.ts (420 lines)
  CodeReview.ts (400 lines)

/src/community/infrastructure/repositories/
  MemberRepository.ts (300 lines)
  DiscussionRepository.ts (340 lines)
  CodeReviewRepository.ts (320 lines)

/src/community/domain/services/
  ReputationService.ts (360 lines)
  PeerReviewService.ts (380 lines)
  LeaderboardService.ts (280 lines)

/src/community/infrastructure/acl/
  LearningDomainTranslator.ts (280 lines)

/src/community/application/sagas/
  PeerReviewSaga.ts (320 lines)

/src/community/api/controllers/
  MemberController.ts (300 lines)
  DiscussionController.ts (380 lines)
```

### Metrics Domain (8 files)
```
/src/metrics/domain/models/
  DashboardQuery.ts (340 lines)

/src/metrics/infrastructure/readmodels/
  ClickHouseMetricsProjection.ts (380 lines)
  ElasticsearchEventIndex.ts (300 lines)

/src/metrics/application/services/
  RealtimeAnalyticsService.ts (350 lines)
  MetricsAggregationPipeline.ts (380 lines)
  AnomalyDetectionService.ts (320 lines)

/src/metrics/api/controllers/
  MetricsController.ts (360 lines)
  AnalyticsController.ts (340 lines)
```

### Shared Infrastructure (12 files)
```
/src/shared/domain/events/
  DomainEvent.ts (280 lines)

/src/shared/infrastructure/events/
  EventBus.ts (350 lines)
  EventPublisher.ts (240 lines)

/src/shared/infrastructure/sagas/
  SagaOrchestrator.ts (380 lines)
  SagaDefinitionBuilder.ts (300 lines)
  SagaExecutionLog.ts (280 lines)

/src/shared/infrastructure/messaging/
  DeadLetterHandler.ts (300 lines)
  EventRetryPolicy.ts (260 lines)

/src/certification/infrastructure/eventstore/
  PostgresEventStore.ts (360 lines)
```

### Testing & agentic-qe (8 files)
```
/src/shared/testing/agentic-qe/
  TestGenerationOrchestrator.ts (340 lines)
  SagaTestGenerator.ts (360 lines)

/src/shared/testing/contracts/
  SkillLabContracts.ts (320 lines)
  CommunityContracts.ts (280 lines)
  MetricsContracts.ts (300 lines)
  SagaContracts.ts (310 lines)

/src/shared/config/
  EventBusConfig.ts (180 lines)
  KubernetesConfig.ts (200 lines)
```

---

## Part 4: SAGA Flows (Phase 2)

### SAGA 1: Lab Completion → Exam Eligibility (Week 10)

**Timeline**: ~300ms (3 events, 2 service hops)

```
Step 1 [SkillLab]:
  Event: ExercisePassed (from learner submission)
  Aggregate all exercise attempts
  Emit: LabSessionCompleted(labId, learnerId, completionTime)

Step 2 [Certification - ACL]:
  Receive: LabSessionCompleted
  Verify: >=5 labs completed with >=75% success rate
  Emit: ExamEligibilityUnlocked(learnerId, examId)

Step 3 [Learning]:
  Receive: ExamEligibilityUnlocked
  Update learner profile with exam badge
  Emit: LearnerMilestoneAchieved(milestone: "EXAM_READY")

Compensation:
  If Certification fails: Emit ExamRecommendationGenerated
  Metrics logs: ExamEligibilityCheckFailed
```

### SAGA 2: Peer Review → Grade → Reputation (Week 14)

**Timeline**: ~600ms (5 events, 4 service hops)

```
Step 1 [Community]:
  Event: CodeReviewApproved (from peer reviewer)
  Emit: PeerReviewApproved(reviewId, submissionId, rating)

Step 2 [SkillLab - ACL]:
  Receive: PeerReviewApproved
  Update LabSession with peer grade
  Emit: ExerciseGradeUpdated(sessionId, exerciseId, peerGrade)

Step 3 [Learning]:
  Receive: ExerciseGradeUpdated
  Recalculate Path progress
  Emit: LearnerProgressRecalculated(learnerId, pathId, newProgress)

Step 4 [Community]:
  Receive: LearnerProgressRecalculated
  Increment reviewer reputation: +15
  Emit: ReputationIncremented(reviewerId, delta: 15)

Step 5 [Metrics]:
  Receive all events
  Aggregate into daily snapshot
  Emit: MetricsDailyAggregated(date, totalReviews, avgRating)

Compensation:
  If Learning fails: Emit ReviewerNotificationFailed
  Retry: 3 attempts with exponential backoff
```

### SAGA 3: Lab Performance → Difficulty Adjustment (Week 12)

**Timeline**: ~400ms (async, can defer)

```
Step 1 [SkillLab]:
  Monitor: Exercise failure rate (3+ failures)
  Aggregate: All learner attempts
  Emit: ExerciseDifficultyCheckNeeded(exerciseId)

Step 2 [Metrics - Analytics]:
  Receive: ExerciseDifficultyCheckNeeded
  Compute 7-day metrics:
    - Success rate: (passed / total)
    - Avg attempts: attempts / learners
    - Avg time: time / passed
  Emit: ExerciseMetricsComputed(exerciseId, metrics)

Step 3 [SkillLab - Decision]:
  Receive: ExerciseMetricsComputed
  Rule: If successRate < 50% → reduce difficulty
  Emit: ExerciseDifficultyAdjusted(exerciseId, newDifficulty)

Step 4 [Learning]:
  Receive: ExerciseDifficultyAdjusted
  Notify instructors for review
  Emit: InstructorReviewRequired

Compensation:
  If metrics stale: Defer adjustment until next window
```

---

## Part 5: agentic-qe Integration

### Test Generation Strategy

**Unit Tests** (Week 10): Domain logic validation
- Exercise validation rules
- Reputation calculation invariants
- Badge issuance rules
- Exam eligibility criteria

**Integration Tests** (Week 12): Service boundary contracts
- SkillLab↔Metrics resource tracking
- Community↔Learning peer grade updates
- SkillLab↔Certification exam eligibility
- Domain event serialization/deserialization

**SAGA Tests** (Week 13): Orchestration scenarios
- Happy path (all steps complete)
- Partial failure (one service timeout)
- Full rollback (all services unavailable)
- Idempotency (re-running produces same result)

**Full-Stack Tests** (Week 14): End-to-end workflows
- Learner completes lab → gets exam eligibility badge
- Peer reviewer submits review → grade updates → reputation earned
- Lab difficulty adjusted → learner notified

**Expected Coverage**: 150+ tests, 80%+ code coverage per domain

---

## Part 6: Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Services | NestJS/Express | Microservices runtime |
| Databases | PostgreSQL | Transactional data (ACID) |
| Analytics | ClickHouse | Time-series OLAP queries |
| Search | Elasticsearch | Full-text event indexing |
| Cache | Redis | Leaderboards, session data |
| Message Bus | RabbitMQ | Event publishing/consumption |
| Sandbox | Kubernetes | Ephemeral code execution |
| Orchestration | Istio Service Mesh | Traffic management & tracing |
| Monitoring | Prometheus/Grafana | Metrics collection & visualization |
| Tracing | Jaeger | Distributed request tracing |
| Logs | ELK Stack | Centralized log aggregation |

---

## Part 7: Success Criteria & Launch Gate

### Week 14 Go/No-Go Gate

**Technical** ✓
- All 5 domains deployed to staging
- Unit test coverage >80% per domain
- Integration tests passing (3 SAGA flows)
- Event latency <100ms
- SAGA latency <500ms
- agentic-qe generated 150+ tests

**Operational** ✓
- Runbooks written for on-call
- SRE team trained
- Monitoring dashboards operational
- Alert thresholds defined

**Business** ✓
- 5 acceptance criteria met
- Performance targets verified (<2s response time)
- Security review complete

### Post-Launch Metrics (Weeks 17+)

**Adoption**: 50+ learners by Week 18, 10+ discussions, 30+ code reviews by Week 20  
**Engagement**: <45min lab completion time, >4.2/5.0 peer review rating  
**Quality**: 80%+ test coverage maintained, <1% bug escape rate, <0.1% SAGA failure rate  
**Reliability**: 99.9% uptime, >99.95% event delivery

---

## Next Steps

1. **Week 9 Kickoff**: Spawn 3 parallel agent teams (SkillLab, Community, Events)
2. **Weekly Syncs**: Review completion status vs. plan
3. **Week 14 Gate Review**: Evaluate go/no-go criteria
4. **Week 16 Launch**: Deploy to production

See `/CLAUDE.md` for Ruflow agent assignments and swarm coordination patterns.
